import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/admin";
import AdminEmailOtp from "@/models/AdminEmailOtp";
import { isMatchingAdminOtp } from "@/lib/admin-email-otp";
import {
  buildSessionResponse,
  clearPendingAdminOtpCookie,
  getPendingAdminOtpFromNextRequest,
} from "@/lib/session";
import { ADMIN_ROLE, isAdminRole, type AppRole } from "@/lib/rbac";

type AdminDoc = {
  _id: unknown;
  email: string;
  name?: string;
  role?: AppRole | string;
};

type AdminOtpDoc = {
  _id: unknown;
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts?: number;
};

const MAX_OTP_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const pending = getPendingAdminOtpFromNextRequest(req);

    if (!pending || pending.purpose !== "admin-login-otp") {
      return NextResponse.json(
        { error: "OTP session expired. Please log in again." },
        { status: 401 },
      );
    }

    const { otp } = await req.json();

    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return NextResponse.json(
        { error: "Invalid OTP format" },
        { status: 400 },
      );
    }

    const challenge = (await AdminEmailOtp.findOne({
      email: pending.email,
      consumedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec()) as AdminOtpDoc | null;

    if (!challenge) {
      return NextResponse.json(
        { error: "No active OTP found." },
        { status: 404 },
      );
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: "OTP expired." }, { status: 410 });
    }

    if ((challenge.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please resend OTP." },
        { status: 429 },
      );
    }

    const isValidOtp = isMatchingAdminOtp(String(otp), challenge.otpHash);

    if (!isValidOtp) {
      await AdminEmailOtp.updateOne(
        { _id: challenge._id },
        { $inc: { attempts: 1 } },
      );

      return NextResponse.json({ error: "Incorrect OTP" }, { status: 401 });
    }

    await AdminEmailOtp.updateOne(
      { _id: challenge._id },
      { $set: { consumedAt: new Date() } },
    );

    const admin = (await Admin.findById(pending.adminId)
      .select("_id email name role")
      .lean()
      .exec()) as AdminDoc | null;

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const resolvedRole: AppRole = isAdminRole(admin.role)
      ? admin.role
      : ADMIN_ROLE;

    const response = buildSessionResponse(
      {
        _id: String(admin._id),
        email: admin.email,
        name: admin.name,
        role: resolvedRole,
      },
      200,
    );

    clearPendingAdminOtpCookie(response);

    return response;
  } catch (error) {
    console.error("Admin OTP verify error:", error);

    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 },
    );
  }
}
