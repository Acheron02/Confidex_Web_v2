import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";
import { sendToBoothWithRetry } from "@/lib/ws-push";
import { withBoothPresence } from "@/lib/booth-presence";

type BoothRouteParams = {
  params: Promise<{ id: string }>;
};

type BoothProductInput = {
  product_id: string;
  name: string;
  type: string;
  price: number;
  enabled: boolean;
  dispense_slot: "KIT1" | "KIT2" | "KIT3";
};

type InventoryProductRecord = Record<string, { stock: number }>;
type InventoryCoinRecord = Record<string, { stock: number; enabled: boolean }>;

const DEFAULT_COINS: InventoryCoinRecord = {
  "20": { stock: 0, enabled: true },
  "5": { stock: 0, enabled: true },
  "1": { stock: 0, enabled: true },
};

function sanitizeProducts(value: unknown): BoothProductInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): BoothProductInput => {
      const rawSlot = String((item as any)?.dispense_slot || "KIT1")
        .trim()
        .toUpperCase();

      const dispense_slot =
        rawSlot === "KIT2" || rawSlot === "KIT3" ? rawSlot : "KIT1";

      return {
        product_id: String((item as any)?.product_id || "").trim(),
        name: String((item as any)?.name || "").trim(),
        type: String((item as any)?.type || "").trim(),
        price: Math.max(0, Number((item as any)?.price) || 0),
        enabled: Boolean((item as any)?.enabled ?? true),
        dispense_slot,
      };
    })
    .filter((product) => product.product_id && product.name && product.type);
}

export async function PATCH(req: Request, { params }: BoothRouteParams) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      products?: unknown;
    };

    const booth = await Booth.findById(id);
    if (!booth) {
      return NextResponse.json({ error: "Booth not found" }, { status: 404 });
    }

    const currentConfig = (booth.config || {}) as {
      products?: BoothProductInput[];
      [key: string]: unknown;
    };

    const currentInventory = (booth.inventorySnapshot || {
      products: {},
      coins: DEFAULT_COINS,
    }) as {
      products?: InventoryProductRecord;
      coins?: InventoryCoinRecord;
    };

    const nextProducts = sanitizeProducts(body.products);

    booth.config = {
      ...currentConfig,
      products: nextProducts,
    };

    booth.configVersion = Number(booth.configVersion || 0) + 1;

    const nextInventoryProducts: InventoryProductRecord = {};

    for (const product of nextProducts) {
      const productId = product.product_id;
      nextInventoryProducts[productId] = {
        stock: Math.max(
          0,
          Number(currentInventory.products?.[productId]?.stock) || 0,
        ),
      };
    }

    booth.inventorySnapshot = {
      products: nextInventoryProducts,
      coins: currentInventory.coins || DEFAULT_COINS,
    };

    booth.inventoryVersion = Number(booth.inventoryVersion || 0) + 1;
    booth.lastSeenAt = booth.lastSeenAt || null;

    await booth.save();

    const boothId = String(booth._id);

    const configPushed = await sendToBoothWithRetry(boothId, {
      type: "config_updated",
      boothId,
      configVersion: Number(booth.configVersion || 1),
      config: booth.config || {},
    });

    const inventoryPushed = await sendToBoothWithRetry(boothId, {
      type: "inventory_replace",
      boothId,
      inventoryVersion: Number(booth.inventoryVersion || 1),
      inventorySnapshot: booth.inventorySnapshot || {
        products: {},
        coins: DEFAULT_COINS,
      },
    });

    return NextResponse.json(
      {
        message:
          configPushed && inventoryPushed
            ? "Booth products updated successfully"
            : "Booth products updated, but booth socket was not connected for full realtime push",
        booth: withBoothPresence(booth.toObject()),
        pushed: {
          config: configPushed,
          inventory: inventoryPushed,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update booth products error:", error);
    return NextResponse.json(
      { error: "Failed to update booth products" },
      { status: 500 },
    );
  }
}
