// lib/r2.ts
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadToR2Args = {
  buffer: Buffer;
  key: string;
  contentType: string;
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

let cachedClient: S3Client | null = null;
let cachedClientKey = "";

function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const bucket = process.env.R2_BUCKET?.trim() || "";
  const publicUrl = process.env.R2_PUBLIC_URL?.trim() || "";

  const missing = [
    ["R2_ACCOUNT_ID", accountId],
    ["R2_ACCESS_KEY_ID", accessKeyId],
    ["R2_SECRET_ACCESS_KEY", secretAccessKey],
    ["R2_BUCKET", bucket],
    ["R2_PUBLIC_URL", publicUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudflare R2 environment variables: ${missing.join(", ")}`
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
  };
}

function getR2Client(config: R2Config) {
  const clientKey = `${config.accountId}:${config.accessKeyId}`;

  if (cachedClient && cachedClientKey === clientKey) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  cachedClientKey = clientKey;

  return cachedClient;
}

export async function uploadToR2({
  buffer,
  key,
  contentType,
}: UploadToR2Args) {
  const config = getR2Config();
  const r2 = getR2Client(config);

  await r2.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const baseUrl = config.publicUrl.replace(/\/+$/, "");
  const cleanKey = key.replace(/^\/+/, "");

  return `${baseUrl}/${cleanKey}`;
}

export function sanitizeSegment(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}