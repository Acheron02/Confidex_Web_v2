import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";

type BoothAuthCacheEntry = {
  boothId: string;
  deviceId: string;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __confidex_booth_auth_cache__:
    | Map<string, BoothAuthCacheEntry>
    | undefined;
}

const AUTH_CACHE_TTL_MS = 60 * 1000;

function getAuthCache() {
  if (!global.__confidex_booth_auth_cache__) {
    global.__confidex_booth_auth_cache__ = new Map<string, BoothAuthCacheEntry>();
  }

  return global.__confidex_booth_auth_cache__;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getCredentialCacheKey(params: {
  apiKey: string;
  deviceId: string;
  deviceSecret: string;
}) {
  return sha256(
    `${params.apiKey || "no-global-key"}:${params.deviceId}:${sha256(
      params.deviceSecret,
    )}`,
  );
}

function assertGlobalApiKey(apiKey: string) {
  if (process.env.DEVICE_API_KEY && apiKey !== process.env.DEVICE_API_KEY) {
    throw new Error("Invalid device API key");
  }
}

async function verifyBoothCredentials(params: {
  apiKey?: string;
  deviceId?: string;
  deviceSecret?: string;
}): Promise<BoothAuthCacheEntry> {
  const apiKey = String(params.apiKey || "").trim();
  const deviceId = String(params.deviceId || "").trim();
  const deviceSecret = String(params.deviceSecret || "").trim();

  assertGlobalApiKey(apiKey);

  if (!deviceId || !deviceSecret) {
    throw new Error("Missing booth device credentials");
  }

  const cache = getAuthCache();
  const cacheKey = getCredentialCacheKey({ apiKey, deviceId, deviceSecret });
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  await dbConnect();

  const booth = await Booth.findOne({ deviceId }).select("+deviceSecretHash");

  if (!booth) {
    throw new Error("Booth device not found");
  }

  const incomingHash = sha256(deviceSecret);

  if (!booth.deviceSecretHash || booth.deviceSecretHash !== incomingHash) {
    throw new Error("Invalid booth device secret");
  }

  const entry: BoothAuthCacheEntry = {
    boothId: String(booth._id),
    deviceId: booth.deviceId,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  };

  cache.set(cacheKey, entry);
  return entry;
}

export async function authenticateBoothRequest(req: Request) {
  return verifyBoothCredentials({
    apiKey: req.headers.get("x-device-api-key")?.trim() || "",
    deviceId: req.headers.get("x-booth-device-id")?.trim() || "",
    deviceSecret: req.headers.get("x-booth-device-secret")?.trim() || "",
  });
}

export async function authenticateBoothDevice(req: Request) {
  const auth = await authenticateBoothRequest(req);

  await dbConnect();

  const booth = await Booth.findById(auth.boothId);

  if (!booth) {
    throw new Error("Booth device not found");
  }

  return booth;
}

export async function authenticateBoothSocket(params: {
  apiKey?: string;
  deviceId?: string;
  deviceSecret?: string;
}) {
  const auth = await verifyBoothCredentials(params);

  await dbConnect();

  const booth = await Booth.findById(auth.boothId);

  if (!booth) {
    throw new Error("Booth device not found");
  }

  return booth;
}
