import mongoose from "mongoose";

const cooldownRuleSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    minAmount: { type: Number, required: true },
    maxAmount: { type: Number, required: true },
    days: { type: Number, required: true }
  },
  { timestamps: true }
);

cooldownRuleSchema.index({ userId: 1 });

export default mongoose.model("CooldownRule", cooldownRuleSchema);
