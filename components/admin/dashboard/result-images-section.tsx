"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type { ResultImageRecord } from "@/components/admin/dashboard/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResultImagesSectionProps {
  images: ResultImageRecord[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onDeleteSelected: (ids: string[]) => Promise<void> | void;
}

const ALL_KITS = "All test kits";
const ALL_DATES = "All dates";
const MAX_BULK_DOWNLOAD = 100;
const PH_TIME_ZONE = "Asia/Manila";

function normalizeSearch(value: unknown) {
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

function shortenId(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) return "N/A";
  if (text.length <= 14) return text;

  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

function parseDate(value?: string | Date | number | null) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getImageDateValue(image: ResultImageRecord) {
  return image.testedDate || image.createdAt || image.updatedAt || null;
}

function getDateParts(value?: string | Date | number | null) {
  const date = parseDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return null;

  return { year, month, day };
}

function getDateKey(value?: string | Date | number | null) {
  const parts = getDateParts(value);
  if (!parts) return "unknown-date";

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDateLabel(value?: string | Date | number | null) {
  const date = parseDate(value);
  if (!date) return "Unknown date";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatDateTimeLabel(value?: string | Date | number | null) {
  const date = parseDate(value);
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

async function copyToClipboard(value: string) {
  const text = String(value ?? "").trim();

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
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
      className={`inline-flex h-7 max-w-full shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${getResultBadgeClass(
        result,
      )}`}
      title={result || "N/A"}
    >
      <span className="truncate">{result || "N/A"}</span>
    </span>
  );
}

function KitTypeBadge({ kitType }: { kitType: string }) {
  const label = kitType || "Unknown Kit";

  return (
    <Badge
      variant="secondary"
      className="flex h-7 min-w-0 max-w-full items-center rounded-full px-2.5 text-xs font-semibold"
      title={label}
    >
      <span className="min-w-0 truncate">{label}</span>
    </Badge>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => Promise<void> | void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <ImageIcon className="size-10 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No result images found</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Uploaded result images from the booth will appear here once they are
          saved in the system.
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

function groupImagesByKit(images: ResultImageRecord[]) {
  return images.reduce<Record<string, ResultImageRecord[]>>((acc, image) => {
    const key = image.kitType || "Unknown Kit";

    if (!acc[key]) acc[key] = [];

    acc[key].push(image);
    return acc;
  }, {});
}

function groupImagesByDate(images: ResultImageRecord[]) {
  const groups = images.reduce<
    Record<
      string,
      {
        dateKey: string;
        label: string;
        sortTime: number;
        images: ResultImageRecord[];
      }
    >
  >((acc, image) => {
    const dateValue = getImageDateValue(image);
    const dateKey = getDateKey(dateValue);
    const parsedDate = parseDate(dateValue);
    const sortTime = parsedDate?.getTime() ?? 0;

    if (!acc[dateKey]) {
      acc[dateKey] = {
        dateKey,
        label: formatDateLabel(dateValue),
        sortTime,
        images: [],
      };
    }

    acc[dateKey].images.push(image);

    if (sortTime > acc[dateKey].sortTime) {
      acc[dateKey].sortTime = sortTime;
    }

    return acc;
  }, {});

  return Object.values(groups).sort((a, b) => b.sortTime - a.sortTime);
}

function getFilenameFromDisposition(disposition: string | null) {
  if (!disposition) return "confidex-result-images.zip";

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

  const normalMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (normalMatch?.[1]) return normalMatch[1];

  return "confidex-result-images.zip";
}

async function downloadSelectedImages(ids: string[]) {
  const res = await fetch("/api/admins/result-images/bulk-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to download selected images");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = getFilenameFromDisposition(
    res.headers.get("content-disposition"),
  );

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function ResultImagesSection({
  images,
  loading,
  onRefresh,
  onDeleteSelected,
}: ResultImagesSectionProps) {
  const [selectedKit, setSelectedKit] = React.useState(ALL_KITS);
  const [selectedDate, setSelectedDate] = React.useState(ALL_DATES);
  const [search, setSearch] = React.useState("");
  const [previewImage, setPreviewImage] =
    React.useState<ResultImageRecord | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = React.useState<"download" | "delete" | null>(
    null,
  );
  const [bulkError, setBulkError] = React.useState<string | null>(null);
  const [copiedTransactionId, setCopiedTransactionId] = React.useState<
    string | null
  >(null);

  const selectedIdSet = React.useMemo(
    () => new Set(selectedIds),
    [selectedIds],
  );
  const kitGroups = React.useMemo(() => groupImagesByKit(images), [images]);

  const kitTabs = React.useMemo(
    () => [
      { kitType: ALL_KITS, count: images.length },
      ...Object.entries(kitGroups)
        .map(([kitType, groupImages]) => ({
          kitType,
          count: groupImages.length,
        }))
        .sort((a, b) => a.kitType.localeCompare(b.kitType)),
    ],
    [images.length, kitGroups],
  );

  const dateBaseImages = React.useMemo(() => {
    const query = normalizeSearch(search);

    return images.filter((image) => {
      const matchesKit =
        selectedKit === ALL_KITS || image.kitType === selectedKit;

      if (!matchesKit) return false;
      if (!query) return true;

      const captureOrUploadDate = formatDateTimeLabel(getImageDateValue(image));

      const searchable = [
        image.transaction_id,
        image._id,
        image.kitType,
        image.productID,
        image.productName,
        image.result,
        image.original_result,
        image.override_result,
        image.review_status,
        captureOrUploadDate,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [images, search, selectedKit]);

  const dateOptions = React.useMemo(() => {
    const groups = groupImagesByDate(dateBaseImages);

    return [
      {
        dateKey: ALL_DATES,
        label: ALL_DATES,
        count: dateBaseImages.length,
      },
      ...groups.map((group) => ({
        dateKey: group.dateKey,
        label: group.label,
        count: group.images.length,
      })),
    ];
  }, [dateBaseImages]);

  const filteredImages = React.useMemo(() => {
    if (selectedDate === ALL_DATES) return dateBaseImages;

    return dateBaseImages.filter(
      (image) => getDateKey(getImageDateValue(image)) === selectedDate,
    );
  }, [dateBaseImages, selectedDate]);

  const dateGroups = React.useMemo(
    () => groupImagesByDate(filteredImages),
    [filteredImages],
  );

  const visibleIds = React.useMemo(
    () => filteredImages.map((image) => image._id),
    [filteredImages],
  );

  const selectedVisibleCount = React.useMemo(
    () => visibleIds.filter((id) => selectedIdSet.has(id)).length,
    [selectedIdSet, visibleIds],
  );

  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  React.useEffect(() => {
    if (selectedKit === ALL_KITS) return;
    if (kitGroups[selectedKit]) return;

    setSelectedKit(ALL_KITS);
  }, [kitGroups, selectedKit]);

  React.useEffect(() => {
    const availableDateKeys = new Set(
      dateOptions.map((option) => option.dateKey),
    );

    if (!availableDateKeys.has(selectedDate)) {
      setSelectedDate(ALL_DATES);
    }
  }, [dateOptions, selectedDate]);

  React.useEffect(() => {
    if (!previewImage) return;

    setPreviewLoading(true);
  }, [previewImage]);

  React.useEffect(() => {
    const existingIds = new Set(images.map((image) => image._id));

    setSelectedIds((current) => current.filter((id) => existingIds.has(id)));
  }, [images]);

  React.useEffect(() => {
    if (!copiedTransactionId) return;

    const timeout = window.setTimeout(() => {
      setCopiedTransactionId(null);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [copiedTransactionId]);

  const toggleSelected = React.useCallback((id: string) => {
    setBulkError(null);

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }, []);

  const toggleVisibleSelection = React.useCallback(() => {
    setBulkError(null);

    setSelectedIds((current) => {
      const currentSet = new Set(current);

      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      visibleIds.forEach((id) => currentSet.add(id));
      return Array.from(currentSet);
    });
  }, [allVisibleSelected, visibleIds]);

  const clearSelection = React.useCallback(() => {
    setBulkError(null);
    setSelectedIds([]);
  }, []);

  const handleCopyTransactionId = React.useCallback(
    async (event: React.MouseEvent, transactionId: string) => {
      event.stopPropagation();

      const cleanId = String(transactionId ?? "").trim();

      if (!cleanId) return;

      await copyToClipboard(cleanId);
      setCopiedTransactionId(cleanId);
    },
    [],
  );

  const handleBulkDownload = React.useCallback(async () => {
    if (!selectedIds.length || bulkBusy) return;

    if (selectedIds.length > MAX_BULK_DOWNLOAD) {
      setBulkError(`Select up to ${MAX_BULK_DOWNLOAD} images per download.`);
      return;
    }

    try {
      setBulkBusy("download");
      setBulkError(null);

      await downloadSelectedImages(selectedIds);
    } catch (error) {
      setBulkError(
        error instanceof Error
          ? error.message
          : "Failed to download selected images",
      );
    } finally {
      setBulkBusy(null);
    }
  }, [bulkBusy, selectedIds]);

  const handleBulkDelete = React.useCallback(async () => {
    if (!selectedIds.length || bulkBusy) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected image${
        selectedIds.length === 1 ? "" : "s"
      } from the gallery? This removes the image reference from the result record, but keeps the user result and transaction history.`,
    );

    if (!confirmed) return;

    try {
      setBulkBusy("delete");
      setBulkError(null);

      await onDeleteSelected(selectedIds);

      setSelectedIds([]);
      setPreviewImage((current) =>
        current && selectedIds.includes(current._id) ? null : current,
      );
    } catch (error) {
      setBulkError(
        error instanceof Error
          ? error.message
          : "Failed to delete selected images",
      );
    } finally {
      setBulkBusy(null);
    }
  }, [bulkBusy, onDeleteSelected, selectedIds]);

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Result Image Library
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse uploaded result images by test kit type. Filter by capture or
            upload date, then select images to download or delete.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="cursor-pointer"
        >
          <RefreshCcw className={loading ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Uploaded images</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {images.length} image{images.length === 1 ? "" : "s"} available
                across {Math.max(kitTabs.length - 1, 0)} kit type
                {kitTabs.length - 1 === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="grid w-full gap-2 lg:max-w-2xl lg:grid-cols-[minmax(0,1fr)_230px]">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search transaction ID, kit, result, or date..."
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />

                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="h-10 w-full pl-9">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>

                  <SelectContent>
                    {dateOptions.map((option) => (
                      <SelectItem key={option.dateKey} value={option.dateKey}>
                        {option.label} ({option.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {kitTabs.map((tab) => {
              const isActive = selectedKit === tab.kitType;

              return (
                <button
                  key={tab.kitType}
                  type="button"
                  onClick={() => setSelectedKit(tab.kitType)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tab.kitType}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {images.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleVisibleSelection}
                  disabled={filteredImages.length === 0 || loading}
                  className="cursor-pointer"
                >
                  <Check className="size-4" />
                  {allVisibleSelected ? "Unselect visible" : "Select visible"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedIds.length === 0 || Boolean(bulkBusy)}
                  className="cursor-pointer"
                >
                  Clear
                </Button>

                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selected
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleBulkDownload()}
                  disabled={selectedIds.length === 0 || Boolean(bulkBusy)}
                  className="cursor-pointer"
                >
                  {bulkBusy === "download" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Download selected
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleBulkDelete()}
                  disabled={selectedIds.length === 0 || Boolean(bulkBusy)}
                  className="cursor-pointer"
                >
                  {bulkBusy === "delete" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete selected
                </Button>
              </div>
            </div>
          ) : null}

          {bulkError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {bulkError}
            </p>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading result images...
            </div>
          ) : images.length === 0 ? (
            <div className="p-4">
              <EmptyState onRefresh={onRefresh} />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-base font-semibold">
                No images match this filter
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try searching a different transaction ID, kit type, result, or
                date.
              </p>
            </div>
          ) : (
            <div className="space-y-8 p-4">
              {dateGroups.map((group) => (
                <section key={group.dateKey} className="space-y-3">
                  <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {group.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {group.images.length} image
                        {group.images.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {group.images.map((image) => {
                      const checked = selectedIdSet.has(image._id);
                      const resultLabel =
                        image.result || image.original_result || "N/A";
                      const transactionId = String(
                        image.transaction_id || "",
                      ).trim();
                      const captureOrUploadDate = formatDateTimeLabel(
                        getImageDateValue(image),
                      );

                      return (
                        <article
                          key={image._id}
                          className={`group flex h-full min-h-[370px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            checked
                              ? "border-primary ring-2 ring-primary/25"
                              : ""
                          }`}
                        >
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewImage(image)}
                              className="relative aspect-[4/3] w-full overflow-hidden bg-muted text-left"
                              aria-label={`Open ${image.kitType} image`}
                            >
                              {image.result_image ? (
                                <img
                                  src={image.result_image}
                                  alt={`${image.kitType} result image`}
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                                  No image
                                </div>
                              )}

                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                                <Eye className="size-7 text-white" />
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleSelected(image._id)}
                              className={`absolute left-3 top-3 flex size-9 items-center justify-center rounded-full border shadow-sm backdrop-blur transition ${
                                checked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-white/70 bg-background/85 text-foreground hover:bg-background"
                              }`}
                              aria-label={
                                checked ? "Unselect image" : "Select image"
                              }
                            >
                              {checked ? <Check className="size-4" /> : null}
                            </button>
                          </div>

                          <div className="flex flex-1 flex-col gap-3 p-4">
                            <div className="grid h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                              <KitTypeBadge kitType={image.kitType} />
                              <ResultBadge result={resultLabel} />
                            </div>

                            <div className="rounded-xl border bg-muted/30 px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Capture / Upload
                              </p>
                              <p
                                className="mt-1 truncate text-xs font-semibold text-foreground"
                                title={captureOrUploadDate}
                              >
                                {captureOrUploadDate}
                              </p>
                            </div>

                            <div className="mt-auto px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    Transaction ID
                                  </p>
                                  <p
                                    className="mt-1 truncate font-mono text-xs font-semibold text-foreground"
                                    title={transactionId || "N/A"}
                                  >
                                    {shortenId(transactionId)}
                                  </p>
                                </div>

                                {transactionId ? (
                                  <button
                                    type="button"
                                    onClick={(event) =>
                                      void handleCopyTransactionId(
                                        event,
                                        transactionId,
                                      )
                                    }
                                    className="shrink-0 rounded-lg border bg-background p-2 text-muted-foreground transition hover:text-foreground"
                                    title="Copy transaction ID"
                                  >
                                    <Copy className="size-3.5" />
                                    <span className="sr-only">
                                      Copy transaction ID
                                    </span>
                                  </button>
                                ) : null}
                              </div>

                              <p
                                className={`mt-1 h-4 text-[11px] font-medium ${
                                  copiedTransactionId === transactionId
                                    ? "text-emerald-600"
                                    : "text-transparent"
                                }`}
                              >
                                Copied
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Image Preview
                </p>

                <h3 className="mt-1 break-words text-xl font-bold">
                  {previewImage.kitType || "Unknown Kit"}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ResultBadge
                    result={
                      previewImage.result ||
                      previewImage.original_result ||
                      "N/A"
                    }
                  />

                  {previewImage.transaction_id ? (
                    <span
                      className="rounded-full border bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground"
                      title={previewImage.transaction_id}
                    >
                      TXN: {shortenId(previewImage.transaction_id)}
                    </span>
                  ) : null}

                  <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {formatDateTimeLabel(getImageDateValue(previewImage))}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPreviewImage(null)}
                className="shrink-0 cursor-pointer"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <div className="relative flex min-h-[320px] flex-1 items-center justify-center bg-black/90 p-3 sm:p-6">
              {previewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading image...
                </div>
              ) : null}

              {previewImage.result_image ? (
                <img
                  src={previewImage.result_image}
                  alt={`${previewImage.kitType} result preview`}
                  className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => setPreviewLoading(false)}
                />
              ) : (
                <div className="text-sm text-white/70">No image available</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
