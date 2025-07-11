import mongoose from "mongoose";

const ProdutoSchema = new mongoose.Schema({
  code: String,
  name: String,
  ean: String,
  ncm: String,
  quantity: Number,
  unitValue: Number,
  icmsValue: Number,
  ipiValue: Number,
  totalValue: Number,
});

const NfeEntrySchema = new mongoose.Schema(
  {
    fornecedor: {
      nome: String,
      cnpj: String,
      telefone: String,
    },
    numeroNota: String,
    dataEmissao: Date,
    valores: {
      vProd: Number,
      vFrete: Number,
      vICMS: Number,
      vIPI: Number,
      vNF: Number,
    },
    produtos: [ProdutoSchema],
    manual: { type: Boolean, default: false },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("NfeEntry", NfeEntrySchema);