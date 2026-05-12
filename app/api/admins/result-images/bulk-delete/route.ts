import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";

const MAX_BULK_DELETE = 200;

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((id) => String(id ?? "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ).slice(0, MAX_BULK_DELETE);
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids = normalizeIds(body?.ids);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No valid image IDs were provided" },
        { status: 400 },
      );
    }

    await dbConnect();

    const result = await Result.updateMany(
      {
        _id: { $in: ids },
        result_image: { $exists: true, $ne: "" },
      },
      {
        $set: {
          result_image: "",
        },
      },
    );

    return NextResponse.json(
      {
        success: true,
        requested: ids.length,
        deleted: result.modifiedCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ADMIN RESULT IMAGES][BULK DELETE] error:", error);
    return NextResponse.json(
      { error: "Failed to delete selected images" },
      { status: 500 },
    );
  }
}
