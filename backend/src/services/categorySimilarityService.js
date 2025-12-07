import { callOpenRouter, isOpenRouterAvailable } from "./openRouterService.js";
import { renderPrompt } from "./promptService.js";

// Кэш для результатов сравнения категорий
const similarityCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

// Проверяем доступность OpenRouter
const openRouterAvailable = isOpenRouterAvailable();

/**
 * Определяет семантическую близость между категорией товара и категорией из черного списка
 * @param {string} purchaseCategory - Категория товара (например, "Игровая консоль")
 * @param {string} blacklistCategory - Категория из черного списка (например, "техника")
 * @returns {Promise<{similarity: number, matched: boolean, explanation: string}>}
 * similarity - скор от 0 до 1 (1 = полное совпадение, 0 = нет связи)
 * matched - true если similarity >= 0.7 (порог для блокировки)
 * explanation - объяснение связи
 */
export async function checkCategorySimilarity(purchaseCategory, blacklistCategory) {
  if (!purchaseCategory || !blacklistCategory) {
    return {
      similarity: 0,
      matched: false,
      explanation: "Одна из категорий не указана"
    };
  }

  // Нормализуем категории для кэша
  const normalizedPurchase = purchaseCategory.toLowerCase().trim();
  const normalizedBlacklist = blacklistCategory.toLowerCase().trim();

  // Проверяем точное совпадение (включая подстроки)
  if (normalizedPurchase.includes(normalizedBlacklist) || 
      normalizedBlacklist.includes(normalizedPurchase)) {
    return {
      similarity: 1.0,
      matched: true,
      explanation: `Категория "${purchaseCategory}" напрямую содержит категорию "${blacklistCategory}" из черного списка`
    };
  }

  // Проверяем кэш
  const cacheKey = `${normalizedPurchase}|||${normalizedBlacklist}`;
  const cached = similarityCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  // Если OpenRouter недоступен, используем fallback
  if (!openRouterAvailable) {
    const fallbackResult = fallbackSimilarityCheck(normalizedPurchase, normalizedBlacklist);
    similarityCache.set(cacheKey, {
      result: fallbackResult,
      timestamp: Date.now()
    });
    return fallbackResult;
  }

  // Используем AI для определения семантической близости
  try {
    // Пытаемся загрузить промпт из БД
    let prompt;
    try {
      prompt = await renderPrompt("checkCategorySimilarity", {
        purchaseCategory,
        blacklistCategory
      });
      console.log("✅ Using prompt from DB: checkCategorySimilarity");
    } catch (error) {
      console.log("⚠ Prompt not found in DB, using default:", error.message);
      // Fallback на дефолтный промпт
      prompt = `
Ты финансовый ассистент. Твоя задача — определить, насколько семантически близки две категории товаров.

=== КАТЕГОРИИ ===
Категория товара: "${purchaseCategory}"
Категория из черного списка: "${blacklistCategory}"

=== ЗАДАЧА ===
Определи, насколько эти категории связаны. Например:
- "Игровая консоль" и "техника" — связаны (консоль это техника)
- "Игровая консоль" и "игры" — связаны (консоль для игр)
- "Игровая консоль" и "еда" — не связаны
- "Смартфон" и "техника" — сильно связаны
- "Одежда" и "техника" — не связаны

=== ПРАВИЛА ===
1. Учитывай синонимы и родственные понятия
2. Учитывай иерархию категорий (например, "консоль" относится к "технике")
3. Учитывай контекст использования (например, "консоль" связана с "играми")
4. Будь строгим: если категории не связаны, скор должен быть низким

=== ОТВЕТ (строго JSON) ===
{
  "similarity": 0.85,
  "explanation": "Игровая консоль является разновидностью техники, поэтому категории связаны"
}

Где:
- similarity: число от 0 до 1 (1 = полное совпадение/сильная связь, 0 = нет связи)
- explanation: краткое объяснение связи (1-2 предложения на русском)
`;
    }

    const completion = await callOpenRouter(
      [{ role: "user", content: prompt }],
      {
        maxTokens: 150,
        temperature: 0.3, // Низкая температура для более детерминированных результатов
        stream: false
      }
    );

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Пустой ответ от AI");
    }

    // Парсим JSON ответ
    let result;
    try {
      // Убираем markdown код блоки если есть
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Ошибка парсинга ответа AI:", parseError);
      console.error("Содержимое:", content);
      // Fallback если не удалось распарсить
      return fallbackSimilarityCheck(normalizedPurchase, normalizedBlacklist);
    }

    // Валидация результата
    const similarity = Math.max(0, Math.min(1, result.similarity || 0));
    const explanation = result.explanation || "Связь не определена";
    const matched = similarity >= 0.7; // Порог для блокировки

    const finalResult = {
      similarity,
      matched,
      explanation
    };

    // Сохраняем в кэш
    similarityCache.set(cacheKey, {
      result: finalResult,
      timestamp: Date.now()
    });

    return finalResult;

  } catch (error) {
    console.error("Ошибка при определении семантической близости:", error.message);
    // Fallback при ошибке
    return fallbackSimilarityCheck(normalizedPurchase, normalizedBlacklist);
  }
}

