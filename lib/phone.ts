import crypto from "crypto";

export function sha256Phone(phone: string) {
  return crypto.createHash("sha256").update(phone.trim()).digest("hex");
}

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(phoneHash: string, purpose: string, otp: string) {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET!)
    .update(`${phoneHash}:${purpose}:${otp}`)
    .digest("hex");
}
