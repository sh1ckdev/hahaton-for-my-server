import api from "./client";

/**
 * Запрос у бэкенда классификации
 * title/description -> category
 */
export async function classifyCategoryFrontend(title, description = "") {
  const res = await api.post("/ai/classify-category", { title, description });
  return res.data.category;
}


/**
 * Получение категорий blacklist (генерируемых ИИ)
 * пока заглушка — backend нужно добавить endpoint
 */
export async function generateBlacklistByAI(profileSummary = "") {
  const res = await api.post("/ai/suggest-blacklist", { profileSummary });
  return res.data.categories; // ожидаем массив
}
