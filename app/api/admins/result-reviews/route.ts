import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";
import User from "@/models/User";
import Admin from "@/models/admin";

void User;
void Admin;

const MACHINE_REVIEW_RESULTS = ["invalid", "no object detected"];

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeResult(value: unknown) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function isMachineReviewResult(value: unknown) {
  return MACHINE_REVIEW_RESULTS.includes(normalizeResult(value));
}

function normalizeResultImageUrl(value: unknown) {
  const raw = cleanString(value);

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/api/images/")) {
    return raw;
  }

  if (raw.startsWith("/uploads/")) {
    const key = raw.replace(/^\/uploads\//, "");
    return `/api/images/by-key?key=${encodeURIComponent(key)}`;
  }

  if (raw.startsWith("uploads/")) {
    const key = raw.replace(/^uploads\//, "");
    return `/api/images/by-key?key=${encodeURIComponent(key)}`;
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  return `/api/images/by-key?key=${encodeURIComponent(raw)}`;
}

function getUserId(item: any) {
  const user =
    item.user_id && typeof item.user_id === "object" ? item.user_id : null;
  return user?._id ? String(user._id) : cleanString(item.user_id);
}

function serializePendingReviewResult(item: any) {
  const user =
    item.user_id && typeof item.user_id === "object" ? item.user_id : null;

  const effectiveResult = cleanString(item.override_result || item.result);
  const originalResult = cleanString(item.original_result || item.result);

  return {
    _id: String(item._id ?? ""),
    user_id: getUserId(item),
    username: user?.username ? String(user.username) : "Unknown user",
    productID: cleanString(item.productID),
    transaction_id: cleanString(item.transaction_id),
    result: effectiveResult,
    original_result: originalResult,
    override_result: cleanString(item.override_result),
    review_status: cleanString(item.review_status || "none"),
    review_notes: cleanString(item.review_notes),
    result_image: normalizeResultImageUrl(item.result_image),
    testedDate: item.testedDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    reviewed_at: item.reviewed_at || null,
    reviewed_by: item.reviewed_by ? String(item.reviewed_by) : null,
  };
}

function serializeHistoryResult(item: any, adminLookup: Map<string, any>) {
  const reviewedById = cleanString(item.reviewed_by);
  const admin = reviewedById ? adminLookup.get(reviewedById) : null;

  const originalResult = cleanString(item.original_result || "N/A");
  const overrideResult = cleanString(
    item.override_result || item.result || "N/A",
  );

  return {
    _id: String(item._id ?? ""),
    user_id: getUserId(item),
    username: "",
    productID: cleanString(item.productID),
    transaction_id: cleanString(item.transaction_id),
    result: overrideResult,
    original_result: originalResult,
    override_result: overrideResult,
    review_status: cleanString(item.review_status || "overridden"),
    review_notes: cleanString(item.review_notes),
    result_image: normalizeResultImageUrl(item.result_image),
    testedDate: item.testedDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    reviewed_at: item.reviewed_at || item.updatedAt || null,
    reviewed_by: reviewedById || null,
    reviewed_by_name: admin?.name ? String(admin.name) : "Unknown admin",
    reviewed_by_email: admin?.email ? String(admin.email) : "",
  };
}

async function getPendingReviews() {
  const results = await Result.find({
    result_image: { $exists: true, $ne: "" },
    $or: [
      {
        review_status: "under_review",
      },
      {
        review_status: { $nin: ["overridden", "completed", "resolved"] },
        $or: [
          { result: { $regex: /^invalid$/i } },
          { result: { $regex: /^no object detected$/i } },
          { original_result: { $regex: /^invalid$/i } },
          { original_result: { $regex: /^no object detected$/i } },
        ],
      },
    ],
  })
    .populate("user_id", "username")
    .select(
      "_id user_id productID transaction_id result original_result override_result review_status review_notes result_image testedDate createdAt updatedAt reviewed_at reviewed_by",
    )
    .sort({
      updatedAt: -1,
      testedDate: -1,
      createdAt: -1,
    })
    .lean();

  return results.map(serializePendingReviewResult).filter((item) => {
    if (item.review_status === "under_review") return true;
    if (item.review_status === "overridden") return false;

    return (
      isMachineReviewResult(item.result) ||
      isMachineReviewResult(item.original_result)
    );
  });
}

async function getReviewHistory() {
  const history = await Result.find({
    result_image: { $exists: true, $ne: "" },
    review_history_deleted: { $ne: true },
    $or: [
      { review_status: "overridden" },
      { override_result: { $exists: true, $ne: "" } },
    ],
  })
    .select(
      "_id user_id productID transaction_id result original_result override_result review_status review_notes result_image testedDate createdAt updatedAt reviewed_at reviewed_by",
    )
    .sort({
      reviewed_at: -1,
      updatedAt: -1,
      createdAt: -1,
    })
    .lean();

  const adminIds = Array.from(
    new Set(
      history.map((item: any) => cleanString(item.reviewed_by)).filter(Boolean),
    ),
  );

  const admins = adminIds.length
    ? await Admin.find({ _id: { $in: adminIds } })
        .select("name email")
        .lean()
    : [];

  const adminLookup = new Map<string, any>();

  for (const admin of admins as any[]) {
    adminLookup.set(String(admin._id), admin);
  }

  return history.map((item) => serializeHistoryResult(item, adminLookup));
}

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const mode = cleanString(searchParams.get("mode")).toLowerCase();

    if (mode === "history") {
      const history = await getReviewHistory();

      return NextResponse.json(
        {
          success: true,
          history,
          results: history,
        },
        { status: 200 },
      );
    }

    const results = await getPendingReviews();

    return NextResponse.json(
      {
        success: true,
        results,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ADMIN RESULT REVIEWS][GET] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch result reviews" },
      { status: 500 },
    );
  }
}
