import { escapeHtml, sendCompanyMail } from "@/lib/company-mail";

type InventoryProduct = {
  stock?: number;
  enabled?: boolean;
};

type InventoryCoin = {
  stock?: number;
  enabled?: boolean;
};

type BoothProductConfig = {
  product_id?: string;
  productID?: string;
  id?: string;
  name?: string;
  type?: string;
  price?: number;
  enabled?: boolean;
  dispense_slot?: string;
};

type BoothLike = {
  _id?: string;
  name?: string;
  location?: string;
  inventoryVersion?: number;
  config?: {
    products?: BoothProductConfig[];
  };
};

type InventorySnapshot = {
  products?: Record<string, InventoryProduct>;
  coins?: Record<string, InventoryCoin>;
};

type SendInventoryUpdateEmailPayload = {
  booth: BoothLike;
  products: Record<string, InventoryProduct>;
  coins: Record<string, InventoryCoin>;
  updatedBy?: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  source?: string;
};

type SendInventoryStockAlertEmailPayload = {
  booth: BoothLike;
  previousInventory?: InventorySnapshot | null;
  nextInventory: InventorySnapshot;
  source?: string;
  updatedBy?: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  force?: boolean;
};

type ProductAlert = {
  productId: string;
  productName: string;
  previousStock: number | null;
  currentStock: number;
  status: "low" | "out";
  statusLabel: string;
};

type CoinAlert = {
  coinKey: string;
  coinName: string;
  previousStock: number | null;
  currentStock: number;
  status: "low" | "out";
  statusLabel: string;
};

const PRODUCT_LOW_STOCK_THRESHOLD = Number(
  process.env.PRODUCT_LOW_STOCK_THRESHOLD || 2,
);

const COIN_LOW_STOCK_THRESHOLD = Number(
  process.env.COIN_LOW_STOCK_THRESHOLD || 5,
);

const DEFAULT_COINS: Record<string, InventoryCoin> = {
  "20": { stock: 0, enabled: true },
  "5": { stock: 0, enabled: true },
  "1": { stock: 0, enabled: true },
};

