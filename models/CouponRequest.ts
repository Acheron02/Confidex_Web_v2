import { Schema, model, models } from "mongoose";

const CouponRequestSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    transactionId: {
      type: String,
      required: true,
      index: true,
    },

    receiptId: {
      type: Schema.Types.ObjectId,
      ref: "Receipt",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    adminNote: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedBy: {
      type: String,
      default: null,
      index: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    couponToken: {
      type: String,
      default: null,
      index: true,
    },

    verification: {
      boothPrintStatus: {
        type: String,
        default: "unknown",
      },

      printerFunctionAvailable: {
        type: Boolean,
        default: false,
      },

      boothRecordedToken: {
        type: String,
        default: null,
      },

      attemptedAt: {
        type: String,
        default: null,
      },

      completedAt: {
        type: String,
        default: null,
      },

      boothPrintError: {
        type: String,
        default: null,
      },
    },
  },
  { timestamps: true },
);

CouponRequestSchema.index({ userId: 1, transactionId: 1 }, { unique: true });

export default models.CouponRequest ||
  model("CouponRequest", CouponRequestSchema);
