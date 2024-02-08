import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
 username: { type: String, unique: true, required: true },
 password: { type: String, required: true },
 md_id: { type: String },
 plan: { type: String },
 expiries_at: { type: Date },
 alwaysFree: { type: Boolean },
 });
export default mongoose.model('User', userSchema);