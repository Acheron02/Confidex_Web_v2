import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import OtpChallenge from "@/models/otpChallenge";
import OtpThrottle from "@/models/otpThrottle";
import { sha256Phone, generateOtp, hashOtp } from "@/lib/phone";
import { sendOtpSms } from "@/lib/sms";
import { normalizePhone } from "@/lib/normalizePhone";
import { formatOtpLockMessage, getRetryAfterSeconds } from "@/lib/otpLock";

const OTP_PURPOSE = "register";
const OTP_TTL_MS = 5 * 60 * 1000;

type RegisterPayload = {
  gender: string;
  dob: string;
};

function getDemoOtpCode() {
  const code = String(process.env.OTP_DEMO_CODE || "123456").trim();
  return /^\d{6}$/.test(code) ? code : "123456";
}

function canUseDemoOtpFallback() {
  return (
    process.env.OTP_DEMO_MODE === "true" &&
    process.env.OTP_DEMO_ALLOW_ALL === "true"
  );
}

function shouldForceDemoOtp() {
  return process.env.OTP_FORCE_DEMO_MODE === "true";
}

async function createDemoOtpChallenge(
  phoneHash: string,
  payload: RegisterPayload,
) {
  const demoCode = getDemoOtpCode();
  const demoOtpHash = hashOtp(phoneHash, OTP_PURPOSE, demoCode);

  await OtpChallenge.create({
    phoneHash,
    purpose: OTP_PURPOSE,
    otpHash: demoOtpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    payload,
  });

  return demoCode;
}

function demoOtpResponse(demoCode: string, forced = false) {
  return NextResponse.json({
    ok: true,
    delivery: "demo",
    smsProviderUnavailable: !forced,
    message: forced
      ? "Demo OTP mode is enabled."
      : "SMS provider is unavailable. Demo fallback OTP is enabled.",
    demoCode: process.env.OTP_DEMO_SHOW_CODE === "true" ? demoCode : undefined,
  });
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { phoneNumber, gender, dob } = await req.json();

    const rawPhone = String(phoneNumber || "").trim();
    const phone = normalizePhone(rawPhone);
    const g = String(gender || "")
      .trim()
      .toLowerCase();
    const dobStr = String(dob || "").trim();

    if (!phone || !g || !dobStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const dobDate = new Date(dobStr);
    if (isNaN(dobDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth" },
        { status: 400 },
      );
    }

    const phoneHash = sha256Phone(phone);

    const existingUser = await User.findOne({ phoneHash }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409 },
      );
    }

    const throttle = await OtpThrottle.findOne({
      phoneHash,
      purpose: OTP_PURPOSE,
    });

    if (throttle?.lockedUntil && throttle.lockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        {
          error: formatOtpLockMessage(throttle.lockedUntil),
          retryAfterSeconds: getRetryAfterSeconds(throttle.lockedUntil),
        },
        { status: 429 },
      );
    }

    await OtpChallenge.updateMany(
      { phoneHash, purpose: OTP_PURPOSE, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );

    const payload: RegisterPayload = {
      gender: g,
      dob: dobStr,
    };

    if (shouldForceDemoOtp()) {
      if (!canUseDemoOtpFallback()) {
        return NextResponse.json(
          {
            error:
              "Demo OTP mode is enabled, but OTP_DEMO_MODE and OTP_DEMO_ALLOW_ALL are not both true.",
          },
          { status: 500 },
        );
      }

      const demoCode = await createDemoOtpChallenge(phoneHash, payload);
      return demoOtpResponse(demoCode, true);
    }

    const otp = generateOtp();
    const otpHash = hashOtp(phoneHash, OTP_PURPOSE, otp);

    const challenge = await OtpChallenge.create({
      phoneHash,
      purpose: OTP_PURPOSE,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      payload,
    });

    try {
      await sendOtpSms(phone, otp);

      return NextResponse.json({
        ok: true,
        delivery: "sms",
      });
    } catch (smsError) {
      console.error("[REGISTER OTP SMS DELIVERY FAILED]", smsError);

      await OtpChallenge.updateOne(
        { _id: challenge._id },
        { $set: { consumedAt: new Date() } },
      );

      if (!canUseDemoOtpFallback()) {
        return NextResponse.json(
          {
            error:
              "SMS verification is temporarily unavailable. Please try again later or ask the booth operator for assistance.",
            smsProviderUnavailable: true,
          },
          { status: 503 },
        );
      }

      const demoCode = await createDemoOtpChallenge(phoneHash, payload);
      return demoOtpResponse(demoCode);
    }
  } catch (error) {
    console.error("[REGISTER OTP START]", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
