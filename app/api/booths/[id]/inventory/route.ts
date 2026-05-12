import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";
import { sendToBoothWithRetry } from "@/lib/ws-push";
import { withBoothPresence } from "@/lib/booth-presence";

export const runtime = "nodejs";

type BoothRouteParams = {
  params: Promise<{ id: string }>;
};

type InventoryProductRecord = Record<string, { stock: number }>;
type InventoryCoinRecord = Record<string, { stock: number; enabled: boolean }>;

const DEFAULT_COINS: InventoryCoinRecord = {
  "20": { stock: 0, enabled: true },
  "5": { stock: 0, enabled: true },
  "1": { stock: 0, enabled: true },
};

const GMAIL_USER =
  process.env.GMAIL_USER ||
  process.env.EMAIL_USER ||
  process.env.GOOGLE_EMAIL ||
  "";

const GMAIL_APP_PASSWORD =
  process.env.GMAIL_APP_PASSWORD ||
  process.env.EMAIL_PASS ||
  process.env.GOOGLE_APP_PASSWORD ||
  "";

const COMPANY_EMAIL =
  process.env.COMPANY_EMAIL ||
  process.env.MAIL_TO ||
  process.env.GMAIL_TO ||
  GMAIL_USER;

function sanitizeProducts(value: unknown): InventoryProductRecord {
  if (!value || typeof value !== "object") return {};

  const raw = value as Record<string, any>;
  const products: InventoryProductRecord = {};

  for (const [productId, productValue] of Object.entries(raw)) {
    const cleanId = String(productId).trim();
    if (!cleanId) continue;

    products[cleanId] = {
      stock: Math.max(0, Number(productValue?.stock) || 0),
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDatePH(value = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(value);
}

function getProductName(booth: any, productId: string) {
  const products = Array.isArray(booth?.config?.products)
    ? booth.config.products
    : [];

  const matched = products.find((product: any) => {
    const possibleId = String(
      product?.product_id || product?.id || product?.name || "",
    ).trim();

    return possibleId === productId;
  });

  return matched?.name || productId;
}

function getStockStatus(stock: number) {
  if (stock <= 0) return "Out of stock";
  if (stock <= 30) return "Low stock";
  return "Available";
}

function getCoinStatus(stock: number) {
  if (stock <= 0) return "No coins";
  if (stock <= 5) return "Low coins";
  return "Available";
}

function buildProductRows(
  booth: any,
  products: InventoryProductRecord,
): string {
  const entries = Object.entries(products || {});

  if (!entries.length) {
    return `
      <tr>
        <td colspan="3" style="padding:10px;border:1px solid #e5e7eb;color:#6b7280;">
          No product stock data available.
        </td>
      </tr>
    `;
  }

  return entries
    .map(([productId, productValue]) => {
      const stock = Math.max(0, Number(productValue?.stock) || 0);

      return `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(getProductName(booth, productId))}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">
            ${stock}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(getStockStatus(stock))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildCoinRows(coins: InventoryCoinRecord): string {
  const coinList = [
    { key: "20", label: "₱20 coin" },
    { key: "5", label: "₱5 coin" },
    { key: "1", label: "₱1 coin" },
  ];

  return coinList
    .map((coin) => {
      const coinData = coins?.[coin.key];
      const stock = Math.max(0, Number(coinData?.stock) || 0);
      const enabled = Boolean(coinData?.enabled ?? true);

      return `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(coin.label)}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">
            ${stock}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(getCoinStatus(stock))}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${enabled ? "Enabled" : "Disabled"}
          </td>
        </tr>
      `;
    })
    .join("");
}

async function sendInventoryEmail({
  booth,
  products,
  coins,
}: {
  booth: any;
  products: InventoryProductRecord;
  coins: InventoryCoinRecord;
}) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !COMPANY_EMAIL) {
    console.warn(
      "[INVENTORY EMAIL] Skipped. Missing GMAIL_USER, GMAIL_APP_PASSWORD, or COMPANY_EMAIL.",
    );
    return;
  }

  const boothName = booth?.name || "Unnamed booth";
  const boothLocation = booth?.location || "No location";
  const updatedAt = formatDatePH();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h2 style="margin:0 0 8px;">Confidex Inventory Update</h2>

      <p style="margin:0 0 16px;color:#4b5563;">
        The booth inventory was updated from the admin dashboard.
      </p>

      <div style="margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        <p style="margin:0;"><strong>Booth:</strong> ${escapeHtml(boothName)}</p>
        <p style="margin:0;"><strong>Location:</strong> ${escapeHtml(boothLocation)}</p>
        <p style="margin:0;"><strong>Inventory version:</strong> ${escapeHtml(booth?.inventoryVersion || "N/A")}</p>
        <p style="margin:0;"><strong>Updated at:</strong> ${escapeHtml(updatedAt)}</p>
      </div>

      <h3 style="margin:18px 0 8px;">Product Stock</h3>

      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Product</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Stock</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${buildProductRows(booth, products)}
        </tbody>
      </table>

      <h3 style="margin:18px 0 8px;">Coin Inventory</h3>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Coin</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Quantity</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Status</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Enabled</th>
          </tr>
        </thead>
        <tbody>
          ${buildCoinRows(coins)}
        </tbody>
      </table>
    </div>
  `;

  const text = `
Confidex Inventory Update

Booth: ${boothName}
Location: ${boothLocation}
Inventory version: ${booth?.inventoryVersion || "N/A"}
Updated at: ${updatedAt}

Product Stock:
${Object.entries(products || {})
  .map(([productId, item]) => {
    const stock = Math.max(0, Number(item?.stock) || 0);
    return `- ${getProductName(booth, productId)}: ${stock} (${getStockStatus(stock)})`;
  })
  .join("\n")}

Coin Inventory:
- ₱20 coin: ${Math.max(0, Number(coins?.["20"]?.stock) || 0)} (${getCoinStatus(
    Math.max(0, Number(coins?.["20"]?.stock) || 0),
  )})
- ₱5 coin: ${Math.max(0, Number(coins?.["5"]?.stock) || 0)} (${getCoinStatus(
    Math.max(0, Number(coins?.["5"]?.stock) || 0),
  )})
- ₱1 coin: ${Math.max(0, Number(coins?.["1"]?.stock) || 0)} (${getCoinStatus(
    Math.max(0, Number(coins?.["1"]?.stock) || 0),
  )})
  `.trim();

  await transporter.sendMail({
    from: `"Confidex System" <${GMAIL_USER}>`,
    to: COMPANY_EMAIL,
    subject: `Confidex Inventory Update - ${boothName}`,
    html,
    text,
  });
}

export async function PATCH(req: Request, { params }: BoothRouteParams) {
  try {
    await dbConnect();

    const { id } = await params;

    const body = (await req.json().catch(() => ({}))) as {
      products?: unknown;
      coins?: unknown;
    };

    const booth = await Booth.findById(id);

    if (!booth) {
      return NextResponse.json({ error: "Booth not found" }, { status: 404 });
    }

    const currentInventory = (booth.inventorySnapshot || {
      products: {},
      coins: DEFAULT_COINS,
    }) as {
      products?: InventoryProductRecord;
      coins?: InventoryCoinRecord;
    };

    const nextProducts =
      body.products !== undefined
        ? sanitizeProducts(body.products)
        : currentInventory.products || {};

    const nextCoins =
      body.coins !== undefined
        ? sanitizeCoins(body.coins)
        : currentInventory.coins || DEFAULT_COINS;

    booth.inventorySnapshot = {
      products: nextProducts,
      coins: nextCoins,
    };

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

    try {
      await sendInventoryEmail({
        booth,
        products: nextProducts,
        coins: nextCoins,
      });
    } catch (emailError) {
      console.error(
        "[INVENTORY EMAIL] Failed to send company email:",
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
