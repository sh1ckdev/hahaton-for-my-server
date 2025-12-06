import Goal from "../models/Goal.js";

export const listGoalsByUser = (userId, includeCompleted = false) => {
  const query = { userId };
  if (!includeCompleted) {
    query.isCompleted = false;
  }
  return Goal.find(query).sort({ priority: 1, createdAt: -1 }); // Сортировка: сначала по приоритету (1 = высший), потом по дате
};

export const getGoalById = (id) => Goal.findById(id);

export const createGoal = async (userId, payload) => {
  const { title, price, priority = 1, description = "" } = payload;

  if (!title || !price) {
    throw new Error("Title and price are required");
  }

  const goal = await Goal.create({
    userId,
    title,
    price,
    priority: Math.max(1, Math.min(10, priority)), // Ограничиваем от 1 до 10
    description
  });

  return goal;
};

export const updateGoal = async (id, payload) => {
  const goal = await Goal.findById(id);
  if (!goal) {
    throw new Error("Goal not found");
  }

  const { title, price, priority, description, isCompleted } = payload;

  if (title !== undefined) goal.title = title;
  if (price !== undefined) goal.price = price;
  if (priority !== undefined) goal.priority = Math.max(1, Math.min(10, priority));
  if (description !== undefined) goal.description = description;
  if (isCompleted !== undefined) goal.isCompleted = isCompleted;

  await goal.save();
  return goal;
};

export const deleteGoal = async (id) => {
  const goal = await Goal.findById(id);
  if (!goal) {
    throw new Error("Goal not found");
  }
  await Goal.findByIdAndDelete(id);
  return goal;
};

/**
 * Рассчитывает влияние покупки на цели пользователя с учетом приоритета
 * @param {Object} user - объект пользователя
 * @param {Object} purchase - объект покупки
 * @returns {Array} массив целей с информацией о сдвиге: [{_id, title, price, priority, shiftDays}, ...]
 */
export const calculateGoalsImpact = async (user, purchase) => {
  if (!user.savingsPerMonth || user.savingsPerMonth <= 0) {
    return []; // Без информации о накоплениях не можем рассчитать сдвиг
  }

  // Получаем все активные цели, отсортированные по приоритету (высший приоритет = меньше число)
  const goals = await listGoalsByUser(user.userId, false);
  
  const goalsWithShift = goals.map(goal => {
    // Накопления после покупки
    const newSavings = user.currentSavings - purchase.price;
    
    // Если накопления отрицательные, нужно сначала их восстановить, потом накопить на цель
    let totalNeeded = goal.price;
    if (newSavings < 0) {
      // Сначала нужно вернуть долг, потом накопить на цель
      totalNeeded = Math.abs(newSavings) + goal.price;
    } else {
      // Если накопления положительные, считаем дефицит
      totalNeeded = Math.max(0, goal.price - newSavings);
    }
    
    let shiftDays = null;
    if (totalNeeded > 0 && user.savingsPerMonth > 0) {
      // Рассчитываем дни: сколько нужно накопить / сколько накапливаем в день
      const dailySavings = user.savingsPerMonth / 30;
      shiftDays = Math.ceil(totalNeeded / dailySavings);
    }
    
    return {
      _id: goal._id,
      title: goal.title,
      price: goal.price,
      priority: goal.priority,
      shiftDays: shiftDays
    };
  }).filter(g => g.shiftDays !== null && g.shiftDays > 0); // Только цели, которые действительно сдвинутся

  // Сортируем по приоритету (высший приоритет = меньше число = сначала в списке)
  return goalsWithShift.sort((a, b) => a.priority - b.priority);
};

