import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Получаем текущую директорию в ES модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env файл из директории на две уровня выше (опционально, если файл существует)
// В Docker переменные окружения передаются через environment, так что это просто fallback
const envPath = path.join(__dirname, "..", "..", ".env");
config({ path: envPath });

// Используем только MONGO_URI для подключения к внешней БД
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("❌ MONGO_URI не установлен в переменных окружения!");
  process.exit(1);
}

// Маскируем пароль в URI для логирования (безопасность)
const uriForLog = uri.replace(/:[^:@]+@/, ":****@");

console.log(`📡 Подключение к внешней MongoDB: ${uriForLog}`);

mongoose
  .connect(uri, {
    serverSelectionTimeoutMS: 10000, // Таймаут подключения 10 секунд
    socketTimeoutMS: 45000, // Таймаут сокета 45 секунд
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'unknown'}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:");
    console.error("   Message:", err.message);
    console.error("   Code:", err.code);
    process.exit(1);
  });

export default mongoose;