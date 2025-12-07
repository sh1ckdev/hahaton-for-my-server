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

// Поддерживаем оба варианта переменных окружения для совместимости
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!uri) {
  console.error("❌ MONGODB_URI или MONGO_URI не установлен в переменных окружения!");
  console.error("Проверьте переменные окружения:", {
    MONGODB_URI: process.env.MONGODB_URI ? "установлен" : "не установлен",
    MONGO_URI: process.env.MONGO_URI ? "установлен" : "не установлен"
  });
  process.exit(1);
}

// Маскируем пароль в URI для логирования (безопасность)
const uriForLog = uri.replace(/:[^:@]+@/, ":****@");
console.log(`📡 Подключение к MongoDB: ${uriForLog}`);

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Таймаут подключения 10 секунд
    socketTimeoutMS: 45000, // Таймаут сокета 45 секунд
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'unknown'}`);
    console.log(`🌐 Host: ${mongoose.connection.host || 'unknown'}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:");
    console.error("   Message:", err.message);
    console.error("   Code:", err.code);
    console.error("   Full error:", err);
    process.exit(1);
  });

export default mongoose;