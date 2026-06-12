import { NextRequest, NextResponse } from "next/server";
import { authenticateBoothDevice } from "@/lib/deviceAuth";
import {
  normalizeInventorySnapshot,
  sendInventoryStockAlertEmail,
} from "@/lib/inventory-mail";

type InventoryProductMap = Record<string, { stock: number; enabled?: boolean }>;
type InventoryCoinMap = Record<string, { stock: number; enabled: boolean }>;

const DEFAULT_COINS: InventoryCoinMap = {
  "20": { stock: 0, enabled: true },
  "5": { stock: 0, enabled: true },
  "1": { stock: 0, enabled: true },
};

function sanitizeInventorySnapshot(value: unknown): {
  products: InventoryProductMap;
  coins: InventoryCoinMap;
} | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as {
    products?: Record<string, any>;
    coins?: Record<string, any>;
  };

  const products: InventoryProductMap = {};
  const rawProducts = raw.products || {};

  for (const [productId, productValue] of Object.entries(rawProducts)) {
    const cleanId = String(productId).trim();
    if (!cleanId) continue;

    products[cleanId] = {
      stock: Math.max(0, Number(productValue?.stock) || 0),
      enabled: Boolean(productValue?.enabled ?? true),
    };
  }

  const rawCoins = raw.coins || {};
  const coins: InventoryCoinMap = {
    "20": {
      stock: Math.max(0, Number(rawCoins["20"]?.stock) || 0),
      enabled: Boolean(rawCoins["20"]?.enabled ?? true),
    },
    "5": {
      stock: Math.max(0, Number(rawCoins["5"]?.stock) || 0),
      enabled: Boolean(rawCoins["5"]?.enabled ?? true),
    },
    "1": {
      stock: Math.max(0, Number(rawCoins["1"]?.stock) || 0),
      enabled: Boolean(rawCoins["1"]?.enabled ?? true),
    },
  };

  return { products, coins };
}

function deepEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function POST(req: NextRequest) {
  try {
    const booth = await authenticateBoothDevice(req);
    const body = (await req.json().catch(() => ({}))) as {
      inventorySnapshot?: unknown;
    };

    const nextInventory = sanitizeInventorySnapshot(body.inventorySnapshot);
    if (!nextInventory) {
      return NextResponse.json(
        { error: "Missing inventorySnapshot" },
        { status: 400 },
      );
    }

    const previousInventory = normalizeInventorySnapshot(
      booth.inventorySnapshot || {
        products: {},
        coins: DEFAULT_COINS,
      },
    );

    const nextInventorySnapshot = {
      products: nextInventory.products,
      coins: nextInventory.coins || DEFAULT_COINS,
    };

    booth.lastSeenAt = new Date();
    booth.isOnline = true;

    const inventoryChanged = !deepEqual(
      booth.inventorySnapshot || {},
      nextInventorySnapshot,
    );

    if (inventoryChanged) {
      booth.inventorySnapshot = nextInventorySnapshot;
      booth.inventoryVersion = Number(booth.inventoryVersion || 0) + 1;
    }

    await booth.save();

    let stockAlertResult: Awaited<
      ReturnType<typeof sendInventoryStockAlertEmail>
    > | null = null;

    if (inventoryChanged) {
      try {
        stockAlertResult = await sendInventoryStockAlertEmail({
          booth,
          previousInventory,
          nextInventory: nextInventorySnapshot,
          source: "Booth HTTP inventory sync",
        });
      } catch (emailError) {
        console.error(
          "[INVENTORY EMAIL] Failed to send HTTP inventory stock alert:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      boothId: String(booth._id),
      inventoryVersion: Number(booth.inventoryVersion || 1),
      inventorySnapshot: booth.inventorySnapshot || {
        products: {},
        coins: DEFAULT_COINS,
      },
      inventoryChanged,
      stockAlert: stockAlertResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unauthorized" },
      { status: 401 },
    );
  }
}
