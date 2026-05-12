import crypto from "crypto";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Receipt from "@/models/Receipt";
import Transaction from "@/models/transactions";
import QrToken from "@/models/qrToken";
import { getSessionFromRequest } from "@/lib/session";

const DEFAULT_DISCOUNT_PERCENT = 15;
const COUPON_VALID_DAYS = 30;

type CouponPayload = {
  token: string;
  qr_value: string;
  status: "active";
  reason: "missing_coupon_report";
  discount_percent: number;
  issued_at: string;
  expires_at: string;
};

function makeDiscountToken() {
  return `DISCOUNT-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
}

async function createUniqueDiscountToken(
  userId: string,
  expiresAt: Date,
  receiptTransactionId: string,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = makeDiscountToken();

    try {
      await QrToken.create({
        token,
        userId,
        type: "discount",
        discountPercent: DEFAULT_DISCOUNT_PERCENT,
        source: "missing_coupon_report",
        receiptTransactionId,
        used: false,
        expiresAt,
      });

      return token;
    } catch (error: any) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  throw new Error("Failed to generate unique coupon token");
}

async function findUserReceipt(requestedTransactionId: string, userId: string) {
  let receiptDoc = await Receipt.findOne({
    transactionId: requestedTransactionId,
    userId,
  });

  if (receiptDoc) return receiptDoc;

  if (!mongoose.Types.ObjectId.isValid(requestedTransactionId)) {
    return null;
  }

  const txDoc = await Transaction.findOne({
    _id: requestedTransactionId,
    user_id: userId,
  })
    .select("_id transaction_id transactionId")
    .lean();

  const resolvedAltId = String(
    (txDoc as any)?.transaction_id ?? (txDoc as any)?.transactionId ?? "",
  ).trim();

  if (!resolvedAltId) return null;

  receiptDoc = await Receipt.findOne({
    transactionId: resolvedAltId,
    userId,
  });

  return receiptDoc;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = getSessionFromRequest(req);

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const requestedTransactionId = String(body.transactionId || "").trim();

    if (!requestedTransactionId) {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 },
      );
    }

    const receiptDoc = await findUserReceipt(
      requestedTransactionId,
      session.id,
    );

    if (!receiptDoc) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = (receiptDoc.receipt || {}) as Record<string, any>;
    const existingCoupon = receipt?.coupon;

    if (existingCoupon?.token) {
      return NextResponse.json({
        ok: true,
        alreadyIssued: true,
        coupon: existingCoupon,
      });
    }

    const expiresAt = new Date(
      Date.now() + COUPON_VALID_DAYS * 24 * 60 * 60 * 1000,
    );

    const token = await createUniqueDiscountToken(
      session.id,
      expiresAt,
      String(receiptDoc.transactionId),
    );

    const coupon: CouponPayload = {
      token,
      qr_value: token,
      status: "active",
      reason: "missing_coupon_report",
      discount_percent: DEFAULT_DISCOUNT_PERCENT,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    receiptDoc.receipt = {
      ...receipt,
      coupon,
      support: {
        ...(receipt?.support || {}),
        missing_coupon_reported_at: new Date().toISOString(),
      },
    };

    receiptDoc.markModified("receipt");
    await receiptDoc.save();

    return NextResponse.json({
      ok: true,
      alreadyIssued: false,
      coupon,
    });
  } catch (error) {
    console.error("[REPORT MISSING COUPON] Failed:", error);

    return NextResponse.json(
      { error: "Failed to issue coupon" },
      { status: 500 },
    );
  }
}
