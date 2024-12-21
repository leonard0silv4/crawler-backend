import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    lote: { type: String, required: true },
    data: { type: Date, required: true },
    qtd: { type: Number, required: true },
    larg: { type: Number, required: true },
    compr: { type: Number, required: true },
    emenda: { type: Boolean, default: false},
    totMetros: { type: Number, required: true }, // Total de metros
    orcamento: { type: Number, required: true },
    recebidoConferido: { type: Boolean, default: false },
    dataRecebidoConferido: { type: Date },
    lotePronto: { type: Boolean, default: false },
    dataLotePronto: { type: Date },
    recebido: { type: Boolean, default: false },
    aprovado: { type: Boolean, default: false },
    emAnalise: { type: Boolean, default: false },
    pago: { type: Boolean, default: false },
    dataPgto: { type: Date },
    caixa: { type: String },
    isArchived: { type: Boolean, default: false },
    faccionistaId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Relaciona a costura ao faccionista
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Relaciona a costura ao owner
  }, { timestamps: true });


  jobSchema.pre("find", function () {
    this.where({ isArchived: { $ne: true } });
  });
  
  jobSchema.pre("findOne", function () {
    this.where({ isArchived: { $ne: true } });
  });
  
  export default mongoose.model("Job", jobSchema);