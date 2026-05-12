// app/utils/simulateTransaction.ts
export interface PurchaseItem {
  name: string;
  productID: string;
  result: string;
}

export const simulatePurchase = async (
  user_id: string,
  items?: PurchaseItem[]
) => {
  try {
    const res = await fetch("/api/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,
        status: "completed",
        items: items ?? [
          {
            name: "Sample Test Kit",
            productID: "TK001",
            result: Math.random() > 0.95 ? "positive" : "negative",
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to record purchase");
    }

    if (data.success && data.transaction) {
      return data.transaction;
    }

    throw new Error(data.error || "Failed to record purchase");
  } catch (err) {
    console.error(err);
    alert("Something went wrong while recording purchase.");
    return null;
  }
};
