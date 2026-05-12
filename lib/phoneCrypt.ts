import crypto from "crypto";

const PHONE_ENCRYPTION_KEY = process.env.PHONE_ENCRYPTION_KEY || "";

/**
 * Must be exactly 32 bytes after decoding from hex.
 * Example generator:
 * crypto.randomBytes(32).toString("hex")
 */
function getKey(): Buffer {
  if (!PHONE_ENCRYPTION_KEY) {
    throw new Error("Missing PHONE_ENCRYPTION_KEY");
  }

  const key = Buffer.from(PHONE_ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("PHONE_ENCRYPTION_KEY must be a 32-byte hex string");
  }

  return key;
}

export function encryptPhone(phone: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // recommended size for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(phone, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptPhone(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted phone payload");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
