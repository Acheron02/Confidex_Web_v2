import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/dbConnect"
import Admin from "@/models/admin"
import { getSessionFromRequest } from "@/lib/session"
import {
  ADMIN_ROLE,
  SUPERADMIN_ROLE,
  isAdminRole,
  isSuperAdminRole,
} from "@/lib/rbac"

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 })

    return NextResponse.json({ admins }, { status: 200 })
  } catch (error) {
    console.error("Get admins error:", error)
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)

    if (!session || !isSuperAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Only superadmins can add admins" },
        { status: 403 }
      )
    }

    await dbConnect()
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedRole = String(role || ADMIN_ROLE).trim().toLowerCase()

    if (![ADMIN_ROLE, SUPERADMIN_ROLE].includes(normalizedRole as any)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const existing = await Admin.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      )
    }

    const admin = await Admin.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: normalizedRole,
    })

    const safeAdmin = await Admin.findById(admin._id, { password: 0 })

    return NextResponse.json(
      { message: "Admin added successfully", admin: safeAdmin },
      { status: 201 }
    )
  } catch (error) {
    console.error("Add admin error:", error)
    return NextResponse.json({ error: "Failed to add admin" }, { status: 500 })
  }
}
