import { addDays, now } from "./date.js";

// выбрать правило по сумме
export const getCooldownDaysForAmount = (rules, amount) => {
  if (!rules || rules.length === 0) return 0;
  const rule = rules.find((r) => amount >= r.minAmount && amount < r.maxAmount);
  return rule ? rule.days : 0;
};

// учёт накоплений: когда покупка станет комфортной
export const calcComfortableFrom = (user, price) => {
  if (!user.considerSavings) return null;

  let savings = user.currentSavings;
  let month = 0;
  const maxMonths = 60; // не дальше 5 лет

  while (month <= maxMonths) {
    const after = savings - price;
    if (after >= 0 && after >= savings * (user.minReserveRatio || 0.5)) {
      const d = now();
      d.setMonth(d.getMonth() + month);
      return d;
    }
    savings += user.savingsPerMonth;
    month++;
  }

  return null;
};

export const isDateInPast = (d) => {
  if (!d) return false;
  return new Date(d).getTime() <= now().getTime();
};
