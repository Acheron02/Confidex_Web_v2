import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Result from "@/models/results";
import { broadcast } from "@/server/webSocket";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeReviewValue(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function shouldRequireReview(result: unknown) {
  const normalized = normalizeReviewValue(result);

  return (
    normalized.includes("invalid") ||
    normalized.includes("no object detected") ||
    normalized.includes("uncertain") ||
    normalized.includes("error") ||
    normalized.includes("not detected")
  );
}

function serializeResult(item: any) {
  const resultImage = clean(item?.result_image || item?.annotated_image);
  const annotatedImage = clean(item?.annotated_image || item?.result_image);

  const originalImage = clean(item?.original_image || item?.raw_image);
  const rawImage = clean(item?.raw_image || item?.original_image);

  return {
    _id: String(item?._id ?? ""),
    user_id: String(item?.user_id ?? ""),
    productID: clean(item?.productID),
    transaction_id: clean(item?.transaction_id),
    result: clean(item?.result || "Pending"),

    testedDate: item?.testedDate,
    updatedAt: item?.updatedAt,
    createdAt: item?.createdAt,

    /**
     * Result / annotated image.
     * This is the image with only RESULT: POSITIVE / NEGATIVE / INVALID.
     */
    result_image: resultImage,
    resultImageUrl: resultImage,
    result_image_url: resultImage,

    annotated_image: annotatedImage,
    annotatedImageUrl: annotatedImage,
    annotated_image_url: annotatedImage,

    /**
     * Original / raw image.
     * This is the untouched captured photo for reviewing.
     */
    original_image: originalImage,
    originalImageUrl: originalImage,
    original_image_url: originalImage,

    raw_image: rawImage,
    rawImageUrl: rawImage,
    raw_image_url: rawImage,

    review_status: clean(item?.review_status || "none"),
    original_result: clean(item?.original_result),
    override_result: clean(item?.override_result),
    reviewed_by: item?.reviewed_by ? String(item.reviewed_by) : null,
    reviewed_at: item?.reviewed_at ?? null,
    review_notes: clean(item?.review_notes),
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

    const results = await Result.find({ user_id: userId })
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
    const result = clean(data?.result);
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

    if (!user_id || !productID || !result || !transaction_id) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          received: { user_id, productID, result, transaction_id },
        },
        { status: 400 },
      );
    }

    const needsReview = shouldRequireReview(result);

    const setData: Record<string, unknown> = {
      user_id,
      productID,
      result,
      transaction_id,
      review_status: needsReview ? "under_review" : "none",
      original_result: needsReview ? result : "",
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
      { user_id, transaction_id },
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

    broadcast({
      type: "new_result",
      result: serializeResult(updatedResult),
    });

    return NextResponse.json(
      {
        success: true,
        result: serializeResult(updatedResult),
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
