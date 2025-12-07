import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: Number, default: 0 },

  category: { type: String },
  aiCategory: { type: String },
  url: { type: String }, // Ссылка на товар

  status: { type: String, enum:["planned","purchased","canceled"], default:"planned" },

  cooldownUntil: { type: Date, default: null },
  comfortableFrom: { type: Date, default: null },
  recommendedDays: { type: Number, default: 0 }, // Объединенный рекомендуемый срок (от накоплений + от цены)

  blacklistMatched: { type: Boolean, default:false },
  blockedByCategory: { type: Boolean, default:false },
  similarityScore: { type: Number, default: null }, // Скор семантической близости (0-1)
  matchedBlacklistCategory: { type: String, default: null }, // Категория из черного списка, с которой совпала
  similarityExplanation: { type: String, default: null }, // Объяснение связи категорий

  notifyEnabled: { type: Boolean, default: null }, // null = использовать глобальные настройки, false = отключить, true = включить с индивидуальными настройками
  notifyEveryDays: { type: Number, default: null }, // null = использовать глобальные настройки, иначе индивидуальный интервал в днях
  lastNotifiedAt:{type:Date, default:null},
},{
  timestamps:true
});

export default mongoose.model("Purchase", purchaseSchema);
