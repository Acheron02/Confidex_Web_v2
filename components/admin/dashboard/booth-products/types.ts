export type DispenseSlot = "KIT1" | "KIT2" | "KIT3";

export interface BoothProduct {
  product_id: string;
  name: string;
  type: string;
  price: number;
  enabled: boolean;
  dispense_slot: DispenseSlot;
}

export interface BoothProductsRecord {
  boothId: string;
  boothName: string;
  location?: string;
  products: BoothProduct[];
}

export interface BoothProductsSectionProps {
  booths: BoothProductsRecord[];
  onSubmit: (
    boothId: string,
    payload: { products: BoothProduct[] },
  ) => Promise<void>;
}
