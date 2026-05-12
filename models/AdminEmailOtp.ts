import mongoose, { Schema, models, model } from "mongoose";

const AdminEmailOtpSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    email: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

AdminEmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.AdminEmailOtp ||
  model("AdminEmailOtp", AdminEmailOtpSchema);
