"use client";

import type {
  AdminDashboardSection,
  AdminRecord,
  BoothRecord,
} from "@/components/admin/dashboard/types";
import { OverviewMonitoringSummary } from "@/components/admin/dashboard/overview/overview-monitoring-summary";
import { OverviewRecentBooths } from "@/components/admin/dashboard/overview/overview-recent-booths";
import { OverviewStatsSection } from "@/components/admin/dashboard/overview/overview-stats-section";
import { OverviewStatusSection } from "@/components/admin/dashboard/overview/overview-status-section";
import { OverviewSummarySection } from "@/components/admin/dashboard/overview/overview-summary-section";

interface AdminDashboardOverviewProps {
  admins: AdminRecord[];
  booths: BoothRecord[];
  revenue: number;
  totalUsers: number;
  onSectionChange: (section: AdminDashboardSection) => void;
  role?: string;
}

export function AdminDashboardOverview({
  admins,
  booths,
  revenue,
  totalUsers,
  onSectionChange,
  role,
}: AdminDashboardOverviewProps) {
  const activeBooths = booths.filter(
    (booth) => booth.status === "active",
  ).length;

  const maintenanceDue = booths.filter(
    (booth) => booth.status === "due for maintenance check",
  ).length;

  const underMaintenance = booths.filter(
    (booth) => booth.status === "under maintenance",
  ).length;

  const statusData = [
    { status: "Active", count: activeBooths },
    { status: "Due", count: maintenanceDue },
    { status: "Maintenance", count: underMaintenance },
  ];

  const isSuperadmin = role === "superadmin";

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <OverviewSummarySection
        revenue={revenue}
        totalUsers={totalUsers}
        onSectionChange={onSectionChange}
        hideRevenue={!isSuperadmin}
      />

      <OverviewStatsSection
        totalBooths={booths.length}
        activeBooths={activeBooths}
        adminCount={admins.length}
        actionNeededCount={maintenanceDue + underMaintenance}
        onSectionChange={onSectionChange}
      />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <OverviewStatusSection statusData={statusData} />
        <OverviewMonitoringSummary
          booths={booths}
          onSectionChange={onSectionChange}
        />
      </section>

      <OverviewRecentBooths booths={booths} onSectionChange={onSectionChange} />
    </div>
  );
}
