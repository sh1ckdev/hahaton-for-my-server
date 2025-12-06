import { classifyCategory } from "./aiService.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { calcComfortableFrom } from "../utils/cooldownCalc.js";

// расчет влияния покупки на ближайшую хотелку
const estimateDelayDays = (user, targetPrice) => {
    let savings = user.currentSavings;
    let month = 0;

    while(month < 60) {
        let after = savings - targetPrice;
        if(after >= 0 && after >= savings * user.minReserveRatio) return month * 30;
        savings += user.savingsPerMonth;
        month++;
    }
    return 999;
};

export const generatePurchaseAdvice = async (userId, payment) => {
    const user = await User.findOne({ userId });
    const planned = await Purchase.find({ userId, status:"planned" });

    // Получаем список запрещенных категорий пользователя
    const excludeCategories = user?.notificationSettings?.excludeCategories || [];
    const category = await classifyCategory(payment.description || "товар", "", excludeCategories);

    // ближайшая хотелка
    const nextGoal = planned.sort((a,b)=> new Date(a.cooldownUntil) - new Date(b.cooldownUntil))[0];

    let adviceText = `Я определил, что эта покупка относится к категории: **${category}**.\n\n`;

    if(nextGoal) {
        const delay = estimateDelayDays(user, payment.amount);

        adviceText += `У тебя запланировано: *${nextGoal.title}* за ${nextGoal.price}₽.\n`;
        adviceText += `Если совершить текущую покупку — цель может сдвинуться примерно на **${delay} дней**.\n\n`;
    }

    adviceText += `Хочешь подтвердить транзакцию на **${payment.amount}₽**?\n`;

    adviceText += `✔ Напиши *\"подтвердить\"*\n❌ Или *\"отложить\"*, и я добавлю это в хотелки.\n`;

    return {
        category,
        message: adviceText
    };
};
