import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import Result from "@/models/results";
import Transaction from "@/models/transactions";
import { broadcast } from "@/server/webSocket";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeReviewValue(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function normalizePublicResult(value: unknown) {
  const raw = clean(value);
  const normalized = normalizeReviewValue(raw);

  if (!raw) return "Pending";

  if (normalized === "positive") return "Positive";
  if (normalized === "negative") return "Negative";
  if (normalized === "invalid") return "Invalid";
  if (normalized === "pending") return "Pending";

  if (
    normalized.includes("no object detected") ||
    normalized.includes("no object") ||
    normalized.includes("not detected") ||
    normalized.includes("uncertain") ||
    normalized.includes("error") ||
    normalized.includes("failed")
  ) {
    return "Invalid";
  }

  return raw;
}

function shouldRequireReview(result: unknown) {
  const normalized = normalizeReviewValue(result);

  return (
    normalized.includes("invalid") ||
    normalized.includes("no object detected") ||
    normalized.includes("no object") ||
    normalized.includes("uncertain") ||
    normalized.includes("error") ||
    normalized.includes("not detected") ||
    normalized.includes("failed")
  );
}

function toObjectIdIfValid(value: unknown) {
  const raw = clean(value);

  if (mongoose.Types.ObjectId.isValid(raw)) {
    return new mongoose.Types.ObjectId(raw);
  }

  return raw;
}

function serializeResult(item: any) {
  const rawResult = clean(item?.result || "Pending");
  const publicResult = normalizePublicResult(rawResult);

  const resultImage = clean(item?.result_image || item?.annotated_image);
  const annotatedImage = clean(item?.annotated_image || item?.result_image);

  const originalImage = clean(item?.original_image || item?.raw_image);
  const rawImage = clean(item?.raw_image || item?.original_image);

  return {
    _id: String(item?._id ?? ""),
    user_id: String(item?.user_id ?? ""),
    productID: clean(item?.productID),
    transaction_id: clean(item?.transaction_id),
    result: publicResult,

    testedDate: item?.testedDate,
    updatedAt: item?.updatedAt,
    createdAt: item?.createdAt,

    result_image: resultImage,
    resultImageUrl: resultImage,
    result_image_url: resultImage,

    annotated_image: annotatedImage,
    annotatedImageUrl: annotatedImage,
    annotated_image_url: annotatedImage,

    original_image: originalImage,
    originalImageUrl: originalImage,
    original_image_url: originalImage,

    raw_image: rawImage,
    rawImageUrl: rawImage,
    raw_image_url: rawImage,

    review_status: clean(item?.review_status || "none"),
    original_result: clean(
      item?.original_result || (publicResult !== rawResult ? rawResult : ""),
    ),
    override_result: clean(item?.override_result),
    reviewed_by: item?.reviewed_by ? String(item.reviewed_by) : null,
    reviewed_at: item?.reviewed_at ?? null,
    review_notes: clean(item?.review_notes),
  };
}

async function patchMatchingTransactionItem(params: {
  user_id: string;
  transaction_id: string;
  productID: string;
  result: string;
}) {
  const user_id = clean(params.user_id);
  const transaction_id = clean(params.transaction_id);
  const productID = clean(params.productID);
  const result = normalizePublicResult(params.result);

  if (!user_id || !transaction_id || !result || result === "Pending") {
    return {
      patched: false,
      reason: "missing_required_fields_or_pending_result",
    };
  }

  const txObjectId = mongoose.Types.ObjectId.isValid(transaction_id)
    ? new mongoose.Types.ObjectId(transaction_id)
    : null;

  const userObjectId = mongoose.Types.ObjectId.isValid(user_id)
    ? new mongoose.Types.ObjectId(user_id)
    : null;

  const txOr: Record<string, unknown>[] = [
    { transaction_id },
    { transactionID: transaction_id },
    { transactionId: transaction_id },
    { website_transaction_id: transaction_id },
    { websiteTransactionId: transaction_id },
  ];

  if (txObjectId) {
    txOr.unshift({ _id: txObjectId });
  }

  const userOr: Record<string, unknown>[] = [{ user_id }];

  if (userObjectId) {
    userOr.unshift({ user_id: userObjectId });
  }

  const baseQueries = [
    {
      $and: [{ $or: txOr }, { $or: userOr }],
    },
    {
      $or: txOr,
    },
  ];

  const setData = {
    status: "completed",
    payment_status: "paid",
    updatedAt: new Date(),
  };

  for (const baseQuery of baseQueries) {
    if (productID) {
      const exactItemResult = await Transaction.updateOne(
        {
          ...baseQuery,
          "items.productID": productID,
        },
        {
          $set: {
            ...setData,
            "items.$.result": result,
          },
        },
      );

      if (exactItemResult.matchedCount > 0) {
        return {
          patched: exactItemResult.modifiedCount > 0,
          matched: exactItemResult.matchedCount,
          modified: exactItemResult.modifiedCount,
          mode: "matched_product_item",
        };
      }
    }

    const firstItemResult = await Transaction.updateOne(baseQuery, {
      $set: {
        ...setData,
        "items.0.result": result,
      },
    });

    if (firstItemResult.matchedCount > 0) {
      return {
        patched: firstItemResult.modifiedCount > 0,
        matched: firstItemResult.matchedCount,
        modified: firstItemResult.modifiedCount,
        mode: "first_item_fallback",
      };
    }
  }

  return {
    patched: false,
    matched: 0,
    modified: 0,
    reason: "transaction_not_found",
  };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const userId = clean(
      searchParams.get("userId") || searchParams.get("user_id"),
    );

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId or user_id" },
        { status: 400 },
      );
    }

    const userQuery = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    const results = await Result.find({ user_id: userQuery })
      .select(
        [
          "_id",
          "user_id",
          "productID",
          "transaction_id",
          "result",
          "result_image",
          "annotated_image",
          "original_image",
          "raw_image",
          "testedDate",
          "updatedAt",
          "createdAt",
          "review_status",
          "original_result",
          "override_result",
          "reviewed_by",
          "reviewed_at",
          "review_notes",
        ].join(" "),
      )
      .sort({
        testedDate: -1,
        updatedAt: -1,
        createdAt: -1,
      })
      .lean();

    return NextResponse.json(results.map(serializeResult), { status: 200 });
  } catch (error: any) {
    console.error("[RESULTS API][GET] error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch results",
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const data = await req.json();

    const user_id = clean(data?.user_id);
    const productID = clean(data?.productID);
    const rawResult = clean(data?.result);
    const result = normalizePublicResult(rawResult);
    const transaction_id = clean(data?.transaction_id);

    const result_image = clean(
      data?.result_image ||
        data?.annotated_image ||
        data?.resultImageUrl ||
        data?.annotatedImageUrl,
    );

    const original_image = clean(
      data?.original_image ||
        data?.raw_image ||
        data?.originalImageUrl ||
        data?.rawImageUrl,
    );

    if (!user_id || !productID || !rawResult || !transaction_id) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          received: { user_id, productID, result: rawResult, transaction_id },
        },
        { status: 400 },
      );
    }

    const userObjectId = toObjectIdIfValid(user_id);
    const needsReview = shouldRequireReview(rawResult) || result === "Invalid";

    const setData: Record<string, unknown> = {
      user_id: userObjectId,
      productID,
      result,
      transaction_id,
      review_status: needsReview ? "under_review" : "none",
      original_result: needsReview ? rawResult : "",
      override_result: "",
      reviewed_by: null,
      reviewed_at: null,
      review_notes: "",
    };

    if (result_image) {
      setData.result_image = result_image;
      setData.annotated_image = result_image;
    }

    if (original_image) {
      setData.original_image = original_image;
      setData.raw_image = original_image;
    }

    const updatedResult = await Result.findOneAndUpdate(
      { user_id: userObjectId, transaction_id },
      {
        $set: setData,
        $setOnInsert: {
          testedDate: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    const transactionPatch = await patchMatchingTransactionItem({
      user_id,
      transaction_id,
      productID,
      result,
    });

    if (!transactionPatch.matched) {
      console.warn("[RESULTS API][POST] Transaction patch did not match:", {
        user_id,
        transaction_id,
        productID,
        result,
        transactionPatch,
      });
    }

    const serialized = serializeResult(updatedResult);

    broadcast({
      type: "new_result",
      result: serialized,
    });

    return NextResponse.json(
      {
        success: true,
        result: serialized,
        transaction_patch: transactionPatch,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[RESULTS API][POST] error:", error);

    return NextResponse.json(
      {
        error: "Failed to add/update result",
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
