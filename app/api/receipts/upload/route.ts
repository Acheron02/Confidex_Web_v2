import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Receipt from "@/models/Receipt";
import Booth from "@/models/Booth";
import Transaction from "@/models/transactions";

type ReceiptPayload = {
  transaction_id?: string;
  user?: { user_id?: string; username?: string };
  purchase?: {
    date?: string;
    time?: string;
    timestamp_folder?: string;
    datetime_iso?: string;
  };
  product?: {
    name?: string;
    product_id?: string;
    type?: string;
    price?: number;
  };
  amounts?: {
    discount_percent?: number;
    total?: number;
    total_paid?: number;
    change?: number;
  };
  payment?: {
    mode_of_payment?: string;
    payment_method?: string;
    online_payment?: boolean;
    payment_session_id?: string | null;
    payment_reference?: string | null;
    payment_amount?: number | null;
    payment_mode?: string | null;
    simulated?: boolean;
  };
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseReceiptDate(receipt: ReceiptPayload) {
  const iso = clean(receipt.purchase?.datetime_iso);
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const date = clean(receipt.purchase?.date);
  const time = clean(receipt.purchase?.time);
  if (date || time) {
    const parsed = new Date(`${date} ${time}`.trim());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

async function ensureTransactionFromReceipt(params: {
  userId: string;
  transactionId: string;
  receipt: ReceiptPayload;
}) {
  const { userId, transactionId, receipt } = params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("receipt user_id is not a valid ObjectId");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const txObjectId = mongoose.Types.ObjectId.isValid(transactionId)
    ? new mongoose.Types.ObjectId(transactionId)
    : null;

  const txOr: Record<string, unknown>[] = [
    { transaction_id: transactionId },
    { transactionID: transactionId },
    { transactionId: transactionId },
    { local_transaction_id: transactionId },
    { offline_local_transaction_id: transactionId },
    { payment_reference: transactionId },
  ];

  if (txObjectId) txOr.unshift({ _id: txObjectId });

  const item = {
    name:
      clean(receipt.product?.name) ||
      clean(receipt.product?.product_id) ||
      "Test Kit",
    productID: clean(receipt.product?.product_id) || "UNKNOWN",
    type: clean(receipt.product?.type),
    price: num(receipt.product?.price, 0),
    discount: num(receipt.amounts?.discount_percent, 0),
    finalPrice: num(receipt.amounts?.total, num(receipt.product?.price, 0)),
    result: "Pending",
  };

  const paymentMethod = clean(
    receipt.payment?.payment_method ||
      receipt.payment?.payment_mode ||
      receipt.payment?.mode_of_payment,
  );

  const doc = {
    user_id: userObjectId,
    transaction_id: transactionId,
    transactionID: transactionId,
    transactionId,
    local_transaction_id: transactionId,
    offline_local_transaction_id: transactionId,
    status: "completed",
    items: [item],
    purchasedDate: parseReceiptDate(receipt),
    discount: num(receipt.amounts?.discount_percent, 0),
    total: num(receipt.amounts?.total, 0),
    total_paid: num(receipt.amounts?.total_paid, 0),
    change: num(receipt.amounts?.change, 0),
    payment_method: paymentMethod,
    payment_session_id: clean(receipt.payment?.payment_session_id),
    payment_reference: clean(
      receipt.payment?.payment_reference || transactionId,
    ),
    payment_status: "paid",
    offline_synced_from_booth:
      transactionId.startsWith("LOCAL-") ||
      !clean(receipt.payment?.payment_session_id),
  };

  const existing = await Transaction.findOne({
    user_id: userObjectId,
    $or: txOr,
  });

  if (existing) {
    return Transaction.findByIdAndUpdate(
      existing._id,
      { $set: doc },
      { new: true, runValidators: true },
    );
  }

  return Transaction.create(doc);
}

export async function POST(req: NextRequest) {
  try {
    const incomingKey = req.headers.get("x-device-api-key");
    const expectedKey = process.env.DEVICE_API_KEY;

    if (!expectedKey || incomingKey !== expectedKey) {
      console.log("[RECEIPT UPLOAD] Unauthorized device");
      return NextResponse.json(
        { error: "Unauthorized device" },
        { status: 401 },
      );
    }

    await dbConnect();

    const boothDeviceId = String(
      req.headers.get("x-booth-device-id") || "",
    ).trim();
    const body = await req.json();

    const userId = String(body.user_id || "").trim();
    const timestamp = String(body.timestamp || "").trim();
    const receipt = (body.receipt || {}) as ReceiptPayload;
    const transactionId = String(receipt.transaction_id || "").trim();

    if (!userId || !timestamp || !receipt) {
      return NextResponse.json(
        { error: "user_id, timestamp, and receipt are required" },
        { status: 400 },
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        { error: "receipt.transaction_id is required" },
        { status: 400 },
      );
    }

    let boothId: string | null = null;

    if (boothDeviceId) {
      const booth = (await Booth.findOne({ deviceId: boothDeviceId })
        .select("_id")
        .lean()) as { _id?: unknown } | null;

      if (booth?._id) boothId = String(booth._id);
      else
        console.log(
          `[RECEIPT UPLOAD] No booth found for deviceId=${boothDeviceId}`,
        );
    } else {
      console.log("[RECEIPT UPLOAD] Missing x-booth-device-id header");
    }

    const saved = await Receipt.findOneAndUpdate(
      { userId, transactionId },
      { userId, transactionId, timestamp, receipt, boothId },
      { upsert: true, new: true },
    );

    let transaction: any = null;
    let transactionError = "";
    try {
      transaction = await ensureTransactionFromReceipt({
        userId,
        transactionId,
        receipt,
      });
    } catch (error: any) {
      transactionError = error?.message || String(error);
      console.warn(
        "[RECEIPT UPLOAD] Saved receipt but failed to ensure transaction:",
        transactionError,
      );
    }

    return NextResponse.json({
      ok: true,
      receiptId: String(saved._id),
      transactionId,
      timestamp,
      boothId,
      transactionIdStored: transaction?._id ? String(transaction._id) : null,
      transactionError: transactionError || null,
    });
  } catch (error) {
    console.error("[RECEIPT UPLOAD] Failed:", error);
    return NextResponse.json(
      { error: "Failed to save receipt" },
      { status: 500 },
    );
  }
}
