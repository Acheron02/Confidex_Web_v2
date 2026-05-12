import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import dbConnect from "@/lib/dbConnect"
import Admin from "@/models/admin"
import { getSessionFromRequest } from "@/lib/session"
import {
  ADMIN_ROLE,
  SUPERADMIN_ROLE,
  isAdminRole,
  isSuperAdminRole,
} from "@/lib/rbac"

async function getTargetAdmin(id: string) {
  return Admin.findById(id)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req)

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const admin = await Admin.findById(params.id, { password: 0 })

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    return NextResponse.json({ admin }, { status: 200 })
  } catch (error) {
    console.error("Get admin error:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req)

    if (!session || !isSuperAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Only superadmins can update admin accounts" },
        { status: 403 }
      )
    }

    await dbConnect()

    const targetAdmin = await getTargetAdmin(params.id)
    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    const { name, email, password, role } = await req.json()

    const update: Record<string, any> = {}

    if (name !== undefined) {
      update.name = String(name).trim()
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim()

      const emailOwner = await Admin.findOne({ email: normalizedEmail })
      if (emailOwner && String(emailOwner._id) !== params.id) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        )
      }

      update.email = normalizedEmail
    }

    if (password && String(password).trim()) {
      update.password = await bcrypt.hash(String(password), 10)
    }

    if (role !== undefined) {
      const normalizedRole = String(role).trim().toLowerCase()

      if (![ADMIN_ROLE, SUPERADMIN_ROLE].includes(normalizedRole as any)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
      }

      const isDemotingLastSuperadmin =
        targetAdmin.role === SUPERADMIN_ROLE &&
        normalizedRole !== SUPERADMIN_ROLE

      if (isDemotingLastSuperadmin) {
        const superadminCount = await Admin.countDocuments({
          role: SUPERADMIN_ROLE,
        })

        if (superadminCount <= 1) {
          return NextResponse.json(
            { error: "You must keep at least one superadmin account" },
            { status: 400 }
          )
        }
      }

      update.role = normalizedRole
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(params.id, update, {
      new: true,
      runValidators: true,
      projection: { password: 0 },
    })

    return NextResponse.json(
      { message: "Admin updated successfully", admin: updatedAdmin },
      { status: 200 }
    )
  } catch (error) {
    console.error("Update admin error:", error)
    return NextResponse.json(
      { error: "Failed to update admin" },
      { status: 500 }
    )
  }
}

export const PATCH = PUT

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req)

    if (!session || !isSuperAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Only superadmins can delete admin accounts" },
        { status: 403 }
      )
    }

    await dbConnect()

    if (session.id === params.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    const targetAdmin = await getTargetAdmin(params.id)
    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    if (targetAdmin.role === SUPERADMIN_ROLE) {
      const superadminCount = await Admin.countDocuments({
        role: SUPERADMIN_ROLE,
      })

      if (superadminCount <= 1) {
        return NextResponse.json(
          { error: "You must keep at least one superadmin account" },
          { status: 400 }
        )
      }
    }

    await Admin.findByIdAndDelete(params.id)

    return NextResponse.json(
      { message: "Admin deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Delete admin error:", error)
    return NextResponse.json(
      { error: "Failed to delete admin" },
      { status: 500 }
    )
  }
}
