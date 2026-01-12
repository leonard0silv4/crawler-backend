import mongoose from "mongoose";

const ExpedicaoDiaEncerradoSchema = new mongoose.Schema(
  {
    data: {
      type: Date,
      required: true,
      unique: true,
      index: true,
    },
    encerradoEm: {
      type: Date,
      required: true,
    },
    encerradoPor: {
      type: String,
      required: true,
    },
    totalPacotes: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ExpedicaoDiaEncerradoSchema.index({ encerradoEm: -1 });

export default mongoose.model("ExpedicaoDiaEncerrado", ExpedicaoDiaEncerradoSchema);



