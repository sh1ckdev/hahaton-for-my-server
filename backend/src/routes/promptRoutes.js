import express from "express";
import { listPrompts, getPrompt, createOrUpdatePrompt, removePrompt } from "../controllers/promptController.js";

const router = express.Router();

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: Получить все промпты
 *     tags: [Prompts]
 *     responses:
 *       200:
 *         description: Список промптов
 */
router.get("/", listPrompts);

/**
 * @swagger
 * /api/prompts/{key}:
 *   get:
 *     summary: Получить промпт по ключу
 *     tags: [Prompts]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Промпт
 *       404:
 *         description: Промпт не найден
 */
router.get("/:key", getPrompt);

/**
 * @swagger
 * /api/prompts/{key}:
 *   put:
 *     summary: Создать или обновить промпт
 *     tags: [Prompts]
 *     parameters:
 *       - in: path
 *         name: key
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
 *               - template
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               template:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Промпт создан/обновлен
 */
router.put("/:key", createOrUpdatePrompt);

/**
 * @swagger
 * /api/prompts/{key}:
 *   delete:
 *     summary: Удалить промпт
 *     tags: [Prompts]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Промпт удален
 *       404:
 *         description: Промпт не найден
 */
router.delete("/:key", removePrompt);

export default router;

