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

        if (data?.type === "new_result") {
          const result = data.result;
          if (String(result.user_id) === String(userId)) {
            setResults((prev) => {
              const incomingTransactionId = String(result.transaction_id ?? "");
              const exists = prev.some(
                (r) =>
                  String(r.transaction_id ?? "") === incomingTransactionId &&
                  String(r.user_id) === String(result.user_id),
              );

              if (exists) {
                return prev.map((r) =>
                  String(r.transaction_id ?? "") === incomingTransactionId &&
                  String(r.user_id) === String(result.user_id)
                    ? {
                        ...r,
                        result: result.result ?? r.result,
                        result_image: result.result_image || r.result_image,
                        transaction_id: result.transaction_id || r.transaction_id,
                        review_status: result.review_status || r.review_status,
                        original_result: result.original_result ?? r.original_result,
                        override_result: result.override_result ?? r.override_result,
                        reviewed_by: result.reviewed_by ?? r.reviewed_by,
                        reviewed_at: result.reviewed_at ?? r.reviewed_at,
                        review_notes: result.review_notes ?? r.review_notes,
                        createdAt: result.createdAt || r.createdAt,
                        updatedAt: result.updatedAt || r.updatedAt,
                      }
                    : r,
                );
              }

              return [
                {
                  _id: result._id ?? Date.now().toString(),
                  user_id: result.user_id,
                  productID: result.productID,
                  transaction_id: result.transaction_id,
                  result: result.result ?? "Analyzed",
                  result_image: result.result_image || "",
                  review_status: result.review_status || "none",
                  original_result: result.original_result || "",
                  override_result: result.override_result || "",
                  reviewed_by: result.reviewed_by || null,
                  reviewed_at: result.reviewed_at || null,
                  review_notes: result.review_notes || "",
                  createdAt: result.createdAt || new Date().toISOString(),
                  updatedAt: result.updatedAt,
                },
                ...prev,
              ];
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
