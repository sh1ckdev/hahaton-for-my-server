import mongoose from "mongoose";

const promptSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  }, // Уникальный ключ промпта (например: "generateBlacklist", "classifyCategory")
  name: { 
    type: String, 
    required: true 
  }, // Название промпта для отображения в админ-панели
  description: { 
    type: String, 
    default: "" 
  }, // Описание назначения промпта
  template: { 
    type: String, 
    required: true 
  }, // Шаблон промпта (может содержать плейсхолдеры типа {context}, {data} и т.д.)
  variables: { 
    type: [String], 
    default: [] 
  }, // Список переменных, которые используются в шаблоне (для справки)
  isActive: { 
    type: Boolean, 
    default: true 
  }, // Активен ли промпт (можно временно отключить)
  version: { 
    type: Number, 
    default: 1 
  }, // Версия промпта для отслеживания изменений
}, {
  timestamps: true
});

export default mongoose.model("Prompt", promptSchema);

