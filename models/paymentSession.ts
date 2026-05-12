import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const PaymentSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: { type: String, default: "" },
    productId: { type: String, default: "" },
    productType: { type: String, default: "" },

    amount: { type: Number, required: true },
    currency: { type: String, default: "PHP" },

    mode: { type: String, enum: ["test", "live"], required: true },
    paymentMethod: { type: String, default: "paymongo-checkout" },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "expired"],
      default: "pending",
      index: true,
    },

    paid: { type: Boolean, default: false },

    paymongoPaymentId: { type: String, default: "" },
    livemode: { type: Boolean, default: false },

    lastWebhookEvent: { type: String, default: "" },
    rawWebhook: { type: Schema.Types.Mixed, default: null },

    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type PaymentSessionType = InferSchemaType<typeof PaymentSessionSchema>;

const PaymentSession =
  models.PaymentSession ||
  model<PaymentSessionType>("PaymentSession", PaymentSessionSchema);

export default PaymentSession;
