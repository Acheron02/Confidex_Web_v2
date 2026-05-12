import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Result from "@/models/results";
import { broadcast } from "@/server/webSocket";
import { uploadToR2, sanitizeSegment } from "@/lib/r2";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeImageType(value: unknown) {
  const raw = clean(value).toLowerCase();

  if (raw === "original") return "original";
  if (raw === "raw") return "raw";
  if (raw === "annotated") return "annotated";
  if (raw === "result") return "annotated";
  if (raw === "result_image") return "annotated";

  return "";
}

function guessImageTypeFromFilename(filename: string) {
  const lower = filename.toLowerCase();

  if (lower.includes("original")) return "original";
  if (lower.includes("raw")) return "raw";
  if (lower.includes("annotated")) return "annotated";
  if (lower.includes("result")) return "annotated";

  return "annotated";
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

    testedDate: item?.testedDate,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,

    review_status: clean(item?.review_status || "none"),
    original_result: clean(item?.original_result),
    override_result: clean(item?.override_result),
    reviewed_by: item?.reviewed_by ? String(item.reviewed_by) : null,
    reviewed_at: item?.reviewed_at ?? null,
    review_notes: clean(item?.review_notes),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { userID: string; productID: string } },
) {
  try {
    await dbConnect();

    const userID = clean(params.userID);
    const productID = clean(params.productID);

    if (!userID || !productID) {
      return NextResponse.json(
        { error: "Missing userID or productID" },
        { status: 400 },
      );
    }

    const formData = await req.formData();

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const transactionId = clean(
      formData.get("transaction_id") ||
        formData.get("transactionId") ||
        formData.get("transactionID"),
    );

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing transaction_id" },
        { status: 400 },
      );
    }

    const result = clean(formData.get("result"));

    const imageType =
      normalizeImageType(formData.get("image_type")) ||
      guessImageTypeFromFilename(file.name);

    const ext = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf("."))
      : ".png";

    const safeUserId = sanitizeSegment(userID);
    const safeProductId = sanitizeSegment(productID);
    const safeTransactionId = sanitizeSegment(transactionId);

    const normalizedFileName =
      imageType === "original"
        ? "original"
        : imageType === "raw"
          ? "raw"
          : "annotated";

    const key = `analyzed_kits/${safeUserId}/${safeProductId}/${safeTransactionId}/${normalizedFileName}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const imageUrl = await uploadToR2({
      buffer,
      key,
      contentType: file.type || "image/png",
    });

    const needsReview = result ? shouldRequireReview(result) : false;

    const setData: Record<string, unknown> = {
      user_id: userID,
      productID,
      transaction_id: transactionId,
    };

    if (result) {
      setData.result = result;
      setData.review_status = needsReview ? "under_review" : "none";
      setData.original_result = needsReview ? result : "";
      setData.override_result = "";
      setData.reviewed_by = null;
      setData.reviewed_at = null;
      setData.review_notes = "";
    }

    if (imageType === "original") {
      setData.original_image = imageUrl;
      setData.raw_image = imageUrl;
    } else if (imageType === "raw") {
      setData.raw_image = imageUrl;
      setData.original_image = imageUrl;
    } else {
      setData.result_image = imageUrl;
      setData.annotated_image = imageUrl;
    }

    const updatedResult = await Result.findOneAndUpdate(
      {
        user_id: userID,
        transaction_id: transactionId,
      },
      {
        $set: setData,
        $setOnInsert: {
          result: result || "Pending",
          testedDate: new Date(),
          review_status: "none",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    const serialized = serializeResult(updatedResult);

    broadcast({
      type: "new_result_image",
      result: serialized,
      imageType,
      imageUrl,
    });

    return NextResponse.json(
      {
        success: true,
        imageUrl,
        imageType,
        result: serialized,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[RESULT IMAGE UPLOAD] error:", err);

    return NextResponse.json(
      {
        error: "Failed to upload result image",
        details: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