/**
 * Fallback метод для определения близости категорий без AI
 * Использует простые правила и ключевые слова
 */
function fallbackSimilarityCheck(purchaseCategory, blacklistCategory) {
  const purchase = purchaseCategory.toLowerCase();
  const blacklist = blacklistCategory.toLowerCase();

  // Словарь синонимов и связанных понятий
  const categoryRelations = {
    "техника": ["консоль", "игровая", "смартфон", "телефон", "ноутбук", "компьютер", "пк", "гаджет", "электроника", "устройство"],
    "игры": ["консоль", "игровая", "гейм", "game", "playstation", "xbox", "nintendo", "steam"],
    "электроника": ["техника", "гаджет", "устройство", "смартфон", "телефон", "ноутбук", "компьютер"],
    "одежда": ["шмот", "вещь", "куртка", "джинсы", "футболка", "рубашка", "обувь"],
    "еда": ["ресторан", "кафе", "фастфуд", "продукт", "супермаркет", "магазин", "доставка"],
    "развлечения": ["игры", "кино", "подписка", "стрим", "концерт", "клуб"],
    "транспорт": ["такси", "бензин", "заправка", "автобус", "метро", "каршеринг"]
  };

  // Проверяем прямые связи
  const relatedWords = categoryRelations[blacklist] || [];
  let matchCount = 0;
  let totalChecks = relatedWords.length || 1;

  for (const word of relatedWords) {
    if (purchase.includes(word)) {
      matchCount++;
    }
  }

  // Также проверяем обратную связь
  const purchaseRelated = categoryRelations[purchase] || [];
  for (const word of purchaseRelated) {
    if (blacklist.includes(word)) {
      matchCount++;
      totalChecks++;
    }
  }

  // Вычисляем скор
  const similarity = Math.min(1.0, matchCount / Math.max(1, totalChecks * 0.5));
  const matched = similarity >= 0.5; // Более низкий порог для fallback

  return {
    similarity,
    matched,
    explanation: matched 
      ? `Категория "${purchaseCategory}" связана с категорией "${blacklistCategory}" из черного списка`
      : `Категория "${purchaseCategory}" не связана с категорией "${blacklistCategory}"`
  };
}

/**
 * Проверяет категорию товара против всех категорий из черного списка
 * Возвращает лучший матч (самую высокую близость)
 * @param {string} purchaseCategory - Категория товара
 * @param {string[]} blacklistCategories - Массив категорий из черного списка
 * @returns {Promise<{bestMatch: {category: string, similarity: number, matched: boolean, explanation: string} | null, allMatches: Array}>}
 */
export async function checkAgainstBlacklist(purchaseCategory, blacklistCategories) {
  if (!purchaseCategory || !blacklistCategories || blacklistCategories.length === 0) {
    return {
      bestMatch: null,
      allMatches: []
    };
  }

  const allMatches = await Promise.all(
    blacklistCategories.map(async (blacklistCat) => {
      const result = await checkCategorySimilarity(purchaseCategory, blacklistCat);
      return {
        category: blacklistCat,
        ...result
      };
    })
  );

  // Находим лучший матч (самую высокую близость)
  const bestMatch = allMatches.reduce((best, current) => {
    return current.similarity > (best?.similarity || 0) ? current : best;
  }, null);

  return {
    bestMatch: bestMatch && bestMatch.matched ? bestMatch : null,
    allMatches
  };
}

