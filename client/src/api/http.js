import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  console.error("❌ VITE_API_URL не установлен в переменных окружения!");
  throw new Error("VITE_API_URL is not configured. Please set it in your .env file.");
}

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 8000
});
