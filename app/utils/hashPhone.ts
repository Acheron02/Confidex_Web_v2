// utils/hashPhone.ts
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function hashPhone(phone: string) {
  const bcryptHash = await bcrypt.hash(phone, 10); // for secure storage
  const sha256Hash = crypto.createHash("sha256").update(phone).digest("hex"); // for lookup
  return { bcryptHash, sha256Hash };
}

export function sha256Phone(phone: string) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}
