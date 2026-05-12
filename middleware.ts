import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { isAdminRole, isSuperAdminRole } from "@/lib/rbac"

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()

  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()

  return "unknown"
}

function isIpAllowed(ip: string) {
  if (process.env.NODE_ENV !== "production") return true

  const raw = process.env.ADMIN_ALLOWED_IPS?.trim()
  if (!raw) return true

  const allowedIps = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return allowedIps.includes(ip)
}

async function verifySessionTokenEdge(token: string) {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return null

    const encodedSecret = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, encodedSecret)

    return {
      id: typeof payload.id === "string" ? payload.id : "",
      role: typeof payload.role === "string" ? payload.role : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    }
  } catch {
    return null
  }
}

function redirectForUser(req: NextRequest, userId?: string) {
  if (userId) {
    return NextResponse.redirect(new URL(`/pages/users/${userId}`, req.url))
  }
  return NextResponse.redirect(new URL("/", req.url))
}

function forbidden(req: NextRequest, message = "Forbidden") {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: message }, { status: 403 })
  }
  return NextResponse.redirect(new URL("/", req.url))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminLoginPath =
    pathname === "/pages/admin" || pathname.startsWith("/api/auth/adminLogin")

  const isAdminRegisterPath =
    pathname === "/pages/admin/register" ||
    pathname.startsWith("/api/auth/adminRegister")

  const isProtectedAdminArea =
    pathname.startsWith("/pages/admin/dashboard") ||
    pathname.startsWith("/api/admins") ||
    pathname.startsWith("/api/booths")

  if (!isAdminLoginPath && !isAdminRegisterPath && !isProtectedAdminArea) {
    return NextResponse.next()
  }

  const ip = getClientIp(req)
  if (!isIpAllowed(ip)) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const token = req.cookies.get("session")?.value
  const session = token ? await verifySessionTokenEdge(token) : null

  if (isAdminLoginPath) {
    if (!session) return NextResponse.next()

    if (isAdminRole(session.role)) {
      return NextResponse.redirect(new URL("/pages/admin/dashboard", req.url))
    }

    return redirectForUser(req, session.id)
  }

  if (isAdminRegisterPath) {
    if (!session) {
      return NextResponse.redirect(new URL("/pages/admin", req.url))
    }

    if (!isSuperAdminRole(session.role)) {
      if (isAdminRole(session.role)) {
        return NextResponse.redirect(
          new URL("/pages/admin/dashboard", req.url)
        )
      }
      return redirectForUser(req, session.id)
    }

    return NextResponse.next()
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/pages/admin", req.url))
  }

  if (!isAdminRole(session.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return redirectForUser(req, session.id)
  }

  if (pathname.startsWith("/api/admins")) {
    const isWriteMethod = req.method !== "GET"
    if (isWriteMethod && !isSuperAdminRole(session.role)) {
      return forbidden(req, "Only superadmins can manage admin accounts")
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/pages/admin/:path*",
    "/api/admins/:path*",
    "/api/booths/:path*",
    "/api/auth/adminLogin/:path*",
    "/api/auth/adminRegister/:path*",
  ],
}
