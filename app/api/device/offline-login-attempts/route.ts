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

export async function POST(req: Request) {
  try {
    const booth = await authenticateBoothDevice(req);

    await dbConnect();

    const body = await req.json();
    const attempts = Array.isArray(body?.attempts) ? body.attempts : [];

    const results = [];

    for (const attempt of attempts) {
      const localAttemptId = clean(attempt?.local_attempt_id || attempt?.id);
      const qrCode = clean(attempt?.qr_code || attempt?.qrCode);
      const claimedUserId = clean(attempt?.user_id || attempt?.userId);
      const scannedAt = parseScanTime(
        attempt?.scanned_at || attempt?.scannedAt,
      );
      const scannedAtSeconds = Math.floor(scannedAt.getTime() / 1000);

      if (!localAttemptId || !qrCode) {
        results.push({
          local_attempt_id: localAttemptId,
          ok: false,
          status: "missing_required_fields",
        });
        continue;
      }

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

      const userId = signed.payload.sub;

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

      const qrRecord = await QrToken.findOne({
        token: qrCode,
        type: "login",
      });

      if (qrRecord) {
        if (!qrRecord.used) {
          qrRecord.used = true;
          await qrRecord.save();
        }

        results.push({
          local_attempt_id: localAttemptId,
          ok: true,
          status: "verified_and_marked_used",
          user_id: userId,
        });

        continue;
      }

      results.push({
        local_attempt_id: localAttemptId,
        ok: true,
        status: "verified_signed_token_without_db_record",
        user_id: userId,
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
