import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import dbConnect from "@/lib/dbConnect"
import Admin from "@/models/admin"
import AdminEmailOtp from "@/models/AdminEmailOtp"
import {
  buildSessionResponse,
  clearPendingAdminOtpCookie,
  getPendingAdminOtpFromNextRequest,
} from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/rbac"

export async function POST(req: NextRequest) {
  try {
    await dbConnect()

    const pending = getPendingAdminOtpFromNextRequest(req)

    if (!pending || pending.purpose !== "admin-login-otp") {
      return NextResponse.json(
        { error: "OTP session expired. Please log in again." },
        { status: 401 }
      )
    }

    const { otp } = await req.json()

    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return NextResponse.json({ error: "Invalid OTP format" }, { status: 400 })
    }

    const challenge = await AdminEmailOtp.findOne({
      email: pending.email,
      consumedAt: null,
    }).sort({ createdAt: -1 })

    if (!challenge) {
      return NextResponse.json({ error: "No active OTP found." }, { status: 404 })
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "OTP expired." }, { status: 410 })
    }

    const isValidOtp = await bcrypt.compare(otp, challenge.otpHash)

    if (!isValidOtp) {
      challenge.attempts += 1
      await challenge.save()

      return NextResponse.json({ error: "Incorrect OTP" }, { status: 401 })
    }

    challenge.consumedAt = new Date()
    await challenge.save()

    const admin = await Admin.findById(pending.adminId)

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    const response = buildSessionResponse(
      {
        _id: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: admin.role || ADMIN_ROLE,
      },
      200
    )

    clearPendingAdminOtpCookie(response)

    return response
  } catch (error) {
    console.error("Admin OTP verify error:", error)

    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    )
  }
}
