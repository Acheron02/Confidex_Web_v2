"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck, Store } from "lucide-react";

import type { AdminDashboardSection } from "@/components/admin/dashboard/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverviewStatsSectionProps {
  totalBooths: number;
  activeBooths: number;
  adminCount: number;
  actionNeededCount: number;
  onSectionChange: (section: AdminDashboardSection) => void;
}

export function OverviewStatsSection({
  totalBooths,
  activeBooths,
  adminCount,
  actionNeededCount,
  onSectionChange,
}: OverviewStatsSectionProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <button
        type="button"
        onClick={() => onSectionChange("booths")}
        className="cursor-pointer text-left"
      >
        <Card className="rounded-2xl transition-colors hover:bg-muted/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total booths</CardTitle>
            <Store className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {totalBooths}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Installed kiosks being monitored from the admin portal.
            </p>
          </CardContent>
        </Card>
      </button>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active booths</CardTitle>
          <CheckCircle2 className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-tight">
            {activeBooths}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Booths currently available for users.
          </p>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => onSectionChange("admins")}
        className="cursor-pointer text-left"
      >
        <Card className="rounded-2xl transition-colors hover:bg-muted/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Admin accounts
            </CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {adminCount}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Authorized admins with dashboard access.
            </p>
          </CardContent>
        </Card>
      </button>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Action needed</CardTitle>
          <AlertTriangle className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-tight">
            {actionNeededCount}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Booths needing maintenance attention or follow-up.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
