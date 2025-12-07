import { addDays, now } from "./date.js";

// выбрать правило по сумме
export const getCooldownDaysForAmount = (rules, amount) => {
  if (!rules || rules.length === 0) return 0;
  const rule = rules.find((r) => amount >= r.minAmount && amount < r.maxAmount);
  return rule ? rule.days : 0;
};

// Расчет рекомендуемых дней по диапазонам цен (для анализа)
// Возвращает количество дней, которые рекомендуется подумать над покупкой
export const getRecommendedDaysByPrice = (rules, price) => {
  if (!rules || rules.length === 0) return 0;
  const rule = rules.find((r) => price >= r.minAmount && price < r.maxAmount);
  return rule ? rule.days : 0;
};

// учёт накоплений: когда покупка станет комфортной
// Возвращает дату, когда покупка станет комфортной
// Условие: после покупки должно остаться как минимум minReserveRatio (по умолчанию 50%) от накоплений
// Пример: если накоплений 100.000, покупка 100.000, minReserveRatio 0.5
//   то после покупки должно остаться >= 50.000, значит нужно накопить 150.000
export const calcComfortableFrom = (user, price) => {
  if (!user.considerSavings || !user.savingsPerMonth || user.savingsPerMonth <= 0) {
    return null;
  }

  const minReserveRatio = user.minReserveRatio || 0.5;
  let savings = user.currentSavings || 0;
  let month = 0;
  const maxMonths = 60; // не дальше 5 лет

  while (month <= maxMonths) {
    // Проверяем, что накоплений достаточно для покупки
    if (savings >= price) {
      const after = savings - price;
      // После покупки должно остаться как минимум minReserveRatio от текущих накоплений
      // Например, если накоплений 100.000 и minReserveRatio 0.5, то после покупки должно остаться >= 50.000
      const minReserve = savings * minReserveRatio;
      if (after >= minReserve) {
        const d = now();
        d.setMonth(d.getMonth() + month);
        return d;
      }
    }
    // Увеличиваем накопления на месячную сумму
    savings += user.savingsPerMonth;
    month++;
  }

  return null;
};

// Расчет дней до комфортной покупки с учетом накоплений
// Если сумма накоплений меньше стоимости покупки, рассчитывает через сколько дней можно купить
export const calcDaysUntilComfortable = (user, price) => {
  if (!user.considerSavings || !user.savingsPerMonth || user.savingsPerMonth <= 0) {
    return null;
  }

  const currentSavings = user.currentSavings || 0;
  
  // Если накоплений достаточно для покупки, возвращаем 0
  if (currentSavings >= price) {
    const after = currentSavings - price;
    const minReserve = currentSavings * (user.minReserveRatio || 0.5);
    if (after >= minReserve) {
      return 0;
    }
  }

  // Если накоплений меньше стоимости покупки, рассчитываем дни
  if (currentSavings < price) {
    const deficit = price - currentSavings;
    const dailySavings = user.savingsPerMonth / 30;
    const days = Math.ceil(deficit / dailySavings);
    return days;
  }

  // Если накоплений достаточно, но после покупки останется меньше резерва
  let savings = currentSavings;
  let days = 0;
  const maxDays = 60 * 30; // 5 лет максимум

  while (days < maxDays) {
    const after = savings - price;
    const minReserve = savings * (user.minReserveRatio || 0.5);
    if (after >= 0 && after >= minReserve) {
      return days;
    }
    savings += user.savingsPerMonth / 30;
    days++;
  }

  return null;
};

// Объединение сроков: если срок рассчитывался через considerSavings, объединяем с рекомендацией по цене
export const getCombinedRecommendedDays = (user, price, rules) => {
  const daysFromSavings = calcDaysUntilComfortable(user, price);
  const daysFromPrice = getRecommendedDaysByPrice(rules, price);

  // Если оба срока рассчитаны, берем максимальный (более консервативный подход)
  if (daysFromSavings !== null && daysFromPrice > 0) {
    return Math.max(daysFromSavings, daysFromPrice);
  }
  
  // Если только один срок рассчитан, возвращаем его
  if (daysFromSavings !== null) {
    return daysFromSavings;
  }
  
  if (daysFromPrice > 0) {
    return daysFromPrice;
  }

  return 0;
};

export const isDateInPast = (d) => {
  if (!d) return false;
  return new Date(d).getTime() <= now().getTime();
};
