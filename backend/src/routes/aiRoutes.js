import { Router } from "express";
import { classifyCategoryController, suggestBlacklistController, chatController, getPurchaseAdviceController, parseProfileController } from "../controllers/aiController.js";

const router = Router();

/**
 * @swagger
 * /api/ai/classify-category:
 *   post:
 *     summary: Классифицировать категорию покупки с помощью AI
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               userId:
 *                 type: string
 *                 description: Опционально. Если указан, будут учтены запрещенные категории пользователя
 *     responses:
 *       200:
 *         description: Категория покупки
 */
router.post("/classify-category", classifyCategoryController);

/**
 * @swagger
 * /api/ai/suggest-blacklist:
 *   post:
 *     summary: Предложить blacklist категорий с помощью AI
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: Список категорий для blacklist
 */
router.post("/suggest-blacklist", suggestBlacklistController);

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Чат с AI ассистентом
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ответ AI
 */
router.post("/chat", chatController);

/**
 * @swagger
 * /api/ai/purchase-advice/{purchaseId}:
 *   get:
 *     summary: Получить совет AI по покупке
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Совет AI
 */
router.get("/purchase-advice/:purchaseId", getPurchaseAdviceController);

/**
 * @swagger
 * /api/ai/parse-profile:
 *   post:
 *     summary: Парсинг профиля пользователя из текста через чат-бот
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *               conversationHistory:
 *                 type: array
 *     responses:
 *       200:
 *         description: Результат парсинга профиля
 */
router.post("/parse-profile", parseProfileController);

export default router;
