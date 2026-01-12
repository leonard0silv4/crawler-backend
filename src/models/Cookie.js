import mongoose from "mongoose";

const CookieSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    domain: {
      type: String,
      default: "",
    },
    path: {
      type: String,
      default: "/",
    },
    expiry: {
      type: Number,
    },
    httpOnly: {
      type: Boolean,
      default: false,
    },
    secure: {
      type: Boolean,
      default: false,
    },
    sameSite: {
      type: String,
      enum: ["Strict", "Lax", "None", null],
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "cookies", 
  }
);

export default mongoose.model("Cookie", CookieSchema);

