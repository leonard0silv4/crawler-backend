import mongoose from "mongoose";

const jobLogSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, enum: ["create", "update"], required: true },
  field: { type: String, required: function () { return this.action === "update"; } },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  ownerId: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("Logs", jobLogSchema);