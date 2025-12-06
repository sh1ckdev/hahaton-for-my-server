import { makeAutoObservable, runInAction } from "mobx";
import api from "../api/client";


export class UserStore {
  user = null;
  userId = "";
  nickname = "";
  loading = false;

  constructor(root) {
    this.root = root;
    makeAutoObservable(this);

    // ⬇ пробуем восстановить сессию при запуске
    this.restoreSession();
  }

  get isAuthenticated() {
    return !!this.user;
  }

  setCredentials(phone, nickname) {
    this.userId = phone;
    this.nickname = nickname;

    // сохраняем сразу
    localStorage.setItem("userId", phone);
    localStorage.setItem("nickname", nickname);
  }

  // --- LOGIN ---
  async loginOrRegister() {
    if (!this.userId) return;

    this.loading = true;
    try {
      const payload = { nickname: this.nickname || this.userId };
      const res = await api.post(`/users/${this.userId}/profile`, payload);

      // Проверяем, что пользователь создан/найден
      if (!res.data) {
        console.warn("User not found after login attempt, logging out");
        this.logout();
        return;
      }

      runInAction(() => {
        this.user = res.data;
      });

      // ⬇ сохраняем пользователя
      localStorage.setItem("user", JSON.stringify(res.data));

      await this.root.purchaseStore.loadForUser(this.userId);

      // Проверяем наличие финансового профайла
      if (!res.data.salary || res.data.salary === 0) {
        this.root.uiStore.openFinancialProfileModal();
      } else if (res.data.isFirstLogin) {
        this.root.uiStore.openInitialBlacklistModal();
      }

    } catch (e) {
      // Если 404 или другая ошибка - делаем logout
      if (e.response?.status === 404 || e.response?.status === 401) {
        console.warn("User not found or unauthorized, logging out");
        this.logout();
        return;
      }
      console.error("Login error:", e);
    } finally {
      this.loading = false;
    }
  }

  // --- RESTORE SESSION ---
  async restoreSession() {
    const savedUser = localStorage.getItem("user");
    const savedId = localStorage.getItem("userId");
    const savedNickname = localStorage.getItem("nickname");

    if (savedUser && savedId) {
      this.userId = savedId;
      this.nickname = savedNickname || "";
      
      try {
        const parsedUser = JSON.parse(savedUser);
        this.user = parsedUser;

        // грузим свежие данные с сервера
        await this.loadProfile();

        // Если после loadProfile пользователь все еще существует, загружаем покупки
        if (this.user) {
          await this.root.purchaseStore.loadForUser(savedId);
        }
      } catch (e) {
        console.error("Error restoring session:", e);
        // Если ошибка при парсинге или загрузке - делаем logout
        this.logout();
      }
    }
  }

  // --- LOAD PROFILE (used in restore) ---
  async loadProfile() {
    if (!this.userId) return;

    try {
      const res = await api.get(`/users/${this.userId}/profile`);
      
      // Проверяем, что пользователь найден
      if (!res.data) {
        console.warn("User not found, logging out");
        this.logout();
        return;
      }

      // Проверяем совпадение nickname (если был указан)
      if (this.nickname && res.data.nickname && res.data.nickname !== this.nickname) {
        console.warn("Nickname mismatch, logging out");
        this.logout();
        return;
      }

      runInAction(() => {
        this.user = res.data;
      });

      localStorage.setItem("user", JSON.stringify(res.data));

      // Проверяем наличие финансового профайла
      if (!res.data.salary || res.data.salary === 0) {
        this.root.uiStore.openFinancialProfileModal();
      } else if (res.data.isFirstLogin) {
        this.root.uiStore.openInitialBlacklistModal();
      }

    } catch (e) {
      // Если 404 или пользователь не найден - делаем logout
      if (e.response?.status === 404 || e.response?.status === 401) {
        console.warn("User not found or unauthorized, logging out");
        this.logout();
        return;
      }
      console.error("Error loading profile:", e);
    }
  }

  // --- UPDATE BLACKLIST ---
  async updateBlacklist(categories) {
    try {
      const res = await api.post(`/users/${this.userId}/blacklist`, { categories });
  
      // Проверяем, что пользователь найден
      if (!res.data) {
        console.warn("User not found, logging out");
        this.logout();
        return;
      }

      runInAction(() => {
        this.user = res.data; // <-- получаем isFirstLogin=false с сервера
      });
  
      localStorage.setItem("user", JSON.stringify(res.data));
  
      this.root.uiStore.closeInitialBlacklistModal();
  
    } catch (e) {
      // Если 404 или пользователь не найден - делаем logout
      if (e.response?.status === 404 || e.response?.status === 401) {
        console.warn("User not found or unauthorized, logging out");
        this.logout();
        return;
      }
      console.error("Error updating blacklist:", e);
    }
  }
  

  // --- LOGOUT (если понадобится) ---
  logout() {
    this.user = null;
    this.userId = "";
    localStorage.clear();
  }
}
