import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  priority: { type: Number, default: 1, min: 1, max: 10 }, // 1 = высший приоритет, 10 = низший
  description: { type: String, default: "" },
  isCompleted: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Индекс для быстрого поиска целей пользователя, отсортированных по приоритету
goalSchema.index({ userId: 1, priority: 1, isCompleted: 1 });

export default mongoose.model("Goal", goalSchema);

