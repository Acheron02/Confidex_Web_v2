import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { authenticateBoothRequest } from "@/lib/deviceAuth";
import {
  createOrReuseTransactionFromPaymentSession,
  serializePaymentForBooth,
} from "@/lib/paymentRecovery";
import { broadcast } from "@/server/webSocket";

export async function POST(req: NextRequest) {
  try {
    await authenticateBoothRequest(req);
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId || body.payment_session_id || "").trim();
    const userId = String(body.userId || body.user_id || "").trim();

    const { transaction, payment, reused } =
      await createOrReuseTransactionFromPaymentSession({ sessionId, userId });

    if (!reused) {
      broadcast({ type: "new_transaction", transaction });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      reused,
      transaction,
      transactionId: String(transaction._id),
      payment: serializePaymentForBooth(payment),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error?.message || "Unable to complete payment session",
      },
      { status: 400 },
    );
  }
}
