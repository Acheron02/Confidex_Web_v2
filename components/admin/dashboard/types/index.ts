import type { AdminRole } from "@/lib/rbac";

export type { AdminRole };

export type AdminDashboardSection =
  | "overview"
  | "revenue"
  | "users"
  | "result-images"
  | "result-reviews"
  | "coupon-requests"
  | "booths"
  | "booth-products"
  | "stock-monitoring"
  | "coin-inventory"
  | "admins";

export type BoothStatus =
  | "active"
  | "due for maintenance check"
  | "under maintenance";

export interface AdminRecord {
  _id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt?: string | Date;
}

export interface BoothRecord {
  _id: string;
  name: string;
  location: string;
  installationDate: string;
  status: BoothStatus;
  deviceId?: string;
  isOnline?: boolean;
  connectionStatus?: "online" | "unstable" | "offline";
  lastSeenAt?: string | null;
  configVersion?: number;
  inventoryVersion?: number;
  inventorySnapshot?: {
    products?: Record<string, { stock: number }>;
    coins?: Record<string, { stock: number; enabled: boolean }>;
  };
  config?: {
    products?: Array<{
      product_id: string;
      name: string;
      type: string;
      price: number;
      enabled: boolean;
    }>;
  };
}

export interface ResultReviewRecord {
  _id: string;
  user_id: string;
  username: string;
  productID: string;
  transaction_id: string;
  result: string;
  original_result: string;
  override_result: string;
  review_status: string;
  review_notes: string;
  result_image: string;
  testedDate?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  reviewed_at?: string | Date | null;
  reviewed_by?: string | null;
}

export interface ResultImageRecord {
  _id: string;
  user_id: string;
  username: string;
  productID: string;
  productName: string;
  kitType: string;
  transaction_id: string;
  result: string;
  original_result: string;
  override_result: string;
  review_status: string;
  result_image: string;
  download_url: string;
  testedDate?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CouponRequestRecord {
  _id: string;
  userId: string;
  username: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected" | string;
  note: string;
  adminNote: string;
  couponToken: string | null;
  verification: {
    boothPrintStatus?: string;
    printerFunctionAvailable?: boolean;
    boothRecordedToken?: string | null;
    attemptedAt?: string | null;
    completedAt?: string | null;
    boothPrintError?: string | null;
  };
  productName: string;
  productType: string;
  purchaseDate: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  reviewedAt?: string | Date | null;
  reviewedBy?: string | null;
}