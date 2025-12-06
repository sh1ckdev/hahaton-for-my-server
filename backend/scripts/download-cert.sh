#!/bin/bash
# Скрипт для автоматической загрузки сертификата Минцифры

CERT_DIR="./certs"
CERT_FILE="$CERT_DIR/russian_trusted_root_ca_pem.crt"

echo "📥 Загрузка сертификата Минцифры..."

# Создаем папку для сертификатов
mkdir -p "$CERT_DIR"

# Загружаем сертификат
curl -k "https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt" -o "$CERT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Сертификат успешно загружен в $CERT_FILE"
    echo ""
    echo "Добавьте в .env файл:"
    echo "GIGACHAT_CA_BUNDLE=./certs/russian_trusted_root_ca_pem.crt"
else
    echo "❌ Ошибка при загрузке сертификата"
    exit 1
fi

