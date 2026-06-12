"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/components/providers/auth-context";
import { AdminDashboardAppSidebar } from "@/components/admin/dashboard/app-sidebar";
import { AdminDashboardOverview } from "@/components/admin/dashboard/overview/admin-dashboard-overview";
import { AdminDashboardPageHeader } from "@/components/admin/dashboard/page-header";
import { AdminsSection } from "@/components/admin/dashboard/admins-section";
import { BoothsSection } from "@/components/admin/dashboard/booths-section";
import { BoothProductsSection } from "@/components/admin/dashboard/booth-products-section";
import { CoinInventorySection } from "@/components/admin/dashboard/coin-inventory-section";
import { CouponRequestsSection } from "@/components/admin/dashboard/coupon-requests-section";
import { RevenueSection } from "@/components/admin/dashboard/revenue-section";
import { ResultImagesSection } from "@/components/admin/dashboard/result-images-section";
import { ResultReviewsSection } from "@/components/admin/dashboard/result-reviews-section";
import { StockMonitoringSection } from "@/components/admin/dashboard/stock-monitoring-section";
import { UsersSection } from "@/components/admin/dashboard/users-section";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { AdminRole } from "@/lib/rbac";
import { isAdminRole, isSuperAdminRole } from "@/lib/rbac";

type DispenseSlot = "KIT1" | "KIT2" | "KIT3";

type AdminDashboardUser = {
  _id: string;
  name?: string;
  email?: string;
  role: AdminRole;
};

function normalizeDispenseSlot(value: unknown): DispenseSlot {
  const slot = String(value || "")
    .trim()
    .toUpperCase();

  if (slot === "KIT2") return "KIT2";
  if (slot === "KIT3") return "KIT3";

  return "KIT1";
}

export function AdminDashboardShell() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const adminUser =
    user && isAdminRole(user.role) ? (user as AdminDashboardUser) : null;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (!isAdminRole(user.role)) {
      router.replace(`/pages/users/${user._id}`);
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Checking admin access...
        </p>
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  return <AdminDashboardContent user={adminUser} logout={logout} />;
}

