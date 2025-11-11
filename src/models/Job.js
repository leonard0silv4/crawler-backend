import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  lote: { type: String, required: true },
  data: { type: Date, required: true },
  qtd: { type: Number, required: true },
  larg: { type: Number, required: true },
  compr: { type: Number, required: true },
  emenda: { type: Boolean, default: false },
  totMetros: { type: Number, required: true },
  orcamento: { type: Number, required: true },
  recebidoConferido: { type: Boolean, default: false },
  dataRecebidoConferido: { type: Date },
  receivedCheckedByQrCode: { type: Boolean, default: false },
  lotePronto: { type: Boolean, default: false },
  dataLotePronto: { type: Date },
  recebido: { type: Boolean, default: false },
  dataRecebido: { type: Date },
  aprovado: { type: Boolean, default: false },
  dataAprovado: { type: Date },
  emAnalise: { type: Boolean, default: false },
  pago: { type: Boolean, default: false },
  dataPgto: { type: Date },
  caixa: { type: String },
  qtdRolo: { type: Number },
  rateLote: { type: Number },
  advancedMoneyPayment: { type: Number },
  observacao: { type: String },
  isArchived: { type: Boolean, default: false },
  faccionistaId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });


jobSchema.pre("find", function () {
  if (!this.getOptions().bypassMiddleware) {
    this.where({ isArchived: { $ne: true } });
  }
});

jobSchema.pre("findOne", function () {
  if (!this.getOptions().bypassMiddleware) {
    this.where({ isArchived: { $ne: true } });
  }
});

export default mongoose.model("Job", jobSchema);