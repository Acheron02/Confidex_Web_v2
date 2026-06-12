import crypto from "crypto";

export type OfflineLoginPayload = {
  v: 1;
  typ: "login";
  sub: string;
  iat: number;
  nbf: number;
  exp: number;
  jti: string;
  aud: "CONFIDEX_BOOTH";
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function pemFromB64(value: string, label: string) {
  const raw = clean(value);

  if (!raw) {
    throw new Error(`${label} is missing`);
  }

  return Buffer.from(raw, "base64").toString("utf8");
}

export function getOfflineLoginPrivateKey() {
  const pem = pemFromB64(
    process.env.OFFLINE_LOGIN_PRIVATE_KEY_B64 || "",
    "OFFLINE_LOGIN_PRIVATE_KEY_B64",
  );

  return crypto.createPrivateKey(pem);
}

export function getOfflineLoginPublicKeyPemB64() {
  const raw = clean(process.env.OFFLINE_LOGIN_PUBLIC_KEY_B64);

  if (!raw) {
    throw new Error("OFFLINE_LOGIN_PUBLIC_KEY_B64 is missing");
  }

  return raw;
}

export function getOfflineLoginPublicKey() {
  const pem = pemFromB64(
    process.env.OFFLINE_LOGIN_PUBLIC_KEY_B64 || "",
    "OFFLINE_LOGIN_PUBLIC_KEY_B64",
  );

  return crypto.createPublicKey(pem);
}

export function createOfflineLoginToken(params: {
  userId: string;
  ttlSeconds?: number;
}) {
  const userId = clean(params.userId);

  if (!userId) {
    throw new Error("Missing userId for offline login token");
  }

  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = Math.max(
    60,
    Number(
      params.ttlSeconds || process.env.OFFLINE_LOGIN_QR_TTL_SECONDS || 900,
    ),
  );

  const payload: OfflineLoginPayload = {
    v: 1,
    typ: "login",
    sub: userId,
    iat: now,
    nbf: now - 10,
    exp: now + ttlSeconds,
    jti: crypto.randomUUID(),
    aud: "CONFIDEX_BOOTH",
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));

  const signature = crypto.sign(
    null,
    Buffer.from(payloadPart, "utf8"),
    getOfflineLoginPrivateKey(),
  );

  const signaturePart = base64UrlEncode(signature);

  return {
    token: `LOGIN-OFFLINE-v1.${payloadPart}.${signaturePart}`,
    payload,
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifyOfflineLoginToken(
  token: string,
  options?: {
    nowSeconds?: number;
    allowExpired?: boolean;
  },
) {
  const raw = clean(token);

  if (!raw.startsWith("LOGIN-OFFLINE-v1.")) {
    return {
      ok: false,
      error: "INVALID_OFFLINE_TOKEN_PREFIX",
      payload: null as OfflineLoginPayload | null,
    };
  }

  const parts = raw.split(".");

  if (parts.length !== 3) {
    return {
      ok: false,
      error: "INVALID_OFFLINE_TOKEN_FORMAT",
      payload: null as OfflineLoginPayload | null,
    };
  }

  const [, payloadPart, signaturePart] = parts;

  let verified = false;

  try {
    verified = crypto.verify(
      null,
      Buffer.from(payloadPart, "utf8"),
      getOfflineLoginPublicKey(),
      base64UrlDecode(signaturePart),
    );
  } catch {
    verified = false;
  }

  if (!verified) {
    return {
      ok: false,
      error: "INVALID_OFFLINE_TOKEN_SIGNATURE",
      payload: null as OfflineLoginPayload | null,
    };
  }

  let payload: OfflineLoginPayload;

  try {
    payload = JSON.parse(base64UrlDecode(payloadPart).toString("utf8"));
  } catch {
    return {
      ok: false,
      error: "INVALID_OFFLINE_TOKEN_PAYLOAD",
      payload: null as OfflineLoginPayload | null,
    };
  }

  if (
    payload?.v !== 1 ||
    payload?.typ !== "login" ||
    payload?.aud !== "CONFIDEX_BOOTH" ||
    !payload?.sub
  ) {
    return {
      ok: false,
      error: "INVALID_OFFLINE_TOKEN_CLAIMS",
      payload: null as OfflineLoginPayload | null,
    };
  }

  const now = Number(options?.nowSeconds || Math.floor(Date.now() / 1000));

  if (payload.nbf && now < payload.nbf) {
    return {
      ok: false,
      error: "OFFLINE_TOKEN_NOT_YET_VALID",
      payload,
    };
  }

  if (!options?.allowExpired && payload.exp && now > payload.exp) {
    return {
      ok: false,
      error: "OFFLINE_TOKEN_EXPIRED",
      payload,
    };
  }

  return {
    ok: true,
    error: "",
    payload,
  };
}
