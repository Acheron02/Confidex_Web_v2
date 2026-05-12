import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";
import { authenticateBoothRequest } from "@/lib/deviceAuth";

declare global {
  // eslint-disable-next-line no-var
  var __confidex_device_presence_write_at__:
    | Map<string, number>
    | undefined;
}

const HEARTBEAT_WRITE_INTERVAL_MS = 45 * 1000;

function getPresenceWriteMap() {
  if (!global.__confidex_device_presence_write_at__) {
    global.__confidex_device_presence_write_at__ = new Map<string, number>();
  }

  return global.__confidex_device_presence_write_at__;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateBoothRequest(req);
    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
    };

    const now = new Date();
    const nextOnline = body.status !== "offline";
    const writes = getPresenceWriteMap();
    const lastWriteAt = writes.get(auth.boothId) || 0;
    const shouldWrite =
      !nextOnline || Date.now() - lastWriteAt >= HEARTBEAT_WRITE_INTERVAL_MS;

    if (shouldWrite) {
      await dbConnect();
      await Booth.findByIdAndUpdate(auth.boothId, {
        $set: {
          lastSeenAt: now,
          isOnline: nextOnline,
        },
      });

      writes.set(auth.boothId, Date.now());
    }

    return NextResponse.json({
      ok: true,
      boothId: auth.boothId,
      isOnline: nextOnline,
      lastSeenAt: now,
      saved: shouldWrite,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unauthorized" },
      { status: 401 },
    );
  }
}
