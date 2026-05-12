import { NextRequest, NextResponse } from "next/server";
import { getPayMongoMode } from "@/lib/paymongo";
import dbConnect from "@/lib/dbConnect";
import PaymentSession from "@/models/paymentSession";

const DEBUG = process.env.PAYMONGO_DEBUG === "1";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const payload = await req.json();
    const mode = getPayMongoMode();

    const eventType = payload?.data?.attributes?.type;
    const resource = payload?.data?.attributes?.data || {};
    const resourceAttrs = resource?.attributes || {};

    const referenceNumber =
      resourceAttrs?.reference_number ||
      resourceAttrs?.metadata?.reference_number ||
      resourceAttrs?.metadata?.referenceNumber ||
      "";

    const explicitCheckoutSessionId =
      resourceAttrs?.checkout_session_id ||
      resourceAttrs?.metadata?.checkout_session_id ||
      "";

    const livemode = Boolean(payload?.data?.attributes?.livemode);

    if (DEBUG) {
      console.log("[PAYMONGO WEBHOOK]", {
        mode,
        livemode,
        eventType,
        resourceId: resource?.id || "",
        explicitCheckoutSessionId,
        referenceNumber,
      });
    }

    let payment = null;

    if (explicitCheckoutSessionId) {
      payment = await PaymentSession.findOne({
        sessionId: explicitCheckoutSessionId,
      });
    }

    if (
      !payment &&
      String(eventType || "").startsWith("checkout_session.") &&
      resource?.id
    ) {
      payment = await PaymentSession.findOne({
        sessionId: resource.id,
      });
    }

    if (!payment && referenceNumber) {
      payment = await PaymentSession.findOne({ referenceNumber });
    }

    if (!payment) {
      if (DEBUG) {
        console.warn(
          "[PAYMONGO] No matching PaymentSession found for webhook",
          {
            eventType,
            resourceId: resource?.id || "",
            explicitCheckoutSessionId,
            referenceNumber,
          },
        );
      }

      return NextResponse.json({ received: true, mode });
    }

    payment.lastWebhookEvent = eventType || "";
    payment.rawWebhook = payload;
    payment.livemode = livemode;

    if (
      eventType === "checkout_session.payment.paid" ||
      eventType === "payment.paid"
    ) {
      payment.status = "paid";
      payment.paid = true;
      payment.paidAt = new Date();
      payment.paymongoPaymentId =
        resource?.id || payment.paymongoPaymentId || "";
      await payment.save();

      if (DEBUG) {
        console.log("[PAYMONGO] Payment marked paid:", {
          sessionId: payment.sessionId,
          referenceNumber: payment.referenceNumber,
        });
      }
    } else if (
      eventType === "checkout_session.payment.failed" ||
      eventType === "payment.failed"
    ) {
      payment.status = "failed";
      payment.paid = false;
      payment.failedAt = new Date();
      await payment.save();

      if (DEBUG) {
        console.log("[PAYMONGO] Payment marked failed:", {
          sessionId: payment.sessionId,
          referenceNumber: payment.referenceNumber,
        });
      }
    } else if (
      eventType === "payment.refunded" ||
      eventType === "payment.refund.updated"
    ) {
      if (DEBUG) {
        console.log("[PAYMONGO] Refund event received:", {
          sessionId: payment.sessionId,
          referenceNumber: payment.referenceNumber,
        });
      }
    }

    return NextResponse.json({ received: true, mode });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
