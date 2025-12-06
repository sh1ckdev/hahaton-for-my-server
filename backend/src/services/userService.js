import User from "../models/User.js";
import CooldownRule from "../models/CooldownRule.js";

// создать/обновить профиль
export const upsertUserProfile = async (userId, payload) => {
  const existing = await User.findOne({ userId });

  // ---- Новый пользователь ----
  if (!existing) {
    const user = await User.create({
      userId,
      nickname: payload.nickname || userId,
      salary: payload.salary ?? 0,
      currentSavings: payload.currentSavings ?? 0,
      savingsPerMonth: payload.savingsPerMonth ?? 0,
      considerSavings: true,
      minReserveRatio: 0.5,
      isFirstLogin: true
    });

    // дефолтные правила охлаждения
    await ensureCooldownRules(userId);

    return user;
  }

  // ---- Старый пользователь — обновляем, но не трогаем isFirstLogin ----
  const updated = await User.findOneAndUpdate(
    { userId },
    { $set: payload },
    { new: true }
  );

  return updated;
};

// рефактор правил охлаждения
async function ensureCooldownRules(userId) {
  const count = await CooldownRule.countDocuments({ userId });
  if (!count) {
    await CooldownRule.insertMany([
      { userId, minAmount: 0, maxAmount: 15000, days: 1 },
      { userId, minAmount: 15000, maxAmount: 50000, days: 7 },
      { userId, minAmount: 50000, maxAmount: 100000, days: 30 },
      { userId, minAmount: 100000, maxAmount: 1_000_000_000, days: 90 }
    ]);
  }
}

export const getUserProfile = (userId) => User.findOne({ userId });

export const getUserCooldownRules = (userId) =>
  CooldownRule.find({ userId }).sort({ minAmount: 1 });

export const setUserCooldownRules = async (userId, rules) => {
  await CooldownRule.deleteMany({ userId });
  const toInsert = rules.map((r) => ({
    userId,
    minAmount: Number(r.minAmount),
    maxAmount: Number(r.maxAmount),
    days: Number(r.days)
  }));
  return CooldownRule.insertMany(toInsert);
};



