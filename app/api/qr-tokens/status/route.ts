// app/api/qr-tokens/status/route.ts
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";
import { NextResponse } from "next/server";

type QrTokenStatusDoc = {
  token: string;
  type: "login" | "discount";
  used: boolean;
  expiresAt: Date | string;
};

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const token = String(body.token || "").trim();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const qrRecord = await QrToken.findOne({ token })
      .select("token type used expiresAt")
      .lean<QrTokenStatusDoc | null>();

    if (!qrRecord) {
      return NextResponse.json(
        {
          exists: false,
          used: false,
          expired: false,
          type: null,
        },
        { status: 200 },
      );
    }

    const expired = new Date() > new Date(qrRecord.expiresAt);

    return NextResponse.json(
      {
        exists: true,
        used: Boolean(qrRecord.used),
        expired,
        type: qrRecord.type,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[QR STATUS] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
