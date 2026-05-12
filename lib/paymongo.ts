// app/lib/paymongo.ts
export const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || "";

export function getPayMongoMode(): "test" | "live" {
  if (PAYMONGO_SECRET_KEY.startsWith("sk_live")) return "live";
  return "test";
}

export function getPayMongoAuthHeader() {
  return `Basic ${Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString("base64")}`;
}
