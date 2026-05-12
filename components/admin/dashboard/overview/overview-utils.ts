import type { BoothRecord } from "@/components/admin/dashboard/types";

export function getStatusLabel(status: BoothRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "under maintenance") return "Under maintenance";
  return "Due for maintenance";
}

export function getStatusBadgeVariant(status: BoothRecord["status"]) {
  if (status === "active") return "default" as const;
  if (status === "under maintenance") return "destructive" as const;
  return "secondary" as const;
}
