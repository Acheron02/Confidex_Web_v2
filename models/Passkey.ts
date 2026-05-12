import mongoose, { Schema, models, model } from "mongoose";

const PasskeySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    webauthnUserID: { type: String, required: true, index: true },
    credentialID: { type: String, required: true, unique: true, index: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true, default: 0 },
    deviceType: { type: String, required: true },
    backedUp: { type: Boolean, required: true, default: false },
    transports: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default models.Passkey || model("Passkey", PasskeySchema);
