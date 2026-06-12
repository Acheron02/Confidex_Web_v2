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

  return sanitizeSegment(raw || "image");
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

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const userId = clean(formData.get("user_id"));
    const timestamp = clean(formData.get("timestamp"));
    const imageType = normalizeImageType(formData.get("image_type"));
    const productID = clean(formData.get("productID"));
    const transactionId = clean(
      formData.get("transaction_id") ||
        formData.get("transactionId") ||
        formData.get("transactionID"),
    );

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!userId || !timestamp || !imageType) {
      return NextResponse.json(
        { error: "Missing user_id, timestamp, or image_type" },
        { status: 400 },
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        {
          error:
            "Missing transaction_id. Image uploads must be tied to the exact transaction to prevent old rows from showing the newest image.",
        },
        { status: 400 },
      );
    }

    const safeUserId = sanitizeSegment(userId);
    const safeProductId = sanitizeSegment(productID || "unknown-product");
    const safeTransactionId = sanitizeSegment(transactionId);
    const safeImageType = sanitizeSegment(imageType);

    const ext = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf("."))
      : ".png";

    /**
     * IMPORTANT:
     * Use transactionId in the R2 path.
     * Do not use timestamp alone, because reused timestamps/session folders can overwrite old images.
     */
    const key = `capture_sessions/${safeUserId}/${safeTransactionId}/${safeProductId}/${safeImageType}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const imageUrl = await uploadToR2({
      buffer,
      key,
      contentType: file.type || "image/png",
    });

    const setData: Record<string, unknown> = {
      user_id: userId,
      productID,
      transaction_id: transactionId,
    };

    if (imageType === "annotated") {
      setData.result_image = imageUrl;
      setData.annotated_image = imageUrl;
    } else if (imageType === "original") {
      setData.original_image = imageUrl;
    } else if (imageType === "raw") {
      setData.raw_image = imageUrl;
    } else {
      setData[`${safeImageType}_image`] = imageUrl;
    }

    const updatedResult = await Result.findOneAndUpdate(
      {
        user_id: userId,
        transaction_id: transactionId,
      },
      {
        $set: setData,
        $setOnInsert: {
          result: "Pending",
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
      type: "new_result",
      result: serialized,
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      imageType,
      result: serialized,
    });
  } catch (err: any) {
    console.error("[DEVICE IMAGE UPLOAD] error:", err);

    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
