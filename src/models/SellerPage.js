import mongoose from "mongoose";

const sellerPageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: "" },
    uid: { type: String, required: true },
    active: { type: Boolean, default: true },
    scraping: { type: Boolean, default: false },
    scrapingStartedAt: { type: Date, default: null }, // quando o scraping atual foi iniciado
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("SellerPage", sellerPageSchema);
