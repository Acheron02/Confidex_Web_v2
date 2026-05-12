import jwt, { type Secret, type SignOptions } from "jsonwebtoken"
import { serialize } from "cookie"
import { NextRequest, NextResponse } from "next/server"
import { isAdminRole, USER_ROLE, type AppRole } from "@/lib/rbac"

const JWT_SECRET: Secret = process.env.JWT_SECRET as Secret

type SessionUser = {
  _id: string
  username?: string
  name?: string
  email?: string
  gender?: string
  dob?: string
  createdAt?: string | Date
  hasPasskey?: boolean
  phoneHash?: string
  role?: AppRole
}

export function signSessionToken(user: SessionUser) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role || USER_ROLE,
      phoneHash: user.phoneHash || null,
      email: user.email || null,
      name: user.name || user.username || null,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  )
}

export function buildSessionResponse(user: SessionUser, status = 200) {
  const token = signSessionToken(user)

  const safeUser = isAdminRole(user.role)
    ? {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      }
    : {
        _id: user._id.toString(),
        username: user.username,
        gender: user.gender,
        dob: user.dob,
        createdAt: user.createdAt,
        hasPasskey: !!user.hasPasskey,
        role: USER_ROLE,
      }

  const res = NextResponse.json({ user: safeUser }, { status })

  res.headers.append(
    "Set-Cookie",
    serialize("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60,
      path: "/",
    })
  )

  return res
}

export function clearSessionResponse() {
  const res = NextResponse.json({ success: true })

  res.headers.append(
    "Set-Cookie",
    serialize("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    })
  )

  return res
}

export function verifySessionToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      id: string
      role?: string
      phoneHash?: string | null
      email?: string | null
      name?: string | null
    }
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get("session")?.value
  if (!token) return null
  return verifySessionToken(token)
}

const PENDING_ADMIN_OTP_COOKIE_NAME = "admin_otp_pending"

export interface PendingAdminOtpPayload {
  adminId: string
  email: string
  purpose: "admin-login-otp"
}

export function signPendingAdminOtp(
  payload: PendingAdminOtpPayload,
  expiresIn: SignOptions["expiresIn"] = "10m"
) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function verifyPendingAdminOtpToken(
  token?: string | null
): PendingAdminOtpPayload | null {
  if (!token) return null

  try {
    return jwt.verify(token, JWT_SECRET) as PendingAdminOtpPayload
  } catch {
    return null
  }
}

export function setPendingAdminOtpCookie(res: NextResponse, token: string) {
  res.headers.append(
    "Set-Cookie",
    serialize(PENDING_ADMIN_OTP_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 10,
      path: "/",
    })
  )
  return res
}

export function clearPendingAdminOtpCookie(res: NextResponse) {
  res.headers.append(
    "Set-Cookie",
    serialize(PENDING_ADMIN_OTP_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    })
  )
  return res
}

export function getPendingAdminOtpFromNextRequest(req: NextRequest) {
  const token = req.cookies.get(PENDING_ADMIN_OTP_COOKIE_NAME)?.value
  return verifyPendingAdminOtpToken(token)
}
