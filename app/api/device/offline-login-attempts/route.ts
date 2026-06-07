import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QrToken from "@/models/qrToken";
import User from "@/models/User";
import { authenticateBoothDevice } from "@/lib/deviceAuth";
import { verifyOfflineLoginToken } from "@/lib/offline-login-token";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function parseScanTime(value: unknown) {
  const parsed = new Date(clean(value));

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date();
}

function payloadFromAttempt(attempt: any) {
  const payload = attempt?.payload;

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, any>;
  }

  const payloadJson = clean(attempt?.payload_json || attempt?.payloadJson);

  if (!payloadJson) return {} as Record<string, any>;

  try {
    const parsed = JSON.parse(payloadJson);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch {
    // ignore invalid optional payload JSON
  }

  return {} as Record<string, any>;
}

function extractUserId(payload: Record<string, any>) {
  return clean(
    payload.sub ||
      payload.user_id ||
      payload.userId ||
      payload.userID ||
      payload._id ||
      payload.id ||
      payload.uid,
  );
}

function extractTokenId(payload: Record<string, any>) {
  return clean(
    payload.jti ||
      payload.token_id ||
      payload.tokenId ||
      payload.nonce ||
      "",
  );
}

export async function POST(req: Request) {
  try {
    const booth = await authenticateBoothDevice(req);

    await dbConnect();

    const body = await req.json();
    const attempts = Array.isArray(body?.attempts) ? body.attempts : [];

    const results = [];

    for (const attempt of attempts) {
      const localAttemptId = clean(
        attempt?.local_attempt_id || attempt?.attempt_id || attempt?.id,
      );

      const qrCode = clean(attempt?.qr_code || attempt?.qrCode);
      const qrHash = clean(attempt?.qr_hash || attempt?.qrHash);
      const claimedUserId = clean(attempt?.user_id || attempt?.userId);
      const scannedAt = parseScanTime(
        attempt?.scanned_at || attempt?.scannedAt || attempt?.used_at || attempt?.usedAt,
      );
      const scannedAtSeconds = Math.floor(scannedAt.getTime() / 1000);
      const payload = payloadFromAttempt(attempt);

      let userId = extractUserId(payload);
      let tokenId = clean(attempt?.token_id || attempt?.tokenId) || extractTokenId(payload);

      if (!localAttemptId) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "missing_local_attempt_id",
        });
        continue;
      }

      if (qrCode) {
        const signed = verifyOfflineLoginToken(qrCode, {
          nowSeconds: scannedAtSeconds,
        });

        if (!signed.ok || !signed.payload?.sub) {
          results.push({
            local_attempt_id: localAttemptId,
            ok: false,
            status: "invalid_signature_or_expired_at_scan_time",
            reason: signed.error,
          });
          continue;
        }

        userId = signed.payload.sub;
        tokenId = signed.payload.jti || tokenId;
      }

      if (!userId) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "missing_user_id",
        });
        continue;
      }

      if (claimedUserId && claimedUserId !== userId) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "claimed_user_mismatch",
          user_id: userId,
        });
        continue;
      }

      const user = await User.findById(userId).select("_id").lean();

      if (!user) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "user_not_found",
          user_id: userId,
        });
        continue;
      }

      const lookup: any = {
        type: "login",
      };

      if (tokenId) {
        lookup.tokenId = tokenId;
      } else if (qrCode) {
        lookup.token = qrCode;
      } else {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "missing_token_id_or_qr_code",
          user_id: userId,
          qr_hash: qrHash || undefined,
        });
        continue;
      }

      const qrRecord = await QrToken.findOne(lookup);

      if (!qrRecord) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "login_token_record_not_found",
          user_id: userId,
          token_id: tokenId || undefined,
          qr_hash: qrHash || undefined,
        });
        continue;
      }

      if (String(qrRecord.userId || "") !== String(userId)) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "token_user_mismatch",
          user_id: userId,
          token_id: tokenId || undefined,
        });
        continue;
      }

      if (new Date(qrRecord.expiresAt) <= scannedAt) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "token_was_expired_at_scan_time",
          user_id: userId,
          token_id: tokenId || undefined,
        });
        continue;
      }

      const marked = await QrToken.findOneAndUpdate(
        {
          _id: qrRecord._id,
          used: false,
        },
        {
          $set: { used: true },
        },
        { new: true },
      );

      if (!marked) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "token_already_used_or_replayed",
          user_id: userId,
          token_id: tokenId || undefined,
          qr_hash: qrHash || undefined,
        });
        continue;
      }

      results.push({
        local_attempt_id: localAttemptId,
        ok: true,
        status: "verified_and_marked_used",
        user_id: userId,
        token_id: tokenId || undefined,
        qr_hash: qrHash || undefined,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        boothId: String(booth._id),
        reconciledAt: new Date().toISOString(),
        results,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[OFFLINE LOGIN ATTEMPTS] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to reconcile offline login attempts",
      },
      { status: 500 },
    );
  }
}
