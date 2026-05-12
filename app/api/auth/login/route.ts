// app/api/auth/login/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { serialize } from "cookie";
import jwt from "jsonwebtoken";
import { sha256Phone } from "@/app/utils/hashPhone";
import type { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET as string;

type LeanUser = {
  _id: Types.ObjectId;
  username: string;
  gender: string;
  dob: Date;
  createdAt: Date;
  phoneHash: string;
  phoneNumber: string;
};

function normalizePhone(phone: string): string {
  const trimmed = phone.replace(/\s+/g, "").trim();

  if (trimmed.startsWith("+63")) return trimmed;
  if (trimmed.startsWith("0")) return `+63${trimmed.slice(1)}`;
  return trimmed;
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const rawPhone = String(body.phoneNumber || "").trim();
    if (!rawPhone) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(rawPhone);
    const phoneHash = sha256Phone(phone);

    const matchedUser = await User.findOne({
      phoneHash,
    }).lean<LeanUser | null>();

    if (!matchedUser) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const token = jwt.sign(
      { id: matchedUser._id.toString(), phoneHash },
      JWT_SECRET,
      { expiresIn: "5m" },
    );

    const res = NextResponse.json(
      {
        message: "Login successful",
        user: {
          _id: matchedUser._id.toString(),
          username: matchedUser.username,
          gender: matchedUser.gender,
          dob: matchedUser.dob,
          createdAt: matchedUser.createdAt,
        },
      },
      { status: 200 },
    );

    res.headers.set(
      "Set-Cookie",
      serialize("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 5 * 60,
        path: "/",
      }),
    );

    return res;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
