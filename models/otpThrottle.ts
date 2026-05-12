import mongoose, { Schema, model, models } from "mongoose";

const OtpThrottleSchema = new Schema(
  {
    phoneHash: {
      type: String,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["login", "register"],
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lockLevel: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

OtpThrottleSchema.index({ phoneHash: 1, purpose: 1 }, { unique: true });

const OtpThrottle =
  models.OtpThrottle || model("OtpThrottle", OtpThrottleSchema);

export default OtpThrottle;
