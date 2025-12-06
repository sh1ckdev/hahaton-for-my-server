# Настройка уведомлений (Email и Telegram)

## Email уведомления (SMTP)

### 1. Настройка Gmail (рекомендуется)

1. Перейдите в [Настройки аккаунта Google](https://myaccount.google.com/)
2. Включите двухфакторную аутентификацию
3. Создайте пароль приложения:
   - Перейдите в [Пароли приложений](https://myaccount.google.com/apppasswords)
   - Выберите "Почта" и "Другое устройство"
   - Введите название (например, "Rational Assistant")
   - Скопируйте сгенерированный пароль

4. Добавьте в `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com          # Email для авторизации в SMTP (обязательно)
SMTP_PASSWORD=your_app_password_here    # Пароль приложения (обязательно)
SMTP_FROM=your_email@gmail.com          # Адрес отправителя (опционально, если не указан - используется SMTP_USER)
FRONTEND_URL=http://localhost:3000      # URL вашего фронтенда (для ссылок в уведомлениях)
```

**Объяснение полей:**
- **SMTP_USER** - ваш email адрес для входа в SMTP сервер (обычно совпадает с адресом почты)
- **SMTP_PASSWORD** - пароль для SMTP (для Gmail это пароль приложения, не обычный пароль!)
- **SMTP_FROM** - адрес, который будет показан как отправитель в письме (обычно такой же как SMTP_USER, можно не указывать)

### 2. Настройка другого SMTP сервера

Для других почтовых сервисов измените настройки:

**Yandex:**
```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
```

**Mail.ru:**
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=true
```

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Telegram уведомления

### 1. Создание Telegram бота

1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например, "Rational Assistant Bot")
   - Введите username бота (должен заканчиваться на `bot`, например `rational_assistant_bot`)
4. BotFather пришлет токен, например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Добавление в .env

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
FRONTEND_URL=http://localhost:3000      # URL вашего фронтенда (для ссылок в уведомлениях)
```

### 3. Настройка в приложении (автоматическое подключение)

**Рекомендуемый способ (автоматический):**

1. Откройте настройки уведомлений в приложении
2. Включите канал "Telegram"
3. Включите переключатель "Включить уведомления в Telegram"
4. Нажмите кнопку "Открыть бота в Telegram"
5. Напишите боту команду: `/start ваш_user_id`
   - Ваш User ID отображается в приложении (обычно это ваш идентификатор из системы аутентификации)
6. Нажмите кнопку "Проверить" в приложении
7. Если подключение успешно, появится сообщение "Telegram подключен ✅"

**Альтернативный способ (ручной):**

Если вы хотите использовать другой Chat ID или username:
1. Откройте настройки уведомлений
2. Включите канал "Telegram"
3. В поле "Chat ID" введите ваш Chat ID (можно получить через [@userinfobot](https://t.me/userinfobot))

## Проверка работы

После настройки проверьте логи сервера:
- `[EMAIL] ✅ Email sent successfully` - Email работает
- `[TELEGRAM] ✅ Message sent successfully` - Telegram работает
- `[EMAIL] ⚠️ SMTP credentials not configured` - Email не настроен
- `[TELEGRAM] ⚠️ Telegram Bot Token not configured` - Telegram не настроен

## Важные заметки

1. **Email**: Для Gmail обязательно используйте пароль приложения, обычный пароль не работает
2. **Telegram**: Убедитесь, что пользователь уже написал боту хотя бы одно сообщение перед использованием
3. **Безопасность**: Никогда не коммитьте файл `.env` в git. Используйте `.env.example` для примера
4. **Тестирование**: Можно включить уведомления только для Email или только для Telegram, или оба одновременно

