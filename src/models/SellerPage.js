import mongoose from "mongoose";

const sellerPageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: "" },
    uid: { type: String, required: true },
    active: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("SellerPage", sellerPageSchema);
