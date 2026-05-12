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
  config?: {
    products?: BoothProductConfig[];
  };
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
};

function formatDatePH(value = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(value);
}

function getProductName(booth: BoothLike, productId: string) {
  const products = Array.isArray(booth.config?.products)
    ? booth.config.products
    : [];

  const matched = products.find((product) => {
    const possibleId = String(
      product.product_id || product.id || product.name || "",
    );

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
      const stock = Math.max(0, Number(value?.stock) || 0);

      return `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(getProductName(booth, productId))}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">
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
  const coinList = [
    { key: "1", label: "₱1 coin" },
    { key: "5", label: "₱5 coin" },
    { key: "20", label: "₱20 coin" },
  ];

  return coinList
    .map((coin) => {
      const stock = Math.max(0, Number(coins?.[coin.key]?.stock) || 0);

      return `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(coin.label)}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">
            ${stock}
          </td>
          <td style="padding:10px;border:1px solid #e5e7eb;">
            ${escapeHtml(getCoinStatus(stock))}
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
}: SendInventoryUpdateEmailPayload) {
  const boothName = booth.name || "Unnamed booth";
  const boothLocation = booth.location || "No location";
  const updatedAt = formatDatePH();

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h2 style="margin:0 0 8px;">Confidex Inventory Update</h2>

      <p style="margin:0 0 16px;color:#4b5563;">
        The booth inventory was updated from the admin dashboard.
      </p>

      <div style="margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        <p style="margin:0;"><strong>Booth:</strong> ${escapeHtml(boothName)}</p>
        <p style="margin:0;"><strong>Location:</strong> ${escapeHtml(boothLocation)}</p>
        <p style="margin:0;"><strong>Updated at:</strong> ${escapeHtml(updatedAt)}</p>
        <p style="margin:0;"><strong>Updated by:</strong> ${escapeHtml(updatedBy?.name || updatedBy?.email || "Admin")}</p>
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
          </tr>
        </thead>
        <tbody>
          ${buildCoinRows(coins)}
        </tbody>
      </table>
    </div>
  `;

  await sendCompanyMail({
    subject: `Confidex Inventory Update - ${boothName}`,
    html,
    text: `Confidex inventory update for ${boothName}. Product stock and coin inventory were updated at ${updatedAt}.`,
  });
}
