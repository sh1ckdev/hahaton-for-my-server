import { Router } from "express";
import {
  postProfile,
  getProfile,
  getCooldownRulesController,
  setCooldownRulesController,
  updateBlacklist,
  syncBankData,
  updateNotificationSettings,
  getTelegramBotInfo
} from "../controllers/userController.js";

const router = Router();

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   post:
 *     summary: Создать или обновить профиль пользователя
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               salary:
 *                 type: number
 *               currentSavings:
 *                 type: number
 *               savingsPerMonth:
 *                 type: number
 *     responses:
 *       200:
 *         description: Профиль пользователя
 */
router.post("/:userId/profile", postProfile);

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   get:
 *     summary: Получить профиль пользователя
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *       404:
 *         description: Пользователь не найден
 */
router.get("/:userId/profile", getProfile);

/**
 * @swagger
 * /api/users/{userId}/blacklist:
 *   post:
 *     summary: Обновить blacklist категорий
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Обновленный профиль
 */
router.post("/:userId/blacklist", updateBlacklist);

/**
 * @swagger
 * /api/users/{userId}/cooldown-rules:
 *   get:
 *     summary: Получить правила охлаждения пользователя
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список правил охлаждения
 */
router.get("/:userId/cooldown-rules", getCooldownRulesController);

/**
 * @swagger
 * /api/users/{userId}/cooldown-rules:
 *   post:
 *     summary: Установить правила охлаждения
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 minAmount:
 *                   type: number
 *                 maxAmount:
 *                   type: number
 *                 days:
 *                   type: number
 *     responses:
 *       200:
 *         description: Созданные правила
 */
router.post("/:userId/cooldown-rules", setCooldownRulesController);

/**
 * @swagger
 * /api/users/{userId}/bank-sync:
 *   post:
 *     summary: Синхронизировать данные с банком
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               salary:
 *                 type: number
 *               currentSavings:
 *                 type: number
 *               savingsPerMonth:
 *                 type: number
 *               spentThisMonth:
 *                 type: number
 *     responses:
 *       200:
 *         description: Обновленный профиль
 */
router.post("/:userId/bank-sync", syncBankData);

/**
 * @swagger
 * /api/users/{userId}/notification-settings:
 *   post:
 *     summary: Обновить настройки уведомлений
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ui, email, telegram]
 *               excludeCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *               excludePurchaseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               emailSettings:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   email:
 *                     type: string
 *               telegramSettings:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   chatId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Обновленный профиль
 */
router.post("/:userId/notification-settings", updateNotificationSettings);

/**
 * @swagger
 * /api/users/telegram-bot-info:
 *   get:
 *     summary: Получить информацию о Telegram боте
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Информация о боте
 *       503:
 *         description: Бот не настроен
 */
router.get("/telegram-bot-info", getTelegramBotInfo);

export default router;
