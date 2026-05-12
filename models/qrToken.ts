import { Schema, models, model } from "mongoose";

const QrTokenSchema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    type: {
      type: String,
      enum: ["login", "discount"],
      required: true,
      index: true,
    },

    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    source: {
      type: String,
      default: null,
      trim: true,
    },

    receiptTransactionId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },

    used: {
      type: Boolean,
      default: false,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

QrTokenSchema.index({ token: 1, type: 1 });
QrTokenSchema.index({ userId: 1, type: 1, used: 1 });

const QrToken = models.QrToken || model("QrToken", QrTokenSchema);

export default QrToken;
