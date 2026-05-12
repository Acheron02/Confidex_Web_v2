import { NextRequest, NextResponse } from "next/server";
import { authenticateBoothDevice } from "@/lib/deviceAuth";
import { getBoothConnectionStatus } from "@/lib/booth-presence";

const DEFAULT_COINS = {
  "20": { stock: 0, enabled: true },
  "5": { stock: 0, enabled: true },
  "1": { stock: 0, enabled: true },
};

export async function GET(req: NextRequest) {
  try {
    const booth = await authenticateBoothDevice(req);

    const connectionStatus = getBoothConnectionStatus(booth.lastSeenAt || null);

    return NextResponse.json({
      ok: true,
      boothId: String(booth._id),
      deviceId: booth.deviceId,
      config: booth.config || { products: [] },
      inventorySnapshot: booth.inventorySnapshot || {
        products: {},
        coins: DEFAULT_COINS,
      },
      configVersion: Number(booth.configVersion || 1),
      inventoryVersion: Number(booth.inventoryVersion || 1),
      isOnline: connectionStatus !== "offline",
      connectionStatus,
      lastSeenAt: booth.lastSeenAt || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unauthorized" },
      { status: 401 },
    );
  }
}
