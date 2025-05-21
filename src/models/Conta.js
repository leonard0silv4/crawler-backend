import mongoose from "mongoose";

const ContaSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  nickname: String,
  access_token: String,
  refresh_token: String,
  expires_at: Date, 
  uid: String,
  disabled : Boolean
}, { timestamps: true });

export default mongoose.model('Conta', ContaSchema);