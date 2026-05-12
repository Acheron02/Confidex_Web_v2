import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";

function cleanFileSegment(value: unknown, fallback: string) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return cleaned || fallback;
}

function getExtension(contentType: string, sourceUrl: string) {
  const loweredContentType = contentType.toLowerCase();
  if (loweredContentType.includes("png")) return "png";
  if (loweredContentType.includes("webp")) return "webp";
  if (loweredContentType.includes("gif")) return "gif";
  if (loweredContentType.includes("jpeg") || loweredContentType.includes("jpg")) return "jpg";

  const path = sourceUrl.split("?")[0] || "";
  const match = path.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match?.[1]) return match[1].toLowerCase();

  return "jpg";
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    await dbConnect();

    const result = await Result.findById(id)
      .select("_id user_id productID transaction_id result_image testedDate createdAt")
      .lean();

    if (!result || !result.result_image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const origin = new URL(req.url).origin;
    const rawImageUrl = String(result.result_image).trim();
    const imageUrl = rawImageUrl.startsWith("http")
      ? rawImageUrl
      : new URL(rawImageUrl.startsWith("/") ? rawImageUrl : `/${rawImageUrl}`, origin).toString();

    const imageRes = await fetch(imageUrl, { cache: "no-store" });

    if (!imageRes.ok) {
      return NextResponse.json(
        { error: "Failed to download source image" },
        { status: imageRes.status },
      );
    }

    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const extension = getExtension(contentType, imageUrl);
    const product = cleanFileSegment(result.productID, "kit");
    const transaction = cleanFileSegment(result.transaction_id, "transaction");
    const filename = `confidex_${product}_${transaction}.${extension}`;
    const body = await imageRes.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[ADMIN RESULT IMAGE DOWNLOAD][GET] error:", error);
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 500 },
    );
  }
}
