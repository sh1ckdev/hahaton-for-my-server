# Multi-stage build для оптимизации размера образа

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Аргумент для API URL (build-time, требуется для Vite)
ARG VITE_API_URL=http://localhost:5000/api

# Переменная окружения для Vite (Vite требует переменные с префиксом VITE_)
ENV VITE_API_URL=${VITE_API_URL}

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Переменная окружения для порта (жестко установлен 3001)
ENV PORT=3001

# Устанавливаем serve для раздачи статических файлов
RUN npm install -g serve

# Копируем собранные файлы из builder
COPY --from=builder /app/dist ./dist

# Открываем порт 3001
EXPOSE 3001

# Запускаем serve на порту 3001 (serve по умолчанию слушает на всех интерфейсах)
CMD serve -s dist -l 3001

