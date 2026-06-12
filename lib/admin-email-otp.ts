import crypto from "crypto";

const OTP_HASH_SECRET =
  process.env.OTP_SECRET || process.env.JWT_SECRET || "confidex-dev-secret";

export function generateAdminOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashAdminOtp(otp: string) {
  return crypto
    .createHmac("sha256", OTP_HASH_SECRET)
    .update(String(otp).trim())
    .digest("hex");
}

export function isMatchingAdminOtp(otp: string, otpHash: string) {
  const expected = hashAdminOtp(otp);

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(String(otpHash || ""), "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
