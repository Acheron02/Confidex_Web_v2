import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";
import { broadcast } from "@/server/webSocket";

const MAX_REASON_LENGTH = 500;

function cleanText(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Admins cannot submit user review requests here" },
        { status: 403 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const transactionId = cleanText(
      body?.transactionId || body?.transaction_id,
      120,
    );

    const reason = cleanText(body?.reason, MAX_REASON_LENGTH);

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const result = await Result.findOne({
      user_id: new mongoose.Types.ObjectId(session.id),
      transaction_id: transactionId,
      result_image: { $exists: true, $ne: "" },
    }).sort({
      testedDate: -1,
      updatedAt: -1,
      createdAt: -1,
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "No result image was found for this transaction. Only transactions with uploaded result images can be submitted for review.",
        },
        { status: 404 },
      );
    }

    const originalResult = cleanText(
      result.original_result || result.result || "Pending",
      80,
    );

    result.review_status = "under_review";
    result.original_result = originalResult;

    /**
     * Clear previous override when the user asks for another review.
     * The machine/original result is still preserved in original_result.
     */
    result.override_result = "";
    result.reviewed_by = null;
    result.reviewed_at = null;
    result.review_notes = reason
      ? `User requested review: ${reason}`
      : "User requested review.";

    await result.save();

    broadcast({
      type: "new_result",
      result,
    });

    return NextResponse.json(
      {
        success: true,
        result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[RESULT REQUEST REVIEW][PATCH] error:", error);

    return NextResponse.json(
      { error: "Failed to submit result for review" },
      { status: 500 },
    );
  }
}
