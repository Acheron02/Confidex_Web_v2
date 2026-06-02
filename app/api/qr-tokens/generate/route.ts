import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";
import User from "@/models/User";
import { createOfflineLoginToken } from "@/lib/offline-login-token";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const userId = String(body?.userId || "").trim();

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

    const signed = createOfflineLoginToken({ userId });

    await QrToken.create({
      token: signed.token,
      userId,
      type: "login",
      used: false,
      expiresAt: signed.expiresAt,
      source: "offline_capable_login",
    });

    return NextResponse.json(
      {
        token: signed.token,
        expiresAt: signed.expiresAt.toISOString(),
        offlineCapable: true,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[GENERATE LOGIN QR] error:", err);

    return NextResponse.json(
      {
        error: "Failed to generate QR code",
        details: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
