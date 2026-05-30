import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/admin";
import AdminEmailOtp from "@/models/AdminEmailOtp";
import { sendAdminOtpEmail } from "@/lib/email";
import { generateAdminOtp, hashAdminOtp } from "@/lib/admin-email-otp";
import { getPendingAdminOtpFromNextRequest } from "@/lib/session";

type AdminDoc = {
  _id: unknown;
  email: string;
  name?: string;
};

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

    const admin = (await Admin.findById(pending.adminId)
      .select("_id email name")
      .lean()
      .exec()) as AdminDoc | null;

    if (!admin) {
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 404 },
      );
    }

    const otp = generateAdminOtp();
    const otpHash = hashAdminOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await AdminEmailOtp.findOneAndUpdate(
      { email: admin.email, consumedAt: null },
      {
        $set: {
          adminId: admin._id,
          email: admin.email,
          otpHash,
          expiresAt,
          attempts: 0,
          consumedAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    await sendAdminOtpEmail({
      to: admin.email,
      name: admin.name,
      otp,
    });

    return NextResponse.json(
      { message: "OTP resent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Admin OTP resend error:", error);

    return NextResponse.json(
      { error: "Failed to resend OTP" },
      { status: 500 },
    );
  }
}
