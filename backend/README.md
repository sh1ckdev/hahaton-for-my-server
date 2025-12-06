# Rational Assistant - Backend

Backend сервер для приложения Rational Assistant.

## Требования

- Docker и Docker Compose
- Node.js 20+ (для локальной разработки без Docker)

## Быстрый старт с Docker

1. Скопируйте `.env.example` в `.env` и заполните необходимые переменные:
```bash
cp .env.example .env
```

2. Запустите сервисы:
```bash
docker-compose up -d
```

3. Backend будет доступен на `http://localhost:5000`
4. MongoDB будет доступна на `mongodb://localhost:27017`

## Переменные окружения

См. `.env.example` для списка всех необходимых переменных окружения.

## Разработка

Для локальной разработки без Docker:

1. Установите зависимости:
```bash
npm install
```

2. Запустите MongoDB локально или используйте MongoDB из Docker:
```bash
docker-compose up -d mongodb
```

3. Создайте `.env` файл с переменными окружения

4. Запустите сервер:
```bash
npm run dev
```

## API Документация

После запуска сервера, Swagger документация доступна по адресу:
`http://localhost:5000/api-docs`

## Структура проекта

```
backend/
├── src/
│   ├── config/        # Конфигурация (DB, Swagger)
│   ├── controllers/   # Контроллеры API
│   ├── models/        # Mongoose модели
│   ├── routes/        # Express маршруты
│   ├── services/      # Бизнес-логика
│   └── utils/         # Утилиты
├── Dockerfile
├── docker-compose.yml
└── package.json
```

