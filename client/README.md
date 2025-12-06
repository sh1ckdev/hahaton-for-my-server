# Rational Assistant - Frontend

Frontend приложение для Rational Assistant на React + Vite.

## Требования

- Docker и Docker Compose
- Node.js 20+ (для локальной разработки без Docker)

## Быстрый старт с Docker

1. Создайте `.env` файл (опционально, для изменения API URL):
```bash
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

2. Запустите контейнер:
```bash
docker-compose up -d
```

3. Приложение будет доступно на `http://localhost:3000`

## Переменные окружения

- `VITE_API_URL` - URL бэкенд API (по умолчанию: `http://localhost:5000/api`)

## Разработка

Для локальной разработки без Docker:

1. Установите зависимости:
```bash
npm install
```

2. Создайте `.env` файл:
```bash
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

3. Запустите dev-сервер:
```bash
npm run dev
```

4. Откройте `http://localhost:5173` в браузере

## Сборка

Для production сборки:

```bash
npm run build
```

Собранные файлы будут в директории `dist/`.

## Структура проекта

```
client/
├── src/
│   ├── api/           # API клиент
│   ├── components/    # React компоненты
│   ├── pages/         # Страницы приложения
│   ├── stores/        # MobX stores
│   └── utils/         # Утилиты
├── Dockerfile
├── docker-compose.yml
└── package.json
```
