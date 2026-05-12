// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { sha256Phone } from "@/app/utils/hashPhone";
import { generateUniqueUsernameWithPhone } from "@/app/utils/generateUsername";
import { encryptPhone } from "@/lib/phoneCrypt";

const JWT_SECRET = process.env.JWT_SECRET as string;

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
    const gender = String(body.gender || "")
      .trim()
      .toLowerCase();
    const dobStr = String(body.dob || "").trim();

    if (!rawPhone || !gender || !dobStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(rawPhone);

    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth" },
        { status: 400 },
      );
    }

    const phoneHash = sha256Phone(phone);
    const phoneEncrypted = encryptPhone(phone);

    const existingUser = await User.findOne({ phoneHash });
    if (existingUser) {
      return NextResponse.json(
        {
          error: "Phone number already registered",
          username: existingUser.username,
        },
        { status: 409 },
      );
    }

    const username = await generateUniqueUsernameWithPhone(phone);

    const user = await User.create({
      phoneHash,
      phoneNumber: phoneEncrypted,
      gender,
      dob,
      username,
    });

    const token = jwt.sign({ id: user._id.toString(), phoneHash }, JWT_SECRET, {
      expiresIn: "5m",
    });

    const response = NextResponse.json(
      {
        user: {
          _id: user._id.toString(),
          username: user.username,
          gender: user.gender,
          dob: user.dob,
          createdAt: user.createdAt,
        },
        token,
      },
      { status: 201 },
    );

    response.headers.append(
      "Set-Cookie",
      serialize("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 5 * 60,
        path: "/",
      }),
    );

    return response;
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
