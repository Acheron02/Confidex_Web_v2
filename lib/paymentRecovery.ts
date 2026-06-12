import mongoose from "mongoose";
import PaymentSession from "@/models/paymentSession";
import Transaction from "@/models/transactions";

export type PaymentFinalStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "completed";

export function normalizePaymentStatus(value: unknown, fallback = "pending") {
  return String(value || fallback)
    .toLowerCase()
    .trim();
}

export function isPaidStatus(status: unknown) {
  const normalized = normalizePaymentStatus(status, "");
  return ["paid", "completed", "succeeded", "success"].includes(normalized);
}

export function isTerminalUnpaidStatus(status: unknown) {
  const normalized = normalizePaymentStatus(status, "");
  return ["failed", "cancelled", "canceled", "expired"].includes(normalized);
}

export function normalizeTerminalStatus(status: unknown): PaymentFinalStatus {
  const normalized = normalizePaymentStatus(status, "pending");

  if (isPaidStatus(normalized)) return "paid";
  if (normalized === "canceled") return "cancelled";
  if (["failed", "cancelled", "expired"].includes(normalized)) {
    return normalized as PaymentFinalStatus;
  }

  return "pending";
}

export function safeDateFromUnixSeconds(value: unknown) {
  const raw = Number(value || 0);
  if (!raw || Number.isNaN(raw)) return null;
  return new Date(raw * 1000);
}

export function getCheckoutStatusFromPayMongoAttributes(attrs: any) {
  const checkoutStatus = normalizePaymentStatus(attrs?.status, "pending");

  const paymentIntentStatus = normalizePaymentStatus(
    attrs?.payment_intent?.attributes?.status,
    "",
  );

  const payments = Array.isArray(attrs?.payments) ? attrs.payments : [];
  const latestPayment = payments.length > 0 ? payments[0] : null;
  const latestPaymentStatus = normalizePaymentStatus(
    latestPayment?.attributes?.status,
    "",
  );

  const paid =
    latestPaymentStatus === "paid" || paymentIntentStatus === "succeeded";

  let finalStatus: PaymentFinalStatus = "pending";

  if (paid) {
    finalStatus = "paid";
  } else if (latestPaymentStatus === "failed") {
    finalStatus = "failed";
  } else if (checkoutStatus === "expired") {
    finalStatus = "expired";
  } else if (checkoutStatus === "cancelled" || checkoutStatus === "canceled") {
    finalStatus = "cancelled";
  }

  return {
    finalStatus,
    paid,
    checkoutStatus,
    paymentIntentStatus,
    latestPaymentStatus,
    latestPaymentId: latestPayment?.id || "",
  };
}

export async function updatePaymentSessionStatus(params: {
  sessionId: string;
  status: PaymentFinalStatus;
  paid?: boolean;
  paymongoPaymentId?: string;
  rawCheckoutStatus?: unknown;
  lastWebhookEvent?: string;
  rawWebhook?: unknown;
}) {
  const now = new Date();
  const status = normalizeTerminalStatus(params.status);
  const paid = typeof params.paid === "boolean" ? params.paid : status === "paid";

  const set: Record<string, unknown> = {
    status,
    paid,
    lastStatusCheckAt: now,
  };

  if (status === "paid") {
    set.paidAt = now;
    set.resumeStage = "payment_paid";
  }

  if (status === "failed") {
    set.failedAt = now;
  }

  if (status === "expired") {
    set.expiredAt = now;
  }

  if (status === "cancelled") {
    set.cancelledAt = now;
  }

  if (params.paymongoPaymentId) {
    set.paymongoPaymentId = params.paymongoPaymentId;
  }

  if (typeof params.rawCheckoutStatus !== "undefined") {
    set.rawCheckoutStatus = params.rawCheckoutStatus;
  }

  if (typeof params.lastWebhookEvent !== "undefined") {
    set.lastWebhookEvent = params.lastWebhookEvent;
  }

  if (typeof params.rawWebhook !== "undefined") {
    set.rawWebhook = params.rawWebhook;
  }

  return PaymentSession.findOneAndUpdate(
    { sessionId: params.sessionId },
    { $set: set },
    { new: true },
  );
}

