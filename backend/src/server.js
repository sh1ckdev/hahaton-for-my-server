import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import "./config/db.js";
import { startNotificationScheduler } from "./services/notificationService.js";
import { startTelegramBotPolling } from "./services/telegramBotService.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // запуск периодического опроса хотелок
  startNotificationScheduler();
  // запуск Telegram бота для обработки команд
  startTelegramBotPolling();
});
