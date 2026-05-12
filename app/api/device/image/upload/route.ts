import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Result from "@/models/results";
import { broadcast } from "@/server/webSocket";
import { uploadToR2, sanitizeSegment } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const userId = String(formData.get("user_id") || "").trim();
    const timestamp = String(formData.get("timestamp") || "").trim();
    const imageType = String(formData.get("image_type") || "").trim();
    const productID = String(formData.get("productID") || "").trim();
    const transactionId = String(formData.get("transaction_id") || "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!userId || !timestamp || !imageType) {
      return NextResponse.json(
        { error: "Missing user_id, timestamp, or image_type" },
        { status: 400 },
      );
    }

    const safeUserId = sanitizeSegment(userId);
    const safeTimestamp = sanitizeSegment(timestamp);
    const safeImageType = sanitizeSegment(imageType);

    const ext = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf("."))
      : ".png";

    const fileName = `${safeImageType}${ext}`;
    const key = `capture_sessions/${safeUserId}/${safeTimestamp}/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const imageUrl = await uploadToR2({
      buffer,
      key,
      contentType: file.type || "image/png",
    });

    let updatedResult = null;

    if (safeImageType === "annotated" && transactionId) {
      updatedResult = await Result.findOneAndUpdate(
        {
          user_id: userId,
          transaction_id: transactionId,
        },
        {
          $set: {
            user_id: userId,
            productID,
            transaction_id: transactionId,
            result_image: imageUrl,
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
        result: updatedResult,
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      imageType: safeImageType,
      result: updatedResult,
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
