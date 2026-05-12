import mongoose, { Schema, model, models } from "mongoose";

export interface Item {
  name: string;
  productID: string;
}

export interface ITransaction {
  user_id: mongoose.Types.ObjectId;
  status: string;
  items: Item[];
  purchasedDate: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, required: true },
    items: [
      {
        name: { type: String, required: true },
        productID: { type: String, required: true },
      },
    ],
    purchasedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Transaction =
  models.Transaction || model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
