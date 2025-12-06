import fetch from "node-fetch";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = "https://api.telegram.org/bot";

/**
 * Отправка сообщения в Telegram
 * @param {string} chatId - ID чата или username
 * @param {string} message - Текст сообщения
 * @param {Object} options - Дополнительные опции (parse_mode, reply_markup и т.д.)
 * @returns {Promise<boolean>} - true если отправлено успешно
 */
export const sendTelegramMessage = async (chatId, message, options = {}) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("[TELEGRAM] ⚠️ Telegram Bot Token not configured. Telegram notifications will be disabled.");
      return false;
    }

    if (!chatId) {
      console.log("[TELEGRAM] ⏭️ Skipping telegram message - no chatId provided");
      return false;
    }

    const url = `${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      ...options
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (data.ok) {
      console.log(`[TELEGRAM] ✅ Message sent successfully to chat ${chatId}`);
      return true;
    } else {
      console.error(`[TELEGRAM] ❌ Failed to send message to chat ${chatId}:`, data.description);
      console.error(`[TELEGRAM] ❌ Full error response:`, JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error(`[TELEGRAM] ❌ Error sending telegram message to ${chatId}:`, error.message);
    return false;
  }
};

/**
 * Отправка уведомления о покупке в вишлисте
 * @param {string} chatId - ID чата или username получателя
 * @param {Object} purchase - Объект покупки
 * @returns {Promise<boolean>}
 */
export const sendPurchaseNotification = async (chatId, purchase) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  // Убираем trailing slash если есть
  const cleanUrl = frontendUrl.replace(/\/+$/, '');
  const wishlistUrl = `${cleanUrl}/wishlist`;
  
  console.log(`[TELEGRAM] 📱 Preparing notification for purchase "${purchase.title}" to chat ${chatId}`);
  console.log(`[TELEGRAM] 🔗 Frontend URL from env: ${frontendUrl}`);
  console.log(`[TELEGRAM] 🔗 Wishlist URL: ${wishlistUrl}`);
  
  // Проверяем, является ли URL localhost или недействительным для Telegram
  const isLocalhost = wishlistUrl.includes('localhost') || wishlistUrl.includes('127.0.0.1') || !wishlistUrl.startsWith('http');
  
  // Валидируем, что URL начинается с http:// или https:// для Telegram
  const isValidTelegramUrl = wishlistUrl.startsWith('http://') || wishlistUrl.startsWith('https://');
  const canUseButton = !isLocalhost && isValidTelegramUrl;
  
  console.log(`[TELEGRAM] 🔍 isLocalhost: ${isLocalhost}, isValidTelegramUrl: ${isValidTelegramUrl}, canUseButton: ${canUseButton}`);
  
  let message = `🔔 <b>Напоминание о покупке</b>\n\n` +
    `Ты всё ещё хочешь купить <b>"${purchase.title}"</b> за <b>${purchase.price.toLocaleString('ru-RU')}₽</b>?\n\n`;
  
  // Если localhost или невалидный URL, добавляем ссылку в текст сообщения
  if (isLocalhost || !canUseButton) {
    message += `📋 Открой вишлист: <a href="${wishlistUrl}">${wishlistUrl}</a>\n\n`;
  }
  
  // Если есть URL товара
  if (purchase.url) {
    const isProductUrlValid = purchase.url.startsWith('http://') || purchase.url.startsWith('https://');
    if (isProductUrlValid) {
      if (canUseButton) {
        message += `🛒 <a href="${purchase.url}">Перейти к товару</a>`;
      } else {
        message += `🛒 Товар: <a href="${purchase.url}">${purchase.url}</a>`;
      }
    } else {
      message += `🛒 Товар: ${purchase.url}`;
    }
  }
  
  // Кнопки через inline keyboard только если URL валидный
  let options = {};
  
  if (canUseButton) {
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "📋 Открыть вишлист",
            url: wishlistUrl
          }
        ]
      ]
    };
    
    // Добавляем кнопку товара если есть и она валидна
    if (purchase.url && (purchase.url.startsWith('http://') || purchase.url.startsWith('https://'))) {
      replyMarkup.inline_keyboard[0].push({
        text: "🛒 Перейти к товару",
        url: purchase.url
      });
    }
    
    console.log(`[TELEGRAM] ⌨️ Creating inline keyboard:`, JSON.stringify(replyMarkup, null, 2));
    options.reply_markup = replyMarkup;
  } else {
    console.log(`[TELEGRAM] ⚠️ Skipping inline keyboard (localhost or invalid URL)`);
  }
  
  return await sendTelegramMessage(chatId, message, options);
};

/**
 * Получение информации о боте (для проверки конфигурации)
 * @returns {Promise<Object|null>}
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
    console.error("[TELEGRAM] ❌ Error getting bot info:", error.message);
    return null;
  }
};

