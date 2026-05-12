// app/api/qr-tokens/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { token, userId } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 },
      );
    }

    const normalizedToken = String(token).trim();
    const now = new Date();

    const existing = await QrToken.findOne({
      token: normalizedToken,
      type: "discount",
    });

    if (!existing) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: "Token not found.",
      });
    }

    if (existing.used) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: "Token already used.",
      });
    }

    if (new Date(existing.expiresAt) <= now) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: "Token expired.",
      });
    }

    if (userId && String(existing.userId) !== String(userId)) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: "Token does not belong to this user.",
      });
    }

    const qrToken = await QrToken.findOneAndUpdate(
      {
        _id: existing._id,
        used: false,
      },
      {
        $set: { used: true },
      },
      { new: true },
    );

    if (!qrToken) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: "Token already used.",
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message: "Discount token accepted.",
      discountPercent: Number(qrToken.discountPercent || 0),
      receiptTransactionId: qrToken.receiptTransactionId || null,
    });
  } catch (error) {
    console.error("[QR VALIDATE] error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to validate QR token" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: "GET method not allowed" },
    { status: 405 },
  );
}
