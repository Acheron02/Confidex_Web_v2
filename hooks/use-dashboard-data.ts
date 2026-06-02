"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchUserResults,
  getEffectiveResult,
  Result,
} from "@/app/utils/fetchResult";
import {
  fetchUserTransactions,
  Transaction,
} from "@/app/utils/fetchTransaction";
import { getDisplayStatus } from "@/app/utils/dashboard/build-display-items";
import type { ReceiptDialogData } from "@/components/custom-ui/receipt_dialog";

function getAnnotatedImageUrl(result?: Partial<Result> | null) {
  return (
    result?.result_image ||
    (result as any)?.annotated_image ||
    (result as any)?.resultImageUrl ||
    (result as any)?.annotatedImageUrl ||
    (result as any)?.result_image_url ||
    (result as any)?.annotated_image_url ||
    ""
  );
}

function getOriginalImageUrl(result?: Partial<Result> | null) {
  const direct =
    (result as any)?.original_image ||
    (result as any)?.raw_image ||
    (result as any)?.originalImageUrl ||
    (result as any)?.rawImageUrl ||
    (result as any)?.original_image_url ||
    (result as any)?.raw_image_url ||
    "";

  if (direct) return direct;

  const annotated = getAnnotatedImageUrl(result);

  if (annotated.includes("annotated.png")) {
    return annotated.replace("annotated.png", "original.png");
  }

  if (annotated.includes("annotated.")) {
    return annotated.replace("annotated.", "original.");
  }

  return annotated;
}

function normalizePendingValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function isPendingResult(result?: Partial<Result> | null) {
  const effective = getEffectiveResult(result);
  const normalized = normalizePendingValue(effective);

  return (
    !normalized ||
    normalized === "pending" ||
    normalized === "not available" ||
    normalized === "n/a" ||
    normalized === "none"
  );
}

function hasAnyResultImage(result?: Partial<Result> | null) {
  if (isPendingResult(result)) {
    return false;
  }

  return Boolean(getAnnotatedImageUrl(result) || getOriginalImageUrl(result));
}

function getResultTime(value: any) {
  return new Date(
    value?.updatedAt || value?.createdAt || value?.testedDate || 0,
  ).getTime();
}

function getBestResultMatch(results: Result[], userId: string, txId: string) {
  const matches = results.filter(
    (r) =>
      String(r.user_id) === String(userId) &&
      String((r as any).transaction_id) === String(txId),
  );

  if (!matches.length) return null;

  /**
   * Do not prefer older rows just because they have images.
   * Use latest result state. If it is Pending, image display is blocked.
   */
  return (
    [...matches].sort((a, b) => getResultTime(b) - getResultTime(a))[0] ?? null
  );
}

