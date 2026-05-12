import { NextRequest, NextResponse } from "next/server";
import {
  getPayMongoAuthHeader,
  getPayMongoMode,
  PAYMONGO_SECRET_KEY,
} from "@/lib/paymongo";
import dbConnect from "@/lib/dbConnect";
import PaymentSession from "@/models/paymentSession";

type PaymentSessionStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

type PaymentSessionLean = {
  sessionId: string;
  status: PaymentSessionStatus;
  paid?: boolean;
  paidAt?: Date | string | null;
} | null;

function normalizeStatus(value: unknown, fallback = "pending"): string {
  return String(value || fallback)
    .toLowerCase()
    .trim();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    if (!PAYMONGO_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing PAYMONGO_SECRET_KEY" },
        { status: 500 },
      );
    }

    await dbConnect();

    const mode = getPayMongoMode();
    const { sessionId } = await context.params;

    const payment = await PaymentSession.findOne({
      sessionId,
    }).lean<PaymentSessionLean>();

    if (payment?.status === "paid") {
      return NextResponse.json({
        status: "paid",
        paid: true,
        mode,
        simulated: mode === "test",
      });
    }

    if (payment?.status === "failed") {
      return NextResponse.json({
        status: "failed",
        paid: false,
        mode,
        simulated: mode === "test",
      });
    }

    if (payment?.status === "cancelled") {
      return NextResponse.json({
        status: "cancelled",
        paid: false,
        mode,
        simulated: mode === "test",
      });
    }

    if (payment?.status === "expired") {
      return NextResponse.json({
        status: "expired",
        paid: false,
        mode,
        simulated: mode === "test",
      });
    }

    const res = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: getPayMongoAuthHeader(),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data?.errors?.[0]?.detail || "Unable to fetch checkout session",
          mode,
        },
        { status: res.status },
      );
    }

    const attrs = data?.data?.attributes || {};

    const checkoutStatus = normalizeStatus(attrs.status, "pending");

    const paymentIntentStatus = normalizeStatus(
      attrs?.payment_intent?.attributes?.status,
      "",
    );

    const payments = Array.isArray(attrs?.payments) ? attrs.payments : [];
    const latestPayment = payments.length > 0 ? payments[0] : null;
    const latestPaymentStatus = normalizeStatus(
      latestPayment?.attributes?.status,
      "",
    );

    const paid =
      latestPaymentStatus === "paid" || paymentIntentStatus === "succeeded";

    let finalStatus: PaymentSessionStatus = "pending";

    if (paid) {
      finalStatus = "paid";
    } else if (latestPaymentStatus === "failed") {
      finalStatus = "failed";
    } else if (checkoutStatus === "expired") {
      finalStatus = "expired";
    } else if (checkoutStatus === "cancelled") {
      finalStatus = "cancelled";
    }

    if (payment && paid) {
      await PaymentSession.updateOne(
        { sessionId },
        {
          $set: {
            status: "paid",
            paid: true,
            paidAt: new Date(),
          },
        },
      );
    }

    return NextResponse.json({
      status: finalStatus,
      paid,
      mode,
      simulated: mode === "test",
      debug: {
        checkoutStatus,
        paymentIntentStatus,
        latestPaymentStatus,
      },
    });
  } catch (error) {
    console.error("Checkout status error:", error);
    return NextResponse.json(
      { error: "Server error fetching payment status" },
      { status: 500 },
    );
  }
}
