import mongoose, { Schema, models, model } from "mongoose";

const OtpChallengeSchema = new Schema(
  {
    phoneHash: { type: String, required: true, index: true },
    purpose: {
      type: String,
      enum: ["register", "login"],
      required: true,
      index: true,
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    payload: { type: Schema.Types.Mixed, default: null }, // temp form for register
  },
  { timestamps: true },
);

OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.OtpChallenge || model("OtpChallenge", OtpChallengeSchema);
