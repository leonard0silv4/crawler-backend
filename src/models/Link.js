import mongoose from "mongoose";


const LinkSchema = new mongoose.Schema(
  {
    sku: String,
    link: String,
    name: String,
    status: String,
    nowPrice: Number,
    lastPrice: Number,
    image: String,
    uid: String
  },
  {
    toJSON: {
      virtuals: true,
    },
    timestamps: { createdAt: 'created_at' }
  },
  
);



export default mongoose.model("Link", LinkSchema);
