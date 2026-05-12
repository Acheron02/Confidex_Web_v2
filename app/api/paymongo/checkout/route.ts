import { NextRequest, NextResponse } from "next/server";
import {
  getPayMongoAuthHeader,
  getPayMongoMode,
  PAYMONGO_SECRET_KEY,
} from "@/lib/paymongo";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import PaymentSession from "@/models/paymentSession";
import { decryptPhone } from "@/lib/phoneCrypt";
import type { Types } from "mongoose";

const DEBUG = process.env.PAYMONGO_DEBUG === "1";

type LeanUser = {
  _id: Types.ObjectId;
  username: string;
  phoneNumber: string; // encrypted phone
};

function normalizePhone(phone: string): string {
  const trimmed = phone.replace(/\s+/g, "").trim();

  if (trimmed.startsWith("+63")) return trimmed;
  if (trimmed.startsWith("0")) return `+63${trimmed.slice(1)}`;
  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    if (!PAYMONGO_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing PAYMONGO_SECRET_KEY" },
        { status: 500 },
      );
    }

    await dbConnect();

    const body = await req.json();
    const mode = getPayMongoMode();

    const amount = Number(body.amount || 0);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!body.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const user = await User.findById(body.userId).lean<LeanUser | null>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let checkoutPhone = "+639000000000";

    try {
      const storedPhone = String(user.phoneNumber || "");

      if (storedPhone.startsWith("$2")) {
        return NextResponse.json(
          {
            error:
              "This account uses the old phone format. Please register again.",
          },
          { status: 400 },
        );
      }

      if (storedPhone.split(":").length !== 3) {
        return NextResponse.json(
          { error: "Stored phone number format is invalid." },
          { status: 500 },
        );
      }

      checkoutPhone = normalizePhone(decryptPhone(storedPhone));
    } catch (err) {
      console.error("Failed to decrypt phone number:", err);
      return NextResponse.json(
        { error: "Unable to read user phone number" },
        { status: 500 },
      );
    }

    const amountInCentavos = Math.round(amount * 100);
    const referenceNumber = `CONFIDEX-${Date.now()}`;

    const payload = {
      data: {
        attributes: {
          billing: {
            name: body.username || user.username || "Confidex User",
            email: "kiosk@confidex.local",
            phone: checkoutPhone,
          },
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `Confidex purchase - ${body.productType || "Test Kit"}`,
          line_items: [
            {
              currency: "PHP",
              amount: amountInCentavos,
              name: body.productName || "Confidex Kit",
              quantity: 1,
              description: `Discount: ${body.discountPercent || 0}%`,
            },
          ],
          payment_method_types: ["gcash", "paymaya", "qrph"],
          reference_number: referenceNumber,
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failed`,
          metadata: {
            userId: body.userId || "",
            productId: body.productId || "",
            productType: body.productType || "",
            originalPrice: body.originalPrice || 0,
            discountPercent: body.discountPercent || 0,
            kioskSource: "raspberry-pi",
            mode,
          },
        },
      },
    };

    const paymongoRes = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getPayMongoAuthHeader(),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    const paymongoData = await paymongoRes.json();

    if (!paymongoRes.ok) {
      console.error("[PAYMONGO] Checkout create failed:", paymongoData);
      return NextResponse.json(
        {
          error:
            paymongoData?.errors?.[0]?.detail ||
            "Failed to create checkout session",
          mode,
        },
        { status: paymongoRes.status },
      );
    }

    const session = paymongoData.data;
    const sessionId = session?.id;
    const checkoutUrl = session?.attributes?.checkout_url;

    if (!sessionId || !checkoutUrl) {
      return NextResponse.json(
        { error: "PayMongo did not return session ID or checkout URL", mode },
        { status: 500 },
      );
    }

    await PaymentSession.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        referenceNumber,
        userId: body.userId || "",
        productId: body.productId || "",
        productType: body.productType || "",
        amount,
        currency: "PHP",
        mode,
        paymentMethod: "paymongo-checkout",
        status: "pending",
        paid: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (DEBUG) {
      console.log("[PAYMONGO] Checkout session saved:", {
        sessionId,
        referenceNumber,
        mode,
        amount,
      });
    }

    return NextResponse.json({
      sessionId,
      checkoutUrl,
      referenceNumber,
      mode,
      simulated: mode === "test",
      paymentMethods: ["gcash", "paymaya", "qrph"],
    });
  } catch (error) {
    console.error("PayMongo checkout error:", error);
    return NextResponse.json(
      { error: "Server error creating checkout session" },
      { status: 500 },
    );
  }
}
