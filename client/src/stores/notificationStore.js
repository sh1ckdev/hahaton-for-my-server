import { makeAutoObservable, runInAction } from "mobx";
import api from "../api/client";

export class NotificationStore {
  notifications = [];
  loading = false;

  constructor(root) {
    this.root = root;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get unreadCount() {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  async loadForUser(userId) {
    if (!userId) {
      console.log("[NOTIFICATIONS] ⚠️ No userId provided");
      return;
    }
    this.loading = true;
    try {
      console.log(`[NOTIFICATIONS] 🔄 Loading notifications for user ${userId}`);
      const res = await api.get(`/notifications/${userId}`);
      const notifications = res.data || [];
      console.log(`[NOTIFICATIONS] ✅ Loaded ${notifications.length} notifications:`, notifications);
      runInAction(() => {
        this.notifications = notifications;
      });
    } catch (e) {
      console.error("[NOTIFICATIONS] ❌ Failed to load notifications:", e);
      if (e.response) {
        console.error("[NOTIFICATIONS] Response status:", e.response.status);
        console.error("[NOTIFICATIONS] Response data:", e.response.data);
      }
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async markAllRead(userId) {
    if (!userId) return;
    try {
      const res = await api.post(`/notifications/${userId}/read-all`);
      runInAction(() => {
        this.notifications = res.data || [];
      });
    } catch (e) {
      console.error("Failed to mark notifications as read:", e);
    }
  }
}


