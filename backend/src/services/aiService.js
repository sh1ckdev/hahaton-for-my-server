import { callOpenRouter, isOpenRouterAvailable } from "./openRouterService.js";

// Кэш для результатов (чтобы не запрашивать одно и то же)
const categoryCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 час

// Проверяем доступность OpenRouter
const openRouterAvailable = isOpenRouterAvailable();
if (openRouterAvailable) {
  console.log("✅ OpenRouter доступен");
} else {
  console.log("⚠️ OpenRouter недоступен");
}

// Улучшенный fallback
const localFallback = (text) => {
  text = text.toLowerCase();

  const categories = [
    { patterns: [/казино|азарт|ставк|бет|деп.*кази|рулетк|покер|блэкджек|слот|игров.*автомат/], category: "азарт" },
    { patterns: [/playstation|xbox|steam|игра|game|nintendo/], category: "игры" },
    { patterns: [/телефон|смартфон|iphone|android/, /ноутбук|laptop|macbook/, /пк|компьютер|pc/], category: "техника" },
    { patterns: [/одежд|куртк|пальто|джинс|футболк|рубашк/], category: "одежда" },
    { patterns: [/подписк|netflix|spotify|яндекс.музык|кино|стрим/], category: "развлечения" },
    { patterns: [/поездк|авиабилет|отель|путешеств|тур|отпуск/], category: "путешествия" },
    { patterns: [/еда|ресторан|кафе|продукт|супермаркет|магазин/], category: "еда" },
    { patterns: [/транспорт|такси|бензин|заправк|автобус|метро/], category: "транспорт" },
  ];

  for (const { patterns, category } of categories) {
    if (patterns.some(pattern => pattern.test(text))) {
      return category;
    }
  }

  return "другое";
};

