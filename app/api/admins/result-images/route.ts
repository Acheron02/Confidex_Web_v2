import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";
import User from "@/models/User";
import Receipt from "@/models/Receipt";

void User;

const KIT_LABEL_MAP: Record<string, string> = {
  hiv: "HIV Test Kit",
  hivkit: "HIV Test Kit",
  hivtest: "HIV Test Kit",
  hiv_test: "HIV Test Kit",
  "hiv-test": "HIV Test Kit",
  hiv123: "HIV Test Kit",

  dengue: "Dengue Test Kit",
  denguekit: "Dengue Test Kit",
  dengue_test: "Dengue Test Kit",
  "dengue-test": "Dengue Test Kit",
  dengue123: "Dengue Test Kit",

  pregnancy: "Pregnancy Test Kit",
  pregnancykit: "Pregnancy Test Kit",
  pregnancy_test: "Pregnancy Test Kit",
  "pregnancy-test": "Pregnancy Test Kit",

  syphilis: "Syphilis Test Kit",
  syphiliskit: "Syphilis Test Kit",
  syphilis_test: "Syphilis Test Kit",
  "syphilis-test": "Syphilis Test Kit",

  drugtest: "Drug Test Kit",
  drug_test: "Drug Test Kit",
  "drug-test": "Drug Test Kit",
};

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeKitType(...values: unknown[]) {
  for (const value of values) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;

    const key = normalizeKey(raw);
    if (KIT_LABEL_MAP[key]) return KIT_LABEL_MAP[key];

    if (/hiv/i.test(raw)) return "HIV Test Kit";
    if (/dengue/i.test(raw)) return "Dengue Test Kit";
    if (/pregnancy/i.test(raw)) return "Pregnancy Test Kit";
    if (/syphilis/i.test(raw)) return "Syphilis Test Kit";
    if (/drug/i.test(raw)) return "Drug Test Kit";

    const titled = toTitleCase(raw);
    if (/kit/i.test(titled) || /test/i.test(titled)) return titled;
    return `${titled} Kit`;
  }

  return "Unknown Kit";
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function serializeResultImage(item: any, receiptLookup: Map<string, any>) {
  const user =
    item.user_id && typeof item.user_id === "object" ? item.user_id : null;
  const userId = user?._id ? String(user._id) : cleanString(item.user_id);
  const transactionId = cleanString(item.transaction_id);
  const receiptDoc = receiptLookup.get(`${userId}:${transactionId}`);
  const receipt = receiptDoc?.receipt || {};
  const receiptProduct = receipt?.product || {};

  const kitType = normalizeKitType(
    receiptProduct?.type,
    receiptProduct?.name,
    receiptProduct?.product_id,
    item.productID,
  );

  const result = cleanString(item.override_result || item.result);
  const originalResult = cleanString(item.original_result || item.result);

  return {
    _id: String(item._id ?? ""),
    user_id: userId,
    username: user?.username ? String(user.username) : "Unknown user",
    productID: cleanString(item.productID),
    productName:
      cleanString(receiptProduct?.name) || cleanString(item.productID),
    kitType,
    transaction_id: transactionId,
    result,
    original_result: originalResult,
    override_result: cleanString(item.override_result),
    review_status: cleanString(item.review_status || "none"),
    result_image: cleanString(item.result_image),
    testedDate: item.testedDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    download_url: `/api/admins/result-images/${String(item._id ?? "")}/download`,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const results = await Result.find({
      result_image: { $exists: true, $ne: "" },
    })
      .populate("user_id", "username")
      .select(
        "_id user_id productID transaction_id result original_result override_result review_status result_image testedDate createdAt updatedAt",
      )
      .sort({ updatedAt: -1, testedDate: -1, createdAt: -1 })
      .lean();

    const receiptFilters = results
      .map((item: any) => {
        const user =
          item.user_id && typeof item.user_id === "object"
            ? item.user_id
            : null;
        const userId = user?._id ? String(user._id) : cleanString(item.user_id);
        const transactionId = cleanString(item.transaction_id);

        if (!userId || !transactionId) return null;

        return { userId, transactionId };
      })
      .filter(Boolean) as Array<{ userId: string; transactionId: string }>;

    const receipts = receiptFilters.length
      ? await Receipt.find({ $or: receiptFilters })
          .select("userId transactionId receipt.product")
          .lean()
      : [];

    const receiptLookup = new Map<string, any>();
    for (const receipt of receipts as any[]) {
      receiptLookup.set(
        `${String(receipt.userId)}:${String(receipt.transactionId)}`,
        receipt,
      );
    }

    const images = results.map((item) =>
      serializeResultImage(item, receiptLookup),
    );

    const grouped = images.reduce<Record<string, number>>((acc, image) => {
      acc[image.kitType] = (acc[image.kitType] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json(
      {
        images,
        groups: Object.entries(grouped)
          .map(([kitType, count]) => ({ kitType, count }))
          .sort((a, b) => a.kitType.localeCompare(b.kitType)),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ADMIN RESULT IMAGES][GET] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch result images" },
      { status: 500 },
    );
  }
}
