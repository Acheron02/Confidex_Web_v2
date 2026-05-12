import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Receipt from "@/models/Receipt";
import Transaction from "@/models/transactions";
import CouponRequest from "@/models/CouponRequest";
import { getSessionFromRequest } from "@/lib/session";

function cleanText(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

async function findUserReceipt(requestedTransactionId: string, userId: string) {
  let receiptDoc = await Receipt.findOne({
    userId,
    transactionId: requestedTransactionId,
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

  return await Receipt.findOne({
    userId,
    transactionId: resolvedAltId,
  });
}

function getCouponPrintVerification(receipt: Record<string, any>) {
  const couponPrint = receipt?.coupon_print || {};

  return {
    boothPrintStatus: String(couponPrint?.status || "unknown"),
    printerFunctionAvailable: Boolean(couponPrint?.printer_function_available),
    boothRecordedToken: couponPrint?.token ? String(couponPrint.token) : null,
    attemptedAt: couponPrint?.attempted_at
      ? String(couponPrint.attempted_at)
      : null,
    completedAt: couponPrint?.completed_at
      ? String(couponPrint.completed_at)
      : null,
    boothPrintError: couponPrint?.error ? String(couponPrint.error) : null,
  };
}

function serializeRequest(request: any) {
  return {
    id: String(request._id),
    status: String(request.status || "pending"),
    note: String(request.note || ""),
    adminNote: String(request.adminNote || ""),
    couponToken: request.couponToken ? String(request.couponToken) : null,
    reviewedAt: request.reviewedAt || null,
    createdAt: request.createdAt || null,
    updatedAt: request.updatedAt || null,
    verification: request.verification || {},
  };
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = getSessionFromRequest(req);

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const transactionId = cleanText(body?.transactionId, 120);
    const note = cleanText(body?.note, 500);

    if (!transactionId) {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 },
      );
    }

    const receiptDoc = await findUserReceipt(transactionId, session.id);

    if (!receiptDoc) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = (receiptDoc.receipt || {}) as Record<string, any>;

    if (receipt?.coupon?.token) {
      return NextResponse.json({
        ok: true,
        alreadyHasCoupon: true,
        message: "This receipt already has a digital coupon QR.",
        coupon: receipt.coupon,
      });
    }

    const existingRequest = await CouponRequest.findOne({
      userId: session.id,
      transactionId: String(receiptDoc.transactionId),
    });

    if (existingRequest) {
      receiptDoc.receipt = {
        ...receipt,
        coupon_request: serializeRequest(existingRequest),
      };

      receiptDoc.markModified("receipt");
      await receiptDoc.save();

      return NextResponse.json({
        ok: true,
        alreadyRequested: true,
        request: serializeRequest(existingRequest),
      });
    }

    const request = await CouponRequest.create({
      userId: session.id,
      transactionId: String(receiptDoc.transactionId),
      receiptId: receiptDoc._id,
      status: "pending",
      note,
      verification: getCouponPrintVerification(receipt),
    });

    receiptDoc.receipt = {
      ...receipt,
      coupon_request: serializeRequest(request),
      support: {
        ...(receipt?.support || {}),
        missing_coupon_reported_at: new Date().toISOString(),
      },
    };

    receiptDoc.markModified("receipt");
    await receiptDoc.save();

    return NextResponse.json({
      ok: true,
      request: serializeRequest(request),
      message: "Coupon request submitted for admin verification.",
    });
  } catch (error) {
    console.error("[COUPON REQUEST][POST] error:", error);

    return NextResponse.json(
      { error: "Failed to submit coupon request" },
      { status: 500 },
    );
  }
}
