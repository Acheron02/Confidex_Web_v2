import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Receipt from "@/models/Receipt";
import Booth from "@/models/Booth";

type ReceiptPayload = {
  transaction_id?: string;
  user?: {
    user_id?: string;
    username?: string;
  };
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

      if (booth?._id) {
        boothId = String(booth._id);
      } else {
        console.log(
          `[RECEIPT UPLOAD] No booth found for deviceId=${boothDeviceId}`,
        );
      }
    } else {
      console.log("[RECEIPT UPLOAD] Missing x-booth-device-id header");
    }

    const saved = await Receipt.findOneAndUpdate(
      {
        userId,
        transactionId,
      },
      {
        userId,
        transactionId,
        timestamp,
        receipt,
        boothId,
      },
      {
        upsert: true,
        new: true,
      },
    );

    return NextResponse.json({
      ok: true,
      receiptId: String(saved._id),
      transactionId,
      timestamp,
      boothId,
    });
  } catch (error) {
    console.error("[RECEIPT UPLOAD] Failed:", error);
    return NextResponse.json(
      { error: "Failed to save receipt" },
      { status: 500 },
    );
  }
}
