import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { authenticateBoothRequest } from "@/lib/deviceAuth";
import PaymentSession from "@/models/paymentSession";
import {
  createOrReuseTransactionFromPaymentSession,
  serializePaymentForBooth,
} from "@/lib/paymentRecovery";
import { broadcast } from "@/server/webSocket";

async function getRequestPayload(req: NextRequest) {
  if (req.method === "GET") {
    const { searchParams } = new URL(req.url);
    return {
      userId: searchParams.get("userId") || searchParams.get("user_id") || "",
      sessionId:
        searchParams.get("sessionId") ||
        searchParams.get("payment_session_id") ||
        "",
    };
  }

  const body = await req.json().catch(() => ({}));
  return {
    userId: body.userId || body.user_id || "",
    sessionId: body.sessionId || body.payment_session_id || "",
  };
}

async function handleResume(req: NextRequest) {
  try {
    await authenticateBoothRequest(req);
    await dbConnect();

    const payload = await getRequestPayload(req);
    const userId = String(payload.userId || "").trim();
    const sessionId = String(payload.sessionId || "").trim();

    if (!userId && !sessionId) {
      return NextResponse.json(
        {
          ok: false,
          hasResume: false,
          error: "userId or sessionId is required",
        },
        { status: 400 },
      );
    }

    const query: Record<string, unknown> = sessionId
      ? { sessionId }
      : {
          userId,
          status: { $in: ["paid", "completed"] },
          resumeStage: { $ne: "completed" },
        };

    const payment: any = await PaymentSession.findOne(query).sort({ updatedAt: -1 });

    if (!payment) {
      const pending = userId
        ? await PaymentSession.findOne({
            userId,
            status: "pending",
          })
            .sort({ updatedAt: -1 })
            .lean()
        : null;

      return NextResponse.json({
        ok: true,
        hasResume: false,
        pending: pending ? serializePaymentForBooth(pending) : null,
      });
    }

    if (!payment.paid && payment.status !== "paid" && payment.status !== "completed") {
      return NextResponse.json({
        ok: true,
        hasResume: false,
        payment: serializePaymentForBooth(payment),
      });
    }

    const result = await createOrReuseTransactionFromPaymentSession({
      sessionId: payment.sessionId,
      userId: userId || payment.userId,
    });

    if (!result.reused) {
      broadcast({ type: "new_transaction", transaction: result.transaction });
    }

    return NextResponse.json({
      ok: true,
      hasResume: true,
      reused: result.reused,
      transaction: result.transaction,
      transactionId: String(result.transaction._id),
      payment: serializePaymentForBooth(result.payment),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        hasResume: false,
        error: error?.message || "Unable to check resumable payment",
      },
      { status: 400 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleResume(req);
}

export async function POST(req: NextRequest) {
  return handleResume(req);
}
