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

// Извлекаем имя базы данных из URI для логирования
// Формат: mongodb://user:pass@host:port/database?options
const uriParts = uri.match(/mongodb:\/\/[^/]+\/([^?]+)(\?|$)/);
const dbNameFromUri = uriParts ? uriParts[1] : 'unknown';

// Маскируем пароль в URI для логирования (безопасность)
const uriForLog = uri.replace(/:[^:@]+@/, ":****@");
// Извлекаем хост из URI для логирования
const hostMatch = uri.match(/mongodb:\/\/[^@]+@([^:/]+)/);
const hostFromUri = hostMatch ? hostMatch[1] : 'unknown';

console.log(`📡 Подключение к MongoDB: ${uriForLog}`);
console.log(`🌐 Хост из URI: ${hostFromUri}`);
console.log(`📦 База данных из URI: ${dbNameFromUri}`);

mongoose
  .connect(uri, {
    serverSelectionTimeoutMS: 10000, // Таймаут подключения 10 секунд
    socketTimeoutMS: 45000, // Таймаут сокета 45 секунд
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'unknown'}`);
    console.log(`🌐 Host: ${mongoose.connection.host || 'unknown'}`);
    console.log(`🔌 Port: ${mongoose.connection.port || 'unknown'}`);
    
    // Проверяем список баз данных для диагностики
    try {
      const adminDb = mongoose.connection.db.admin();
      const { databases } = await adminDb.listDatabases();
      console.log(`📚 Доступные базы данных: ${databases.map(db => db.name).join(', ') || 'нет'}`);
      
      // Проверяем, существует ли наша база данных
      const ourDbExists = databases.some(db => db.name === mongoose.connection.db?.databaseName);
      if (ourDbExists) {
        console.log(`✅ База данных "${mongoose.connection.db?.databaseName}" найдена в списке`);
      } else {
        console.log(`⚠️  База данных "${mongoose.connection.db?.databaseName}" будет создана при первой записи`);
      }
    } catch (listError) {
      console.log(`⚠️  Не удалось получить список баз данных (возможна проблема с правами): ${listError.message}`);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:");
    console.error("   Message:", err.message);
    console.error("   Code:", err.code);
    console.error("   Full error:", err);
    process.exit(1);
  });

export default mongoose;