import mongoose, { Schema, Document } from "mongoose"
import bcrypt from "bcrypt"
import { ADMIN_ROLE, SUPERADMIN_ROLE, type AdminRole } from "@/lib/rbac"

export interface IAdmin extends Document {
  email: string
  password: string
  name: string
  role: AdminRole
  profileImage?: string
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [ADMIN_ROLE, SUPERADMIN_ROLE],
      default: ADMIN_ROLE,
    },
    profileImage: { type: String, default: "/image.png" },
  },
  { collection: "admins", timestamps: true }
)

AdminSchema.pre("save", async function (next) {
  const admin = this as IAdmin

  if (!admin.isModified("password")) return next()

  admin.password = await bcrypt.hash(admin.password, 10)
  next()
})

export default mongoose.models.Admin ||
  mongoose.model<IAdmin>("Admin", AdminSchema)
