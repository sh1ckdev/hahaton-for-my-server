# PowerShell скрипт для автоматической загрузки сертификата Минцифры

$certDir = ".\certs"
$certFile = "$certDir\russian_trusted_root_ca_pem.crt"

Write-Host "📥 Загрузка сертификата Минцифры..." -ForegroundColor Cyan

# Создаем папку для сертификатов
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

# Загружаем сертификат
try {
    Invoke-WebRequest -Uri "https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt" -OutFile $certFile -SkipCertificateCheck
    Write-Host "✅ Сертификат успешно загружен в $certFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Добавьте в .env файл:" -ForegroundColor Yellow
    Write-Host "GIGACHAT_CA_BUNDLE=./certs/russian_trusted_root_ca_pem.crt" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Ошибка при загрузке сертификата: $_" -ForegroundColor Red
    exit 1
}

