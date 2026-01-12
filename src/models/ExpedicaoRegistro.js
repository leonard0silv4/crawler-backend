import mongoose from "mongoose";

const ExpedicaoRegistroSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mesaId: {
      type: String,
      required: true,
      enum: ["M1", "M2", "M3", "M4"],
      index: true,
    },
    seller: {
      type: String,
      enum: ["mercadoLivre", "shopee", "amazon", "outros", null],
      default: null,
    },
    dataContabilizacao: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compostos para otimização
ExpedicaoRegistroSchema.index({ mesaId: 1, createdAt: -1 });
ExpedicaoRegistroSchema.index({ dataContabilizacao: 1, seller: 1 });
ExpedicaoRegistroSchema.index({ dataContabilizacao: 1, mesaId: 1 });

export default mongoose.model("ExpedicaoRegistro", ExpedicaoRegistroSchema);



