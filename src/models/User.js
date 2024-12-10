import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
 username: { type: String, unique: true, required: true },
 password: { type: String, required: true },
 plan: { type: String },
 sendEmail: { type: Boolean },
 storeName: { type: String },
 emailNotify: { type: String },
 expiries_at: { type: Date },
 cronInterval: { type: String }, // Novo campo para armazenar o intervalo do cron

 
 });
export default mongoose.model('User', userSchema);