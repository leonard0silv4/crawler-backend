import mongoose from "mongoose";

const CatalogProductSchema = new mongoose.Schema(
  {
    sku1: { type: String, required: true, unique: true },
    sku2: { type: String, default: "" },
    produto: { type: String, required: true },
    medidas: { type: String, required: true },
    largura: { type: Number, required: true },
    comprimento: { type: Number, required: true },
    altura: { type: Number, required: true },
    peso: { type: Number, default: 0 },
    pesoCubico: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CatalogProductSchema.pre("save", function (next) {
  if (this.largura > 0 && this.comprimento > 0 && this.altura > 0) {
    this.pesoCubico =
      Math.round(((this.largura * this.comprimento * this.altura) / 6000) * 1000) / 1000;
  } else {
    this.pesoCubico = 0;
  }
  next();
});

CatalogProductSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  const l = update.largura;
  const c = update.comprimento;
  const a = update.altura;

  if (l != null && c != null && a != null && l > 0 && c > 0 && a > 0) {
    update.pesoCubico = Math.round(((l * c * a) / 5900) * 1000) / 1000;
  }
  next();
});

CatalogProductSchema.index({ sku1: 1 });
CatalogProductSchema.index({ sku2: 1 });
CatalogProductSchema.index({ medidas: 1 });

export default mongoose.model("CatalogProduct", CatalogProductSchema);
