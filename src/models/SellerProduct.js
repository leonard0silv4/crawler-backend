import mongoose from "mongoose";

const priceEntrySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  { _id: false }
);

const sellerProductSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerPage",
      required: true,
    },
    url: { type: String, required: true }, // clean URL sem query params — identificador único do produto
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    sku: { type: String, default: "" }, // MLB ID extraído da URL
    currentPrice: { type: Number, default: 0 },
    priceHistory: { type: [priceEntrySchema], default: [] }, // máximo 4 entradas, uma por dia
    isNew: { type: Boolean, default: false }, // adicionado na última execução
    priceChanged: { type: Boolean, default: false }, // preço alterado na última execução
  },
  { timestamps: true }
);

sellerProductSchema.index({ sellerId: 1, url: 1 }, { unique: true });

export default mongoose.model("SellerProduct", sellerProductSchema);
