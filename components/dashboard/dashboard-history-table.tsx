"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  Eye,
  FileText,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  DisplayItem,
  DisplayItemStatus,
} from "../../app/utils/dashboard/build-display-items";
import { formatTxDate } from "../../app/utils/dashboard/format-tx-date";

type Props = {
  currentItems: DisplayItem[];
  startIndex: number;
  deleteMode: boolean;
  imageLoadingTxId: string | null;
  receiptLoadingTxId: string | null;
  reviewRequestLoadingTxId: string | null;
  isTransactionSelected: (txId: string) => boolean;
  toggleTransactionSelection: (txId: string) => void;
  onViewResult: (txId: string) => void;
  onViewReceipt: (transactionId: string) => void;
  onSubmitReview: (txId: string) => void;
  onDeleteRow: (txId: string) => void;
};

type ActionMenuProps = {
  txId: string;
  receiptTransactionId: string;
  item: DisplayItem;
  isOpen: boolean;
  isReceiptLoading: boolean;
  isReviewLoading: boolean;
  onClose: () => void;
  onToggle: () => void;
  onViewReceipt: (transactionId: string) => void;
  onSubmitReview: (txId: string) => void;
  onDeleteRow: (txId: string) => void;
};

function getStatusClass(status: DisplayItemStatus) {
  if (status === "Under Review") {
    return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200";
  }

  if (status === "Completed") {
    return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-200";
}

function StatusBadge({ status }: { status: DisplayItemStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function isAlreadyUnderReview(item: DisplayItem) {
  return item.status === "Under Review" || item.reviewStatus === "under_review";
}

function canSubmitForReview(item: DisplayItem) {
  return Boolean(item.result_image_url) && !isAlreadyUnderReview(item);
}

function canViewResult(item: DisplayItem) {
  return Boolean(item.result_image_url);
}

function getSubmitReviewLabel(item: DisplayItem, loading: boolean) {
  if (loading) return "Submitting...";
  if (isAlreadyUnderReview(item)) return "Already in review";
  if (!item.result_image_url) return "No result image";
  return "Submit for Review";
}

function ActionItem({
  icon,
  label,
  description,
  disabled,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "group/action flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition",
        "disabled:pointer-events-none disabled:opacity-45",
        danger
          ? "text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/15"
          : "text-popover-foreground hover:bg-muted",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border",
          danger
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-border bg-muted/50 text-foreground",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-bold leading-5">{label}</span>

        {description ? (
          <span
            className={[
              "mt-0.5 block text-xs leading-5",
              danger ? "text-destructive/80" : "text-muted-foreground",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ActionMenu({
  txId,
  receiptTransactionId,
  item,
  isOpen,
  isReceiptLoading,
  isReviewLoading,
  onClose,
  onToggle,
  onViewReceipt,
  onSubmitReview,
  onDeleteRow,
}: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const reviewDisabled = !canSubmitForReview(item) || isReviewLoading;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const runAction = (callback: () => void) => {
    callback();
    onClose();
  };

  return (
    <div ref={menuRef} className="relative flex justify-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        aria-expanded={isOpen}
        aria-label="Open row actions"
        className={[
          "size-10 rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:cursor-pointer",
          "hover:bg-muted hover:text-foreground",
          isOpen ? "bg-muted text-foreground ring-2 ring-primary/20" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <MoreHorizontal className="size-5" />
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-[282px] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="border-b border-border bg-muted/40 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              Row Actions
            </p>
          </div>

          <div className="grid gap-1 p-2">
            <ActionItem
              icon={<FileText className="size-4" />}
              label={isReceiptLoading ? "Loading receipt..." : "View Receipt"}
              description="Open the transaction receipt."
              disabled={isReceiptLoading}
              onClick={() =>
                runAction(() => onViewReceipt(receiptTransactionId))
              }
            />

            <ActionItem
              icon={<ClipboardCheck className="size-4" />}
              label={getSubmitReviewLabel(item, isReviewLoading)}
              description="Ask an admin to review this result."
              disabled={reviewDisabled}
              onClick={() => runAction(() => onSubmitReview(txId))}
            />

            <div className="my-1 border-t border-border" />

            <ActionItem
              icon={<Trash2 className="size-4" />}
              label="Delete"
              description="Remove this transaction from your history."
              danger
              onClick={() => runAction(() => onDeleteRow(txId))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardHistoryTable({
  currentItems,
  startIndex,
  deleteMode,
  imageLoadingTxId,
  receiptLoadingTxId,
  reviewRequestLoadingTxId,
  isTransactionSelected,
  toggleTransactionSelection,
  onViewResult,
  onViewReceipt,
  onSubmitReview,
  onDeleteRow,
}: Props) {
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  if (currentItems.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">
          No purchase history yet.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your completed transactions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full">
      <div className="mb-2 hidden grid-cols-[56px_minmax(0,1fr)_minmax(0,0.9fr)_160px_190px_56px] items-center gap-4 rounded-xl bg-muted/35 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground lg:grid">
        <div className="text-center">No.</div>
        <div className="text-center">Product</div>
        <div className="text-center">Result</div>
        <div className="text-center">Result Image</div>
        <div className="text-center">Date</div>
        <div className="text-center">Action</div>
      </div>

      <div className="grid gap-2.5">
        {currentItems.map((item, index) => {
          const txId = String(item.txId);
          const receiptTransactionId = String(
            item.receiptTransactionId ?? item.txId,
          );

          const rowNumber = startIndex + index + 1;
          const isImageLoading = imageLoadingTxId === txId;
          const isReceiptLoading = receiptLoadingTxId === receiptTransactionId;
          const isReviewLoading = reviewRequestLoadingTxId === txId;
          const isActionOpen = openActionId === txId;
          const hasResultImage = canViewResult(item);

          return (
            <article
              key={`${item.txId}-${item.itemIndex}-${rowNumber}`}
              className={[
                "rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition duration-200",
                "hover:border-primary/40 hover:bg-muted/15 hover:shadow-md",
                isActionOpen ? "border-primary/40 ring-2 ring-primary/10" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="grid gap-4 p-4 lg:grid-cols-[56px_minmax(0,1fr)_minmax(0,0.9fr)_160px_190px_56px] lg:items-center">
                <div className="hidden lg:flex lg:items-center lg:justify-center">
                  {deleteMode ? (
                    <input
                      type="checkbox"
                      checked={isTransactionSelected(txId)}
                      onChange={() => toggleTransactionSelection(txId)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                      aria-label={`Select transaction ${rowNumber}`}
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-sm font-black text-foreground">
                      {rowNumber}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 gap-3 lg:justify-center">
                  <div className="flex w-10 shrink-0 flex-col items-center gap-2 lg:hidden">
                    {deleteMode ? (
                      <input
                        type="checkbox"
                        checked={isTransactionSelected(txId)}
                        onChange={() => toggleTransactionSelection(txId)}
                        className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                        aria-label={`Select transaction ${rowNumber}`}
                      />
                    ) : (
                      <div className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-sm font-black text-foreground">
                        {rowNumber}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 text-left lg:w-full lg:text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                      Product
                    </p>

                    <h3 className="break-words text-base font-black leading-6 text-foreground">
                      {item.name}
                    </h3>

                    <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">
                      Product ID: {item.productID}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/25 px-3 py-3 lg:bg-transparent lg:px-0 lg:py-0">
                  <div className="flex h-full flex-col items-start justify-center lg:items-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                      Result
                    </p>

                    <p className="break-words text-sm font-bold leading-6 text-foreground lg:text-center">
                      {item.result}
                    </p>

                    <div className="mt-2 flex justify-start lg:justify-center">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/25 px-3 py-3 lg:bg-transparent lg:px-0 lg:py-0">
                  <div className="flex h-full flex-col items-start justify-center lg:items-center">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                      Result Image
                    </p>

                    <Button
                      type="button"
                      variant={hasResultImage ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => onViewResult(txId)}
                      disabled={!hasResultImage || isImageLoading}
                      className="w-full rounded-xl hover:cursor-pointer lg:w-auto lg:min-w-[132px]"
                    >
                      <Eye className="mr-2 size-4" />
                      {isImageLoading
                        ? "Loading..."
                        : hasResultImage
                          ? "View Result"
                          : "No Image"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/25 px-3 py-3 lg:bg-transparent lg:px-0 lg:py-0">
                  <div className="flex h-full flex-col items-start justify-center lg:items-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                      Date
                    </p>

                    <div className="flex items-start gap-2 text-sm font-semibold leading-6 text-muted-foreground lg:max-w-[175px] lg:justify-center lg:text-center">
                      <CalendarDays className="mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0 break-words">
                        {formatTxDate({
                          purchasedDate: item.purchasedDate,
                          _id: item.txId,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/25 px-3 py-3 lg:justify-center lg:bg-transparent lg:px-0 lg:py-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
                    Action
                  </p>

                  <ActionMenu
                    txId={txId}
                    receiptTransactionId={receiptTransactionId}
                    item={item}
                    isOpen={isActionOpen}
                    isReceiptLoading={isReceiptLoading}
                    isReviewLoading={isReviewLoading}
                    onClose={() => setOpenActionId(null)}
                    onToggle={() =>
                      setOpenActionId((current) =>
                        current === txId ? null : txId,
                      )
                    }
                    onViewReceipt={onViewReceipt}
                    onSubmitReview={onSubmitReview}
                    onDeleteRow={onDeleteRow}
                  />
                </div>
              </div>

              <div className="border-t border-border/70 px-4 py-3 lg:hidden">
                <dl className="space-y-2">
                  <InfoRow label="Result">{item.result}</InfoRow>
                  <InfoRow label="Date">
                    {formatTxDate({
                      purchasedDate: item.purchasedDate,
                      _id: item.txId,
                    })}
                  </InfoRow>
                </dl>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
