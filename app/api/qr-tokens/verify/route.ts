// app/api/qr-tokens/verify/route.ts
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { broadcast } from "@/server/webSocket";

type UserType = {
  _id: string | { toString(): string };
  username: string;
  phoneNumber: string;
  gender: "male" | "female" | "other";
  dob: Date;
  createdAt: Date;
};

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body.qrCode) {
      return NextResponse.json(
        { error: "qrCode is required" },
        { status: 400 },
      );
    }

    const qrCode = String(body.qrCode).trim();

    if (!qrCode.startsWith("LOGIN-")) {
      return NextResponse.json(
        { error: "Invalid QR code type" },
        { status: 401 },
      );
    }

    const qrRecord = await QrToken.findOne({
      token: qrCode,
      type: "login",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!qrRecord) {
      return NextResponse.json(
        { error: "QR code expired, already used, or invalid" },
        { status: 401 },
      );
    }

    const user = (await User.findById(
      qrRecord.userId,
    ).lean()) as UserType | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    qrRecord.used = true;
    await qrRecord.save();

    broadcast({
      type: "qr_scanned",
      userId: qrRecord.userId.toString(),
      token: qrRecord.token,
    });

    return NextResponse.json(
      {
        message: "QR scanned successfully",
        user: {
          _id: user._id.toString(),
          username: user.username,
          gender: user.gender,
          dob: user.dob,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[QR VERIFY] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
