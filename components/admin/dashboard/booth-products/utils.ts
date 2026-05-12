import type { BoothProduct, DispenseSlot } from "./types";

export const TABLE_GRID = "grid-cols-[1.1fr_1.15fr_1fr_88px_120px_120px_56px]";

export function normalizeDispenseSlot(value: unknown): DispenseSlot {
  const slot = String(value || "")
    .trim()
    .toUpperCase();

  if (slot === "KIT2") return "KIT2";
  if (slot === "KIT3") return "KIT3";
  return "KIT1";
}

export function createEmptyProduct(): BoothProduct {
  return {
    product_id: "",
    name: "Confidex Kit",
    type: "",
    price: 0,
    enabled: true,
    dispense_slot: "KIT1",
  };
}

export function cleanProducts(products: BoothProduct[]): BoothProduct[] {
  return products
    .map((product) => ({
      product_id: String(product.product_id || "").trim(),
      name: String(product.name || "").trim(),
      type: String(product.type || "").trim(),
      price: Math.max(0, Number(product.price) || 0),
      enabled: !!product.enabled,
      dispense_slot: normalizeDispenseSlot(product.dispense_slot),
    }))
    .filter((product) => product.product_id && product.name && product.type);
}
