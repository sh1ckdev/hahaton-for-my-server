import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    category: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending"
    },
    linkedPurchaseId: { type: String, default: null }
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1 });

export default mongoose.model("Payment", paymentSchema);