function formatDatePH(value = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(value);
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function stockStatus(stock: number, threshold: number) {
  if (stock <= 0) return "out" as const;
  if (stock <= threshold) return "low" as const;
  return "available" as const;
}

function getProductName(booth: BoothLike, productId: string) {
  const products = Array.isArray(booth.config?.products)
    ? booth.config.products
    : [];

  const matched = products.find((product) => {
    const possibleIds = [
      product.product_id,
      product.productID,
      product.id,
      product.name,
      product.type,
    ].map((value) => String(value || "").trim());

    return possibleIds.includes(productId);
  });

  return matched?.name || matched?.type || productId;
}

function getStockStatus(stock: number) {
  if (stock <= 0) return "Out of stock";
  if (stock <= PRODUCT_LOW_STOCK_THRESHOLD) return "Low stock";
  return "Available";
}

function getCoinStatus(stock: number) {
  if (stock <= 0) return "No coins";
  if (stock <= COIN_LOW_STOCK_THRESHOLD) return "Low coins";
  return "Available";
}

function getCoinName(coinKey: string) {
  if (coinKey === "20") return "₱20 coin";
  if (coinKey === "5") return "₱5 coin";
  if (coinKey === "1") return "₱1 coin";
  return `₱${coinKey} coin`;
}

function normalizeProducts(value: unknown): Record<string, InventoryProduct> {
  if (!value || typeof value !== "object") return {};

  const raw = value as Record<string, any>;
  const products: Record<string, InventoryProduct> = {};

  for (const [productId, productValue] of Object.entries(raw)) {
    const cleanId = String(productId || "").trim();
    if (!cleanId) continue;

    products[cleanId] = {
      stock: numberOrZero(productValue?.stock),
      enabled: Boolean(productValue?.enabled ?? true),
    };
  }

  return products;
}

function normalizeCoins(value: unknown): Record<string, InventoryCoin> {
  const raw =
    value && typeof value === "object" ? (value as Record<string, any>) : {};
  const keys = new Set([
    ...Object.keys(DEFAULT_COINS),
    ...Object.keys(raw || {}),
  ]);
  const coins: Record<string, InventoryCoin> = {};

  for (const key of keys) {
    coins[key] = {
      stock: numberOrZero(raw[key]?.stock),
      enabled: Boolean(
        raw[key]?.enabled ?? DEFAULT_COINS[key]?.enabled ?? true,
      ),
    };
  }

  return coins;
}

export function normalizeInventorySnapshot(
  value: unknown,
): Required<InventorySnapshot> {
  const raw =
    value && typeof value === "object" ? (value as InventorySnapshot) : {};

  return {
    products: normalizeProducts(raw.products),
    coins: normalizeCoins(raw.coins || DEFAULT_COINS),
  };
}

function buildProductRows(
  booth: BoothLike,
  products: Record<string, InventoryProduct>,
) {
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
    .map(([productId, value]) => {
      const stock = numberOrZero(value?.stock);

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

function buildCoinRows(coins: Record<string, InventoryCoin>) {
  return Object.entries(normalizeCoins(coins))
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([coinKey, coinData]) => {
      const stock = numberOrZero(coinData?.stock);
      const enabled = Boolean(coinData?.enabled ?? true);

      return `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(getCoinName(coinKey))}
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

function shouldSendProductAlert(
  previousStock: number | null,
  currentStock: number,
  force: boolean,
) {
  const currentStatus = stockStatus(currentStock, PRODUCT_LOW_STOCK_THRESHOLD);
  if (currentStatus === "available") return false;
  if (force || previousStock === null) return true;
  if (previousStock === currentStock) return false;

  const previousStatus = stockStatus(
    previousStock,
    PRODUCT_LOW_STOCK_THRESHOLD,
  );
  if (previousStatus !== currentStatus) return true;

  return currentStock < previousStock;
}

function shouldSendCoinAlert(
  previousStock: number | null,
  currentStock: number,
  force: boolean,
) {
  const currentStatus = stockStatus(currentStock, COIN_LOW_STOCK_THRESHOLD);
  if (currentStatus === "available") return false;
  if (force || previousStock === null) return true;
  if (previousStock === currentStock) return false;

  const previousStatus = stockStatus(previousStock, COIN_LOW_STOCK_THRESHOLD);
  if (previousStatus !== currentStatus) return true;

  return currentStock < previousStock;
}

function collectProductAlerts({
  booth,
  previousInventory,
  nextInventory,
  force = false,
}: SendInventoryStockAlertEmailPayload): ProductAlert[] {
  const previousProducts = normalizeProducts(previousInventory?.products);
  const nextProducts = normalizeProducts(nextInventory.products);

  return Object.entries(nextProducts)
    .map(([productId, value]) => {
      const currentStock = numberOrZero(value?.stock);
      const previousValue = previousProducts[productId]?.stock;
      const previousStock =
        previousValue === undefined || previousValue === null
          ? null
          : numberOrZero(previousValue);

      const status = stockStatus(currentStock, PRODUCT_LOW_STOCK_THRESHOLD);

      if (status === "available") return null;
      if (!shouldSendProductAlert(previousStock, currentStock, force))
        return null;

      return {
        productId,
        productName: getProductName(booth, productId),
        previousStock,
        currentStock,
        status,
        statusLabel: status === "out" ? "Out of stock" : "Low stock",
      } satisfies ProductAlert;
    })
    .filter(Boolean) as ProductAlert[];
}

function collectCoinAlerts({
  previousInventory,
  nextInventory,
  force = false,
}: SendInventoryStockAlertEmailPayload): CoinAlert[] {
  const previousCoins = normalizeCoins(previousInventory?.coins);
  const nextCoins = normalizeCoins(nextInventory.coins);

  return Object.entries(nextCoins)
    .map(([coinKey, value]) => {
      const currentStock = numberOrZero(value?.stock);
      const previousValue = previousCoins[coinKey]?.stock;
      const previousStock =
        previousValue === undefined || previousValue === null
          ? null
          : numberOrZero(previousValue);

      const status = stockStatus(currentStock, COIN_LOW_STOCK_THRESHOLD);

      if (status === "available") return null;
      if (!shouldSendCoinAlert(previousStock, currentStock, force)) return null;

      return {
        coinKey,
        coinName: getCoinName(coinKey),
        previousStock,
        currentStock,
        status,
        statusLabel: status === "out" ? "No coins" : "Low coins",
      } satisfies CoinAlert;
    })
    .filter(Boolean) as CoinAlert[];
}

function buildAlertRows(alerts: Array<ProductAlert | CoinAlert>) {
  return alerts
    .map((alert) => {
      const name = "productName" in alert ? alert.productName : alert.coinName;
      const previous =
        alert.previousStock === null ? "Unknown" : String(alert.previousStock);
      const statusColor = alert.status === "out" ? "#b91c1c" : "#b45309";

      return `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(name)}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">
            ${escapeHtml(previous)}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">
            ${alert.currentStock}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;color:${statusColor};font-weight:700;">
            ${escapeHtml(alert.statusLabel)}
          </td>
        </tr>
      `;
    })
    .join("");
}

export async function sendInventoryUpdateEmail({
  booth,
  products,
  coins,
  updatedBy,
  source = "Admin dashboard",
}: SendInventoryUpdateEmailPayload) {
  const boothName = booth.name || "Unnamed booth";
  const boothLocation = booth.location || "No location";
  const updatedAt = formatDatePH();
  const normalizedProducts = normalizeProducts(products);
  const normalizedCoins = normalizeCoins(coins);

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h2 style="margin:0 0 8px;">Confidex Inventory Update</h2>

      <p style="margin:0 0 16px;color:#4b5563;">
        The booth inventory was updated.
      </p>

      <div style="margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        <p style="margin:0;"><strong>Booth:</strong> ${escapeHtml(boothName)}</p>
        <p style="margin:0;"><strong>Location:</strong> ${escapeHtml(boothLocation)}</p>
        <p style="margin:0;"><strong>Source:</strong> ${escapeHtml(source)}</p>
        <p style="margin:0;"><strong>Inventory version:</strong> ${escapeHtml(booth.inventoryVersion || "N/A")}</p>
        <p style="margin:0;"><strong>Updated at:</strong> ${escapeHtml(updatedAt)}</p>
        <p style="margin:0;"><strong>Updated by:</strong> ${escapeHtml(updatedBy?.name || updatedBy?.email || "System")}</p>
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
          ${buildProductRows(booth, normalizedProducts)}
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
          ${buildCoinRows(normalizedCoins)}
        </tbody>
      </table>
    </div>
  `;

  const text = `
Confidex Inventory Update

Booth: ${boothName}
Location: ${boothLocation}
Source: ${source}
Inventory version: ${booth.inventoryVersion || "N/A"}
Updated at: ${updatedAt}
Updated by: ${updatedBy?.name || updatedBy?.email || "System"}

Product Stock:
${Object.entries(normalizedProducts)
  .map(([productId, item]) => {
    const stock = numberOrZero(item?.stock);
    return `- ${getProductName(booth, productId)}: ${stock} (${getStockStatus(stock)})`;
  })
  .join("\n")}

Coin Inventory:
${Object.entries(normalizedCoins)
  .sort(([a], [b]) => Number(b) - Number(a))
  .map(([coinKey, item]) => {
    const stock = numberOrZero(item?.stock);
    return `- ${getCoinName(coinKey)}: ${stock} (${getCoinStatus(stock)})`;
  })
  .join("\n")}
  `.trim();

  await sendCompanyMail({
    subject: `Confidex Inventory Update - ${boothName}`,
    html,
    text,
  });
}

export async function sendInventoryStockAlertEmail({
  booth,
  previousInventory,
  nextInventory,
  source = "Inventory sync",
  updatedBy,
  force = false,
}: SendInventoryStockAlertEmailPayload) {
  const productAlerts = collectProductAlerts({
    booth,
    previousInventory,
    nextInventory,
    source,
    updatedBy,
    force,
  });

  const coinAlerts = collectCoinAlerts({
    booth,
    previousInventory,
    nextInventory,
    source,
    updatedBy,
    force,
  });

  if (!productAlerts.length && !coinAlerts.length) {
    return {
      sent: false,
      reason: "no_low_or_out_of_stock_transition",
      productAlerts: 0,
      coinAlerts: 0,
    };
  }

  const boothName = booth.name || "Unnamed booth";
  const boothLocation = booth.location || "No location";
  const updatedAt = formatDatePH();
  const hasOutOfStock = [...productAlerts, ...coinAlerts].some(
    (alert) => alert.status === "out",
  );

  const title = hasOutOfStock
    ? "Confidex Out-of-Stock Alert"
    : "Confidex Low-Stock Warning";

  const productSection = productAlerts.length
    ? `
      <h3 style="margin:18px 0 8px;">Product Alerts</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Product</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Previous</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Current</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>${buildAlertRows(productAlerts)}</tbody>
      </table>
    `
    : "";

  const coinSection = coinAlerts.length
    ? `
      <h3 style="margin:18px 0 8px;">Coin Alerts</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Coin</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Previous</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;">Current</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>${buildAlertRows(coinAlerts)}</tbody>
      </table>
    `
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h2 style="margin:0 0 8px;color:${hasOutOfStock ? "#b91c1c" : "#b45309"};">${escapeHtml(title)}</h2>

      <p style="margin:0 0 16px;color:#4b5563;">
        One or more booth inventory items reached a warning level.
      </p>

      <div style="margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        <p style="margin:0;"><strong>Booth:</strong> ${escapeHtml(boothName)}</p>
        <p style="margin:0;"><strong>Location:</strong> ${escapeHtml(boothLocation)}</p>
        <p style="margin:0;"><strong>Source:</strong> ${escapeHtml(source)}</p>
        <p style="margin:0;"><strong>Inventory version:</strong> ${escapeHtml(booth.inventoryVersion || "N/A")}</p>
        <p style="margin:0;"><strong>Detected at:</strong> ${escapeHtml(updatedAt)}</p>
        <p style="margin:0;"><strong>Updated by:</strong> ${escapeHtml(updatedBy?.name || updatedBy?.email || "System")}</p>
      </div>

      ${productSection}
      ${coinSection}
    </div>
  `;

  const textLines = [
    title,
    "",
    `Booth: ${boothName}`,
    `Location: ${boothLocation}`,
    `Source: ${source}`,
    `Inventory version: ${booth.inventoryVersion || "N/A"}`,
    `Detected at: ${updatedAt}`,
    `Updated by: ${updatedBy?.name || updatedBy?.email || "System"}`,
    "",
  ];

  if (productAlerts.length) {
    textLines.push("Product Alerts:");
    for (const alert of productAlerts) {
      textLines.push(
        `- ${alert.productName}: ${alert.previousStock ?? "Unknown"} -> ${alert.currentStock} (${alert.statusLabel})`,
      );
    }
    textLines.push("");
  }

  if (coinAlerts.length) {
    textLines.push("Coin Alerts:");
    for (const alert of coinAlerts) {
      textLines.push(
        `- ${alert.coinName}: ${alert.previousStock ?? "Unknown"} -> ${alert.currentStock} (${alert.statusLabel})`,
      );
    }
  }

  await sendCompanyMail({
    subject: `${title} - ${boothName}`,
    html,
    text: textLines.join("\n").trim(),
  });

  return {
    sent: true,
    productAlerts: productAlerts.length,
    coinAlerts: coinAlerts.length,
    hasOutOfStock,
  };
}
