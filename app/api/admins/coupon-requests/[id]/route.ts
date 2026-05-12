import crypto from "crypto";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import CouponRequest from "@/models/CouponRequest";
import Receipt from "@/models/Receipt";
import QrToken from "@/models/qrToken";
import Notification from "@/models/Notification";
import { broadcast } from "@/server/webSocket";

const DEFAULT_DISCOUNT_PERCENT = 10;
const COUPON_VALID_DAYS = 90;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanText(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function makeDiscountToken() {
  return `DISCOUNT-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
}

function getDiscountPercent(receipt: Record<string, any>) {
  const fromCoupon = Number(receipt?.coupon?.discount_percent);
  if (Number.isFinite(fromCoupon) && fromCoupon > 0) return fromCoupon;

  const fromAmounts = Number(receipt?.amounts?.discount_percent);
  if (Number.isFinite(fromAmounts) && fromAmounts > 0) return fromAmounts;

  return DEFAULT_DISCOUNT_PERCENT;
}

async function createUniqueDiscountToken({
  userId,
  expiresAt,
  receiptTransactionId,
  discountPercent,
}: {
  userId: string;
  expiresAt: Date;
  receiptTransactionId: string;
  discountPercent: number;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = makeDiscountToken();

    try {
      await QrToken.create({
        token,
        userId,
        type: "discount",
        discountPercent,
        source: "admin_approved_missing_coupon",
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

async function createNotification({
  userId,
  type,
  title,
  message,
  transactionId,
  couponToken,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  transactionId: string;
  couponToken?: string | null;
}) {
  return await Notification.create({
    userId,
    type,
    title,
    message,
    href: `/pages/users/${userId}`,
    data: {
      transactionId,
      couponToken: couponToken || null,
    },
  });
}

function serializeRequest(request: any) {
  return {
    id: String(request._id),
    status: String(request.status || "pending"),
    note: String(request.note || ""),
    adminNote: String(request.adminNote || ""),
    couponToken: request.couponToken ? String(request.couponToken) : null,
    reviewedAt: request.reviewedAt || null,
    reviewedBy: request.reviewedBy || null,
    createdAt: request.createdAt || null,
    updatedAt: request.updatedAt || null,
    verification: request.verification || {},
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid coupon request ID" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = cleanText(body?.action, 30).toLowerCase();
    const adminNote = cleanText(body?.adminNote, 500);

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be approve or reject" },
        { status: 400 },
      );
    }

    await dbConnect();

    const request = await CouponRequest.findById(id);

    if (!request) {
      return NextResponse.json(
        { error: "Coupon request not found" },
        { status: 404 },
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "This coupon request has already been reviewed" },
        { status: 409 },
      );
    }

    const receiptDoc = await Receipt.findById(request.receiptId);

    if (!receiptDoc) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = (receiptDoc.receipt || {}) as Record<string, any>;
    const now = new Date();

    if (action === "reject") {
      request.status = "rejected";
      request.adminNote = adminNote;
      request.reviewedBy = session.id;
      request.reviewedAt = now;
      await request.save();

      receiptDoc.receipt = {
        ...receipt,
        coupon_request: serializeRequest(request),
      };

      receiptDoc.markModified("receipt");
      await receiptDoc.save();

      const notification = await createNotification({
        userId: String(request.userId),
        type: "coupon_request_rejected",
        title: "Coupon request reviewed",
        message:
          adminNote || "Your coupon request was reviewed but was not approved.",
        transactionId: String(request.transactionId),
      });

      broadcast({
        type: "coupon_request_updated",
        userId: String(request.userId),
        status: "rejected",
        transactionId: String(request.transactionId),
        notification,
      });

      return NextResponse.json({
        ok: true,
        request: serializeRequest(request),
      });
    }

    const discountPercent = getDiscountPercent(receipt);
    const expiresAt = new Date(
      Date.now() + COUPON_VALID_DAYS * 24 * 60 * 60 * 1000,
    );

    const token = await createUniqueDiscountToken({
      userId: String(request.userId),
      expiresAt,
      receiptTransactionId: String(request.transactionId),
      discountPercent,
    });

    const coupon = {
      token,
      qr_value: token,
      status: "active",
      reason: "admin_approved_missing_coupon",
      discount_percent: discountPercent,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    request.status = "approved";
    request.adminNote = adminNote;
    request.reviewedBy = session.id;
    request.reviewedAt = now;
    request.couponToken = token;
    await request.save();

    receiptDoc.receipt = {
      ...receipt,
      coupon,
      coupon_request: serializeRequest(request),
    };

    receiptDoc.markModified("receipt");
    await receiptDoc.save();

    const notification = await createNotification({
      userId: String(request.userId),
      type: "coupon_request_approved",
      title: "Coupon request approved",
      message: `Your ${discountPercent}% discount coupon is now available in your receipt.`,
      transactionId: String(request.transactionId),
      couponToken: token,
    });

    broadcast({
      type: "coupon_request_updated",
      userId: String(request.userId),
      status: "approved",
      transactionId: String(request.transactionId),
      coupon,
      notification,
    });

    return NextResponse.json({
      ok: true,
      request: serializeRequest(request),
      coupon,
    });
  } catch (error) {
    console.error("[ADMIN COUPON REQUESTS][PATCH] error:", error);

    return NextResponse.json(
      { error: "Failed to review coupon request" },
      { status: 500 },
    );
  }
}
