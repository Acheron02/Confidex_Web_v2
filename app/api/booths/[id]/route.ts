import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";
import { sendToBoothWithRetry } from "@/lib/ws-push";
import { withBoothPresence } from "@/lib/booth-presence";
import {
  normalizeInventorySnapshot,
  sendInventoryStockAlertEmail,
  sendInventoryUpdateEmail,
} from "@/lib/inventory-mail";

export const runtime = "nodejs";

type BoothRouteParams = {
  params: Promise<{ id: string }>;
};

type InventoryProductRecord = Record<
  string,
  { stock: number; enabled?: boolean }
>;
type InventoryCoinRecord = Record<string, { stock: number; enabled: boolean }>;

const DEFAULT_COINS: InventoryCoinRecord = {
  "20": { stock: 0, enabled: true },
  "5": { stock: 0, enabled: true },
  "1": { stock: 0, enabled: true },
};

function sanitizeProducts(value: unknown): InventoryProductRecord {
  if (!value || typeof value !== "object") return {};

  const raw = value as Record<string, any>;
  const products: InventoryProductRecord = {};

  for (const [productId, productValue] of Object.entries(raw)) {
    const cleanId = String(productId).trim();
    if (!cleanId) continue;

    products[cleanId] = {
      stock: Math.max(0, Number(productValue?.stock) || 0),
      enabled: Boolean(productValue?.enabled ?? true),
    };
  }

  return products;
}

function sanitizeCoins(value: unknown): InventoryCoinRecord {
  const raw =
    value && typeof value === "object" ? (value as Record<string, any>) : {};

  return {
    "20": {
      stock: Math.max(0, Number(raw["20"]?.stock) || 0),
      enabled: Boolean(raw["20"]?.enabled ?? true),
    },
    "5": {
      stock: Math.max(0, Number(raw["5"]?.stock) || 0),
      enabled: Boolean(raw["5"]?.enabled ?? true),
    },
    "1": {
      stock: Math.max(0, Number(raw["1"]?.stock) || 0),
      enabled: Boolean(raw["1"]?.enabled ?? true),
    },
  };
}

export async function PATCH(req: Request, { params }: BoothRouteParams) {
  try {
    await dbConnect();

    const { id } = await params;

    const body = (await req.json().catch(() => ({}))) as {
      products?: unknown;
      coins?: unknown;
      updatedBy?: {
        name?: string;
        email?: string;
        role?: string;
      } | null;
    };

    const booth = await Booth.findById(id);

    if (!booth) {
      return NextResponse.json({ error: "Booth not found" }, { status: 404 });
    }

    const previousInventory = normalizeInventorySnapshot(
      booth.inventorySnapshot || {
        products: {},
        coins: DEFAULT_COINS,
      },
    );

    const nextProducts =
      body.products !== undefined
        ? sanitizeProducts(body.products)
        : previousInventory.products || {};

    const nextCoins =
      body.coins !== undefined
        ? sanitizeCoins(body.coins)
        : (previousInventory.coins as InventoryCoinRecord) || DEFAULT_COINS;

    const nextInventorySnapshot = {
      products: nextProducts,
      coins: nextCoins,
    };

    booth.inventorySnapshot = nextInventorySnapshot;
    booth.inventoryVersion = Number(booth.inventoryVersion || 0) + 1;

    await booth.save();

    const boothId = String(booth._id);

    const pushed = await sendToBoothWithRetry(boothId, {
      type: "inventory_replace",
      boothId,
      inventoryVersion: Number(booth.inventoryVersion || 1),
      inventorySnapshot: booth.inventorySnapshot || {
        products: {},
        coins: DEFAULT_COINS,
      },
    });

    const emailSummary = {
      updateEmailSent: false,
      stockAlertSent: false,
      stockAlertResult: null as unknown,
      errors: [] as string[],
    };

    try {
      await sendInventoryUpdateEmail({
        booth,
        products: nextProducts,
        coins: nextCoins,
        updatedBy: body.updatedBy || null,
        source: "Admin dashboard stock update",
      });
      emailSummary.updateEmailSent = true;
    } catch (emailError: any) {
      const message = emailError?.message || String(emailError);
      emailSummary.errors.push(`Inventory update email failed: ${message}`);
      console.error(
        "[INVENTORY EMAIL] Failed to send inventory update email:",
        emailError,
      );
    }

    try {
      const alertResult = await sendInventoryStockAlertEmail({
        booth,
        previousInventory,
        nextInventory: nextInventorySnapshot,
        updatedBy: body.updatedBy || null,
        source: "Admin dashboard stock update",
      });
      emailSummary.stockAlertResult = alertResult;
      emailSummary.stockAlertSent = Boolean(alertResult?.sent);
    } catch (emailError: any) {
      const message = emailError?.message || String(emailError);
      emailSummary.errors.push(`Stock alert email failed: ${message}`);
      console.error(
        "[INVENTORY EMAIL] Failed to send stock alert email:",
        emailError,
      );
    }

    return NextResponse.json(
      {
        message: pushed
          ? "Booth inventory updated successfully"
          : "Booth inventory updated, but booth socket was not connected for realtime push",
        booth: withBoothPresence(booth.toObject()),
        pushed,
        email: emailSummary,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update booth inventory error:", error);

    return NextResponse.json(
      { error: "Failed to update booth inventory" },
      { status: 500 },
    );
  }
}
