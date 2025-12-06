import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { classifyCategory } from "./aiService.js";
import { getUserCooldownRules, getUserProfile } from "./userService.js";
import { getCooldownDaysForAmount, calcComfortableFrom, isDateInPast } from "../utils/cooldownCalc.js";
import { checkBlacklistByText } from "../utils/blacklist.js";
import { addDays, now } from "../utils/date.js";

export const listPurchasesByUser = (userId) =>
  Purchase.find({ userId }).sort({ createdAt: -1 });

export const getPurchaseById = (id) => Purchase.findById(id);

export const createPurchase = async (user, payload) => {
  const { title, price, category, useAiCategory, description, url } = payload;

  let finalTitle = title;
  let finalCategory = category || "другое";
  let aiCategory = null;

  // Если есть URL, пытаемся извлечь информацию из него
  if (url && !title) {
    // Простой парсинг - можно улучшить через специальный сервис
    try {
      // Пытаемся извлечь название из URL (например, из Ozon, Wildberries и т.д.)
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Для популярных магазинов можно добавить специфичную логику
      if (hostname.includes('ozon.ru')) {
        finalTitle = `Товар с Ozon${urlObj.pathname ? ` - ${urlObj.pathname.split('/').pop()}` : ''}`;
      } else if (hostname.includes('wildberries.ru')) {
        finalTitle = `Товар с Wildberries${urlObj.pathname ? ` - ${urlObj.pathname.split('/').pop()}` : ''}`;
      } else {
        finalTitle = `Товар с ${hostname}`;
      }
    } catch (e) {
      // Если не удалось распарсить URL, используем исходное название
      finalTitle = title || "Товар";
    }
  }

  if (useAiCategory || !category) {
    // Получаем список запрещенных категорий пользователя
    const excludeCategories = user.notificationSettings?.excludeCategories || [];
    aiCategory = await classifyCategory(finalTitle, description || url || "", excludeCategories);
    finalCategory = aiCategory;
  }

  const rules = await getUserCooldownRules(user.userId);
  const cooldownDays = getCooldownDaysForAmount(rules, price);
  const cooldownUntil = cooldownDays ? addDays(now(), cooldownDays) : null;
  const comfortableFrom = calcComfortableFrom(user, price);

  // Проверяем blacklist: сначала дефолтный, потом пользовательский
  const defaultBlacklistMatched = checkBlacklistByText(finalCategory, title);
  const userExcludeCategories = user.notificationSettings?.excludeCategories || [];
  const userBlacklistMatched = userExcludeCategories.some(cat => 
    finalCategory && finalCategory.toLowerCase().includes(cat.toLowerCase())
  );
  
  // blacklistMatched должен быть булевым
  const blacklistMatched = !!defaultBlacklistMatched || userBlacklistMatched;
  const blockedByCategory = blacklistMatched;

  // Оставляем статус "planned" даже для заблокированных, чтобы модальное окно могло показаться
  // Пользователь все равно увидит предупреждение и сможет решить
  const status = "planned";

  const purchase = await Purchase.create({
    userId: user.userId,
    title: finalTitle,
    price,
    category: finalCategory,
    aiCategory,
    url: url || undefined,
    cooldownUntil,
    comfortableFrom,
    blacklistMatched,
    blockedByCategory,
    status
  });

  return purchase;
};

export const cancelPurchase = async (id) => {
  const purchase = await Purchase.findById(id);
  if (!purchase) return null;
  purchase.status = "canceled";
  await purchase.save();
  return purchase;
};

export const markPurchaseAsBought = async (id) => {
  const purchase = await Purchase.findById(id);
  if (!purchase) return null;
  purchase.status = "purchased";
  await purchase.save();
  
  // Обновляем накопления пользователя
  const user = await User.findOne({ userId: purchase.userId });
  if (user && user.currentSavings >= purchase.price) {
    user.currentSavings -= purchase.price;
    await user.save();
  }
  
  return purchase;
};

export const isPurchaseAllowedNow = (purchase) => {
  if (purchase.blockedByCategory) return false;
  const cooldownOk = !purchase.cooldownUntil || isDateInPast(purchase.cooldownUntil);
  const comfortOk = !purchase.comfortableFrom || isDateInPast(purchase.comfortableFrom);
  return cooldownOk && comfortOk;
};

export const updateLastNotified = async (purchase) => {
  purchase.lastNotifiedAt = now();
  await purchase.save();
  return purchase;
};

export const updatePurchase = async (id, payload) => {
  const purchase = await Purchase.findById(id);
  if (!purchase) return null;

  const { title, price, category, url, description, useAiCategory } = payload;

  if (title !== undefined) purchase.title = title;
  if (price !== undefined) purchase.price = price;
  if (url !== undefined) purchase.url = url;
  if (description !== undefined) purchase.description = description;

  // Если категория изменилась или нужно переопределить через AI
  if (category !== undefined || (useAiCategory && category === undefined)) {
    if (useAiCategory || !category) {
      const user = await getUserProfile(purchase.userId);
      const excludeCategories = user?.notificationSettings?.excludeCategories || [];
      const aiCategory = await classifyCategory(title || purchase.title, description || url || "", excludeCategories);
      purchase.aiCategory = aiCategory;
      purchase.category = aiCategory;
    } else {
      purchase.category = category;
      purchase.aiCategory = null;
    }
  }

  // Пересчитываем cooldown и comfortableFrom если изменилась цена
  if (price !== undefined && price !== purchase.price) {
    const user = await getUserProfile(purchase.userId);
    if (user) {
      const rules = await getUserCooldownRules(user.userId);
      const cooldownDays = getCooldownDaysForAmount(rules, price);
      purchase.cooldownUntil = cooldownDays ? addDays(now(), cooldownDays) : null;
      purchase.comfortableFrom = calcComfortableFrom(user, price);
    }
  }

  await purchase.save();
  return purchase;
};
