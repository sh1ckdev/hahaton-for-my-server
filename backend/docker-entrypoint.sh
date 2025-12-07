#!/bin/sh
set -e

echo "🚀 Starting backend initialization..."

# Инициализируем промпты (MongoDB подключается автоматически через MONGO_URI из переменных окружения)
echo "📝 Initializing prompts..."
npm run init-prompts

# Запускаем основной процесс
echo "🎯 Starting server..."
exec "$@"
