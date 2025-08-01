import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    descricao: { type: String },
    preco: { type: Number, required: true },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);