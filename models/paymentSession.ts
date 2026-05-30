import { Schema, model, models, InferSchemaType } from "mongoose";

const PaymentSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: { type: String, default: "", index: true },
    productId: { type: String, default: "", index: true },
    productName: { type: String, default: "" },
    productType: { type: String, default: "" },

    amount: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    currency: { type: String, default: "PHP" },

    mode: { type: String, enum: ["test", "live"], required: true },
    paymentMethod: { type: String, default: "paymongo-checkout" },

    checkoutUrl: { type: String, default: "" },
    expiresAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "expired", "completed"],
      default: "pending",
      index: true,
    },

    paid: { type: Boolean, default: false, index: true },

    paymongoPaymentId: { type: String, default: "" },
    livemode: { type: Boolean, default: false },

    transactionId: { type: String, default: "", index: true },
    completedAt: { type: Date, default: null },
    resumeStage: {
      type: String,
      enum: [
        "checkout_created",
        "payment_pending",
        "payment_paid",
        "transaction_created",
        "receipt_uploaded",
        "kit_dispensed",
        "queued_for_analysis",
        "completed",
      ],
      default: "checkout_created",
      index: true,
    },

    lastStatusCheckAt: { type: Date, default: null },
    lastWebhookEvent: { type: String, default: "" },
    rawWebhook: { type: Schema.Types.Mixed, default: null },
    rawCheckoutStatus: { type: Schema.Types.Mixed, default: null },

    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PaymentSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
PaymentSessionSchema.index({ userId: 1, paid: 1, resumeStage: 1, updatedAt: -1 });

export type PaymentSessionType = InferSchemaType<typeof PaymentSessionSchema>;

const PaymentSession =
  models.PaymentSession ||
  model<PaymentSessionType>("PaymentSession", PaymentSessionSchema);

export default PaymentSession;