function appendImageVersion(url: string, version?: string | number | null) {
  if (!version) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(String(version))}`;
}

function resolveImageUrl(rawImg: string, version?: string | number | null) {
  const imagePath = rawImg.trim();

  if (!imagePath) return "";

  if (imagePath.startsWith("http") || imagePath.startsWith("/")) {
    return appendImageVersion(imagePath, version);
  }

  const params = new URLSearchParams({ key: imagePath });

  if (version) {
    params.set("v", String(version));
  }

  return `/api/images/by-key?${params.toString()}`;
}

function extractResultText(found: any): string {
  if (!found) return "Pending";
  return getEffectiveResult(found);
}

function getTransactionMatch(transactions: Transaction[], txId: string) {
  return (
    transactions.find((tx) => {
      const transactionObjectId = String(tx?._id ?? "");
      const transactionReceiptId = String(
        (tx as any)?.transaction_id ?? (tx as any)?.transactionId ?? "",
      );

      return transactionObjectId === txId || transactionReceiptId === txId;
    }) ?? null
  );
}

function normalizePaymentStatus(status: unknown) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

  if (!normalized) return "Pending";
  if (normalized.includes("failed")) return "Failed";

  if (normalized.includes("cancelled") || normalized.includes("canceled")) {
    return "Cancelled";
  }

  if (normalized.includes("pending")) return "Pending";

  if (normalized.includes("paid") || normalized.includes("completed")) {
    return "Paid";
  }

  return String(status);
}

function normalizeResultFromApi(raw: any): Result {
  const resultImage = String(
    raw?.result_image ||
      raw?.annotated_image ||
      raw?.resultImageUrl ||
      raw?.annotatedImageUrl ||
      raw?.result_image_url ||
      raw?.annotated_image_url ||
      "",
  );

  const annotatedImage = String(
    raw?.annotated_image ||
      raw?.result_image ||
      raw?.annotatedImageUrl ||
      raw?.resultImageUrl ||
      raw?.annotated_image_url ||
      raw?.result_image_url ||
      resultImage ||
      "",
  );

  const originalImage = String(
    raw?.original_image ||
      raw?.raw_image ||
      raw?.originalImageUrl ||
      raw?.rawImageUrl ||
      raw?.original_image_url ||
      raw?.raw_image_url ||
      "",
  );

  const rawImage = String(
    raw?.raw_image ||
      raw?.original_image ||
      raw?.rawImageUrl ||
      raw?.originalImageUrl ||
      raw?.raw_image_url ||
      raw?.original_image_url ||
      originalImage ||
      "",
  );

  return {
    ...raw,

    _id: String(raw?._id ?? ""),
    user_id: String(raw?.user_id ?? ""),
    productID: String(raw?.productID ?? ""),
    transaction_id: raw?.transaction_id
      ? String(raw.transaction_id)
      : undefined,
    result: String(raw?.result ?? "Pending"),

    result_image: resultImage,
    resultImageUrl: resultImage,
    result_image_url: resultImage,

    annotated_image: annotatedImage,
    annotatedImageUrl: annotatedImage,
    annotated_image_url: annotatedImage,

    original_image: originalImage,
    originalImageUrl: originalImage,
    original_image_url: originalImage,

    raw_image: rawImage,
    rawImageUrl: rawImage,
    raw_image_url: rawImage,

    testedDate: raw?.testedDate ? String(raw.testedDate) : undefined,
    createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,

    review_status: raw?.review_status
      ? (String(raw.review_status) as Result["review_status"])
      : "none",
    original_result: raw?.original_result ? String(raw.original_result) : "",
    override_result: raw?.override_result ? String(raw.override_result) : "",
    reviewed_by: raw?.reviewed_by ? String(raw.reviewed_by) : null,
    reviewed_at: raw?.reviewed_at ? String(raw.reviewed_at) : null,
    review_notes: raw?.review_notes ? String(raw.review_notes) : "",
  } as Result;
}

const DASHBOARD_CACHE_TTL_MS = 60 * 1000;

type CachedDashboardData = {
  transactions: Transaction[];
  results: Result[];
  savedAt: number;
};

function getDashboardCacheKey(userId: string) {
  return `confidex.dashboard.${userId}.v1`;
}

function readCachedDashboardData(userId: string): CachedDashboardData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(getDashboardCacheKey(userId));
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedDashboardData;
    if (Date.now() - Number(cached.savedAt || 0) > DASHBOARD_CACHE_TTL_MS) {
      sessionStorage.removeItem(getDashboardCacheKey(userId));
      return null;
    }

    return {
      transactions: Array.isArray(cached.transactions)
        ? cached.transactions
        : [],
      results: Array.isArray(cached.results) ? cached.results : [],
      savedAt: cached.savedAt,
    };
  } catch {
    return null;
  }
}

function writeCachedDashboardData(
  userId: string,
  transactions: Transaction[],
  results: Result[],
) {
  if (typeof window === "undefined") return;

  try {
    const cached: CachedDashboardData = {
      transactions,
      results,
      savedAt: Date.now(),
    };

    sessionStorage.setItem(
      getDashboardCacheKey(userId),
      JSON.stringify(cached),
    );
  } catch {}
}

export function useDashboardData(userId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageRefreshing, setPageRefreshing] = useState(false);
  const dashboardRequestRef = useRef<AbortController | null>(null);

  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [selectedOriginalImageUrl, setSelectedOriginalImageUrl] = useState<
    string | null
  >(null);

  const [selectedImageResult, setSelectedImageResult] = useState<string | null>(
    null,
  );

  const [imageLoadingTxId, setImageLoadingTxId] = useState<string | null>(null);

  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [receiptLoadingTxId, setReceiptLoadingTxId] = useState<string | null>(
    null,
  );

  const [selectedReceipt, setSelectedReceipt] =
    useState<ReceiptDialogData | null>(null);

  const [reviewRequestLoadingTxId, setReviewRequestLoadingTxId] = useState<
    string | null
  >(null);

  const refreshDashboardData = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (!userId) return;

      dashboardRequestRef.current?.abort();

      const controller = new AbortController();
      dashboardRequestRef.current = controller;

      if (mode === "initial") {
        const cached = readCachedDashboardData(userId);

        if (cached) {
          setTransactions(cached.transactions);
          setResults(cached.results);
          setPageLoading(false);
          setPageRefreshing(true);
        } else {
          setPageLoading(true);
        }
      }

      if (mode === "refresh") setPageRefreshing(true);

      try {
        const [txs, res] = await Promise.all([
          fetchUserTransactions(userId, { signal: controller.signal }),
          fetchUserResults(userId, { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        setTransactions(txs || []);
        setResults(res || []);
        writeCachedDashboardData(userId, txs || [], res || []);
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Failed to fetch dashboard data:", error);

          toast.error("Failed to load dashboard", {
            description: "Please refresh the page or try again later.",
          });
        }
      } finally {
        if (dashboardRequestRef.current === controller) {
          dashboardRequestRef.current = null;

          if (mode === "initial") {
            setPageLoading(false);
            setPageRefreshing(false);
          }
          if (mode === "refresh") setPageRefreshing(false);
        }
      }
    },
    [userId],
  );

    const fetchAndOpenImage = useCallback(
      async (txId: string) => {
        if (!userId) return;

        setImageLoadingTxId(txId);

        // Clear the previous dialog image immediately so a pending/no-image row
        // can never keep showing the previously opened image.
        setIsImageDialogOpen(false);
        setSelectedImageUrl(null);
        setSelectedOriginalImageUrl(null);
        setSelectedImageResult(null);

        try {
          let found = getBestResultMatch(results, userId, txId);

          if (!found) {
            const refreshed = await fetchUserResults(userId);
            setResults(refreshed || []);
            found = getBestResultMatch(refreshed || [], userId, txId);
          }

          if (!found || isPendingResult(found)) {
            toast.info("No image yet", {
              description:
                "This transaction is still pending and does not have an uploaded result image yet.",
            });
            return;
          }

          const annotatedImg = getAnnotatedImageUrl(found);
          const originalImg = getOriginalImageUrl(found);
          const resultText = extractResultText(found);

          const versionToken =
            (found as any)?.updatedAt ||
            (found as any)?.createdAt ||
            (found as any)?.testedDate ||
            found?._id ||
            null;

          if (!annotatedImg && !originalImg) {
            toast.info("No image yet", {
              description:
                "This transaction does not have an uploaded result image yet.",
            });
            return;
          }

          const displayUrl = resolveImageUrl(
            String(annotatedImg || originalImg),
            versionToken,
          );

          const originalUrl = resolveImageUrl(
            String(originalImg || annotatedImg),
            versionToken,
          );

          requestAnimationFrame(() => {
            setSelectedImageUrl(displayUrl);
            setSelectedOriginalImageUrl(originalUrl || displayUrl);
            setSelectedImageResult(resultText);

            requestAnimationFrame(() => {
              setIsImageDialogOpen(true);
            });
          });
        } catch (err) {
          console.error("Failed to fetch image:", err);

          toast.error("Failed to open result image", {
            description: "Please try again or refresh the dashboard.",
          });
        } finally {
          setImageLoadingTxId(null);
        }
      },
      [userId, results],
    );

  const requestResultReview = useCallback(
    async (txId: string) => {
      if (!userId || reviewRequestLoadingTxId) return;

      setReviewRequestLoadingTxId(txId);

      try {
        const res = await fetch("/api/results/request-review", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            transactionId: txId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || "Failed to submit result for review");
        }

        if (data?.result?._id) {
          const normalized = normalizeResultFromApi(data.result);

          setResults((current) => {
            const exists = current.some((item) => item._id === normalized._id);

            if (!exists) return [normalized, ...current];

            return current.map((item) =>
              item._id === normalized._id ? normalized : item,
            );
          });
        }

        toast.success("Submitted for review", {
          description: "The result was sent to the admin for validation.",
        });

        await refreshDashboardData("refresh");
      } catch (error) {
        console.error("Failed to submit result for review:", error);

        toast.error("Failed to submit review", {
          description:
            error instanceof Error ? error.message : "Please try again later.",
        });

        throw error;
      } finally {
        setReviewRequestLoadingTxId(null);
      }
    },
    [refreshDashboardData, reviewRequestLoadingTxId, userId],
  );

  const closeImageDialog = useCallback(() => {
    setIsImageDialogOpen(false);
    setSelectedImageUrl(null);
    setSelectedOriginalImageUrl(null);
    setSelectedImageResult(null);
    setImageLoadingTxId(null);
  }, []);

  const fetchAndOpenReceipt = useCallback(
    async (txId: string) => {
      if (!userId) return;

      setReceiptLoadingTxId(txId);

      try {
        const params = new URLSearchParams({ transactionId: txId });

        const res = await fetch(`/api/receipts/by-transaction?${params}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load receipt");
        }

        let foundResult = getBestResultMatch(results, userId, txId);

        if (!foundResult) {
          const refreshed = await fetchUserResults(userId);
          setResults(refreshed || []);
          foundResult = getBestResultMatch(refreshed || [], userId, txId);
        }

        const matchingTransaction = getTransactionMatch(transactions, txId);

        const transactionStatus = String(
          matchingTransaction?.status ?? "Pending",
        );

        const resultText = extractResultText(foundResult);

        const resultStatus = getDisplayStatus(
          resultText,
          transactionStatus,
          foundResult?.review_status,
        );

        const paymentStatus = normalizePaymentStatus(transactionStatus);

        setSelectedReceipt({
          transactionId: txId,
          timestamp: data?.timestamp,
          receipt: data?.receipt || {},
          transactionStatus,
          paymentStatus,
          resultStatus,
          resultText,
        });

        setIsReceiptDialogOpen(true);
      } catch (err) {
        console.error("Failed to fetch receipt:", err);

        toast.error("Receipt not found", {
          description:
            "This transaction does not have a receipt available yet.",
        });
      } finally {
        setReceiptLoadingTxId(null);
      }
    },
    [userId, results, transactions],
  );

  const closeReceiptDialog = useCallback(() => {
    setIsReceiptDialogOpen(false);
    setSelectedReceipt(null);
    setReceiptLoadingTxId(null);
  }, []);

  return {
    transactions,
    setTransactions,
    results,
    setResults,
    pageLoading,
    pageRefreshing,
    refreshDashboardData,

    isImageDialogOpen,
    selectedImageUrl,
    selectedOriginalImageUrl,
    selectedImageResult,
    imageLoadingTxId,
    fetchAndOpenImage,
    closeImageDialog,

    isReceiptDialogOpen,
    receiptLoadingTxId,
    selectedReceipt,
    fetchAndOpenReceipt,
    closeReceiptDialog,

    reviewRequestLoadingTxId,
    requestResultReview,
  };
}
