import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { classifyCategory } from "./aiService.js";
import { getUserCooldownRules, getUserProfile } from "./userService.js";
import { getCooldownDaysForAmount, calcComfortableFrom, isDateInPast, getCombinedRecommendedDays } from "../utils/cooldownCalc.js";
import { checkBlacklistByText } from "../utils/blacklist.js";
import { addDays, now } from "../utils/date.js";
import { checkAgainstBlacklist } from "./categorySimilarityService.js";

export const listPurchasesByUser = (userId) =>
  Purchase.find({ userId }).sort({ createdAt: -1 });

export const getPurchaseById = (id) => Purchase.findById(id);

export const createPurchase = async (user, payload) => {
  const { title, price, category, useAiCategory, description, url } = payload;

  let finalTitle = title;
  let finalCategory = category;
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

  // Если категория не указана ИЛИ явно запрошено использование AI - определяем категорию через AI
  if (useAiCategory || !category) {
    // Получаем список запрещенных категорий пользователя
    const excludeCategories = user.notificationSettings?.excludeCategories || [];
    aiCategory = await classifyCategory(finalTitle, description || url || "", excludeCategories);
    // Используем категорию от AI, если она определена, иначе fallback на "другое"
    finalCategory = aiCategory || "другое";
  } else {
    // Если категория указана вручную, используем её
    finalCategory = category;
  }

  const rules = await getUserCooldownRules(user.userId);
  
  // Проверяем blacklist: сначала дефолтный, потом пользовательский
  const defaultBlacklistMatched = checkBlacklistByText(finalCategory, title);
  const userExcludeCategories = user.notificationSettings?.excludeCategories || [];
  
  // Используем ML/AI для определения семантической близости категорий
  let similarityResult = null;
  let userBlacklistMatched = false;
  let similarityScore = null;
  let matchedBlacklistCategory = null;
  let similarityExplanation = null;

  if (userExcludeCategories.length > 0 && finalCategory) {
    try {
      similarityResult = await checkAgainstBlacklist(finalCategory, userExcludeCategories);
      
      if (similarityResult.bestMatch) {
        userBlacklistMatched = true;
        similarityScore = similarityResult.bestMatch.similarity;
        matchedBlacklistCategory = similarityResult.bestMatch.category;
        similarityExplanation = similarityResult.bestMatch.explanation;
      }
    } catch (error) {
      console.error("Ошибка при проверке семантической близости категорий:", error);
      // Fallback на простую проверку при ошибке
      userBlacklistMatched = userExcludeCategories.some(cat => 
        finalCategory && finalCategory.toLowerCase().includes(cat.toLowerCase())
      );
    }
  }

  // Если AI не нашел совпадения, используем простую проверку как fallback
  if (!userBlacklistMatched) {
    userBlacklistMatched = userExcludeCategories.some(cat => 
      finalCategory && finalCategory.toLowerCase().includes(cat.toLowerCase())
    );
  }
  
  // blacklistMatched должен быть булевым
  const blacklistMatched = !!defaultBlacklistMatched || userBlacklistMatched;
  const blockedByCategory = blacklistMatched;

  // Если категория в черном списке, не рассчитываем сроки - покупка не рекомендуется
  let cooldownDays = 0;
  let cooldownUntil = null;
  let comfortableFrom = null;
  let recommendedDays = 0;

  if (!blockedByCategory) {
    // Рассчитываем сроки только если категория не в черном списке
    cooldownDays = getCooldownDaysForAmount(rules, price);
    cooldownUntil = cooldownDays ? addDays(now(), cooldownDays) : null;
    comfortableFrom = calcComfortableFrom(user, price);
    
    // Объединяем сроки: если срок рассчитывался через considerSavings, объединяем с рекомендацией по цене
    recommendedDays = getCombinedRecommendedDays(user, price, rules);
  }

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
    recommendedDays, // Сохраняем объединенный рекомендуемый срок
    similarityScore, // Скор семантической близости
    matchedBlacklistCategory, // Категория из черного списка, с которой совпала
    similarityExplanation, // Объяснение связи
    status
  });

  return purchase;
};

export const cancelPurchase = async (id) => {
  const purchase = await Purchase.findById(id);
  if (!purchase) return null;
  
  // Помечаем покупку как отмененную
  purchase.status = "canceled";
  await purchase.save();
  
  // Удаляем все уведомления, связанные с этой покупкой
  // Уведомления могут содержать один ID покупки или несколько через запятую
  const Notification = (await import("../models/Notification.js")).default;
  const purchaseIdStr = purchase._id.toString();
  
  // Находим все уведомления пользователя для проверки
  const userNotifications = await Notification.find({
    userId: purchase.userId
  });
  
  // Фильтруем уведомления, которые содержат ID отмененной покупки
  const notificationsToDelete = userNotifications.filter(notif => {
    const purchaseIds = notif.purchaseId.split(',').map(id => id.trim());
    return purchaseIds.includes(purchaseIdStr);
  });
  
  // Удаляем найденные уведомления
  if (notificationsToDelete.length > 0) {
    const idsToDelete = notificationsToDelete.map(n => n._id);
    await Notification.deleteMany({
      _id: { $in: idsToDelete }
    });
    console.log(`[PURCHASE] ✅ Deleted ${notificationsToDelete.length} notification(s) for canceled purchase ${id}`);
  }
  
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
    const user = await getUserProfile(purchase.userId);
    const finalCategory = useAiCategory || !category 
      ? await classifyCategory(title || purchase.title, description || url || "", user?.notificationSettings?.excludeCategories || [])
      : category;
    
    if (useAiCategory || !category) {
      purchase.aiCategory = finalCategory;
      purchase.category = finalCategory;
    } else {
      purchase.category = finalCategory;
      purchase.aiCategory = null;
    }

    // Перепроверяем blacklist с новой категорией
    if (user && finalCategory) {
      const defaultBlacklistMatched = checkBlacklistByText(finalCategory, title || purchase.title);
      const userExcludeCategories = user.notificationSettings?.excludeCategories || [];
      
      let similarityResult = null;
      let userBlacklistMatched = false;
      let similarityScore = null;
      let matchedBlacklistCategory = null;
      let similarityExplanation = null;

      if (userExcludeCategories.length > 0) {
        try {
          similarityResult = await checkAgainstBlacklist(finalCategory, userExcludeCategories);
          
          if (similarityResult.bestMatch) {
            userBlacklistMatched = true;
            similarityScore = similarityResult.bestMatch.similarity;
            matchedBlacklistCategory = similarityResult.bestMatch.category;
            similarityExplanation = similarityResult.bestMatch.explanation;
          }
        } catch (error) {
          console.error("Ошибка при проверке семантической близости категорий:", error);
          userBlacklistMatched = userExcludeCategories.some(cat => 
            finalCategory && finalCategory.toLowerCase().includes(cat.toLowerCase())
          );
        }
      }

      if (!userBlacklistMatched) {
        userBlacklistMatched = userExcludeCategories.some(cat => 
          finalCategory && finalCategory.toLowerCase().includes(cat.toLowerCase())
        );
      }

      purchase.blacklistMatched = !!defaultBlacklistMatched || userBlacklistMatched;
      purchase.blockedByCategory = purchase.blacklistMatched;
      purchase.similarityScore = similarityScore;
      purchase.matchedBlacklistCategory = matchedBlacklistCategory;
      purchase.similarityExplanation = similarityExplanation;
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
