import mongoose from "mongoose";

const ExpedicaoMetaSchema = new mongoose.Schema(
  {
    data: {
      type: Date,
      required: true,
      unique: true,
      index: true,
    },
    tipoConfiguracao: {
      type: String,
      required: true,
      enum: ["total", "porSeller"],
    },
    total: {
      type: Number,
      default: null,
    },
    porSeller: {
      mercadoLivre: { type: Number, default: null },
      shopee: { type: Number, default: null },
      amazon: { type: Number, default: null },
      outros: { type: Number, default: null },
    },
    horariosColeta: {
      mercadoLivre: { type: String, default: "11:00" },
      shopee: { type: String, default: "14:00" },
      amazon: { type: String, default: "16:00" },
      outros: { type: String, default: "17:30" },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ExpedicaoMeta", ExpedicaoMetaSchema);

