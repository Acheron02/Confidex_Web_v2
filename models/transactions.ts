import mongoose, { Schema, model, models } from "mongoose";

export interface Item {
  name: string;
  productID: string;
  type?: string;
  price?: number;
  discount?: number;
  finalPrice?: number;
  result?: string;
}

export interface ITransaction {
  user_id: mongoose.Types.ObjectId;
  status: string;
  items: Item[];
  purchasedDate: Date;
  payment_method?: string;
  payment_session_id?: string;
  payment_reference?: string;
  payment_status?: string;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, required: true, trim: true },
    items: [
      {
        name: { type: String, required: true, trim: true },
        productID: { type: String, required: true, trim: true },
        type: { type: String, default: "", trim: true },
        price: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 },
        result: { type: String, default: "Pending", trim: true },
      },
    ],
    purchasedDate: { type: Date, default: Date.now },
    payment_method: { type: String, default: "", trim: true },
    payment_session_id: { type: String, default: "", trim: true, index: true },
    payment_reference: { type: String, default: "", trim: true },
    payment_status: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

transactionSchema.index({ user_id: 1, purchasedDate: -1 });
const Transaction =
  models.Transaction || model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
