import { classifyCategory, generateBlacklist, generatePurchaseConfirmationAdvice } from "../services/aiService.js";
import { getPurchaseById } from "../services/purchaseService.js";
import { getUserProfile } from "../services/userService.js";
import { calculateGoalsImpact } from "../services/goalService.js";
import { callOpenRouter } from "../services/openRouterService.js";
import Goal from "../models/Goal.js";
import User from "../models/User.js";

export const classifyCategoryController = async (req, res) => {
  try {
    const { title, description, userId } = req.body;
    
    // Если передан userId, получаем запрещенные категории пользователя
    let excludeCategories = [];
    if (userId) {
      const user = await getUserProfile(userId);
      if (user) {
        excludeCategories = user.notificationSettings?.excludeCategories || [];
      }
    }
    
    const category = await classifyCategory(title, description, excludeCategories);
    res.json({ category });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI classify failed" });
  }
};

export const suggestBlacklistController = async (req, res) => {
  try {
    const { profileSummary } = req.body;
    const categories = await generateBlacklist(profileSummary || "");
    res.json({ categories });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI blacklist generation failed" });
  }
};

export const chatController = async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    const user = await User.findOne({ userId });
    // Находим цели пользователя, отсортированные по приоритету
    const goals = await Goal.find({ userId, isCompleted: false }).sort({ priority: 1 });
    const highestPriorityGoal = goals[0]; // Самая приоритетная цель
    
    let context = "";
    if (highestPriorityGoal && user.savingsPerMonth) {
      // Простой расчет сдвига для чата
      const deficit = highestPriorityGoal.price - user.currentSavings;
      const shiftDays = deficit > 0 ? Math.ceil(deficit / (user.savingsPerMonth / 30)) : 0;
      context = `Текущая приоритетная цель: ${highestPriorityGoal.title} (${highestPriorityGoal.price}₽), покупка может отложить её на ~${shiftDays} дней.\n`;
    }
    
        const prompt = `
    Ты финансовый ассистент.
    ${context}
    
    User: "${message}"
    Ответи дружелюбно, кратко и по делу. Если речь о покупке — дай рекомендацию.
    `;

    const completion = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { maxTokens: 200, temperature: 0.6 }
    );
    const answer = completion?.choices?.[0]?.message?.content.trim();

    res.json({answer});

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI chat failed" });
  }
};

export const getPurchaseAdviceController = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    const purchase = await getPurchaseById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    const user = await getUserProfile(purchase.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Используем новый сервис для расчета влияния на цели с учетом приоритета
    const goalsWithShift = await calculateGoalsImpact(user, purchase);

    console.log(`[Purchase Advice] User ${user.userId}: currentSavings=${user.currentSavings}, savingsPerMonth=${user.savingsPerMonth}, purchasePrice=${purchase.price}, affectedGoalsCount=${goalsWithShift.length}`);

    // Генерируем AI совет
    const advice = await generatePurchaseConfirmationAdvice(
      user, 
      purchase, 
      goalsWithShift
    );

    res.json({
      advice,
      affectedGoals: goalsWithShift
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate purchase advice" });
  }
};
