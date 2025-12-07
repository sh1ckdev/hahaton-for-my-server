import { callOpenRouter, isOpenRouterAvailable } from "./openRouterService.js";
import { renderPrompt, getPromptByKey } from "./promptService.js";

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

// Полный список доступных категорий для классификации
const AVAILABLE_CATEGORIES = [
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
  "Одежда и аксессуары",
  "Красота и уход",
  "Путешествия",
  "Хобби",
  "Азарт",
  "Казино",
  "Техника",
  "Другое"
];

// Улучшенный fallback
const localFallback = (text) => {
  text = text.toLowerCase();

  const categories = [
    { patterns: [/казино|азарт|ставк|бет|деп.*кази|рулетк|покер|блэкджек|слот|игров.*автомат/], category: "Азарт" },
    { patterns: [/playstation|xbox|steam|игра|game|nintendo|видеоигр/], category: "Игры и внутриигровые покупки" },
    { patterns: [/телефон|смартфон|iphone|android|ноутбук|laptop|macbook|пк|компьютер|pc|техник|гаджет/], category: "Электроника и гаджеты" },
    { patterns: [/одежд|куртк|пальто|джинс|футболк|рубашк|аксессуар/], category: "Одежда и аксессуары" },
    { patterns: [/подписк|netflix|spotify|яндекс.музык|кино|стрим|сервис/], category: "Подписки и сервисы" },
    { patterns: [/поездк|авиабилет|отель|путешеств|тур|отпуск/], category: "Путешествия" },
    { patterns: [/пицц|суши|бургер|шаурм|ролл|доставк.*ед|ед.*на.*дом|доставк.*пицц/], category: "Доставка еды" },
    { patterns: [/ресторан|кафе|обед.*ресторан|ужин.*кафе|поход.*ресторан/], category: "Рестораны и кафе" },
    { patterns: [/макдональдс|kfc|бургер.*кинг|фастфуд|быстр.*ед/], category: "Фастфуд" },
    { patterns: [/кофе|starbucks|кофейн/], category: "Кофе навынос" },
    { patterns: [/такси|каршеринг|транспорт|бензин|заправк|автобус|метро/], category: "Такси и каршеринг" },
    { patterns: [/развлечен|кино|концерт|театр|клуб/], category: "Развлечения" },
  ];

  for (const { patterns, category } of categories) {
    if (patterns.some(pattern => pattern.test(text))) {
      return category;
    }
  }

  return "Другое";
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

  // Пытаемся загрузить промпт из БД, если не найден - используем дефолтный
  let prompt;
  try {
    prompt = await renderPrompt("generateBlacklist", { contextText });
    console.log("✅ Using prompt from DB: generateBlacklist");
  } catch (error) {
    console.log("⚠ Prompt not found in DB, using default:", error.message);
    // Fallback на дефолтный промпт
    prompt = `
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
  `;
  }

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
    // Объединяем полный список категорий с запрещенными категориями пользователя
    const allCategories = [...new Set([...AVAILABLE_CATEGORIES, ...excludeCategories])];
    
    // Формируем секцию для запрещенных категорий
    let excludeCategoriesSection = "";
    if (excludeCategories.length > 0) {
      excludeCategoriesSection = `КРИТИЧЕСКИ ВАЖНО: У пользователя есть список запрещенных категорий, которые он контролирует:\n${excludeCategories.map(cat => `- "${cat}"`).join('\n')}\n\nПРАВИЛА КЛАССИФИКАЦИИ:\n1. Если покупка относится к одной из запрещенных категорий (даже частично) - ОБЯЗАТЕЛЬНО верни ТОЧНОЕ название этой категории из списка выше.\n2. Например, если в запрещенных есть "Доставка еды" или "Фастфуд", а покупка - "пицца пепперони", верни соответствующую запрещенную категорию.\n3. Если покупка не относится к запрещенным категориям, выбери из доступных категорий ниже.\n\n`;
    }
    
    // Формируем список доступных категорий
    let availableCategories = "";
    if (excludeCategories.length > 0) {
      availableCategories = `Запрещенные (приоритет): ${excludeCategories.join(', ')}\nДоступные: ${AVAILABLE_CATEGORIES.join(', ')}`;
    } else {
      availableCategories = AVAILABLE_CATEGORIES.join(', ');
    }
    
    // Пытаемся загрузить промпт из БД
    let prompt;
    try {
      prompt = await renderPrompt("classifyCategory", {
        text,
        excludeCategoriesSection,
        availableCategories
      });
      console.log("✅ Using prompt from DB: classifyCategory");
    } catch (error) {
      console.log("⚠ Prompt not found in DB, using default:", error.message);
      // Fallback на дефолтный промпт
      prompt = `Определи категорию покупки по названию и описанию: "${text}"

ВАЖНО: Распознавание азартных игр:
- "казик", "казино", "деп в казино", "ставки", "бет", "рулетка", "покер", "слоты" → категория "Азарт" или "Казино"
- "игры" относится к видеоиграм (PlayStation, Xbox, Steam и т.д.) → категория "Игры и внутриигровые покупки"

ВАЖНО: Распознавание еды и ресторанов:
- "пицца", "суши", "бургер", "шаурма", "роллы", "доставка еды", "еда на дом" → категория "Доставка еды"
- "ресторан", "кафе", "обед в ресторане", "ужин в кафе" → категория "Рестораны и кафе"
- "макдональдс", "kfc", "бургер кинг", "фастфуд" → категория "Фастфуд"
- "кофе", "кофе навынос", "стаarbucks" → категория "Кофе навынос"

${excludeCategoriesSection}Доступные категории для выбора:
${availableCategories}

Верни ТОЛЬКО одно слово - название категории из списка выше, без дополнительных пояснений.`;
    }

    console.log(`📤 Requesting AI classification for: "${text.substring(0, 100)}..." ${excludeCategories.length > 0 ? `(with ${excludeCategories.length} excluded categories)` : ''}`);

    const completion = await callOpenRouterWithRetry(prompt);
    
    const out = completion?.choices?.[0]?.message?.content?.trim()?.toLowerCase();
    
    if (!out) {
      throw new Error("Empty response from AI");
    }

    // Валидация: проверяем сначала в запрещенных категориях, потом в доступных
    let category;
    const matchedExcluded = excludeCategories.find(cat => 
      out.includes(cat.toLowerCase()) || cat.toLowerCase().includes(out)
    );
    
    if (matchedExcluded) {
      category = matchedExcluded;
    } else {
      // Ищем точное совпадение (без учета регистра)
      const exactMatch = allCategories.find(cat => 
        cat.toLowerCase() === out
      );
      
      if (exactMatch) {
        category = exactMatch;
      } else {
        // Если не нашли точное совпадение, пробуем найти похожую категорию
        const found = allCategories.find(cat => 
          cat.toLowerCase().includes(out) || out.includes(cat.toLowerCase())
        );
        category = found || localFallback(text);
      }
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
  // Если категория в черном списке - явно рекомендуем не покупать и заканчиваем сценарий
  if (purchase.blockedByCategory || purchase.blacklistMatched) {
    const category = purchase.aiCategory || purchase.category || "";
    const matchedCategory = purchase.matchedBlacklistCategory || "";
    const explanation = purchase.similarityExplanation || "";
    const similarityScore = purchase.similarityScore;
    
    let message = `СТОП! Я НЕ РЕКОМЕНДУЮ совершать эту покупку.\n\n`;
    message += `Покупка "${purchase.title}" за ${purchase.price}₽ относится к категории "${category}"`;
    
    if (matchedCategory && matchedCategory !== category) {
      message += `, которая связана с категорией "${matchedCategory}" из твоего черного списка`;
      if (similarityScore !== null) {
        message += ` (близость: ${Math.round(similarityScore * 100)}%)`;
      }
      if (explanation) {
        message += `.\n\n${explanation}`;
      }
    } else {
      message += `, которая находится в твоем списке запрещенных категорий`;
    }
    
    message += `\n\nТы сам добавил эту категорию в blacklist для контроля своих трат. Пожалуйста, не совершай эту покупку - это противоречит твоим финансовым целям.\n\nСценарий коммуникации завершен.`;
    
    return message;
  }

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
      // Дедупликация целей по _id, чтобы избежать дубликатов
      const uniqueGoals = goalsWithShift.reduce((acc, goal) => {
        const existing = acc.find(g => g._id?.toString() === goal._id?.toString());
        if (!existing) {
          acc.push(goal);
        }
        return acc;
      }, []);
      
      fallbackText += `\n\n⚠️ ВНИМАНИЕ: Эта покупка отложит твои важные цели:`;
      uniqueGoals.forEach(goal => {
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
      // Дедупликация целей по _id, чтобы избежать дубликатов в контексте для AI
      const uniqueGoals = goalsWithShift.reduce((acc, goal) => {
        const existing = acc.find(g => g._id?.toString() === goal._id?.toString());
        if (!existing) {
          acc.push(goal);
        }
        return acc;
      }, []);
      
      context += `\n\nУ пользователя есть финансовые цели, которые пострадают от этой покупки (чем меньше число приоритета, тем важнее цель):`;
      uniqueGoals.forEach(goal => {
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

    // Добавляем информацию о долгах/кредитах
    if (user.extendedProfile?.hasDebts) {
      context += `\n\n⚠️ ВАЖНО: У пользователя есть кредиты или долги. Это означает, что любые дополнительные траты усугубляют финансовое положение. Нужно быть ОСОБЕННО настойчивым в отговоре от покупки.`;
    }

    // Добавляем информацию о рекомендуемых днях ожидания
    if (purchase.recommendedDays && purchase.recommendedDays > 0) {
      context += `\n\nРекомендуется подумать над покупкой ${purchase.recommendedDays} дней перед совершением.`;
    }

    // Пытаемся загрузить промпт из БД
    let prompt;
    try {
      prompt = await renderPrompt("generatePurchaseAdvice", { context });
      console.log("✅ Using prompt from DB: generatePurchaseAdvice");
    } catch (error) {
      console.log("⚠ Prompt not found in DB, using default:", error.message);
      // Fallback на дефолтный промпт
      prompt = `Ты финансовый ассистент-защитник, который УБЕДИТЕЛЬНО отговаривает от неразумных трат. Твоя задача - СДЕРЖАТЬ пользователя от импульсивной покупки.

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
    }

    const completion = await callOpenRouterWithRetry(prompt, 2, 400);
    const advice = completion?.choices?.[0]?.message?.content?.trim();
    
    // Если AI вернул валидный ответ, используем его
    if (advice && advice.length > 0) {
      return advice;
    }
    
    // Если AI вернул пустой ответ, используем fallback (не рекурсивно!)
    console.warn("⚠️ AI вернул пустой ответ, используем fallback");
    throw new Error("Empty AI response");
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
      // Дедупликация целей по _id, чтобы избежать дубликатов
      const uniqueGoals = goalsWithShift.reduce((acc, goal) => {
        const existing = acc.find(g => g._id?.toString() === goal._id?.toString());
        if (!existing) {
          acc.push(goal);
        }
        return acc;
      }, []);
      
      fallbackText += `\n\n⚠️ ВНИМАНИЕ: Эта покупка отложит твои важные цели:`;
      uniqueGoals.forEach(goal => {
        fallbackText += `\n• "${goal.title}" отложится на ${goal.shiftDays} дней`;
      });
      fallbackText += `\n\nПожалуйста, добавь эту покупку в вишлист и подумай несколько дней. Это мудрое решение!`;
    } else {
      fallbackText += `\n\nЛучше добавь это в вишлист и обдумай покупку несколько дней.`;
    }
    return fallbackText;
  }
};

// Парсинг профиля пользователя из текста через чат-бот
export const parseUserProfile = async (conversationHistory = [], currentMessage = "") => {
  if (!openRouterAvailable) {
    console.log("⚠ AI недоступен для парсинга профиля");
    return {
      reply: "К сожалению, AI сервис недоступен. Пожалуйста, используй форму заполнения профиля.",
      isProfileComplete: false,
      parsedProfile: null
    };
  }

  try {
    // Формируем контекст для AI на основе истории разговора
    const conversationContext = conversationHistory
      .filter(msg => msg && msg.role && msg.content) // Фильтруем только валидные сообщения
      .map(msg => {
        const roleName = msg.role === "user" ? "Пользователь" : "Ассистент";
        return `${roleName}: ${msg.content}`;
      })
      .join("\n");

    const fullContext = conversationContext ? `${conversationContext}\nПользователь: ${currentMessage}` : `Пользователь: ${currentMessage || ""}`;

    // Список доступных категорий для парсинга
    const availableCategories = [
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
      "Одежда и аксессуары",
      "Красота и уход",
      "Путешествия",
      "Хобби",
      "Другое"
    ].join(", ");

    // Пытаемся загрузить промпт из БД
    let prompt;
    try {
      prompt = await renderPrompt("parseUserProfile", {
        conversationContext: fullContext,
        availableCategories
      });
      console.log("✅ Using prompt from DB: parseUserProfile");
    } catch (error) {
      console.log("⚠ Prompt not found in DB, using default:", error.message);
      // Fallback на дефолтный промпт
      prompt = `Ты финансовый ассистент, который помогает заполнить профиль пользователя через диалог.

=== ИСТОРИЯ РАЗГОВОРА ===
${fullContext}

=== ЗАДАЧА ===
Проанализируй ВСЮ информацию из истории разговора и извлеки МАКСИМУМ данных. Будь АГРЕССИВНЫМ в извлечении данных - используй значения по умолчанию, если информации нет.

=== КРИТИЧЕСКИ ВАЖНО ===
1. Если пользователь уже дал достаточно информации (зарплата, траты, цели) - ВСЕГДА возвращай isProfileComplete: true
2. НЕ задавай лишних вопросов, если можно использовать разумные значения по умолчанию
3. Извлекай данные из контекста: если пользователь сказал "трачу 70-80 тысяч", значит траты ~75000, если "откладываю 15%", значит savingsPercentage: 15
4. Если пользователь упомянул несколько целей - извлеки ВСЕ цели
5. Категории маппь на доступные из списка (например, "продукты" → "Другое", "транспорт" → "Такси и каршеринг", "аренда" → "Другое", "подписки" → "Подписки и сервисы", "развлечения" → "Развлечения", "кафе" → "Рестораны и кафе", "одежда" → "Одежда и аксессуары")

=== ДАННЫЕ, КОТОРЫЕ НУЖНО ИЗВЛЕЧЬ ===
- salary: число, зарплата в месяц в рублях (ОБЯЗАТЕЛЬНО извлеки из текста)
- currentSavings: число, текущие накопления в рублях (если не указано, используй 0)
- savingsPercentage: число от 0 до 100, процент от зарплаты (если указан процент, извлеки; если не указан, но есть сумма отложений, рассчитай)
- topSpendingCategories: массив строк из списка доступных категорий - на что тратит больше всего (извлеки из упоминаний: "продукты", "транспорт", "аренда", "подписки" и т.д.)
- impulsiveCategories: массив строк - импульсивные траты (извлеки из упоминаний: "кафе", "одежда", "мелкие покупки" и т.д.)
- blockingCategories: массив строк - категории, мешающие целям (если не указано, используй пустой массив)
- goals: массив объектов с полями {title: строка, price: число, priority: число от 1 до 10, description: строка}
  - Если пользователь упомянул "подушка безопасности на 6 месяцев" и зарплата известна → рассчитай price = salary * 6
  - Если упомянул "отпуск 150000" → цель "Отпуск" с price: 150000
  - Приоритет: 1 = самый важный, 10 = менее важный
- hasDebts: булево значение - есть ли долги/кредиты (если упомянуты кредиты/долги → true)

=== ДОСТУПНЫЕ КАТЕГОРИИ ===
${availableCategories}

=== ПРАВИЛА ИЗВЛЕЧЕНИЯ ===
1. Будь АГРЕССИВНЫМ: если есть хотя бы зарплата и основные траты - считай профиль готовым
2. Используй значения по умолчанию:
   - Если savingsPercentage не указан, но есть сумма отложений и зарплата → рассчитай: (сумма_отложений / зарплата) * 100
   - Если blockingCategories не указаны → []
   - Если impulsiveCategories не указаны, но есть упоминания → извлеки их
3. Для целей: если пользователь сказал "хочу накопить подушку на 6 месяцев" и зарплата 120000 → цель: {"title": "Подушка безопасности", "price": 720000, "priority": 1, "description": "Резервный фонд на 6 месяцев"}
4. Если пользователь дал достаточно информации в первом сообщении - ВСЕГДА возвращай isProfileComplete: true

=== ВАЖНО - ЯЗЫК ===
КРИТИЧЕСКИ ВАЖНО: Все текстовые поля ДОЛЖНЫ быть на РУССКОМ языке:
- Названия целей (title) - ОБЯЗАТЕЛЬНО на русском
- Описания целей (description) - на русском
- Все ответы (reply) - на русском
- Категории должны быть из доступного списка на русском

=== ОТВЕТ ===
Верни ТОЛЬКО валидный JSON объект без markdown разметки, без дополнительного текста до/после.

Если данных достаточно (есть зарплата и хотя бы часть информации):
{
  "reply": "Отлично! Я собрал всю информацию. Профиль готов к сохранению.",
  "isProfileComplete": true,
  "parsedProfile": {
    "salary": 120000,
    "currentSavings": 150000,
    "savingsPercentage": 15,
    "extendedProfile": {
      "topSpendingCategories": ["Другое", "Такси и каршеринг", "Подписки и сервисы"],
      "impulsiveCategories": ["Рестораны и кафе", "Одежда и аксессуары"],
      "blockingCategories": [],
      "hasDebts": true
    },
    "goals": [
      {"title": "Подушка безопасности", "price": 720000, "priority": 1, "description": "Резервный фонд на 6 месяцев"},
      {"title": "Отпуск", "price": 150000, "priority": 2, "description": ""}
    ]
  }
}

Если данных НЕ достаточно (нет зарплаты):
{
  "reply": "Спасибо! А сколько ты зарабатываешь в месяц?",
  "isProfileComplete": false,
  "parsedProfile": null
}`;
    }

    // Используем retry механизм для надежности
    let completion;
    try {
      completion = await callOpenRouterWithRetry(prompt, 2, 2000);
    } catch (error) {
      console.error("❌ Ошибка вызова OpenRouter после retry:", error.message);
      console.error("   Stack:", error.stack);
      throw new Error(`Не удалось получить ответ от AI: ${error.message}`);
    }

    let responseText = completion?.choices?.[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error("Empty AI response");
    }

    // Убираем markdown код блоки если есть
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Парсим JSON ответ
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Ошибка парсинга ответа AI:", parseError);
      console.error("Содержимое:", responseText);
      
      // Fallback - пробуем извлечь JSON из текста
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Не удалось распарсить ответ AI");
      }
    }

    // Валидация структуры ответа
    if (!result.reply) {
      result.reply = "Спасибо за информацию! Могу ли я задать еще несколько вопросов?";
    }

    if (result.isProfileComplete && result.parsedProfile) {
      // Валидация и нормализация данных профиля
      const profile = result.parsedProfile;
      
      // Рассчитываем savingsPerMonth из процента, если указан
      if (profile.salary && profile.savingsPercentage && !profile.savingsPerMonth) {
        profile.savingsPerMonth = Math.round((profile.salary * profile.savingsPercentage) / 100);
      }

      // Убеждаемся, что extendedProfile существует
      if (!profile.extendedProfile) {
        profile.extendedProfile = {};
      }

      // Нормализуем массивы категорий
      if (!Array.isArray(profile.extendedProfile.topSpendingCategories)) {
        profile.extendedProfile.topSpendingCategories = [];
      }
      if (!Array.isArray(profile.extendedProfile.impulsiveCategories)) {
        profile.extendedProfile.impulsiveCategories = [];
      }
      if (!Array.isArray(profile.extendedProfile.blockingCategories)) {
        profile.extendedProfile.blockingCategories = [];
      }

      // Нормализуем цели
      if (!Array.isArray(profile.goals)) {
        profile.goals = [];
      }

      // Валидация: проверяем, что названия целей на русском языке (содержат кириллицу)
      // Если названия на английском, предупреждаем в логах
      if (profile.goals && profile.goals.length > 0) {
        profile.goals = profile.goals.map(goal => {
          if (goal.title) {
            // Проверяем, содержит ли название кириллические символы
            const hasCyrillic = /[а-яёА-ЯЁ]/.test(goal.title);
            if (!hasCyrillic && goal.title.trim().length > 0) {
              console.warn(`⚠ Предупреждение: название цели "${goal.title}" не содержит кириллицу. AI должен был перевести на русский.`);
              // Можно добавить автоматический перевод здесь, но для этого нужен переводчик
            }
          }
          return goal;
        });
      }

      result.parsedProfile = profile;
    }

    return result;

  } catch (error) {
    console.error("❌ Ошибка парсинга профиля:", error.message);
    console.error("   Stack:", error.stack);
    console.error("   Conversation history length:", conversationHistory.length);
    console.error("   Current message:", currentMessage?.substring?.(0, 100) || "N/A");
    console.error("   Error type:", error.constructor.name);
    
    // Если это ошибка OpenRouter - пробрасываем её дальше
    if (error.message && error.message.includes("OpenRouter")) {
      throw error;
    }
    
    return {
      reply: "Извини, произошла ошибка при обработке информации. Попробуй еще раз или переключись на форму заполнения.",
      isProfileComplete: false,
      parsedProfile: null,
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    };
  }
};
