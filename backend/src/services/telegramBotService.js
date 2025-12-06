import fetch from "node-fetch";
import User from "../models/User.js";
import { sendTelegramMessage } from "./telegramService.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = "https://api.telegram.org/bot";

let lastUpdateId = 0;
let pollingInterval = null;

/**
 * Обработка команды /start с userId
 * Формат: /start userId
 */
const handleStartCommand = async (chatId, userId, username, firstName) => {
  try {
    if (!userId) {
      await sendTelegramMessage(chatId, 
        "❌ Не указан ID пользователя.\n\n" +
        "Используйте команду:\n" +
        "<code>/start ваш_user_id</code>\n\n" +
        "Ваш User ID можно найти в настройках приложения."
      );
      return;
    }

    // Находим пользователя по userId
    const user = await User.findOne({ userId });
    
    if (!user) {
      await sendTelegramMessage(chatId,
        `❌ Пользователь с ID <code>${userId}</code> не найден.\n\n` +
        "Проверьте правильность ID и попробуйте снова."
      );
      return;
    }

    // Обновляем настройки пользователя
    await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          "notificationSettings.telegramSettings.chatId": String(chatId),
          "notificationSettings.telegramSettings.enabled": true,
          "notificationSettings.telegramSettings.username": username || null,
          "notificationSettings.telegramSettings.firstName": firstName || null
        }
      },
      { new: true }
    );

    // Включаем канал telegram в channels, если его там нет
    const userUpdated = await User.findOne({ userId });
    const currentChannels = userUpdated.notificationSettings?.channels || [];
    if (!currentChannels.includes("telegram")) {
      await User.findOneAndUpdate(
        { userId },
        {
          $set: {
            "notificationSettings.channels": [...currentChannels, "telegram"]
          }
        }
      );
    }

    await sendTelegramMessage(chatId,
      `✅ <b>Telegram успешно подключен!</b>\n\n` +
      `Пользователь: <code>${userId}</code>\n` +
      `Теперь вы будете получать уведомления о покупках из вишлиста.\n\n` +
      `Вы можете отключить уведомления в настройках приложения.`
    );

    console.log(`[TELEGRAM BOT] ✅ User ${userId} connected Telegram chat ${chatId}`);
  } catch (error) {
    console.error(`[TELEGRAM BOT] ❌ Error handling /start command:`, error);
    await sendTelegramMessage(chatId, 
      "❌ Произошла ошибка при подключении. Попробуйте позже."
    );
  }
};

/**
 * Обработка полученных обновлений от Telegram
 */
const processUpdates = async (updates) => {
  for (const update of updates) {
    if (update.message) {
      const { chat, text, from } = update.message;
      const chatId = chat.id;
      const username = from.username || null;
      const firstName = from.first_name || null;

      // Обработка команды /start
      if (text && text.startsWith("/start")) {
        const parts = text.split(" ");
        const userId = parts.length > 1 ? parts[1] : null;
        
        await handleStartCommand(chatId, userId, username, firstName);
      } else if (text && text.startsWith("/help")) {
        await sendTelegramMessage(chatId,
          "🤖 <b>Rational Assistant Bot</b>\n\n" +
          "<b>Команды:</b>\n" +
          "/start &lt;user_id&gt; - Подключить уведомления\n" +
          "/help - Показать справку\n\n" +
          "Для подключения уведомлений используйте команду /start с вашим User ID из приложения."
        );
      }
    }
  }
};

/**
 * Получение обновлений от Telegram (long polling)
 */
const getUpdates = async () => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return;
    }

    const url = `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.ok && data.result.length > 0) {
      await processUpdates(data.result);
      
      // Обновляем lastUpdateId до последнего обработанного update_id
      lastUpdateId = Math.max(...data.result.map(u => u.update_id));
    }
  } catch (error) {
    console.error("[TELEGRAM BOT] ❌ Error getting updates:", error.message);
  }
};

/**
 * Запуск polling для получения обновлений
 */
export const startTelegramBotPolling = () => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("[TELEGRAM BOT] ⚠️ Telegram Bot Token not configured. Bot polling disabled.");
    return;
  }

  if (pollingInterval) {
    console.log("[TELEGRAM BOT] Already running");
    return;
  }

  console.log("[TELEGRAM BOT] 🤖 Starting Telegram bot polling...");
  
  // Запускаем polling каждые 2 секунды
  pollingInterval = setInterval(getUpdates, 2000);
  
  // Первый запрос сразу
  getUpdates();
};

/**
 * Остановка polling
 */
export const stopTelegramBotPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("[TELEGRAM BOT] Stopped polling");
  }
};

/**
 * Получение информации о боте
 */
export const getBotInfo = async () => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return null;
    }

    const url = `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/getMe`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.ok) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error("[TELEGRAM BOT] ❌ Error getting bot info:", error.message);
    return null;
  }
};

