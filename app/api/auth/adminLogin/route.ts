// app/api/auth/adminLogin/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/admin";
import AdminEmailOtp from "@/models/AdminEmailOtp";
import { sendAdminOtpEmail } from "@/lib/email";
import { setPendingAdminOtpCookie, signPendingAdminOtp } from "@/lib/session";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    //bcrypt compare (now works because password is hashed)
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    //Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await AdminEmailOtp.findOneAndUpdate(
      { email: normalizedEmail, consumedAt: null },
      {
        adminId: admin._id,
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        consumedAt: null,
      },
      { upsert: true, new: true },
    );

    await sendAdminOtpEmail({
      to: admin.email,
      name: admin.name,
      otp,
    });

    const pendingToken = signPendingAdminOtp({
      adminId: admin._id.toString(),
      email: admin.email,
      purpose: "admin-login-otp",
    });

    const response = NextResponse.json(
      {
        message: "OTP sent to admin email",
        email: admin.email,
      },
      { status: 200 },
    );

    return setPendingAdminOtpCookie(response, pendingToken);
  } catch (error) {
    console.error("Admin OTP request error:", error);

    return NextResponse.json(
      { error: "Failed to send OTP email" },
      { status: 500 },
    );
  }
}
