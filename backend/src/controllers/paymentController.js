import { getUserProfile } from "../services/userService.js";
import { createPurchase } from "../services/purchaseService.js";

// список клиентов SSE соединений
const clients = new Map(); // userId -> [res,res,res...]

// webhook = имитация покупки по карте
export const paymentWebhook = async (req, res) => {
  try {
    const { userId, title, price, description } = req.body;
    const user = await getUserProfile(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // создаём покупку как будто банк прислал операцию
    const purchase = await createPurchase(user, {
      title,
      price,
      useAiCategory: true,
      description
    });

    // уведомляем подписанный фронт
    broadcastToUser(userId, {
      type: "NEW_PURCHASE",
      purchase
    });

    return res.json({ status: "ok", purchase });
  } catch (e) {
    console.log("payment error", e);
    res.status(500).json({ error: "paymentWebhook failed" });
  }
};


// --- STREAM / SSE для фронта
export const paymentStream = (req, res) => {
  const { userId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  if (!clients.has(userId)) clients.set(userId, []);
  clients.get(userId).push(res);

  console.log("🔌 Client connected:", userId);

  req.on("close", () => {
    clients.set(
      userId,
      clients.get(userId).filter(r => r !== res)
    );
    console.log("❌ Client disconnected:", userId);
  });
};


// функция для рассылки фронту
function broadcastToUser(userId, data) {
  const receivers = clients.get(userId) || [];
  receivers.forEach(res => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  console.log(`📩 PUSH to ${userId} =>`, data.type);
}
