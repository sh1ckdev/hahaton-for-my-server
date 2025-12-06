import mongoose from "mongoose";

const notificationSettingsSchema = new mongoose.Schema(
  {
    frequency: { type: String, enum: ["daily", "weekly", "monthly", "custom"], default: "weekly" },
    customFrequencyMs: { type: Number, default: null }, // Кастомное время в миллисекундах (для frequency="custom")
    channels: { type: [String], enum: ["ui", "email", "telegram"], default: ["ui"] },
    channel: { type: String, enum: ["ui", "email", "telegram"] }, // Старое поле для обратной совместимости
    excludeCategories: { type: [String], default: [] },
    excludePurchaseIds: { type: [String], default: [] }, // Исключить конкретные товары из нотификаций
    // Настройки для email (SMTP)
    emailSettings: {
      enabled: { type: Boolean, default: false },
      email: { type: String, default: "" }
    },
    // Настройки для Telegram
    telegramSettings: {
      enabled: { type: Boolean, default: false },
      chatId: { type: String, default: "" }
    }
  },
  { _id: false }
);

// Миграция: преобразуем старое поле channel в channels
notificationSettingsSchema.pre('save', function(next) {
  if (this.notificationSettings) {
    if (this.notificationSettings.channel && !this.notificationSettings.channels) {
      this.notificationSettings.channels = [this.notificationSettings.channel];
    }
  }
  next();
});

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    nickname: { type: String },

    // 🔥 Добавляем флаг первого входа
    isFirstLogin: { type: Boolean, default: true },

    salary: { type: Number, default: 0 },
    currentSavings: { type: Number, default: 0 },
    savingsPerMonth: { type: Number, default: 0 },
    considerSavings: { type: Boolean, default: true },
    minReserveRatio: { type: Number, default: 0.5 },

    // Данные расширенной анкеты
    extendedProfile: {
      topSpendingCategories: { type: [String], default: [] },
      impulsiveCategories: { type: [String], default: [] },
      financialGoals: { type: String, default: "" },
      blockingCategories: { type: [String], default: [] },
      savingsPercentage: { type: Number, default: 0 },
      hasDebts: { type: Boolean, default: false }
    },

    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
