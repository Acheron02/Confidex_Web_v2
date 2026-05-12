import mongoose, { Schema, model, models } from "mongoose";

const ReceiptSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },

    boothId: {
      type: Schema.Types.ObjectId,
      ref: "Booth",
      required: false,
      index: true,
    },

    transactionId: { type: String, required: true, index: true },
    timestamp: { type: String, required: true, index: true },
    receipt: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

ReceiptSchema.index({ userId: 1, transactionId: 1 }, { unique: true });

export default models.Receipt || model("Receipt", ReceiptSchema);
