import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, required: false }, 
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    plan: { type: String },
    sendEmail: { type: Boolean },
    storeName: { type: String },
    emailNotify: { type: String },
    lastName: { type: String },
    expiries_at: { type: Date },
    cronInterval: { type: String },
    pixKey: { type: String },
    advanceMoney: { type: Number },
    advanceMoneyLastModified: { type: Date }, 
    address: { type: String },
    phone: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: function () {
      return this.role === "faccionista";
    } }, // relaciona faccionistas ao owner
  }, { timestamps: true });

  userSchema.pre('save', function (next) {
    if (this.isModified('advanceMoney')) {
        this.advanceMoneyLastModified = new Date(); // atualiza data
    }
    next();
  });

  

export default mongoose.model('User', userSchema);