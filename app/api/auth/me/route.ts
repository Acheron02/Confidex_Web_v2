import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import User from "@/models/User";
import Admin from "@/models/admin";

type AdminMeDoc = {
  _id: unknown;
  name?: string;
  email?: string;
  role?: string;
};

type UserMeDoc = {
  _id: unknown;
  username?: string;
  phoneNumber?: string;
  gender?: string;
  dob?: Date | string;
  hasPasskey?: boolean;
};

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    if (isAdminRole(session.role)) {
      const admin = (await Admin.findById(session.id)
        .select("_id name email role")
        .lean()
        .exec()) as AdminMeDoc | null;

      if (!admin) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          _id: String(admin._id),
          name: admin.name ?? "",
          email: admin.email ?? "",
          role: admin.role ?? session.role,
        },
      });
    }

    const user = (await User.findById(session.id)
      .select("_id username phoneNumber gender dob hasPasskey")
      .lean()
      .exec()) as UserMeDoc | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        _id: String(user._id),
        username: user.username ?? "",
        phoneNumber: user.phoneNumber ?? "",
        gender: user.gender ?? "",
        dob: user.dob ?? null,
        hasPasskey: Boolean(user.hasPasskey),
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
