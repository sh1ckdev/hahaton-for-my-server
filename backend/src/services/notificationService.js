import Purchase from "../models/Purchase.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { isDateInPast } from "../utils/cooldownCalc.js";
import { now } from "../utils/date.js";
import { sendPurchaseNotification as sendEmailNotification } from "./emailService.js";
import { sendPurchaseNotification as sendTelegramNotification } from "./telegramService.js";

// Частота запуска планировщика.
// Для продакшена можно поставить, например, раз в 5–15 минут.
// Для демо/UI‑проверки используем 5 секунд.
const SCHEDULE_MS = 1000 * 5;

export const checkAndCreateNotifications = async () => {
  console.log(`[NOTIFY] 🔄 Starting notification check at ${new Date().toISOString()}`);
  const users = await User.find({});
  const current = now();
  console.log(`[NOTIFY] 👥 Found ${users.length} users in database`);

  for (const user of users) {
    console.log(`[NOTIFY] 👤 Processing user ${user.userId}`);
    const settings = user.notificationSettings || {};
    const { frequency, customFrequencyMs, excludeCategories, excludePurchaseIds, channels, channel } = settings;
    
    // ВАЖНО: Сначала проверяем, включены ли у пользователя уведомления в принципе
    // Обратная совместимость: если есть старое поле channel, используем его
    const activeChannels = channels && channels.length > 0 ? channels : (channel ? [channel] : []);
    
    // Если у пользователя нет ни одного включенного канала - пропускаем его полностью
    if (!activeChannels || activeChannels.length === 0) {
      console.log(`[NOTIFY] ⏭️ Skipping user ${user.userId} - no channels enabled`);
      continue;
    }
    
    // Проверяем наличие частоты - если нет, пропускаем
    if (!frequency) {
      console.log(`[NOTIFY] ⏭️ Skipping user ${user.userId} - no frequency configured`);
      continue;
    }

    const query = {
      userId: user.userId,
      status: "planned", // Только запланированные покупки (не отмененные и не купленные)
      blockedByCategory: { $ne: true },
      category: { $nin: excludeCategories || [] }
    };
    
    // Исключаем конкретные покупки, если указаны
    if (excludePurchaseIds && excludePurchaseIds.length > 0) {
      const mongoose = (await import("mongoose")).default;
      query._id = { $nin: excludePurchaseIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    const purchases = await Purchase.find(query);
    
    if (purchases.length === 0) {
      console.log(`[NOTIFY] ⚠️ No purchases found for user ${user.userId}`);
      continue;
    } else {
      console.log(`[NOTIFY] 🔍 Found ${purchases.length} purchases for user ${user.userId}`);
    }

    // Собираем покупки, которые нужно уведомить
    const purchasesToNotify = [];
    
    for (const p of purchases) {
      // 🔕 Индивидуальное исключение: если пользователь явно отключил уведомления для этой покупки
      // null/undefined = применяем глобальные настройки (по умолчанию)
      // false = пользователь явно отключил для этой покупки
      // true = включено индивидуально (может использовать свой notifyEveryDays)
      if (p.notifyEnabled === false) {
        console.log(`[NOTIFY] ⏭️ Skipping purchase "${p.title}" - notifyEnabled=false`);
        continue;
      }

      // не напоминаем слишком часто — по частоте
      if (p.lastNotifiedAt) {
        const diff = current.getTime() - new Date(p.lastNotifiedAt).getTime();
        const dayMs = 86400000;
        let minIntervalMs;
        
        // Приоритет: сначала индивидуальная настройка покупки, потом глобальная
        if (p.notifyEnabled === true && p.notifyEveryDays) {
          // Если у покупки задан индивидуальный интервал в днях, используем его
          minIntervalMs = p.notifyEveryDays * dayMs;
          console.log(`[NOTIFY] 📅 Purchase "${p.title}" using individual interval: ${p.notifyEveryDays} days (${minIntervalMs}ms)`);
        } else if (frequency === "custom" && customFrequencyMs && customFrequencyMs > 0) {
          // Глобальная настройка: кастомная частота
          minIntervalMs = customFrequencyMs;
          console.log(`[NOTIFY] ⚙️ Purchase "${p.title}" using global custom interval: ${customFrequencyMs}ms`);
        } else if (frequency === "daily") {
          minIntervalMs = dayMs;
        } else if (frequency === "weekly") {
          minIntervalMs = 7 * dayMs;
        } else if (frequency === "monthly") {
          minIntervalMs = 30 * dayMs;
        } else {
          minIntervalMs = 7 * dayMs; // default weekly
        }
        
        if (diff < minIntervalMs) {
          const remainingMs = minIntervalMs - diff;
          const remainingSec = Math.round(remainingMs / 1000);
          console.log(`[NOTIFY] ⏳ Skipping purchase "${p.title}" - interval not passed (${remainingSec}s remaining, last notified: ${p.lastNotifiedAt})`);
          continue;
        } else {
          console.log(`[NOTIFY] ✅ Interval passed for purchase "${p.title}" (${Math.round(diff / 1000)}s since last notification)`);
        }
      } else {
        console.log(`[NOTIFY] 🆕 Purchase "${p.title}" - no previous notification, can send`);
      }

      // спрашиваем только, если период охлаждения прошёл
      // ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ТЕСТИРОВАНИЯ - раскомментируй для продакшена
      // const cooldownOk = !p.cooldownUntil || isDateInPast(p.cooldownUntil);
      // if (!cooldownOk) {
      //   console.log(`[NOTIFY] ⏭️ Skipping purchase "${p.title}" - cooldown not passed (until ${p.cooldownUntil})`);
      //   continue;
      // }
      
      // ВРЕМЕННО: пропускаем проверку cooldown для тестирования
      const cooldownOk = true; // Всегда true для тестирования
      if (p.cooldownUntil && !isDateInPast(p.cooldownUntil)) {
        console.log(`[NOTIFY] ⚠️ WARNING: Purchase "${p.title}" cooldown not passed (until ${p.cooldownUntil}), but creating notification anyway for testing`);
      }

      // Добавляем покупку в список для уведомления
      purchasesToNotify.push(p);
    }

    // Если есть покупки для уведомления, создаем объединенное уведомление
    if (purchasesToNotify.length > 0) {
      // Формируем объединенное сообщение
      let message;
      if (purchasesToNotify.length === 1) {
        // Если одна покупка - простое сообщение
        const p = purchasesToNotify[0];
        message = `Ты всё ещё хочешь купить "${p.title}" за ${p.price}₽?`;
      } else {
        // Если несколько покупок - объединенное сообщение
        const purchasesList = purchasesToNotify.map((p, idx) => 
          `${idx + 1}. "${p.title}" за ${p.price}₽`
        ).join('\n');
        message = `Ты всё ещё хочешь купить эти товары?\n\n${purchasesList}\n\nПожалуйста, подумай о необходимости каждой покупки.`;
      }

      // Создаем одно объединенное уведомление для всех покупок
      const purchaseIds = purchasesToNotify.map(p => p._id.toString());
      const notification = await Notification.create({
        userId: user.userId,
        purchaseId: purchaseIds.join(','), // Сохраняем все ID через запятую
        message
      });

      // Обновляем lastNotifiedAt для всех покупок
      for (const p of purchasesToNotify) {
        p.lastNotifiedAt = current;
        await p.save();
      }

      // Отправка уведомлений через включенные каналы
      const emailSettings = settings.emailSettings || {};
      const telegramSettings = settings.telegramSettings || {};

      // Отправка в Email
      if (activeChannels.includes("email") && emailSettings.enabled && emailSettings.email) {
        try {
          // Отправляем объединенное уведомление
          const frontendUrl = process.env.FRONTEND_URL;
          
          if (!frontendUrl) {
            console.error("❌ FRONTEND_URL не установлен в переменных окружения!");
            throw new Error("FRONTEND_URL is not configured");
          }
          const cleanUrl = frontendUrl.replace(/\/+$/, '');
          const wishlistUrl = `${cleanUrl}/wishlist`;
          const emailMessage = purchasesToNotify.length === 1 
            ? message 
            : `${message}\n\nОткрой вишлист: ${wishlistUrl}`;
          await sendEmailNotification(emailSettings.email, purchasesToNotify[0], emailMessage);
        } catch (error) {
          console.error(`[NOTIFY] ❌ Failed to send email notification:`, error.message);
        }
      }

      // Отправка в Telegram
      if (activeChannels.includes("telegram") && telegramSettings.enabled && telegramSettings.chatId) {
        try {
          await sendTelegramNotification(telegramSettings.chatId, purchasesToNotify[0], message);
        } catch (error) {
          console.error(`[NOTIFY] ❌ Failed to send telegram notification:`, error.message);
        }
      }

      console.log(`[NOTIFY] ✅ Created combined notification for user=${user.userId}, purchases=${purchasesToNotify.length}, notificationId=${notification._id}`);
    }
  }
};

let timer = null;

export const startNotificationScheduler = () => {
  if (timer) return;
  timer = setInterval(checkAndCreateNotifications, SCHEDULE_MS);
  console.log("Notification scheduler started");
};