// Функция с ретраями для OpenRouter
async function callOpenRouterWithRetry(prompt, retries = 2, maxTokens = 200) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`Attempt ${attempt} to call OpenRouter...`);
      
      const completion = await callOpenRouter(
        [{ role: "user", content: prompt }],
        {
          maxTokens,
          temperature: 0.6,
          stream: false
        }
      );

      return completion;
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt <= retries) {
        // Ждем перед повторной попыткой (экспоненциальная backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// ---- NEW: AI генерация категорий blacklist ----

export const generateBlacklist = async (contextText = "") => {
  if (!openRouterAvailable) {
    console.log("⚠ AI недоступен — возвращаю fallback категории");
    return ["игры", "подписки", "фастфуд", "шмот", "онлайн покупки", "развлечения"];
  }

  const prompt = `
  Ты финансовый ассистент. Твоя задача — определить категории расходов пользователя, которые стоит ограничить для улучшения бюджета.
  
  === ДАННЫЕ О ПОЛЬЗОВАТЕЛЕ ===
  ${contextText}
  
  === ЗАДАЧА ===
  На основе данных выше выбери категории трат, которые у пользователя могут быть избыточными, импульсивными, несоразмерными доходу или не соответствуют его финансовым целям.
  
  === АНАЛИЗ ===
  1. ОБЯЗАТЕЛЬНО включи категории, которые пользователь сам отметил как:
     - "На что тратит больше всего" (если это необязательные траты)
     - "Импульсивные категории"
     - "Категории, мешающие целям"
  
  2. Учитывай финансовые цели:
     - Если цель требует накоплений → ограничь категории, которые мешают накоплениям
     - Если есть долги → приоритет категориям, которые можно сократить для погашения долгов
  
  3. Учитывай процент отложений:
     - Если процент низкий (< 10%) → больше категорий для ограничения
     - Если процент высокий (> 30%) → меньше категорий, только самые проблемные
  
  4. Если зарплата низкая относительно трат → больше категорий для ограничения
  
  === КАТЕГОРИИ (ориентируйся на них, можно перефразировать близко к смыслу) ===
  "Рестораны и кафе",
  "Фастфуд",
  "Кофе навынос",
  "Доставка еды",
  "Такси и каршеринг",
  "Подписки и сервисы",
  "Онлайн-шопинг",
  "Развлечения",
  "Игры и внутриигровые покупки",
  "Алкоголь и табак",
  "Электроника и гаджеты",
  "Одежда и аксессуары (брендовая)",
  "Красота и уход",
  "Путешествия",
  "Хобби (дорогостоящие)",
  "Криптовалюты и рисковые инвестиции",
  "Микрозаймы и проценты",
  "Премиум-связь или интернет",
  "Автокредит/лизинг"
  
  === ПРАВИЛА ===
  1. Используй только категории (строки).
  2. Минимум 7 категорий, если в данных есть хоть какая-то информация.
  3. Приоритет категориям, которые пользователь сам отметил как проблемные.
  4. Если данных мало — выбери самые вероятные категории для среднего пользователя.
  5. Если данных нет — верни [].
  6. Ответ строго в формате JSON массива строк, без пояснений и текста до/после.
  
  === ОТВЕТ (строго JSON) ===
  `
  

  try {
    const completion = await callOpenRouterWithRetry(prompt);

    let text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty AI response");

    // пробуем распарсить как JSON
    const clean = text.replace(/```json|```|\n/g,"");
    const list = JSON.parse(clean);

    if (Array.isArray(list) && list.length) return list;
    return ["игры","фастфуд","подписки"]; // fallback
  } catch {
    return ["игры","азарт","пицца","подписки","одежда"]; // fallback
  }
};

export const classifyCategory = async (title = "", description = "", excludeCategories = []) => {
  const text = `${title} ${description}`.trim();
  
  // Создаем ключ кэша с учетом запрещенных категорий
  const cacheKey = `${text.toLowerCase()}_${excludeCategories.sort().join(',')}`;
  const cached = categoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📚 Using cached category for: "${text.substring(0, 50)}..."`);
    return cached.category;
  }

  // Если нет OpenRouter, используем fallback
  if (!openRouterAvailable) {
    const category = localFallback(text);
    console.log(`🤖 Fallback category for "${text}": ${category}`);
    return category;
  }

  try {
    // Базовые категории (включая азартные игры)
    const baseCategories = ["игры", "азарт", "казино", "техника", "одежда", "развлечения", "путешествия", "другое"];
    
    // Объединяем базовые категории с запрещенными категориями пользователя
    const allCategories = [...new Set([...baseCategories, ...excludeCategories])];
    
    let prompt = `Определи категорию покупки по названию и описанию: "${text}"\n\n`;
    
    // Добавляем подсказки для распознавания азартных игр
    prompt += `ВАЖНО: Распознавание азартных игр:\n`;
    prompt += `- "казик", "казино", "деп в казино", "ставки", "бет", "рулетка", "покер", "слоты" → категория "азарт" или "казино"\n`;
    prompt += `- "игры" относится к видеоиграм (PlayStation, Xbox, Steam и т.д.)\n\n`;
    
    if (excludeCategories.length > 0) {
      prompt += `КРИТИЧЕСКИ ВАЖНО: У пользователя есть список запрещенных категорий, которые он контролирует:\n${excludeCategories.map(cat => `- "${cat}"`).join('\n')}\n\n`;
      prompt += `ПРАВИЛА КЛАССИФИКАЦИИ:\n`;
      prompt += `1. Если покупка относится к одной из запрещенных категорий (даже частично) - ОБЯЗАТЕЛЬНО верни ТОЧНОЕ название этой категории из списка выше.\n`;
      prompt += `2. Например, если в запрещенных есть "пицца" или "фастфуд", а покупка - "пицца пепперони", верни "пицца" (если это точное совпадение) или соответствующую запрещенную категорию.\n`;
      prompt += `3. Если покупка не относится к запрещенным категориям, выбери из базовых категорий.\n\n`;
    }
    
    prompt += `Доступные категории для выбора:\n`;
    if (excludeCategories.length > 0) {
      prompt += `Запрещенные (приоритет): ${excludeCategories.join(', ')}\n`;
      prompt += `Базовые: ${baseCategories.join(', ')}\n`;
    } else {
      prompt += `${allCategories.join(', ')}\n`;
    }
    prompt += `\nВерни ТОЛЬКО одно слово - название категории из списка выше, без дополнительных пояснений.`;

    console.log(`📤 Requesting AI classification for: "${text.substring(0, 100)}..." ${excludeCategories.length > 0 ? `(with ${excludeCategories.length} excluded categories)` : ''}`);

    const completion = await callOpenRouterWithRetry(prompt);
    
    const out = completion?.choices?.[0]?.message?.content?.trim()?.toLowerCase();
    
    if (!out) {
      throw new Error("Empty response from AI");
    }

    // Валидация: проверяем сначала в запрещенных категориях, потом в базовых
    let category;
    const matchedExcluded = excludeCategories.find(cat => 
      out.includes(cat.toLowerCase()) || cat.toLowerCase().includes(out)
    );
    
    if (matchedExcluded) {
      category = matchedExcluded;
    } else if (allCategories.some(cat => cat.toLowerCase() === out)) {
      category = out;
    } else {
      // Если не нашли точное совпадение, пробуем найти похожую категорию
      const found = allCategories.find(cat => 
        cat.toLowerCase().includes(out) || out.includes(cat.toLowerCase())
      );
      category = found || localFallback(text);
    }
    
    // Сохраняем в кэш
    categoryCache.set(cacheKey, {
      category,
      timestamp: Date.now()
    });
    
    // Очистка старых записей в кэше
    if (categoryCache.size > 1000) {
      const oldestKey = categoryCache.keys().next().value;
      categoryCache.delete(oldestKey);
    }
    
    console.log(`✅ Category: "${text}" → ${category} ${excludeCategories.includes(category) ? '(запрещенная категория)' : ''}`);
    return category;

  } catch (err) {
    console.error(`❌ AI failed for "${text}":`, err.message);
    
    const fallbackCategory = localFallback(text);
    console.log(`🔄 Using fallback: ${fallbackCategory}`);
    
    return fallbackCategory;
  }
};

// Генерация AI совета для подтверждения покупки
// goalsWithShift - массив целей с информацией о сдвиге: [{title, price, shiftDays}, ...]
export const generatePurchaseConfirmationAdvice = async (user, purchase, goalsWithShift = []) => {
  if (!openRouterAvailable) {
    // Fallback без AI
    const category = purchase.aiCategory || purchase.category || "";
    let fallbackText = `СТОП! Пожалуйста, подумай дважды!\n\nТы собираешься купить "${purchase.title}" за ${purchase.price}₽`;
    if (category) {
      fallbackText += ` в категории "${category}"`;
    }
    if (user.salary && user.salary > 0) {
      const salaryPercentage = ((purchase.price / user.salary) * 100).toFixed(0);
      fallbackText += `. Это составляет ${salaryPercentage}% от твоей месячной зарплаты - это ОЧЕНЬ МНОГО!`;
    }
    if (goalsWithShift.length > 0) {
      fallbackText += `\n\n⚠️ ВНИМАНИЕ: Эта покупка отложит твои важные цели:`;
      goalsWithShift.forEach(goal => {
        fallbackText += `\n• "${goal.title}" отложится на ${goal.shiftDays} дней`;
      });
      fallbackText += `\n\nПожалуйста, добавь эту покупку в вишлист и подумай несколько дней. Это мудрое решение!`;
    } else {
      fallbackText += `\n\nЛучше добавь это в вишлист и обдумай покупку несколько дней.`;
    }
    return fallbackText;
  }

  try {
    let context = `Пользователь получил транзакцию на покупку "${purchase.title}" стоимостью ${purchase.price}₽.`;
    
    // Определяем категорию (приоритет AI категории, затем обычной)
    const category = purchase.aiCategory || purchase.category;
    if (category) {
      context += ` Категория покупки: ${category}.`;
    }
    
    if (purchase.description) {
      context += ` Описание: ${purchase.description}.`;
    }

    if (goalsWithShift.length > 0) {
      context += `\n\nУ пользователя есть финансовые цели, которые пострадают от этой покупки (чем меньше число приоритета, тем важнее цель):`;
      goalsWithShift.forEach(goal => {
        context += `\n- "${goal.title}" (${goal.price}₽, приоритет ${goal.priority}) - сдвинется на ${goal.shiftDays} дней`;
      });
    }

    if (user.salary) {
      const salaryPercentage = ((purchase.price / user.salary) * 100).toFixed(0);
      context += `\n\nЗарплата пользователя: ${user.salary}₽/месяц. Покупка составляет ${salaryPercentage}% от месячного дохода.`;
    }

    if (user.currentSavings) {
      context += ` Текущие накопления: ${user.currentSavings}₽.`;
    }

    const prompt = `Ты финансовый ассистент-защитник, который УБЕДИТЕЛЬНО отговаривает от неразумных трат. Твоя задача - СДЕРЖАТЬ пользователя от импульсивной покупки.

${context}

ВАЖНО: Сгенерируй УМОЛЯЮЩИЙ, ЭМОЦИОНАЛЬНЫЙ и УБЕДИТЕЛЬНЫЙ совет на русском языке (3-5 предложений), который заставит пользователя ПЕРЕДУМАТЬ. Используй следующие техники:

1. ОБЯЗАТЕЛЬНО упомяни категорию покупки и процент от зарплаты - это ключевые факторы
2. ПОДЧЕРКНИ критичность ситуации: если покупка большая относительно зарплаты (>20%) - говори что это ОЧЕНЬ СЕРЬЕЗНО
3. Если есть цели с высоким приоритетом - УПОМИНАЙ их ПЕРВЫМИ и говори СКОЛЬКО ДНЕЙ отложится цель
4. Используй ЭМОЦИОНАЛЬНЫЕ фразы: "Пожалуйста, остановись", "Это отложит твою мечту на X дней", "Ты уверен, что это стоит отложить важную цель?", "Представь, как ты пожалеешь через месяц"
5. ПРЕДЛАГАЙ альтернативу: "Лучше добавь в вишлист, обдумай несколько дней"
6. Будь НАСТОЙЧИВЫМ, но не грубым - ты заботишься о финансовом благополучии пользователя

Если сдвиг цели очень большой (сотни дней) - ОБЯЗАТЕЛЬНО подчеркни, что это катастрофический срок.

Не используй markdown разметку, только обычный текст. Пиши так, как будто ты умоляешь близкого друга не совершать ошибку.`;

    const completion = await callOpenRouterWithRetry(prompt, 2, 400);
    const advice = completion?.choices?.[0]?.message?.content?.trim();
    
    return advice || generatePurchaseConfirmationAdvice(user, purchase, goalsWithShift); // рекурсивный fallback
  } catch (err) {
    console.error("❌ AI advice generation failed:", err.message);
    // Fallback
    const category = purchase.aiCategory || purchase.category || "";
    let fallbackText = `СТОП! Пожалуйста, подумай дважды!\n\nТы собираешься купить "${purchase.title}" за ${purchase.price}₽`;
    if (category) {
      fallbackText += ` в категории "${category}"`;
    }
    if (user.salary && user.salary > 0) {
      const salaryPercentage = ((purchase.price / user.salary) * 100).toFixed(0);
      fallbackText += `. Это составляет ${salaryPercentage}% от твоей месячной зарплаты - это ОЧЕНЬ МНОГО!`;
    }
    if (goalsWithShift.length > 0) {
      fallbackText += `\n\n⚠️ ВНИМАНИЕ: Эта покупка отложит твои важные цели:`;
      goalsWithShift.forEach(goal => {
        fallbackText += `\n• "${goal.title}" отложится на ${goal.shiftDays} дней`;
      });
      fallbackText += `\n\nПожалуйста, добавь эту покупку в вишлист и подумай несколько дней. Это мудрое решение!`;
    } else {
      fallbackText += `\n\nЛучше добавь это в вишлист и обдумай покупку несколько дней.`;
    }
    return fallbackText;
  }
};
