// app/api/qr-tokens/generate/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await QrToken.updateMany(
      {
        userId,
        type: "login",
        used: false,
      },
      {
        $set: { used: true },
      },
    );

    const token = "LOGIN-" + Math.random().toString(36).substring(2, 12);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await QrToken.create({
      token,
      userId,
      type: "login",
      used: false,
      expiresAt,
    });

    return NextResponse.json(
      {
        token,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[GENERATE LOGIN QR] error:", err);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 },
    );
  }
}
