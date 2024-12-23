import mongoose from "mongoose";


const LinkSchema = new mongoose.Schema(
  {
    sku: String,
    link: String,
    name: String,
    status: String,
    myPrice : Number,
    nowPrice: Number,
    lastPrice: Number,
    image: String,
    seller: String,
    dateMl: Date,
    uid: String,
    storeName: String,
    ratingSeller: String,
    full: Boolean,
    catalog: Boolean,
    tags: [String],
    history: [
      {
        price: Number,
        seller: String,
        updatedAt: { type: Date, default: Date.now }
      }
    ],
  },
  {
    toJSON: {
      virtuals: true,
    },
    timestamps: { createdAt: 'created_at' }
  },
  
);



export default mongoose.model("Link", LinkSchema);
