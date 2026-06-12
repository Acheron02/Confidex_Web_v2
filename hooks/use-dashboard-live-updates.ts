"use client";

import { useEffect } from "react";
import type { Result } from "@/app/utils/fetchResult";
import type { Transaction } from "@/app/utils/fetchTransaction";

type UseDashboardLiveUpdatesParams = {
  ws: WebSocket | null;
  isReady: boolean;
  userId?: string;
  qrTokenRef: React.MutableRefObject<string | null>;
  clearQrState: () => void;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setResults: React.Dispatch<React.SetStateAction<Result[]>>;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePendingValue(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function isPendingResult(value: unknown) {
  const normalized = normalizePendingValue(value);

  return (
    !normalized ||
    normalized === "pending" ||
    normalized === "not available" ||
    normalized === "n/a" ||
    normalized === "none"
  );
}

function imageFieldsFromResult(result: any, clearImages: boolean) {
  if (clearImages) {
    return {
      result_image: "",
      resultImageUrl: "",
      result_image_url: "",

      annotated_image: "",
      annotatedImageUrl: "",
      annotated_image_url: "",

      original_image: "",
      originalImageUrl: "",
      original_image_url: "",

      raw_image: "",
      rawImageUrl: "",
      raw_image_url: "",
    };
  }

  const resultImage = clean(
    result?.result_image ||
      result?.annotated_image ||
      result?.resultImageUrl ||
      result?.annotatedImageUrl ||
      result?.result_image_url ||
      result?.annotated_image_url,
  );

  const annotatedImage = clean(
    result?.annotated_image ||
      result?.result_image ||
      result?.annotatedImageUrl ||
      result?.resultImageUrl ||
      result?.annotated_image_url ||
      result?.result_image_url ||
      resultImage,
  );

  const originalImage = clean(
    result?.original_image ||
      result?.raw_image ||
      result?.originalImageUrl ||
      result?.rawImageUrl ||
      result?.original_image_url ||
      result?.raw_image_url,
  );

  const rawImage = clean(
    result?.raw_image ||
      result?.original_image ||
      result?.rawImageUrl ||
      result?.originalImageUrl ||
      result?.raw_image_url ||
      result?.original_image_url ||
      originalImage,
  );

  return {
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
  };
}

function normalizeIncomingResult(result: any): Result {
  const pending = isPendingResult(result?.result);
  const imageFields = imageFieldsFromResult(result, pending);

  return {
    ...result,

    _id: clean(result?._id) || Date.now().toString(),
    user_id: clean(result?.user_id),
    productID: clean(result?.productID),
    transaction_id: clean(result?.transaction_id),
    result: clean(result?.result) || "Pending",

    ...imageFields,

    review_status: result?.review_status || "none",
    original_result: result?.original_result || "",
    override_result: result?.override_result || "",
    reviewed_by: result?.reviewed_by || null,
    reviewed_at: result?.reviewed_at || null,
    review_notes: result?.review_notes || "",
    createdAt: result?.createdAt || new Date().toISOString(),
    updatedAt: result?.updatedAt,
  } as Result;
}

function mergeResult(existing: Result, incoming: Result): Result {
  const incomingPending = isPendingResult(incoming.result);

  /**
   * Critical fix:
   * If the incoming state is pending, clear image fields instead of preserving
   * existing.result_image. Otherwise pending rows can show old images.
   */
  if (incomingPending) {
    return {
      ...existing,
      ...incoming,
      result_image: "",
      resultImageUrl: "",
      result_image_url: "",
      annotated_image: "",
      annotatedImageUrl: "",
      annotated_image_url: "",
      original_image: "",
      originalImageUrl: "",
      original_image_url: "",
      raw_image: "",
      rawImageUrl: "",
      raw_image_url: "",
    };
  }

  return {
    ...existing,
    ...incoming,

    // For final results, preserve existing images only when the incoming final
    // result event did not include image fields yet.
    result_image: incoming.result_image || existing.result_image || "",
    resultImageUrl: incoming.resultImageUrl || existing.resultImageUrl || "",
    result_image_url:
      incoming.result_image_url || existing.result_image_url || "",

    annotated_image: incoming.annotated_image || existing.annotated_image || "",
    annotatedImageUrl:
      incoming.annotatedImageUrl || existing.annotatedImageUrl || "",
    annotated_image_url:
      incoming.annotated_image_url || existing.annotated_image_url || "",

    original_image: incoming.original_image || existing.original_image || "",
    originalImageUrl:
      incoming.originalImageUrl || existing.originalImageUrl || "",
    original_image_url:
      incoming.original_image_url || existing.original_image_url || "",

    raw_image: incoming.raw_image || existing.raw_image || "",
    rawImageUrl: incoming.rawImageUrl || existing.rawImageUrl || "",
    raw_image_url: incoming.raw_image_url || existing.raw_image_url || "",
  };
}

export function useDashboardLiveUpdates({
  ws,
  isReady,
  userId,
  qrTokenRef,
  clearQrState,
  setTransactions,
  setResults,
}: UseDashboardLiveUpdatesParams) {
  useEffect(() => {
    if (!ws || !isReady || !userId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.type === "qr_scanned") {
          const incomingUserId =
            data.userId ??
            data.userID ??
            data.user_id ??
            data.user?._id ??
            null;

          const incomingToken =
            data.token ?? data.qrToken ?? data.scannedCode ?? data.code ?? null;

          if (
            String(incomingUserId) === String(userId) &&
            String(incomingToken) === String(qrTokenRef.current)
          ) {
            clearQrState();
          }
        }

        if (data?.type === "new_transaction") {
          const transaction: Transaction = data.transaction;

          if (String((transaction as any).user_id) === String(userId)) {
            setTransactions((prev) => {
              const exists = prev.some((tx) => tx._id === transaction._id);
              if (exists) return prev;
              return [transaction, ...prev];
            });
          }
        }

        if (data?.type === "new_result" || data?.type === "new_result_image") {
          const incoming = normalizeIncomingResult(data.result);

          if (String(incoming.user_id) === String(userId)) {
            setResults((prev) => {
              const incomingTransactionId = String(
                incoming.transaction_id ?? "",
              );

              const exists = prev.some(
                (r) =>
                  String(r.transaction_id ?? "") === incomingTransactionId &&
                  String(r.user_id) === String(incoming.user_id),
              );

              if (exists) {
                return prev.map((r) =>
                  String(r.transaction_id ?? "") === incomingTransactionId &&
                  String(r.user_id) === String(incoming.user_id)
                    ? mergeResult(r, incoming)
                    : r,
                );
              }

              return [incoming, ...prev];
            });
          }
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [
    ws,
    isReady,
    userId,
    qrTokenRef,
    clearQrState,
    setTransactions,
    setResults,
  ]);
}
