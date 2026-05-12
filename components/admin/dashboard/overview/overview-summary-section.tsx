import type { AdminDashboardSection } from "@/components/admin/dashboard/types";
import { PhilippinePeso, Users, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverviewSummarySectionProps {
  revenue: number;
  totalUsers: number;
  onSectionChange: (section: AdminDashboardSection) => void;
  hideRevenue?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function OverviewSummarySection({
  revenue,
  totalUsers,
  onSectionChange,
  hideRevenue = false,
}: OverviewSummarySectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System users</CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>

        <CardContent>
          <div className="text-3xl font-semibold tracking-tight">
            {totalUsers.toLocaleString()}
          </div>

          {/* FIXED ROW */}
          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Registered users currently stored in the system.
            </p>

            <Button
              variant="ghost"
              className="shrink-0 px-0 text-sm cursor-pointer"
              onClick={() => onSectionChange("users")}
            >
              View users
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hideRevenue ? (
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <PhilippinePeso className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {formatCurrency(revenue)}
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Total recorded revenue across all booths.
              </p>

              <Button
                variant="ghost"
                className="shrink-0 px-0 text-sm cursor-pointer"
                onClick={() => onSectionChange("revenue")}
              >
                View revenue
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <PhilippinePeso className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">—</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Revenue is visible to superadmin accounts only.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