function AdminDashboardContent({
  user,
  logout,
}: {
  user: AdminDashboardUser;
  logout: () => Promise<void>;
}) {
  const dashboard = useAdminDashboard();

  const refreshing =
    dashboard.loadingAdmins ||
    dashboard.loadingBooths ||
    dashboard.loadingStats ||
    dashboard.loadingResultReviews ||
    dashboard.loadingResultImages ||
    dashboard.loadingCouponRequests;

  const canManageAdmins = isSuperAdminRole(user.role);

  const refreshAll = () => {
    void dashboard.fetchAdmins();
    void dashboard.fetchBooths();
    void dashboard.fetchStats();
    void dashboard.fetchResultReviews();

    if (dashboard.section === "result-images") {
      void dashboard.fetchResultImages();
    }

    if (dashboard.section === "coupon-requests") {
      void dashboard.fetchCouponRequests();
    }
  };

  const stockMonitoringBooths = useMemo(
    () =>
      dashboard.booths.map((booth) => {
        const inventoryProducts = booth.inventorySnapshot?.products || {};
        const configProducts = Array.isArray((booth as any).config?.products)
          ? (booth as any).config.products
          : [];

        const products = configProducts.map((product: any) => ({
          productId: String(product.product_id || product.id || product.name),
          name: String(product.name || product.product_id || "Unnamed product"),
          stock:
            Number(
              inventoryProducts[
                String(product.product_id || product.id || product.name)
              ]?.stock,
            ) || 0,
        }));

        return {
          boothId: booth._id,
          boothName: booth.name,
          location: booth.location,
          products,
        };
      }),
    [dashboard.booths],
  );

  const coinInventoryBooths = useMemo(
    () =>
      dashboard.booths.map((booth) => {
        const coins = booth.inventorySnapshot?.coins || {};

        return {
          boothId: booth._id,
          boothName: booth.name,
          location: booth.location,
          coins: {
            one: Number(coins["1"]?.stock) || 0,
            five: Number(coins["5"]?.stock) || 0,
            twenty: Number(coins["20"]?.stock) || 0,
          },
        };
      }),
    [dashboard.booths],
  );

  const boothProductsData = useMemo(
    () =>
      dashboard.booths.map((booth) => ({
        boothId: booth._id,
        boothName: booth.name,
        location: booth.location,
        products: Array.isArray((booth as any).config?.products)
          ? (booth as any).config.products.map((product: any) => ({
              product_id: String(product.product_id || "").trim(),
              name: String(product.name || "").trim(),
              type: String(product.type || "").trim(),
              price: Math.max(0, Number(product.price) || 0),
              enabled: Boolean(product.enabled ?? true),
              dispense_slot: normalizeDispenseSlot(product.dispense_slot),
            }))
          : [],
      })),
    [dashboard.booths],
  );

  const content = useMemo(() => {
    switch (dashboard.section) {
      case "admins":
        return (
          <AdminsSection
            admins={dashboard.admins}
            loading={dashboard.loadingAdmins}
            canManageAdmins={canManageAdmins}
            onAdd={async (payload) => {
              await dashboard.addAdmin(payload);
            }}
            onUpdate={async (id, payload) => {
              await dashboard.updateAdmin(id, payload);
            }}
            onDelete={async (id) => {
              await dashboard.deleteAdmin(id);
            }}
          />
        );

      case "booths":
        return (
          <BoothsSection
            booths={dashboard.booths}
            loading={dashboard.loadingBooths}
            onAdd={async (payload) => {
              return await dashboard.addBooth(payload);
            }}
            onUpdate={async (id, payload) => {
              await dashboard.updateBooth(id, payload);
            }}
            onDelete={async (id) => {
              await dashboard.deleteBooth(id);
            }}
          />
        );

      case "booth-products":
        return (
          <BoothProductsSection
            booths={boothProductsData}
            onSubmit={async (boothId, payload) => {
              await dashboard.updateBoothProducts(boothId, payload);
            }}
          />
        );

      case "revenue":
        return (
          <RevenueSection
            revenue={dashboard.revenue}
            analytics={dashboard.revenueAnalytics}
          />
        );

      case "users":
        return (
          <UsersSection
            totalUsers={dashboard.totalUsers}
            analytics={dashboard.userAnalytics}
          />
        );

      case "result-images":
        return (
          <ResultImagesSection
            images={dashboard.resultImages}
            loading={dashboard.loadingResultImages}
            onRefresh={dashboard.fetchResultImages}
            onDeleteSelected={dashboard.deleteResultImages}
          />
        );

      case "result-reviews":
        return (
          <ResultReviewsSection
            results={dashboard.resultReviews}
            loading={dashboard.loadingResultReviews}
            onRefresh={dashboard.fetchResultReviews}
            onOverride={dashboard.overrideResultReview}
          />
        );

      case "coupon-requests":
        return (
          <CouponRequestsSection
            requests={dashboard.couponRequests}
            loading={dashboard.loadingCouponRequests}
            onRefresh={dashboard.fetchCouponRequests}
            onReview={dashboard.reviewCouponRequest}
          />
        );

      case "stock-monitoring":
        return (
          <StockMonitoringSection
            booths={stockMonitoringBooths}
            onSubmit={async (boothId, payload) => {
              const booth = dashboard.booths.find(
                (item) => item._id === boothId,
              );

              const currentCoins = booth?.inventorySnapshot?.coins || {};

              await dashboard.updateBoothInventory(boothId, {
                products: payload.products,
                coins: currentCoins,
              });
            }}
          />
        );

      case "coin-inventory":
        return (
          <CoinInventorySection
            booths={coinInventoryBooths}
            onSubmit={async (boothId, payload) => {
              const booth = dashboard.booths.find(
                (item) => item._id === boothId,
              );

              const currentProducts = booth?.inventorySnapshot?.products || {};

              await dashboard.updateBoothInventory(boothId, {
                products: currentProducts,
                coins: payload.coins,
              });
            }}
          />
        );

      case "overview":
      default:
        return (
          <AdminDashboardOverview
            admins={dashboard.admins}
            booths={dashboard.booths}
            revenue={dashboard.revenue}
            totalUsers={dashboard.totalUsers}
            onSectionChange={dashboard.setSection}
            role={user.role}
          />
        );
    }
  }, [
    dashboard,
    canManageAdmins,
    stockMonitoringBooths,
    coinInventoryBooths,
    boothProductsData,
    user.role,
  ]);

  return (
    <SidebarProvider defaultOpen>
      <AdminDashboardAppSidebar
        activeSection={dashboard.section}
        onSectionChange={dashboard.setSection}
        adminName={user.name}
        adminEmail={user.email}
        role={user.role}
        onLogout={logout}
      />

      <SidebarInset className="min-h-[100dvh] overflow-hidden">
        <AdminDashboardPageHeader
          section={dashboard.section}
          onRefresh={refreshAll}
          refreshing={refreshing}
        />

        {dashboard.error ? (
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <Alert variant="destructive">
              <ShieldAlert className="size-4" />
              <AlertTitle>Dashboard error</AlertTitle>
              <AlertDescription>{dashboard.error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