export function buildTransactionItemsFromPayment(payment: any) {
  const productId = String(payment.productId || "").trim();
  const productName =
    String(payment.productName || "").trim() ||
    String(payment.productType || "").trim() ||
    "Confidex Kit";

  return [
    {
      name: productName,
      productID: productId,
      type: String(payment.productType || ""),
      price: Number(payment.originalPrice || payment.amount || 0),
      discount: Number(payment.discountPercent || 0),
      finalPrice: Number(payment.amount || 0),
      result: "Pending",
    },
  ];
}

export async function createOrReuseTransactionFromPaymentSession(params: {
  sessionId: string;
  userId?: string;
}) {
  const sessionId = String(params.sessionId || "").trim();
  const userId = String(params.userId || "").trim();

  if (!sessionId) {
    throw new Error("Missing payment session ID");
  }

  const payment: any = await PaymentSession.findOne({ sessionId });

  if (!payment) {
    throw new Error("Payment session not found");
  }

  if (userId && String(payment.userId || "") !== userId) {
    throw new Error("Payment session does not belong to this user");
  }

  const paymentUserId = String(payment.userId || userId || "").trim();

  if (!mongoose.Types.ObjectId.isValid(paymentUserId)) {
    throw new Error("Payment session has an invalid user ID");
  }

  if (!payment.paid && payment.status !== "paid") {
    throw new Error(`Payment is not paid yet. Current status: ${payment.status || "pending"}`);
  }

  const existingBySession = await Transaction.findOne({
    payment_session_id: sessionId,
  });

  if (existingBySession) {
    if (!payment.transactionId) {
      payment.transactionId = String(existingBySession._id);
      payment.resumeStage = "transaction_created";
      await payment.save();
    }

    return {
      transaction: existingBySession,
      payment,
      reused: true,
    };
  }

  if (payment.transactionId && mongoose.Types.ObjectId.isValid(payment.transactionId)) {
    const existingById = await Transaction.findById(payment.transactionId);

    if (existingById) {
      return {
        transaction: existingById,
        payment,
        reused: true,
      };
    }
  }

  const transaction = await Transaction.create({
    user_id: new mongoose.Types.ObjectId(paymentUserId),
    status: "completed",
    items: buildTransactionItemsFromPayment(payment),
    purchasedDate: payment.paidAt || new Date(),
    payment_method: payment.paymentMethod || "paymongo-checkout",
    payment_session_id: sessionId,
    payment_reference: payment.referenceNumber || "",
    payment_status: "paid",
  });

  payment.transactionId = String(transaction._id);
  payment.resumeStage = "transaction_created";
  await payment.save();

  return {
    transaction,
    payment,
    reused: false,
  };
}

export function serializePaymentForBooth(payment: any) {
  return {
    sessionId: String(payment.sessionId || ""),
    referenceNumber: String(payment.referenceNumber || ""),
    userId: String(payment.userId || ""),
    productId: String(payment.productId || ""),
    productName: String(payment.productName || ""),
    productType: String(payment.productType || ""),
    amount: Number(payment.amount || 0),
    originalPrice: Number(payment.originalPrice || 0),
    discountPercent: Number(payment.discountPercent || 0),
    currency: String(payment.currency || "PHP"),
    status: String(payment.status || "pending"),
    paid: Boolean(payment.paid || payment.status === "paid"),
    transactionId: String(payment.transactionId || ""),
    resumeStage: String(payment.resumeStage || "checkout_created"),
    checkoutUrl: String(payment.checkoutUrl || ""),
    paidAt: payment.paidAt || null,
    updatedAt: payment.updatedAt || null,
  };
}
