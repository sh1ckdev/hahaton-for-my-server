import Prompt from "../models/Prompt.js";

/**
 * Получить промпт по ключу
 * @param {string} key - Ключ промпта
 * @returns {Promise<Object|null>}
 */
export const getPromptByKey = async (key) => {
  const prompt = await Prompt.findOne({ key, isActive: true });
  return prompt;
};

/**
 * Получить все промпты
 * @returns {Promise<Array>}
 */
export const getAllPrompts = async () => {
  return await Prompt.find().sort({ key: 1 });
};

/**
 * Создать или обновить промпт
 * @param {string} key - Ключ промпта
 * @param {Object} data - Данные промпта
 * @returns {Promise<Object>}
 */
export const upsertPrompt = async (key, data) => {
  const existing = await Prompt.findOne({ key });
  
  if (existing) {
    // Обновляем существующий промпт и увеличиваем версию
    existing.name = data.name || existing.name;
    existing.description = data.description || existing.description;
    existing.template = data.template || existing.template;
    existing.variables = data.variables || existing.variables;
    existing.isActive = data.isActive !== undefined ? data.isActive : existing.isActive;
    existing.version = (existing.version || 1) + 1;
    await existing.save();
    return existing;
  } else {
    // Создаем новый промпт
    const prompt = await Prompt.create({
      key,
      name: data.name || key,
      description: data.description || "",
      template: data.template || "",
      variables: data.variables || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      version: 1
    });
    return prompt;
  }
};

/**
 * Удалить промпт
 * @param {string} key - Ключ промпта
 * @returns {Promise<boolean>}
 */
export const deletePrompt = async (key) => {
  const result = await Prompt.deleteOne({ key });
  return result.deletedCount > 0;
};

/**
 * Рендерит промпт с подстановкой переменных
 * @param {string} key - Ключ промпта
 * @param {Object} variables - Объект с переменными для подстановки
 * @returns {Promise<string>}
 */
export const renderPrompt = async (key, variables = {}) => {
  const prompt = await getPromptByKey(key);
  
  if (!prompt) {
    throw new Error(`Prompt with key "${key}" not found or inactive`);
  }
  
  console.log(`📝 Using prompt from DB: ${key} (v${prompt.version})`);
  
  let rendered = prompt.template;
  
  // Подставляем переменные в шаблон
  for (const [varKey, varValue] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${varKey}\\}`, 'g');
    rendered = rendered.replace(placeholder, varValue);
  }
  
  return rendered;
};

