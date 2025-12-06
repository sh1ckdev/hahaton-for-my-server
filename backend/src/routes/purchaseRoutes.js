import { Router } from "express";
import {
  listPurchases,
  createPurchaseController,
  cancelPurchaseController,
  markBoughtController,
  checkPurchaseAllowedController,
  updateNotificationController,
  updatePurchaseController
} from "../controllers/purchaseController.js";

const router = Router();

/**
 * @swagger
 * /api/purchases/{userId}:
 *   get:
 *     summary: Получить список покупок пользователя
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список покупок
 */
router.get("/:userId", listPurchases);

/**
 * @swagger
 * /api/purchases/{userId}:
 *   post:
 *     summary: Создать новую покупку
 *     tags: [Purchases]
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
 *             required:
 *               - title
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               useAiCategory:
 *                 type: boolean
 *               description:
 *                 type: string
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Созданная покупка
 */
router.post("/:userId", createPurchaseController);

/**
 * @swagger
 * /api/purchases/cancel/{purchaseId}:
 *   post:
 *     summary: Отменить покупку
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Отмененная покупка
 */
router.post("/cancel/:purchaseId", cancelPurchaseController);

/**
 * @swagger
 * /api/purchases/bought/{purchaseId}:
 *   post:
 *     summary: Отметить покупку как купленную
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Обновленная покупка
 */
router.post("/bought/:purchaseId", markBoughtController);

/**
 * @swagger
 * /api/purchases/check-allowed/{purchaseId}:
 *   get:
 *     summary: Проверить, можно ли совершить покупку сейчас
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Результат проверки
 */
router.get("/check-allowed/:purchaseId", checkPurchaseAllowedController);

/**
 * @swagger
 * /api/purchases/notification/{id}:
 *   patch:
 *     summary: Обновить уведомление о покупке
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Обновленное уведомление
 */
router.patch("/notification/:id", updateNotificationController);

/**
 * @swagger
 * /api/purchases/{purchaseId}:
 *   patch:
 *     summary: Обновить покупку
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: purchaseId
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
 *               title:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               url:
 *                 type: string
 *               description:
 *                 type: string
 *               useAiCategory:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Обновленная покупка
 */
router.patch("/:purchaseId", updatePurchaseController);

export default router;
