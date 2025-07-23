import mongoose from "mongoose";

const sourceSummarySchema = new mongoose.Schema({
  source: String,
  totalOrders: Number,
  totalProductsAmount: Number,
  totalShipping: Number,
  totalAmount: Number,
});

const hourlySchema = new mongoose.Schema({
  hour: String,
  totalAmount: Number,
});

const baseLinkerMonthlySummarySchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // proteções aqui
    summary: [sourceSummarySchema],
    hourlySales: [hourlySchema],
  },
  { timestamps: true }
);

// ✅ EVITA recriação do model
export default mongoose.models.BaseLinkerMonthlySummary ||
  mongoose.model("BaseLinkerMonthlySummary", baseLinkerMonthlySummarySchema);
