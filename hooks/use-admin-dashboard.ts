"use client";

import * as React from "react";

import type {
  AdminDashboardSection,
  AdminRecord,
  BoothRecord,
  BoothStatus,
  CouponRequestRecord,
  ResultImageRecord,
  ResultReviewRecord,
} from "@/components/admin/dashboard/types";

import type { UsersAnalytics } from "@/components/admin/dashboard/users-section";
import type { RevenueAnalytics } from "@/components/admin/dashboard/revenue-section";

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data) {
    const value = (data as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }

  return fallback;
}

export function useAdminDashboard() {
  const [section, setSection] =
    React.useState<AdminDashboardSection>("overview");

  const [admins, setAdmins] = React.useState<AdminRecord[]>([]);
  const [booths, setBooths] = React.useState<BoothRecord[]>([]);

  const [resultReviews, setResultReviews] = React.useState<
    ResultReviewRecord[]
  >([]);

  const [resultImages, setResultImages] = React.useState<ResultImageRecord[]>(
    [],
  );

  const [couponRequests, setCouponRequests] = React.useState<
    CouponRequestRecord[]
  >([]);

  const [totalUsers, setTotalUsers] = React.useState(0);
  const [revenue, setRevenue] = React.useState(0);

  const [userAnalytics, setUserAnalytics] = React.useState<
    UsersAnalytics | undefined
  >();

  const [revenueAnalytics, setRevenueAnalytics] = React.useState<
    RevenueAnalytics | undefined
  >();

  const [loadingAdmins, setLoadingAdmins] = React.useState(false);
  const [loadingBooths, setLoadingBooths] = React.useState(false);
  const [loadingStats, setLoadingStats] = React.useState(false);
  const [loadingResultReviews, setLoadingResultReviews] = React.useState(false);
  const [loadingResultImages, setLoadingResultImages] = React.useState(false);
  const [loadingCouponRequests, setLoadingCouponRequests] =
    React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const fetchAdmins = React.useCallback(async () => {
    try {
      setLoadingAdmins(true);
      setError(null);

      const res = await fetch("/api/admins", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to fetch admins"));
      }

      setAdmins(Array.isArray(data.admins) ? data.admins : []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch admins",
      );
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  const fetchBooths = React.useCallback(async () => {
    try {
      setLoadingBooths(true);
      setError(null);

      const res = await fetch("/api/booths", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to fetch booths"));
      }

      setBooths(Array.isArray(data.booths) ? data.booths : []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch booths",
      );
    } finally {
      setLoadingBooths(false);
    }
  }, []);

  const fetchStats = React.useCallback(async () => {
    try {
      setLoadingStats(true);
      setError(null);

      const res = await fetch("/api/admins/dashboard/stats", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to fetch dashboard stats"),
        );
      }

      setTotalUsers(typeof data.totalUsers === "number" ? data.totalUsers : 0);
      setRevenue(typeof data.revenue === "number" ? data.revenue : 0);
      setUserAnalytics(data.userAnalytics);
      setRevenueAnalytics(data.revenueAnalytics);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard stats",
      );
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchResultReviews = React.useCallback(async () => {
    try {
      setLoadingResultReviews(true);
      setError(null);

      const res = await fetch("/api/admins/result-reviews", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to fetch result reviews"),
        );
      }

      setResultReviews(Array.isArray(data.results) ? data.results : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch result reviews",
      );
    } finally {
      setLoadingResultReviews(false);
    }
  }, []);

  const fetchResultImages = React.useCallback(async () => {
    try {
      setLoadingResultImages(true);
      setError(null);

      const res = await fetch("/api/admins/result-images", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to fetch result images"));
      }

      setResultImages(Array.isArray(data.images) ? data.images : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch result images",
      );
    } finally {
      setLoadingResultImages(false);
    }
  }, []);

  const fetchCouponRequests = React.useCallback(async () => {
    try {
      setLoadingCouponRequests(true);
      setError(null);

      const res = await fetch("/api/admins/coupon-requests", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to fetch coupon requests"),
        );
      }

      setCouponRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch coupon requests",
      );
    } finally {
      setLoadingCouponRequests(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchBooths();
    void fetchStats();
  }, [fetchBooths, fetchStats]);

  React.useEffect(() => {
    if (section !== "admins" || admins.length > 0) return;
    void fetchAdmins();
  }, [admins.length, fetchAdmins, section]);

  React.useEffect(() => {
    if (section !== "result-reviews" || resultReviews.length > 0) return;
    void fetchResultReviews();
  }, [fetchResultReviews, resultReviews.length, section]);

  React.useEffect(() => {
    if (section !== "result-images" || resultImages.length > 0) return;
    void fetchResultImages();
  }, [fetchResultImages, resultImages.length, section]);

  React.useEffect(() => {
    if (section !== "coupon-requests") return;
    void fetchCouponRequests();
  }, [fetchCouponRequests, section]);

  const addAdmin = React.useCallback(
    async (payload: { name: string; email: string; password: string }) => {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to add admin"));
      }

      await fetchAdmins();

      return data.admin as AdminRecord | undefined;
    },
    [fetchAdmins],
  );

  const updateAdmin = React.useCallback(
    async (
      id: string,
      payload: { name: string; email: string; password?: string },
    ) => {
      const res = await fetch(`/api/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to update admin"));
      }

      await fetchAdmins();

      return data.admin as AdminRecord | undefined;
    },
    [fetchAdmins],
  );

  const deleteAdmin = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/admins/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(getErrorMessage(data, "Failed to delete admin"));
    }

    setAdmins((current) => current.filter((admin) => admin._id !== id));
  }, []);

  const addBooth = React.useCallback(
    async (payload: {
      name: string;
      location: string;
      installationDate: string;
      status: BoothStatus;
    }) => {
      const res = await fetch("/api/booths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to add booth"));
      }

      setBooths((current) => [data.booth, ...current]);

      return {
        booth: data.booth as BoothRecord,
        deviceCredentials: data.deviceCredentials as {
          deviceId: string;
          deviceSecret: string;
        },
      };
    },
    [],
  );

  const updateBooth = React.useCallback(
    async (
      id: string,
      payload: {
        name: string;
        location: string;
        installationDate: string;
        status: BoothStatus;
      },
    ) => {
      const res = await fetch(`/api/booths/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to update booth"));
      }

      await fetchBooths();

      return data.booth as BoothRecord | undefined;
    },
    [fetchBooths],
  );

  const updateBoothProducts = React.useCallback(
    async (
      id: string,
      payload: {
        products: Array<{
          product_id: string;
          name: string;
          type: string;
          price: number;
          enabled: boolean;
        }>;
      },
    ) => {
      const res = await fetch(`/api/booths/${id}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to update booth products"),
        );
      }

      setBooths((current) =>
        current.map((booth) =>
          booth._id === id ? (data.booth as BoothRecord) : booth,
        ),
      );

      return data.booth as BoothRecord;
    },
    [],
  );

  const updateBoothInventory = React.useCallback(
    async (
      id: string,
      payload: {
        products: Record<string, { stock: number }>;
        coins: Record<string, { stock: number; enabled: boolean }>;
      },
    ) => {
      const res = await fetch(`/api/booths/${id}/inventory`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to update booth inventory"),
        );
      }

      setBooths((current) =>
        current.map((booth) =>
          booth._id === id ? (data.booth as BoothRecord) : booth,
        ),
      );

      return data.booth as BoothRecord;
    },
    [],
  );

  const deleteBooth = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/booths/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(getErrorMessage(data, "Failed to delete booth"));
    }

    setBooths((current) => current.filter((booth) => booth._id !== id));
  }, []);

  const overrideResultReview = React.useCallback(
    async (
      id: string,
      payload: { override_result: string; review_notes?: string },
    ) => {
      const res = await fetch(`/api/admins/result-reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to override result"));
      }

      setResultReviews((current) => current.filter((item) => item._id !== id));

      setResultImages((current) =>
        current.map((item) =>
          item._id === id
            ? {
                ...item,
                result: String(data?.result?.result ?? item.result),
                original_result: String(
                  data?.result?.original_result ?? item.original_result,
                ),
                override_result: String(
                  data?.result?.override_result ?? item.override_result,
                ),
                review_status: String(
                  data?.result?.review_status ?? item.review_status,
                ),
                updatedAt: data?.result?.updatedAt ?? item.updatedAt,
              }
            : item,
        ),
      );

      return data.result;
    },
    [],
  );

  const deleteResultImages = React.useCallback(async (ids: string[]) => {
    const cleanIds = Array.from(
      new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)),
    );

    if (cleanIds.length === 0) return;

    const res = await fetch("/api/admins/result-images/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: cleanIds }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        getErrorMessage(data, "Failed to delete selected images"),
      );
    }

    setResultImages((current) =>
      current.filter((image) => !cleanIds.includes(image._id)),
    );
  }, []);

  const reviewCouponRequest = React.useCallback(
    async (
      id: string,
      payload: {
        action: "approve" | "reject";
        adminNote?: string;
      },
    ) => {
      const res = await fetch(`/api/admins/coupon-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to review coupon request"),
        );
      }

      await fetchCouponRequests();

      return data;
    },
    [fetchCouponRequests],
  );

  return {
    section,
    setSection,

    admins,
    booths,
    resultReviews,
    resultImages,
    couponRequests,

    totalUsers,
    revenue,
    revenueAnalytics,
    userAnalytics,

    loadingAdmins,
    loadingBooths,
    loadingStats,
    loadingResultReviews,
    loadingResultImages,
    loadingCouponRequests,

    error,

    fetchAdmins,
    fetchBooths,
    fetchStats,
    fetchResultReviews,
    fetchResultImages,
    fetchCouponRequests,

    deleteResultImages,

    addAdmin,
    updateAdmin,
    deleteAdmin,

    addBooth,
    updateBooth,
    updateBoothProducts,
    updateBoothInventory,
    deleteBooth,

    overrideResultReview,
    reviewCouponRequest,
  };
}
