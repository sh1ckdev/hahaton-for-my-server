import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Получаем текущую директорию в ES модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env файл из директории на две уровня выше
const envPath = path.join(__dirname, "..", "..", ".env");
config({ path: envPath });

const uri = process.env.MONGO_URI;

if (!uri) {
  process.exit(1);
}

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

export default mongoose;