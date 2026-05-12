import type { AdminDashboardSection } from "@/components/admin/dashboard/types";
import {
  Coins,
  FileWarning,
  Images,
  LayoutDashboard,
  Package2,
  PhilippinePeso,
  ShieldCheck,
  Store,
  TicketCheck,
  Users,
} from "lucide-react";

export const adminDashboardNavItems: Array<{
  key: AdminDashboardSection;
  title: string;
  icon: typeof LayoutDashboard;
  description: string;
}> = [
  {
    key: "overview",
    title: "Dashboard",
    icon: LayoutDashboard,
    description: "System summary and quick actions",
  },
  {
    key: "revenue",
    title: "Revenue",
    icon: PhilippinePeso,
    description: "View sales totals and revenue performance",
  },
  {
    key: "users",
    title: "Users",
    icon: Users,
    description: "View registered users in the system",
  },
  {
    key: "result-images",
    title: "Result images",
    icon: Images,
    description: "Inspect and download all uploaded result images",
  },
  {
    key: "result-reviews",
    title: "Result reviews",
    icon: FileWarning,
    description: "Review invalid or undetected result images",
  },
  {
    key: "coupon-requests",
    title: "Coupon requests",
    icon: TicketCheck,
    description: "Verify missing coupon reports",
  },
  {
    key: "booths",
    title: "Booths",
    icon: Store,
    description: "Manage installed kiosks and maintenance states",
  },
  {
    key: "booth-products",
    title: "Booth products",
    icon: Package2,
    description: "Manage booth products, pricing, and availability",
  },
  {
    key: "stock-monitoring",
    title: "Stock monitoring",
    icon: Package2,
    description: "View item stock availability for each booth",
  },
  {
    key: "coin-inventory",
    title: "Coin inventory",
    icon: Coins,
    description: "View available change coins for each booth",
  },
  {
    key: "admins",
    title: "Admins",
    icon: ShieldCheck,
    description: "Manage authorized administrator accounts",
  },
];
