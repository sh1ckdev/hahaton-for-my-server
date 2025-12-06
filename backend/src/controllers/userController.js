import {
    upsertUserProfile,
    getUserProfile,
    getUserCooldownRules,
    setUserCooldownRules
  } from "../services/userService.js";
  import User from "../models/User.js";
  
  export const postProfile = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const user = await upsertUserProfile(userId, req.body || {});
      
      // Если после upsert пользователь не создан/найден - возвращаем 404
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (e) {
      next(e);
    }
  };
  
  export const getProfile = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const user = await getUserProfile(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (e) {
      next(e);
    }
  };
  
  export const getCooldownRulesController = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const rules = await getUserCooldownRules(userId);
      res.json(rules);
    } catch (e) {
      next(e);
    }
  };
  
  export const setCooldownRulesController = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const rules = await setUserCooldownRules(userId, req.body || []);
      res.json(rules);
    } catch (e) {
      next(e);
    }
  };


  export const updateBlacklist = async (req,res)=>{
    try {
      const { userId } = req.params;
      const { categories } = req.body;
  
      const user = await User.findOneAndUpdate(
        { userId },
        { 
          $set: {
            "notificationSettings.excludeCategories": categories,
            isFirstLogin: false    // <-- теперь точно перезапишет
          }
        },
        { new:true }
      );
  
      res.json(user);
    }catch(err){
      console.error(err);
      res.status(500).json({error:"update blacklist failed"});
    }
  };
  

  export const syncBankData = async (req, res, next) => {
    try {
      const { userId } = req.params;

      const {
        salary,
        currentSavings,
        savingsPerMonth,
        spentThisMonth
      } = req.body;

      const updatePayload = {};

      if (typeof salary === "number") updatePayload.salary = salary;
      if (typeof currentSavings === "number") updatePayload.currentSavings = currentSavings;
      if (typeof savingsPerMonth === "number") updatePayload.savingsPerMonth = savingsPerMonth;

      // 👉 если хочешь считать траты базово — можно сохранить здесь
      if (typeof spentThisMonth === "number") {
        updatePayload.spentThisMonth = spentThisMonth;
      }

      const user = await User.findOneAndUpdate(
        { userId },
        { $set: updatePayload },
        { new: true }
      );

      if (!user) return res.status(404).json({ error: "User not found" });

      res.json(user);
    } catch (e) {
      console.error("syncBankData error:", e);
      next(e);
    }
  };

  export const updateNotificationSettings = async (req, res, next) => {
    try {
      const { userId } = req.params;
      const {
        frequency,
        customFrequencyMs,
        channels,
        excludeCategories,
        excludePurchaseIds,
        emailSettings,
        telegramSettings
      } = req.body;

      const updatePayload = {};

      if (frequency) updatePayload["notificationSettings.frequency"] = frequency;
      if (customFrequencyMs !== undefined) updatePayload["notificationSettings.customFrequencyMs"] = customFrequencyMs;
      if (channels) updatePayload["notificationSettings.channels"] = channels;
      if (excludeCategories) updatePayload["notificationSettings.excludeCategories"] = excludeCategories;
      if (excludePurchaseIds) updatePayload["notificationSettings.excludePurchaseIds"] = excludePurchaseIds;
      if (emailSettings) {
        if (emailSettings.enabled !== undefined) updatePayload["notificationSettings.emailSettings.enabled"] = emailSettings.enabled;
        if (emailSettings.email) updatePayload["notificationSettings.emailSettings.email"] = emailSettings.email;
      }
      if (telegramSettings) {
        if (telegramSettings.enabled !== undefined) updatePayload["notificationSettings.telegramSettings.enabled"] = telegramSettings.enabled;
        // chatId обновляем только если он явно передан (не пустая строка)
        // Это позволяет сохранить chatId, установленный через /start команду
        if (telegramSettings.chatId !== undefined && telegramSettings.chatId !== "") {
          updatePayload["notificationSettings.telegramSettings.chatId"] = telegramSettings.chatId;
        }
      }

      const user = await User.findOneAndUpdate(
        { userId },
        { $set: updatePayload },
        { new: true }
      );

      if (!user) return res.status(404).json({ error: "User not found" });

      res.json(user);
    } catch (e) {
      console.error("updateNotificationSettings error:", e);
      next(e);
    }
  };

  export const getTelegramBotInfo = async (req, res, next) => {
    try {
      const { getBotInfo } = await import("../services/telegramBotService.js");
      const botInfo = await getBotInfo();
      
      if (!botInfo) {
        return res.status(503).json({ error: "Telegram bot not configured" });
      }

      res.json({
        username: botInfo.username,
        firstName: botInfo.first_name,
        botLink: `https://t.me/${botInfo.username}`
      });
    } catch (e) {
      console.error("getTelegramBotInfo error:", e);
      next(e);
    }
  };
  