import { Schema, model, models, InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, index: true },
    phoneNumber: { type: String, required: true, unique: true, index: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date, required: true },
    hasPasskey: { type: Boolean, default: false },
    webauthnUserID: { type: String, default: null },
  },
  { timestamps: true },
);

export type UserType = InferSchemaType<typeof UserSchema>; // includes _id

const User = models.User || model<UserType>("User", UserSchema);
export default User;
