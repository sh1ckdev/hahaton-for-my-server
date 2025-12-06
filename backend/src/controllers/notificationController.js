import Notification from "../models/Notification.js";

// Получить последние уведомления пользователя
export const listNotificationsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    console.log(`[NOTIFICATIONS API] 📥 GET /notifications/${userId}`);
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    console.log(`[NOTIFICATIONS API] ✅ Found ${notifications.length} notifications for user ${userId}`);
    res.json(notifications);
  } catch (e) {
    console.error(`[NOTIFICATIONS API] ❌ Error loading notifications:`, e);
    next(e);
  }
};

// Отметить все уведомления пользователя как прочитанные
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const { userId } = req.params;

    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    const updated = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(updated);
  } catch (e) {
    next(e);
  }
};

// Тестовый endpoint для создания уведомления вручную (для отладки)
export const createTestNotification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { message, purchaseId } = req.body;

    const notification = await Notification.create({
      userId,
      purchaseId: purchaseId || "test-purchase-id",
      message: message || "Тестовое уведомление для проверки работы системы"
    });

    console.log(`[NOTIFICATIONS API] ✅ Test notification created:`, notification);
    res.json(notification);
  } catch (e) {
    console.error(`[NOTIFICATIONS API] ❌ Error creating test notification:`, e);
    next(e);
  }
};


