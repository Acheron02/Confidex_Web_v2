import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import OtpChallenge from "@/models/otpChallenge";
import OtpThrottle from "@/models/otpThrottle";
import { sha256Phone, hashOtp } from "@/lib/phone";
import { buildSessionResponse } from "@/lib/session";
import { generateUniqueUsernameWithPhone } from "@/app/utils/generateUsername";
import { encryptPhone } from "@/lib/phoneCrypt";
import { normalizePhone } from "@/lib/normalizePhone";
import {
  formatOtpLockMessage,
  getOtpLockMs,
  getRetryAfterSeconds,
} from "@/lib/otpLock";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { phoneNumber, code } = await req.json();

    const rawPhone = String(phoneNumber || "").trim();
    const phone = normalizePhone(rawPhone);
    const otp = String(code || "").trim();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Missing phone number or code" },
        { status: 400 },
      );
    }

    const phoneHash = sha256Phone(phone);

    const throttle =
      (await OtpThrottle.findOne({ phoneHash, purpose: "register" })) ||
      (await OtpThrottle.create({
        phoneHash,
        purpose: "register",
        attempts: 0,
        lockLevel: 0,
        lockedUntil: null,
      }));

    if (throttle.lockedUntil && throttle.lockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        {
          error: formatOtpLockMessage(throttle.lockedUntil),
          retryAfterSeconds: getRetryAfterSeconds(throttle.lockedUntil),
        },
        { status: 429 },
      );
    }

    const challenge = await OtpChallenge.findOne({
      phoneHash,
      purpose: "register",
      consumedAt: null,
    }).sort({ createdAt: -1 });

    if (!challenge) {
      return NextResponse.json({ error: "No active OTP" }, { status: 400 });
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      challenge.consumedAt = new Date();
      await challenge.save();
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    const expectedHash = hashOtp(phoneHash, "register", otp);

    if (expectedHash !== challenge.otpHash) {
      challenge.attempts = (challenge.attempts || 0) + 1;
      await challenge.save();

      throttle.attempts += 1;

      if (throttle.attempts >= 3) {
        throttle.attempts = 0;
        throttle.lockLevel += 1;
        throttle.lockedUntil = new Date(
          Date.now() + getOtpLockMs(throttle.lockLevel),
        );
        await throttle.save();

        return NextResponse.json(
          {
            error: formatOtpLockMessage(throttle.lockedUntil),
            retryAfterSeconds: getRetryAfterSeconds(throttle.lockedUntil),
          },
          { status: 429 },
        );
      }

      await throttle.save();

      const remaining = 3 - throttle.attempts;

      return NextResponse.json(
        {
          error: `Invalid OTP. ${remaining} attempt${
            remaining === 1 ? "" : "s"
          } remaining.`,
        },
        { status: 400 },
      );
    }

    challenge.consumedAt = new Date();
    await challenge.save();

    const existingUser = await User.findOne({ phoneHash }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409 },
      );
    }

    const username = await generateUniqueUsernameWithPhone(phone);
    const phoneEncrypted = encryptPhone(phone);

    const user = await User.create({
      phoneHash,
      phoneNumber: phoneEncrypted,
      gender: challenge.payload.gender,
      dob: new Date(challenge.payload.dob),
      username,
      hasPasskey: false,
      webauthnUserID: null,
    });

    throttle.attempts = 0;
    throttle.lockLevel = 0;
    throttle.lockedUntil = null;
    await throttle.save();

    return buildSessionResponse(user, 201);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
