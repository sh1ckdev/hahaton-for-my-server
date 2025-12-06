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

# Аргумент для внутреннего порта (build-time)
ARG INTERNAL_PORT=3000

# Переменная окружения для runtime
ENV INTERNAL_PORT=${INTERNAL_PORT}

# Устанавливаем serve для раздачи статических файлов
RUN npm install -g serve

# Копируем собранные файлы из builder
COPY --from=builder /app/dist ./dist

# Открываем порт (используем переменную или значение по умолчанию)
EXPOSE ${INTERNAL_PORT}

# Запускаем serve с портом из переменной окружения
CMD sh -c "serve -s dist -l ${INTERNAL_PORT:-3000}"

