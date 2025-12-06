import { Router } from "express";
import {
  listGoalsController,
  getGoalController,
  createGoalController,
  updateGoalController,
  deleteGoalController
} from "../controllers/goalController.js";

const router = Router();

/**
 * @swagger
 * /api/goals/{userId}:
 *   get:
 *     summary: Получить список целей пользователя
 *     tags: [Goals]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeCompleted
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Список целей
 */
router.get("/:userId", listGoalsController);

/**
 * @swagger
 * /api/goals/item/{id}:
 *   get:
 *     summary: Получить цель по ID
 *     tags: [Goals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Цель
 */
router.get("/item/:id", getGoalController);

/**
 * @swagger
 * /api/goals/{userId}:
 *   post:
 *     summary: Создать новую цель
 *     tags: [Goals]
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
 *               priority:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Созданная цель
 */
router.post("/:userId", createGoalController);

/**
 * @swagger
 * /api/goals/{id}:
 *   patch:
 *     summary: Обновить цель
 *     tags: [Goals]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               priority:
 *                 type: number
 *               description:
 *                 type: string
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Обновленная цель
 */
router.patch("/:id", updateGoalController);

/**
 * @swagger
 * /api/goals/{id}:
 *   delete:
 *     summary: Удалить цель
 *     tags: [Goals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Цель удалена
 */
router.delete("/:id", deleteGoalController);

export default router;

