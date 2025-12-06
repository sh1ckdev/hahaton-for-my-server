import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath });

// Настройки OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.trim();

// Логируем, что загружено
if (OPENROUTER_API_KEY) {
  console.log(`🔑 OPENROUTER_API_KEY загружен (длина: ${OPENROUTER_API_KEY.length})`);
} else {
  console.warn("⚠️ OPENROUTER_API_KEY не найден в .env");
}

if (OPENROUTER_MODEL) {
  console.log(`🤖 OPENROUTER_MODEL: ${OPENROUTER_MODEL}`);
} else {
  console.warn("⚠️ OPENROUTER_MODEL не найден в .env");
}

/**
 * Отправляет запрос на генерацию через OpenRouter API
 */
export async function callOpenRouter(messages, options = {}) {
  const {
    maxTokens = 200,
    temperature = 0.6,
    model = OPENROUTER_MODEL,
    stream = false
  } = options;

  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY не установлен в .env");
  }

  if (!model) {
    throw new Error("OPENROUTER_MODEL не установлен в .env");
  }

  try {
    console.log(`🌐 Отправка запроса на OpenRouter`);
    console.log(`📝 Модель: ${model}, сообщений: ${messages.length}`);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://github.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Financial Assistant"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: stream
      })
    });

    console.log(`📡 Статус ответа: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      
      // Более понятные сообщения об ошибках
      if (response.status === 401) {
        throw new Error(`Ошибка аутентификации: ${errorData.error?.message || errorText}. Проверьте правильность OPENROUTER_API_KEY в .env. Получите ключ на https://openrouter.ai/keys`);
      }
      
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Ответ получен от OpenRouter`);
    return data;
  } catch (error) {
    console.error("❌ Ошибка вызова OpenRouter:", error.message);
    throw error;
  }
}

/**
 * Проверяет, доступен ли OpenRouter (есть ли API ключ и модель)
 */
export function isOpenRouterAvailable() {
  return !!(OPENROUTER_API_KEY && OPENROUTER_MODEL);
}

