import { parseDateTime } from "@/app/utils/dashboard/ph-time";

export interface TransactionItem {
  name: string;
  productID: string;
  type?: string;
  price?: number;
  discount?: number;
  finalPrice?: number;
  result?: string;
}

export interface Transaction {
  _id: string;
  user_id: string;
  status: string;
  items: TransactionItem[];
  purchasedDate?: string;
}

function combineReceiptDateTime(date?: unknown, time?: unknown) {
  const cleanDate = String(date ?? "").trim();
  const cleanTime = String(time ?? "").trim();

  if (!cleanDate) return "";

  return cleanTime ? `${cleanDate} ${cleanTime}` : cleanDate;
}

function normalizeDateForDisplay(tx: any) {
  const candidates = [
    tx?.displayPurchasedDate,
    tx?.receiptPurchaseDate || tx?.receiptPurchaseTime
      ? combineReceiptDateTime(tx?.receiptPurchaseDate, tx?.receiptPurchaseTime)
      : "",
    tx?.purchasedDate,
  ];

  for (const candidate of candidates) {
    const parsed = parseDateTime(candidate);

    if (parsed) {
      return parsed.toISOString();
    }
  }

  return undefined;
}

export const fetchUserTransactions = async (
  user_id: string,
  options?: RequestInit,
): Promise<Transaction[]> => {
  try {
    const params = new URLSearchParams({ user_id });

    const res = await fetch(`/api/transaction?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
      ...options,
    });

    if (!res.ok) throw new Error("Failed to fetch transactions");

    const data = await res.json();

    const transactions: Transaction[] = (data.transactions ?? []).map(
      (tx: any) => ({
        _id: String(tx._id),
        user_id: String(tx.user_id),
        status: String(tx.status ?? "Pending"),
        items: Array.isArray(tx.items)
          ? tx.items.map((item: any) => ({
              name: String(item.name ?? ""),
              productID: String(item.productID ?? ""),
              type: item.type ? String(item.type) : undefined,
              price: Number.isFinite(Number(item.price))
                ? Number(item.price)
                : undefined,
              discount: Number.isFinite(Number(item.discount))
                ? Number(item.discount)
                : undefined,
              finalPrice: Number.isFinite(Number(item.finalPrice))
                ? Number(item.finalPrice)
                : undefined,
              result: item.result ? String(item.result) : undefined,
            }))
          : [],
        purchasedDate: normalizeDateForDisplay(tx),
      }),
    );

    return transactions;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.error("fetchUserTransactions error:", err);
    }

    return [];
  }
};
