"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { formatPHDateTime } from "@/app/utils/dashboard/ph-time";
import type { ResultReviewRecord } from "@/components/admin/dashboard/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResultReviewsSectionProps {
  results: ResultReviewRecord[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onOverride: (
    id: string,
    payload: { override_result: string; review_notes?: string },
  ) => Promise<void>;
}

type ReviewTab = "current" | "history";

type ResultReviewHistoryRecord = ResultReviewRecord & {
  reviewed_by_name?: string;
  reviewed_by_email?: string;
};

const overrideOptions = ["Invalid", "Negative", "Positive"];
const ITEMS_PER_PAGE = 8;
const HISTORY_ITEMS_PER_PAGE = 10;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeResult(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function formatUploadedAt(item: ResultReviewRecord) {
  return formatPHDateTime(item.testedDate || item.createdAt, "N/A");
}

function formatEditedAt(item: ResultReviewHistoryRecord) {
  return formatPHDateTime(item.reviewed_at || item.updatedAt, "N/A");
}

function getDisplayResult(item: ResultReviewRecord) {
  return String(
    item.override_result || item.result || item.original_result || "N/A",
  ).trim();
}

function getOriginalMachineResult(item: ResultReviewRecord) {
  return String(item.original_result || item.result || "N/A").trim();
}

function getReviewerName(item: ResultReviewHistoryRecord) {
  return String(
    item.reviewed_by_name ||
      item.reviewed_by_email ||
      item.reviewed_by ||
      "Unknown admin",
  ).trim();
}

function getResultBadgeClass(result: string) {
  const normalized = normalizeResult(result);

  if (
    normalized.includes("invalid") ||
    normalized.includes("no object detected")
  ) {
    return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200";
  }

  if (
    normalized.includes("negative") ||
    normalized.includes("non reactive") ||
    normalized.includes("non-reactive") ||
    normalized.includes("not detected")
  ) {
    return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  }

  if (
    normalized.includes("positive") ||
    normalized.includes("reactive") ||
    normalized.includes("detected")
  ) {
    return "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-200";
}

function ResultBadge({ result }: { result: string }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getResultBadgeClass(
        result,
      )}`}
    >
      {result || "N/A"}
    </span>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <h3 className="mt-4 text-lg font-semibold">No results under review</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Invalid, no-object-detected, and user-submitted results will appear
          here.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5 cursor-pointer"
          onClick={() => void onRefresh()}
        >
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyHistory({
  onRefresh,
}: {
  onRefresh: () => Promise<void> | void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <History className="size-10 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No review history yet</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Overridden results will appear here after an admin saves a review.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5 cursor-pointer"
          onClick={() => void onRefresh()}
        >
          <RefreshCcw className="size-4" />
          Refresh history
        </Button>
      </CardContent>
    </Card>
  );
}

function NoSearchResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Search className="size-10 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No matching record found</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Try searching by transaction ID, result, product ID, admin, or date.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5 cursor-pointer"
        onClick={onClear}
      >
        Clear search
      </Button>
    </div>
  );
}

function TableCellText({
  value,
  mono = false,
  muted = false,
}: {
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={[
        "mx-auto block max-w-[240px] truncate text-center",
        mono ? "font-mono text-xs" : "text-sm",
        muted ? "text-muted-foreground" : "font-medium text-foreground",
      ]
        .filter(Boolean)
        .join(" ")}
      title={value}
    >
      {value || "N/A"}
    </span>
  );
}

function ReviewMeta({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          "truncate font-semibold text-foreground",
          mono ? "font-mono text-xs" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title={value}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}

function PaginationFooter({
  currentPage,
  totalPages,
  currentCount,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  currentCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages} · Showing {currentCount} item
        {currentCount === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          className="cursor-pointer"
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="cursor-pointer"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ResultReviewsSection({
  results,
  loading,
  onRefresh,
  onOverride,
}: ResultReviewsSectionProps) {
  const [activeTab, setActiveTab] = React.useState<ReviewTab>("current");

  const [selected, setSelected] = React.useState<ResultReviewRecord | null>(
    null,
  );
  const [overrideResult, setOverrideResult] = React.useState("Negative");
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);
  const [failedImageIds, setFailedImageIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const hasResultImage = React.useCallback(
    (item: ResultReviewRecord | null) =>
      Boolean(
        item?.result_image &&
        item?._id &&
        !failedImageIds.has(String(item._id)),
      ),
    [failedImageIds],
  );

  const markResultImageFailed = React.useCallback((id?: string) => {
    const cleanId = String(id || "").trim();
    if (!cleanId) return;
    setFailedImageIds((current) => new Set(current).add(cleanId));
  }, []);

  const [search, setSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [historyDeleteTarget, setHistoryDeleteTarget] =
    React.useState<ResultReviewHistoryRecord | null>(null);
  const [deletingHistoryId, setDeletingHistoryId] = React.useState<
    string | null
  >(null);
  const [deleteHistoryError, setDeleteHistoryError] = React.useState<
    string | null
  >(null);

  const [historySearch, setHistorySearch] = React.useState("");
  const [historyPage, setHistoryPage] = React.useState(1);
  const [history, setHistory] = React.useState<ResultReviewHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);

  const fetchHistory = React.useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const res = await fetch("/api/admins/result-reviews?mode=history", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch review history");
      }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Failed to fetch review history",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab !== "history") return;
    void fetchHistory();
  }, [activeTab, fetchHistory]);

  React.useEffect(() => {
    if (!selected) return;

    setOverrideResult("Negative");
    setReviewNotes("");
    setImageLoading(hasResultImage(selected));
  }, [selected, hasResultImage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, results.length]);

  React.useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, history.length]);

  const filteredResults = React.useMemo(() => {
    const query = normalizeText(search);

    if (!query) return results;

    return results.filter((item) => {
      const uploadedAt = formatUploadedAt(item);
      const displayResult = getDisplayResult(item);
      const originalResult = getOriginalMachineResult(item);

      const searchable = [
        item._id,
        item.transaction_id,
        item.productID,
        item.result,
        item.original_result,
        item.override_result,
        item.review_status,
        item.review_notes,
        displayResult,
        originalResult,
        uploadedAt,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [results, search]);

  const filteredHistory = React.useMemo(() => {
    const query = normalizeText(historySearch);

    if (!query) return history;

    return history.filter((item) => {
      const editedAt = formatEditedAt(item);
      const reviewer = getReviewerName(item);
      const finalResult = getDisplayResult(item);
      const originalResult = getOriginalMachineResult(item);

      const searchable = [
        item._id,
        item.transaction_id,
        item.productID,
        item.result,
        item.original_result,
        item.override_result,
        item.review_status,
        item.review_notes,
        reviewer,
        item.reviewed_by_email,
        finalResult,
        originalResult,
        editedAt,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [history, historySearch]);

  const totalPages = React.useMemo(() => {
    return Math.max(Math.ceil(filteredResults.length / ITEMS_PER_PAGE), 1);
  }, [filteredResults.length]);

  const historyTotalPages = React.useMemo(() => {
    return Math.max(
      Math.ceil(filteredHistory.length / HISTORY_ITEMS_PER_PAGE),
      1,
    );
  }, [filteredHistory.length]);

  const startIndex = React.useMemo(() => {
    return (currentPage - 1) * ITEMS_PER_PAGE;
  }, [currentPage]);

  const historyStartIndex = React.useMemo(() => {
    return (historyPage - 1) * HISTORY_ITEMS_PER_PAGE;
  }, [historyPage]);

  const currentResults = React.useMemo(() => {
    return filteredResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredResults, startIndex]);

  const currentHistory = React.useMemo(() => {
    return filteredHistory.slice(
      historyStartIndex,
      historyStartIndex + HISTORY_ITEMS_PER_PAGE,
    );
  }, [filteredHistory, historyStartIndex]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  React.useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  const handleSubmit = async () => {
    if (!selected || !overrideResult.trim() || saving) return;

    try {
      setSaving(true);

      await onOverride(selected._id, {
        override_result: overrideResult.trim(),
        review_notes: reviewNotes.trim(),
      });

      setSelected(null);
      void fetchHistory();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHistory = async () => {
    if (!historyDeleteTarget || deletingHistoryId) return;

    try {
      setDeletingHistoryId(historyDeleteTarget._id);
      setDeleteHistoryError(null);

      const res = await fetch(
        `/api/admins/result-reviews/history/${historyDeleteTarget._id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete review history");
      }

      setHistory((current) =>
        current.filter((item) => item._id !== historyDeleteTarget._id),
      );

      setHistoryDeleteTarget(null);
    } catch (error) {
      setDeleteHistoryError(
        error instanceof Error
          ? error.message
          : "Failed to delete review history",
      );
    } finally {
      setDeletingHistoryId(null);
    }
  };

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Result Reviews</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review pending results and audit previously edited transactions.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (activeTab === "history") {
              void fetchHistory();
            } else {
              void onRefresh();
            }
          }}
          disabled={loading || historyLoading}
          className="cursor-pointer"
        >
          <RefreshCcw
            className={
              loading || historyLoading ? "size-4 animate-spin" : "size-4"
            }
          />
          Refresh
        </Button>
      </div>

      <div className="flex w-full flex-col gap-2 rounded-2xl border bg-muted/30 p-1 sm:w-fit sm:flex-row">
        <button
          type="button"
          onClick={() => setActiveTab("current")}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "current"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Current reviews
          <Badge variant="secondary" className="rounded-full">
            {results.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "history"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          History
          <Badge variant="secondary" className="rounded-full">
            {history.length}
          </Badge>
        </button>
      </div>

      {activeTab === "current" ? (
        <Card>
          <CardHeader className="space-y-4 border-b">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Review queue</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing {filteredResults.length} of {results.length} pending
                  review{results.length === 1 ? "" : "s"}.
                </p>
              </div>

              <Badge variant="secondary" className="w-fit rounded-full">
                {results.length} total
              </Badge>
            </div>

            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transaction ID, result, product, or upload date..."
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading under review images...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4">
                <EmptyState onRefresh={onRefresh} />
              </div>
            ) : filteredResults.length === 0 ? (
              <NoSearchResults onClear={() => setSearch("")} />
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[1040px] table-fixed text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-[110px] px-4 py-3 text-center">
                          Image
                        </th>
                        <th className="w-[240px] px-4 py-3 text-center">
                          Transaction ID
                        </th>
                        <th className="w-[160px] px-4 py-3 text-center">
                          Result
                        </th>
                        <th className="w-[150px] px-4 py-3 text-center">
                          Product
                        </th>
                        <th className="w-[190px] px-4 py-3 text-center">
                          Uploaded
                        </th>
                        <th className="w-[150px] px-4 py-3 text-center">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {currentResults.map((item) => {
                        const displayResult = getDisplayResult(item);
                        const originalResult = getOriginalMachineResult(item);
                        const uploadedAt = formatUploadedAt(item);
                        const shouldShowOriginal =
                          originalResult !== "N/A" &&
                          originalResult !== displayResult;

                        return (
                          <tr
                            key={item._id}
                            className="text-center align-middle transition hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => {
                                  setImageLoading(hasResultImage(item));
                                  setSelected(item);
                                }}
                                className="group relative mx-auto h-16 w-20 overflow-hidden rounded-xl border bg-muted"
                              >
                                {hasResultImage(item) ? (
                                  <img
                                    key={`${item._id}:${item.result_image}`}
                                    src={item.result_image}
                                    alt="Under review result"
                                    className="h-full w-full object-cover transition group-hover:scale-105"
                                    loading="lazy"
                                    onError={() =>
                                      markResultImageFailed(item._id)
                                    }
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                    No image
                                  </div>
                                )}

                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                                  <Eye className="size-5 text-white" />
                                </div>
                              </button>
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <TableCellText
                                value={String(item.transaction_id || "N/A")}
                                mono
                              />
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <ResultBadge result={displayResult} />
                                {shouldShowOriginal ? (
                                  <p className="mx-auto max-w-[150px] truncate text-center text-xs text-muted-foreground">
                                    Original: {originalResult}
                                  </p>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <TableCellText
                                value={String(item.productID || "N/A")}
                              />
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <TableCellText value={uploadedAt} muted />
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex justify-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setSelected(item)}
                                  className="cursor-pointer"
                                >
                                  Review
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <PaginationFooter
                  currentPage={currentPage}
                  totalPages={totalPages}
                  currentCount={currentResults.length}
                  onPrevious={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }
                  onNext={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                />
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-4 border-b">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Edited history</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing {filteredHistory.length} of {history.length} edited
                  transaction{history.length === 1 ? "" : "s"}.
                </p>
              </div>

              <Badge variant="secondary" className="w-fit rounded-full">
                {history.length} edited
              </Badge>
            </div>

            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search admin, transaction ID, product, result, or date..."
                className="pl-9"
              />
            </div>

            {historyError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {historyError}
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="p-0">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading review history...
              </div>
            ) : history.length === 0 ? (
              <div className="p-4">
                <EmptyHistory onRefresh={fetchHistory} />
              </div>
            ) : filteredHistory.length === 0 ? (
              <NoSearchResults onClear={() => setHistorySearch("")} />
            ) : (
              <>
                <div className="w-full overflow-hidden">
                  <table className="w-full min-w-[1060px] table-fixed text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-[170px] px-4 py-3 text-center">
                          Edited By
                        </th>
                        <th className="w-[240px] px-4 py-3 text-center">
                          Transaction ID
                        </th>
                        <th className="w-[140px] px-4 py-3 text-center">
                          Original
                        </th>
                        <th className="w-[140px] px-4 py-3 text-center">
                          Final
                        </th>
                        <th className="w-[140px] px-4 py-3 text-center">
                          Product
                        </th>
                        <th className="w-[180px] px-4 py-3 text-center">
                          Edited
                        </th>
                        <th className="w-[150px] px-4 py-3 text-center">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {currentHistory.map((item) => {
                        const finalResult = getDisplayResult(item);
                        const originalResult = getOriginalMachineResult(item);
                        const editedAt = formatEditedAt(item);
                        const reviewer = getReviewerName(item);

                        return (
                          <tr
                            key={item._id}
                            className="text-center align-middle transition hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 text-center align-middle">
                              <TableCellText value={reviewer} />
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <TableCellText
                                value={String(item.transaction_id || "N/A")}
                                mono
                              />
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex justify-center">
                                <ResultBadge result={originalResult} />
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex justify-center">
                                <ResultBadge result={finalResult} />
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <TableCellText
                                value={String(item.productID || "N/A")}
                              />
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <TableCellText value={editedAt} muted />
                            </td>

                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex justify-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setDeleteHistoryError(null);
                                    setHistoryDeleteTarget(item);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Trash2 className="size-4" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <PaginationFooter
                  currentPage={historyPage}
                  totalPages={historyTotalPages}
                  currentCount={currentHistory.length}
                  onPrevious={() =>
                    setHistoryPage((page) => Math.max(page - 1, 1))
                  }
                  onNext={() =>
                    setHistoryPage((page) =>
                      Math.min(page + 1, historyTotalPages),
                    )
                  }
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border bg-background shadow-2xl lg:grid-cols-[minmax(0,1fr)_400px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-h-[320px] bg-black p-3 sm:p-4">
              <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl bg-black">
                {imageLoading ? (
                  <div className="absolute inset-0 animate-pulse bg-muted/20" />
                ) : null}

                {hasResultImage(selected) ? (
                  <img
                    key={`${selected._id}:${selected.result_image}`}
                    src={selected.result_image}
                    alt="Result under review"
                    className={`h-full max-h-[78vh] w-full object-contain transition-opacity ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      markResultImageFailed(selected._id);
                      setImageLoading(false);
                    }}
                  />
                ) : (
                  <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-white/70">
                    No image uploaded yet
                  </div>
                )}
              </div>
            </div>

            <aside className="flex min-h-0 max-h-[92vh] flex-col overflow-hidden">
              <div className="shrink-0 border-b p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Admin review
                    </p>
                    <h3 className="mt-1 text-xl font-bold">Override Result</h3>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelected(null)}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-full"
                    aria-label="Close dialog"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-muted/25 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                          <p className="shrink-0 text-sm font-semibold">
                            Current result
                          </p>

                          <ResultBadge result={getDisplayResult(selected)} />

                          {getOriginalMachineResult(selected) !==
                          getDisplayResult(selected) ? (
                            <p className="min-w-0 truncate text-xs text-muted-foreground">
                              Original machine result:{" "}
                              <span className="font-semibold">
                                {getOriginalMachineResult(selected)}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <ReviewMeta
                      label="Transaction ID"
                      value={String(selected.transaction_id || "N/A")}
                      mono
                    />

                    <ReviewMeta
                      label="Result"
                      value={getDisplayResult(selected)}
                    />

                    <ReviewMeta
                      label="Product ID"
                      value={String(selected.productID || "N/A")}
                    />

                    <ReviewMeta
                      label="Uploaded"
                      value={formatUploadedAt(selected)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold"
                      htmlFor="override-result"
                    >
                      Corrected result
                    </label>

                    <Select
                      value={overrideResult}
                      onValueChange={setOverrideResult}
                    >
                      <SelectTrigger
                        id="override-result"
                        className="h-10 w-full"
                      >
                        <SelectValue placeholder="Select corrected result" />
                      </SelectTrigger>

                      <SelectContent>
                        {overrideOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold"
                      htmlFor="review-notes"
                    >
                      Notes optional
                    </label>

                    <Textarea
                      id="review-notes"
                      value={reviewNotes}
                      onChange={(event) => setReviewNotes(event.target.value)}
                      maxLength={500}
                      placeholder="Example: manually reviewed from image"
                      className="min-h-28 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t bg-background p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelected(null)}
                    disabled={saving}
                    className="h-11 w-full cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={saving || !overrideResult.trim()}
                    className="h-11 w-full cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Override"
                    )}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : null}

      {historyDeleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 backdrop-blur-sm"
          onClick={() => {
            if (deletingHistoryId) return;
            setHistoryDeleteTarget(null);
            setDeleteHistoryError(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border bg-background p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Delete history
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  Remove this history entry?
                </h3>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={Boolean(deletingHistoryId)}
                onClick={() => {
                  setHistoryDeleteTarget(null);
                  setDeleteHistoryError(null);
                }}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-full"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border bg-muted/25 p-4">
              <p className="text-sm text-muted-foreground">
                This will remove the entry from the History tab only. The
                corrected result will still remain attached to the user&apos;s
                transaction.
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <ReviewMeta
                  label="Transaction ID"
                  value={String(historyDeleteTarget.transaction_id || "N/A")}
                  mono
                />

                <div className="grid grid-cols-2 gap-2">
                  <ReviewMeta
                    label="Original"
                    value={getOriginalMachineResult(historyDeleteTarget)}
                  />

                  <ReviewMeta
                    label="Final"
                    value={getDisplayResult(historyDeleteTarget)}
                  />
                </div>

                <ReviewMeta
                  label="Edited by"
                  value={getReviewerName(historyDeleteTarget)}
                />
              </div>
            </div>

            {deleteHistoryError ? (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteHistoryError}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(deletingHistoryId)}
                onClick={() => {
                  setHistoryDeleteTarget(null);
                  setDeleteHistoryError(null);
                }}
                className="h-11 cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={Boolean(deletingHistoryId)}
                onClick={() => void handleDeleteHistory()}
                className="h-11 cursor-pointer"
              >
                {deletingHistoryId ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Delete history
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
