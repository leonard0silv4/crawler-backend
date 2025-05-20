import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // ex: "view_links"
  description: { type: String }
});

export default mongoose.model("Permission", permissionSchema);
