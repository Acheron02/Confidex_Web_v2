"use client";

import { AlertCircle, ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SubmitReviewDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  productName?: string;
  resultText?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function SubmitReviewDialog({
  open,
  isSubmitting,
  productName,
  resultText,
  onClose,
  onConfirm,
}: SubmitReviewDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border bg-muted/35 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardCheck className="size-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-black text-foreground">
                Submit for Review?
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                This will send the result to an admin for validation.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              Selected Transaction
            </p>

            <p className="mt-2 break-words text-sm font-bold text-foreground">
              {productName || "Selected test kit"}
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-muted-foreground">
              Result:{" "}
              <span className="text-foreground">
                {resultText || "Available result"}
              </span>
            </p>
          </div>

          <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm leading-6">
              Once submitted, the result will be marked for admin review. You
              can still view the transaction while waiting for validation.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/25 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl hover:cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-xl hover:cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ClipboardCheck className="mr-2 size-4" />
                Submit for Review
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
