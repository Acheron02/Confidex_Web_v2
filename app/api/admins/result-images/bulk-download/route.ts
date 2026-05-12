import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import Result from "@/models/results";

const MAX_BULK_DOWNLOAD = 100;

type ZipEntryInput = {
  filename: string;
  data: Buffer;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let c = i;

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[i] = c >>> 0;
  }

  return table;
})();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function createZip(entries: ZipEntryInput[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosDate, dosTime } = toDosDateTime();

  for (const entry of entries) {
    const filenameBuffer = Buffer.from(entry.filename, "utf8");
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(filenameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, filenameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(filenameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, filenameBuffer);
    offset += localHeader.length + filenameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localFiles = Buffer.concat(localParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localFiles.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localFiles, centralDirectory, end]);
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((id) => String(id ?? "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ).slice(0, MAX_BULK_DOWNLOAD);
}

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
  if (loweredContentType.includes("jpeg") || loweredContentType.includes("jpg"))
    return "jpg";

  const path = sourceUrl.split("?")[0] || "";
  const match = path.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match?.[1]) return match[1].toLowerCase();

  return "jpg";
}

function makeUniqueFilename(filename: string, used: Set<string>) {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }

  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
  const ext = dotIndex >= 0 ? filename.slice(dotIndex) : "";
  let counter = 2;

  while (used.has(`${base}_${counter}${ext}`)) {
    counter += 1;
  }

  const unique = `${base}_${counter}${ext}`;
  used.add(unique);
  return unique;
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids = normalizeIds(body?.ids);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No valid image IDs were provided" },
        { status: 400 },
      );
    }

    await dbConnect();

    const results = await Result.find({
      _id: { $in: ids },
      result_image: { $exists: true, $ne: "" },
    })
      .select("_id productID transaction_id result_image")
      .lean();

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No downloadable images found" },
        { status: 404 },
      );
    }

    const origin = new URL(req.url).origin;
    const usedFilenames = new Set<string>();
    const entries: ZipEntryInput[] = [];

    for (const result of results as any[]) {
      const rawImageUrl = String(result.result_image || "").trim();
      if (!rawImageUrl) continue;

      const imageUrl = rawImageUrl.startsWith("http")
        ? rawImageUrl
        : new URL(
            rawImageUrl.startsWith("/") ? rawImageUrl : `/${rawImageUrl}`,
            origin,
          ).toString();

      const imageRes = await fetch(imageUrl, { cache: "no-store" });
      if (!imageRes.ok) continue;

      const contentType = imageRes.headers.get("content-type") || "image/jpeg";
      const extension = getExtension(contentType, imageUrl);
      const product = cleanFileSegment(result.productID, "kit");
      const transaction = cleanFileSegment(
        result.transaction_id,
        String(result._id),
      );
      const filename = makeUniqueFilename(
        `confidex_${product}_${transaction}.${extension}`,
        usedFilenames,
      );
      const data = Buffer.from(await imageRes.arrayBuffer());

      entries.push({ filename, data });
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "Selected image files could not be downloaded from storage" },
        { status: 502 },
      );
    }

    const zip = createZip(entries);
    const filename = `confidex_result_images_${new Date().toISOString().slice(0, 10)}.zip`;

    return new NextResponse(zip, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(zip.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[ADMIN RESULT IMAGES][BULK DOWNLOAD] error:", error);
    return NextResponse.json(
      { error: "Failed to download selected images" },
      { status: 500 },
    );
  }
}
