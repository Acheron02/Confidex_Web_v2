// app/api/checkPhone/route.ts
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { sha256Phone } from "@/app/utils/hashPhone";
import bcrypt from "bcrypt";

interface IUser {
  phoneNumber: string;
  phoneHash: string;
  username: string;
  gender: string;
  dob: Date;
  createdAt: Date;
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const phone = String(body.phoneNumber || "").trim();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const phoneHash = sha256Phone(phone);
    const user = (await User.findOne({ phoneHash }).lean()) as IUser | null;

    if (!user) {
      return NextResponse.json(
        { exists: false, message: "Phone number not registered" },
        { status: 200 }
      );
    }

    // double check with bcrypt
    const isMatch = await bcrypt.compare(phone, user.phoneNumber);
    if (!isMatch) {
      return NextResponse.json(
        { exists: false, message: "Phone number mismatch" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      exists: true,
      message: "Phone number registered",
      username: user.username,
    });
  } catch (err: any) {
    console.error("Check phone error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
