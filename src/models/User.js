import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["owner", "faccionista"], required: true }, // Define o tipo de usuário
    plan: { type: String },
    sendEmail: { type: Boolean },
    storeName: { type: String },
    emailNotify: { type: String },
    lastName: { type: String },
    expiries_at: { type: Date },
    cronInterval: { type: String },
    pixKey: { type: String },
    advanceMoney: { type: Number },
    address: { type: String },
    phone: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: function () {
      return this.role === "faccionista";
    } }, // Relaciona faccionistas ao usuário owner
  }, { timestamps: true });
export default mongoose.model('User', userSchema);