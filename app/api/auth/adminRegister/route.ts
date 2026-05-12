import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/dbConnect"
import Admin from "@/models/admin"
import { getSessionFromRequest } from "@/lib/session"
import {
  ADMIN_ROLE,
  SUPERADMIN_ROLE,
  isSuperAdminRole,
} from "@/lib/rbac"

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)

    if (!session || !isSuperAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Only superadmins can create admin accounts" },
        { status: 403 }
      )
    }

    await dbConnect()

    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedRole = String(role || ADMIN_ROLE).trim().toLowerCase()

    if (![ADMIN_ROLE, SUPERADMIN_ROLE].includes(normalizedRole as any)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const existingAdmin = await Admin.findOne({ email: normalizedEmail })

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 400 }
      )
    }

    const admin = await Admin.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: normalizedRole,
    })

    return NextResponse.json({
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error("Admin register error:", error)

    return NextResponse.json(
      { error: "Failed to register admin" },
      { status: 500 }
    )
  }
}
