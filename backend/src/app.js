import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

import userRoutes from "./routes/userRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import promptRoutes from "./routes/promptRoutes.js";

const app = express();

// Разрешенные origins для CORS - ТОЛЬКО из переменных окружения
const parseOrigins = (raw) => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseOrigins(process.env.CLIENT_ORIGIN);

if (allowedOrigins.length === 0) {
  console.error("❌ CLIENT_ORIGIN не установлен в переменных окружения. CORS не будет работать!");
  process.exit(1);
}

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, мобильные приложения, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS: Origin "${origin}" не разрешен. Разрешенные: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan("dev"));

// Swagger документация
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// корневой пинг
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Rational Assistant API" });
});

// маршруты
app.use("/api/users", userRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/prompts", promptRoutes);

// обработка ошибок
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

export default app;
