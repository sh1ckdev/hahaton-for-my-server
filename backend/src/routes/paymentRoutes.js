import { Router } from "express";
import { paymentWebhook, paymentStream } from "../controllers/paymentController.js";

const router = Router();

// Эмуляция оплаты от банка
router.post("/webhook", paymentWebhook);

// Живой стрим для фронта (SSE)
router.get("/stream/:userId", paymentStream);

export default router;
