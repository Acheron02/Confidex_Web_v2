"use client"

import { format } from "date-fns"
import { RefreshCcw } from "lucide-react"

import type { AdminDashboardSection } from "@/components/admin/dashboard/types"
import { adminDashboardNavItems } from "@/components/admin/dashboard/constants/nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface AdminDashboardPageHeaderProps {
  section: AdminDashboardSection
  onRefresh: () => void
  refreshing?: boolean
}

export function AdminDashboardPageHeader({
  section,
  onRefresh,
  refreshing,
}: AdminDashboardPageHeaderProps) {
  const activeItem = adminDashboardNavItems.find((item) => item.key === section)

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-4 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <SidebarTrigger className="mt-0.5 md:hidden" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {activeItem?.title ?? "Dashboard"}
              </h1>
              <Badge variant="secondary" className="rounded-full">
                Admin Panel
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeItem?.description ??
                "Manage Confidex system records and admin operations."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className="hidden rounded-full sm:inline-flex"
          >
            {format(new Date(), "MMM d, yyyy")}
          </Badge>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={refreshing}
            className="cursor-pointer"
          >
            <RefreshCcw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}
