#!/bin/sh
set -e

echo "🚀 Starting backend initialization..."

# Ждем, пока MongoDB будет готова
echo "⏳ Waiting for MongoDB to be ready..."
until nc -z mongodb 27017 2>/dev/null; do
  echo "   MongoDB is unavailable - sleeping"
  sleep 1
done
echo "✅ MongoDB is ready!"

# Инициализируем промпты
echo "📝 Initializing prompts..."
npm run init-prompts

# Запускаем основной процесс
echo "🎯 Starting server..."
exec "$@"
