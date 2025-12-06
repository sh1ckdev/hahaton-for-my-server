import Payment from "../models/Payment.js";
import { createPurchase } from "./purchaseService.js";

export const createMockPayment = async (user, { amount, description, category }) => {
  const payment = await Payment.create({
    userId: user.userId,
    amount,
    description: description || `Покупка на ${amount}`,
    category: category || null
  });
  return payment;
};

export const listPaymentsByUser = (userId) =>
  Payment.find({ userId }).sort({ createdAt: -1 });

export const getPaymentById = (id) => Payment.findById(id);

export const confirmPayment = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) return null;
  payment.status = "confirmed";
  await payment.save();
  return payment;
};

// отклоняем платёж и кидаем в хотелки
export const rejectPaymentToWishlist = async (user, payment) => {
  const purchase = await createPurchase(user, {
    title: payment.description,
    price: payment.amount,
    useAiCategory: true
  });
  payment.status = "rejected";
  payment.linkedPurchaseId = purchase._id.toString();
  await payment.save();
  return purchase;
};
