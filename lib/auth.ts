// lib/auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";

export interface User {
  id: string;
  phoneNumber: string;
  gender: string;
  dob: string;
}

interface UserDoc {
  _id: Types.ObjectId;
  phoneNumber: string;
  gender: string;
  dob: string;
}

export async function getUserById(id: string): Promise<User | null> {
  await dbConnect();

  const user = await UserModel.findById(id).lean<UserDoc>();
  if (!user) return null;

  return {
    id: user._id.toString(),
    phoneNumber: user.phoneNumber,
    gender: user.gender,
    dob: user.dob,
  };
}

// ✅ Verify cookie token
export async function verifyAuth(): Promise<string | null> {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    return decoded.userId;
  } catch {
    return null;
  }
}
