import { getUserProfile } from "../services/userService.js";
import Purchase from "../models/Purchase.js";
import {
  listPurchasesByUser,
  createPurchase,
  cancelPurchase,
  markPurchaseAsBought,
  getPurchaseById,
  isPurchaseAllowedNow,
  updatePurchase
} from "../services/purchaseService.js";

export const listPurchases = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const purchases = await listPurchasesByUser(userId);
    res.json(purchases);
  } catch (e) {
    next(e);
  }
};

export const createPurchaseController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await getUserProfile(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const purchase = await createPurchase(user, req.body || {});
    res.status(201).json(purchase);
  } catch (e) {
    next(e);
  }
};

export const cancelPurchaseController = async (req, res, next) => {
  try {
    const { purchaseId } = req.params;
    const p = await cancelPurchase(purchaseId);
    if (!p) return res.status(404).json({ error: "Purchase not found" });
    res.json(p);
  } catch (e) {
    next(e);
  }
};

export const markBoughtController = async (req, res, next) => {
  try {
    const { purchaseId } = req.params;
    const p = await markPurchaseAsBought(purchaseId);
    if (!p) return res.status(404).json({ error: "Purchase not found" });
    res.json(p);
  } catch (e) {
    next(e);
  }
};

export const checkPurchaseAllowedController = async (req, res, next) => {
  try {
    const { purchaseId } = req.params;
    const p = await getPurchaseById(purchaseId);
    if (!p) return res.status(404).json({ error: "Purchase not found" });
    res.json({ allowed: isPurchaseAllowedNow(p), purchase: p });
  } catch (e) {
    next(e);
  }
};
export const updatePurchaseController = async (req, res, next) => {
  try {
    const { purchaseId } = req.params;
    const purchase = await updatePurchase(purchaseId, req.body || {});
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    res.json(purchase);
  } catch (e) {
    next(e);
  }
};

export const updateNotificationController = async (req,res,next)=>{
  try{
    const { id } = req.params;
    const { notifyEnabled, notifyEveryDays } = req.body;

    const p = await Purchase.findByIdAndUpdate(
      id,
      { notifyEnabled, notifyEveryDays },
      { new:true }
    );
    if(!p) return res.status(404).json({error:"Purchase not found"});
    res.json(p);
  }catch(e){ next(e); }
};

