import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid history ID" },
        { status: 400 },
      );
    }

    await dbConnect();

    const result = await Result.findById(id);

    if (!result) {
      return NextResponse.json(
        { error: "Review history record not found" },
        { status: 404 },
      );
    }

    const hasOverride =
      String(result.override_result || "").trim() ||
      String(result.review_status || "").trim() === "overridden";

    if (!hasOverride) {
      return NextResponse.json(
        { error: "This result has no review history to delete" },
        { status: 400 },
      );
    }

    /**
     * Important:
     * Do not delete the Result document.
     * Do not clear result / override_result.
     * This only hides the row from the admin History tab.
     */
    result.review_history_deleted = true;
    result.review_history_deleted_by = session.id;
    result.review_history_deleted_at = new Date();

    await result.save();

    return NextResponse.json(
      {
        success: true,
        deletedHistoryId: id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ADMIN REVIEW HISTORY][DELETE] error:", error);

    return NextResponse.json(
      { error: "Failed to delete review history" },
      { status: 500 },
    );
  }
}
