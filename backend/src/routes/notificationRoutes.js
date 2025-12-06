import { Router } from "express";
import {
  listNotificationsByUser,
  markAllNotificationsRead,
  createTestNotification
} from "../controllers/notificationController.js";

const router = Router();

/**
 * @swagger
 * /api/notifications/{userId}:
 *   get:
 *     summary: Получить уведомления пользователя
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список уведомлений
 */
router.get("/:userId", listNotificationsByUser);

/**
 * @swagger
 * /api/notifications/{userId}/read-all:
 *   post:
 *     summary: Отметить все уведомления пользователя как прочитанные
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Обновлённый список уведомлений
 */
router.post("/:userId/read-all", markAllNotificationsRead);

/**
 * @swagger
 * /api/notifications/{userId}/test:
 *   post:
 *     summary: Создать тестовое уведомление (для отладки)
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               purchaseId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Созданное тестовое уведомление
 */
router.post("/:userId/test", createTestNotification);

export default router;


