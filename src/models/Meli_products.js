import mongoose from "mongoose";

const HistorySellSchema = new mongoose.Schema({
  day: { type: Date, required: true },
  sellQty: { type: Number, required: true },
  sellQtyAcumulado: { type: Number }, 
  shippingCost: { type: Number }, 
});

const MeliProductSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  SKU: String,
  title: String,
  image: String,
  price: Number,
  available_quantity: Number,
  sold_quantity: Number,
  thumbnail: String,
  permalink: String,
  start_time: Date,
  stop_time: Date,
  expiration_time: Date,
  status: String,
  estoque_full: Number,
  health: Number,
  contaId: { type: mongoose.Schema.Types.ObjectId, ref: "Conta" },
  user_id: Number,
  averageSellDay: Number,
  shippingCost: Number,
  nickname: String,
  isFull : Boolean,
  listingTypeId: String,
  alertRuptura: String,
  daysRestStock: Number,
  historySell: [HistorySellSchema],
  variations: [
  {
    id: String,
    attributes: [
      {
        name: String,
        value_name: String,
      },
    ],
    available_quantity: Number,
  },
],
}, { timestamps: true });

export default mongoose.model("MeliProduct", MeliProductSchema);
