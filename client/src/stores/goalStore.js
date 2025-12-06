import { makeAutoObservable, runInAction } from "mobx";
import api from "../api/client";

export class GoalStore {
  goals = [];
  loading = false;

  constructor(root) {
    this.root = root;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async loadForUser(userId, includeCompleted = false) {
    this.loading = true;
    try {
      const res = await api.get(`/goals/${userId}?includeCompleted=${includeCompleted}`);
      runInAction(() => { this.goals = res.data; });
    } finally {
      runInAction(() => { this.loading = false; });
    }
  }

  async createGoal(userId, goalData) {
    try {
      const res = await api.post(`/goals/${userId}`, goalData);
      runInAction(() => {
        this.goals.push(res.data);
        // Сортируем по приоритету
        this.goals.sort((a, b) => a.priority - b.priority);
      });
      return res.data;
    } catch (e) {
      console.error("Failed to create goal:", e);
      throw e;
    }
  }

  async updateGoal(goalId, goalData) {
    try {
      const res = await api.patch(`/goals/${goalId}`, goalData);
      runInAction(() => {
        this.goals = this.goals.map(g => g._id === goalId ? res.data : g);
        // Сортируем по приоритету
        this.goals.sort((a, b) => a.priority - b.priority);
      });
      return res.data;
    } catch (e) {
      console.error("Failed to update goal:", e);
      throw e;
    }
  }

  async deleteGoal(goalId) {
    try {
      await api.delete(`/goals/${goalId}`);
      runInAction(() => {
        this.goals = this.goals.filter(g => g._id !== goalId);
      });
    } catch (e) {
      console.error("Failed to delete goal:", e);
      throw e;
    }
  }

  get activeGoals() {
    return this.goals.filter(g => !g.isCompleted).sort((a, b) => a.priority - b.priority);
  }

  get completedGoals() {
    return this.goals.filter(g => g.isCompleted);
  }
}

