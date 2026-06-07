import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";
import User from "@/models/User";

type ExistingDiscountTokenLean = {
  used?: boolean;
};

type StoredQrTokenLean = {
  token: string;
  userId: unknown;
  type: string;
  used?: boolean;
  discountPercent?: number;
  receiptTransactionId?: string | null;
  expiresAt?: Date | string | null;
};

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;

  const raw = cleanString(value).toLowerCase();
  if (["true", "1", "yes", "used"].includes(raw)) return true;
  if (["false", "0", "no", "unused"].includes(raw)) return false;
  return undefined;
}

function parseExpiresAt(value: unknown): Date {
  const raw = cleanString(value);

  if (raw) {
    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 3);
  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();

    const userId = cleanString(body?.userId || body?.user_id);

    const qrCode = cleanString(
      body?.qrCode ||
        body?.qr_code ||
        body?.token ||
        body?.qrValue ||
        body?.qr_value,
    );

    const discountPercent = cleanNumber(
      body?.discountPercent ?? body?.discount_percent,
      10,
    );

    const source =
      cleanString(body?.source || body?.reason) || "booth_printed_coupon";

    const receiptTransactionId = cleanString(
      body?.receiptTransactionId ||
        body?.receipt_transaction_id ||
        body?.transactionId ||
        body?.transaction_id,
    );

    const expiresAt = parseExpiresAt(body?.expiresAt || body?.expires_at);
    const requestedUsed = parseBool(body?.used ?? body?.is_used);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing userId",
        },
        { status: 400 },
      );
    }

    if (!qrCode) {
      return NextResponse.json(
        {
          success: false,
          error: "qrCode is required",
        },
        { status: 400 },
      );
    }

    const user = await User.findById(userId).lean().exec();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    const existingToken = (await QrToken.findOne({
      token: qrCode,
      type: "discount",
    })
      .select("used")
      .lean()
      .exec()) as ExistingDiscountTokenLean | null;

    /*
      Never re-enable an already-used discount coupon during retry/sync.

      Rules:
      1. If booth says used=true, website stores used=true.
      2. If website already has used=true, keep it used.
      3. If booth retries the same coupon sync without used=true, do not reset it.
    */
    const nextUsed =
      requestedUsed === true ? true : Boolean(existingToken?.used);

    const qrToken = (await QrToken.findOneAndUpdate(
      {
        token: qrCode,
        type: "discount",
      },
      {
        $set: {
          token: qrCode,
          userId,
          type: "discount",
          used: nextUsed,
          discountPercent,
          source,
          receiptTransactionId: receiptTransactionId || null,
          expiresAt,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    )
      .lean()
      .exec()) as StoredQrTokenLean | null;

    if (!qrToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to store QR token",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        ok: true,
        message: "Discount QR token stored successfully.",
        token: qrToken.token,
        qrCode: qrToken.token,
        userId: String(qrToken.userId),
        type: qrToken.type,
        used: Boolean(qrToken.used),
        discountPercent: Number(
          qrToken.discountPercent || discountPercent || 0,
        ),
        receiptTransactionId: qrToken.receiptTransactionId || null,
        expiresAt: qrToken.expiresAt
          ? new Date(qrToken.expiresAt).toISOString()
          : expiresAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[QR TOKENS CREATE] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to store QR token",
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "GET method not allowed",
    },
    { status: 405 },
  );
}
