import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Receipt from "@/models/Receipt";
import Transaction from "@/models/transactions";
import { getSessionFromRequest } from "@/lib/session";

type ReceiptDocumentShape = {
  userId: string;
  transactionId: string;
  timestamp: string;
  receipt: Record<string, unknown>;
};

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = getSessionFromRequest(req);

    if (!session?.id) {
      console.log("[RECEIPT LOOKUP] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedTransactionId = searchParams.get("transactionId");

    if (!requestedTransactionId) {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 },
      );
    }

    console.log(
      "[RECEIPT LOOKUP] requestedTransactionId:",
      requestedTransactionId,
    );
    console.log("[RECEIPT LOOKUP] session.id:", session.id);

    let receiptDoc = (await Receipt.findOne({
      transactionId: requestedTransactionId,
      userId: session.id,
    }).lean()) as ReceiptDocumentShape | null;

    if (!receiptDoc) {
      const txDoc = await Transaction.findOne({
        _id: requestedTransactionId,
        user_id: session.id,
      })
        .select("_id transaction_id transactionId")
        .lean();

      const resolvedAltId = String(
        (txDoc as any)?.transaction_id ?? (txDoc as any)?.transactionId ?? "",
      );

      if (resolvedAltId) {
        console.log("[RECEIPT LOOKUP] fallback resolvedAltId:", resolvedAltId);

        receiptDoc = (await Receipt.findOne({
          transactionId: resolvedAltId,
          userId: session.id,
        }).lean()) as ReceiptDocumentShape | null;
      }
    }

    if (!receiptDoc) {
      console.log("[RECEIPT LOOKUP] Receipt not found");
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    console.log("[RECEIPT LOOKUP] Receipt found");

    return NextResponse.json({
      ok: true,
      timestamp: receiptDoc.timestamp,
      receipt: receiptDoc.receipt,
    });
  } catch (error) {
    console.error("[RECEIPT LOOKUP] Failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 },
    );
  }
}
