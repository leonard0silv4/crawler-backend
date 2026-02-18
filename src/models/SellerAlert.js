import mongoose from "mongoose";

const sellerAlertSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerPage",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerProduct",
      default: null,
    },
    productName: { type: String, default: "" },
    type: {
      type: String,
      enum: ["price_change", "new_product"],
      required: true,
    },
    oldPrice: { type: Number, default: 0 },
    newPrice: { type: Number, default: 0 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("SellerAlert", sellerAlertSchema);
