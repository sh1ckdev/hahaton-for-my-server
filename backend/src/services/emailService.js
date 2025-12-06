import nodemailer from "nodemailer";

// Создаем транспортер для отправки email
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    console.warn("[EMAIL] ⚠️ SMTP credentials not configured. Email notifications will be disabled.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true для 465, false для других портов
    auth: {
      user: smtpUser,
      pass: smtpPassword
    }
  });
};

/**
 * Отправка email уведомления
 * @param {string} to - Email получателя
 * @param {string} subject - Тема письма
 * @param {string} text - Текст письма
 * @param {string} html - HTML версия письма (опционально)
 * @returns {Promise<boolean>} - true если отправлено успешно
 */
export const sendEmail = async (to, subject, text, html = null) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log(`[EMAIL] ⏭️ Skipping email to ${to} - SMTP not configured`);
      return false;
    }

    // SMTP_USER - логин для авторизации в SMTP сервере (обязательно)
    // SMTP_FROM - адрес отправителя в письме (если не указан, используется SMTP_USER)
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, "<br>")
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Email sent successfully to ${to}:`, info.messageId);
    return true;
  } catch (error) {
    console.error(`[EMAIL] ❌ Failed to send email to ${to}:`, error.message);
    return false;
  }
};

/**
 * Отправка уведомления о покупке в вишлисте
 * @param {string} email - Email получателя
 * @param {Object} purchase - Объект покупки
 * @returns {Promise<boolean>}
 */
export const sendPurchaseNotification = async (email, purchase) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const cleanUrl = frontendUrl.replace(/\/+$/, ''); // Убираем trailing slash
  const wishlistUrl = `${cleanUrl}/wishlist`;
  
  console.log(`[EMAIL] 📧 Preparing notification email for purchase "${purchase.title}" to ${email}`);
  console.log(`[EMAIL] 🔗 Wishlist URL: ${wishlistUrl}`);
  
  const subject = "Напоминание о покупке из вишлиста";
  const text = `Ты всё ещё хочешь купить "${purchase.title}" за ${purchase.price}₽?\n\nОткрой вишлист: ${wishlistUrl}${purchase.url ? `\nПерейти к товару: ${purchase.url}` : ''}`;
  
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0D0D0D; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #1A1A1A; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FFDD2D 0%, #FFE855 100%); padding: 30px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <div style="width: 48px; height: 48px; background-color: #333333; border-radius: 12px; display: inline-block; position: relative;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFDD2D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                      Напоминание о покупке
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 18px; line-height: 1.6;">
                Ты всё ещё хочешь купить
              </p>
              
              <div style="background-color: #0D0D0D; border: 2px solid #333333; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #FFDD2D; font-size: 20px; font-weight: 600;">
                  "${purchase.title}"
                </p>
                <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                  ${purchase.price.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              
              <!-- Buttons -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${wishlistUrl}" style="display: inline-block; background-color: #FFDD2D; color: #333333; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 221, 45, 0.3);">
                      <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                          <polyline points="17 21 17 13 7 13 7 21"></polyline>
                          <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                      </span>
                      Открыть вишлист
                    </a>
                  </td>
                </tr>
                ${purchase.url ? `
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${purchase.url}" style="display: inline-block; background-color: transparent; color: #FFDD2D; text-decoration: none; padding: 12px 32px; border: 2px solid #FFDD2D; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 10px;">
                      <span style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFDD2D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                          <circle cx="9" cy="21" r="1"></circle>
                          <circle cx="20" cy="21" r="1"></circle>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                      </span>
                      Перейти к товару
                    </a>
                  </td>
                </tr>
                ` : ''}
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0D0D0D; padding: 20px 30px; text-align: center; border-top: 1px solid #333333;">
              <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.5;">
                Это автоматическое напоминание от <strong style="color: #FFDD2D;">Rational Assistant</strong><br>
                Вы получили это письмо, потому что у вас включены уведомления по Email
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return await sendEmail(email, subject, text, html);
};

