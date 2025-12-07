import { classifyCategory, generateBlacklist, generatePurchaseConfirmationAdvice, parseUserProfile } from "../services/aiService.js";
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
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Проверяем, нужно ли запросить накопления
    // Если considerSavings включен, но накоплений нет или они равны 0, запрашиваем
    if (user.considerSavings && (!user.currentSavings || user.currentSavings === 0)) {
      const messageLower = message.toLowerCase().trim();
      // Проверяем, не является ли сообщение уже ответом на запрос накоплений
      const isSavingsResponse = /^\d+/.test(message) || 
                                /накоплени/i.test(message) || 
                                /у меня/i.test(message) && /\d+/.test(message);
      
      if (!isSavingsResponse) {
        // Запрашиваем накопления
        return res.json({
          answer: "Для расчета оптимальной даты покупки мне нужно знать размер твоих текущих накоплений. Пожалуйста, укажи сумму, которую ты сейчас отложил (в рублях).",
          requiresSavings: true
        });
      } else {
        // Пытаемся извлечь число из сообщения
        const savingsMatch = message.match(/(\d+[\s,.]?\d*)/);
        if (savingsMatch) {
          const savingsAmount = parseFloat(savingsMatch[1].replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(savingsAmount) && savingsAmount >= 0) {
            // Обновляем накопления пользователя
            user.currentSavings = savingsAmount;
            await user.save();
            
            return res.json({
              answer: `Спасибо! Я запомнил, что у тебя ${savingsAmount.toLocaleString()}₽ накоплений. Теперь я смогу точнее рассчитать, когда тебе будет комфортно совершить покупку. Чем еще могу помочь?`,
              requiresSavings: false
            });
          }
        }
      }
    }
    
    // Находим цели пользователя, отсортированные по приоритету
    const goals = await Goal.find({ userId, isCompleted: false }).sort({ priority: 1 });
    const highestPriorityGoal = goals[0]; // Самая приоритетная цель
    
    let context = "";
    if (highestPriorityGoal && user.savingsPerMonth) {
      // Простой расчет сдвига для чата
      const deficit = highestPriorityGoal.price - (user.currentSavings || 0);
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

    res.json({answer, requiresSavings: false});

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

export const parseProfileController = async (req, res) => {
  try {
    const { userId, message, conversationHistory = [] } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: "userId and message are required" });
    }

    // Проверяем, что пользователь существует
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Вызываем функцию парсинга профиля
    const result = await parseUserProfile(conversationHistory, message);

    res.json(result);
  } catch (e) {
    console.error("Error parsing profile:", e);
    res.status(500).json({ error: "Failed to parse profile" });
  }
};
