import crypto from "crypto";

export function generateBoothDeviceId() {
  return `booth-${crypto.randomBytes(6).toString("hex")}`;
}

export function generateBoothDeviceSecret() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashBoothDeviceSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}
