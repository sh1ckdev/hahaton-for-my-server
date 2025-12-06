import { listGoalsByUser, getGoalById, createGoal, updateGoal, deleteGoal } from "../services/goalService.js";
import { getUserProfile } from "../services/userService.js";

export const listGoalsController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { includeCompleted } = req.query;
    
    const goals = await listGoalsByUser(userId, includeCompleted === "true");
    res.json(goals);
  } catch (e) {
    next(e);
  }
};

export const getGoalController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const goal = await getGoalById(id);
    
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }
    
    res.json(goal);
  } catch (e) {
    next(e);
  }
};

export const createGoalController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await getUserProfile(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const goal = await createGoal(userId, req.body || {});
    res.status(201).json(goal);
  } catch (e) {
    if (e.message === "Title and price are required") {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
};

export const updateGoalController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const goal = await updateGoal(id, req.body || {});
    res.json(goal);
  } catch (e) {
    if (e.message === "Goal not found") {
      return res.status(404).json({ error: e.message });
    }
    next(e);
  }
};

export const deleteGoalController = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteGoal(id);
    res.status(204).send();
  } catch (e) {
    if (e.message === "Goal not found") {
      return res.status(404).json({ error: e.message });
    }
    next(e);
  }
};

