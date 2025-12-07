# Используем официальный образ Node.js
FROM node:20-alpine

# Устанавливаем netcat для проверки доступности MongoDB
RUN apk add --no-cache netcat-openbsd

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Копируем и делаем исполняемым entrypoint скрипт
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Открываем порт
EXPOSE 5000

# Используем entrypoint для инициализации промптов перед запуском
ENTRYPOINT ["docker-entrypoint.sh"]

# Запускаем приложение
CMD ["npm", "start"]

