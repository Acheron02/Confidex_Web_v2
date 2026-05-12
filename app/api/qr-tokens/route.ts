// app/api/qr-tokens/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, token } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 },
      );
    }

    if (!token || !String(token).trim()) {
      return NextResponse.json(
        { success: false, error: "token required" },
        { status: 400 },
      );
    }

    const normalizedToken = String(token).trim();

    const existing = await QrToken.findOne({ token: normalizedToken });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Token already exists" },
        { status: 409 },
      );
    }

    const newToken = await QrToken.create({
      userId,
      token: normalizedToken,
      type: "discount",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      used: false,
    });

    return NextResponse.json({ success: true, qrToken: newToken });
  } catch (error) {
    console.error("[QR TOKENS] create discount token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to store token" },
      { status: 500 },
    );
  }
}
