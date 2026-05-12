import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";
import { broadcast } from "@/server/webSocket";

const MAX_NOTES_LENGTH = 500;
const ALLOWED_OVERRIDE_RESULTS = ["Invalid", "Negative", "Positive"];

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid result ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const overrideResult = cleanText(body?.override_result, 80);
    const reviewNotes = cleanText(body?.review_notes, MAX_NOTES_LENGTH);

    if (!ALLOWED_OVERRIDE_RESULTS.includes(overrideResult)) {
      return NextResponse.json(
        {
          error: "Invalid override result",
          allowed: ALLOWED_OVERRIDE_RESULTS,
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const current = await Result.findById(id);

    if (!current) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const originalResult = String(
      current.original_result || current.result || "",
    ).trim();

    current.original_result = originalResult;
    current.override_result = overrideResult;
    current.result = overrideResult;
    current.review_status = "overridden";
    current.reviewed_by = session.id;
    current.reviewed_at = new Date();
    current.review_notes = reviewNotes;

    await current.save();

    broadcast({ type: "new_result", result: current });

    return NextResponse.json(
      { success: true, result: current },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ADMIN RESULT REVIEWS][PATCH] error:", error);
    return NextResponse.json(
      { error: "Failed to override result" },
      { status: 500 },
    );
  }
}
