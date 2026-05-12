import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Admin from "@/models/admin";
import { isAdminRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    if (isAdminRole(session.role)) {
      const admin = await Admin.findById(session.id)
        .select("name email role")
        .lean();

      if (!admin) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          _id: String(admin._id),
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    }

    const user = await User.findById(session.id)
      .select("username phoneNumber gender dob hasPasskey")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        _id: String(user._id),
        username: user.username,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dob: user.dob,
        hasPasskey: user.hasPasskey,
        role: "user",
      },
    });
  } catch (error) {
    console.error("auth/me error:", error);
    return NextResponse.json(
      { error: "Failed to restore session" },
      { status: 500 },
    );
  }
}
