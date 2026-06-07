import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";
import User from "@/models/User";
import { createOfflineLoginToken } from "@/lib/offline-login-token";

function clampCount(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 5;

  return Math.max(1, Math.min(10, Math.floor(n)));
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const count = clampCount(body?.count);

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const user = await User.findById(userId).select("_id").lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await QrToken.updateMany(
      {
        userId,
        type: "login",
        used: false,
        expiresAt: { $lte: new Date() },
      },
      {
        $set: { used: true },
      },
    );

    const tokens = [];

    for (let i = 0; i < count; i += 1) {
      const signed = createOfflineLoginToken({ userId });

      await QrToken.create({
        token: signed.token,
        tokenId: signed.payload.jti,
        userId,
        type: "login",
        used: false,
        expiresAt: signed.expiresAt,
        source: "offline_login_preissued",
      });

      tokens.push({
        token: signed.token,
        tokenId: signed.payload.jti,
        expiresAt: signed.expiresAt.toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        ok: true,
        offlineCapable: true,
        count: tokens.length,
        tokens,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[OFFLINE LOGIN TOKEN BUNDLE] error:", err);

    return NextResponse.json(
      {
        error: "Failed to prepare offline login tokens",
        details: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
