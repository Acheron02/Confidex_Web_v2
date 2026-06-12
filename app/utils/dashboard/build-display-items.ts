import type { Result } from "@/app/utils/fetchResult";
import { getEffectiveResult } from "@/app/utils/fetchResult";
import type { Transaction } from "@/app/utils/fetchTransaction";

export type DisplayItemStatus = "Under Review" | "Completed" | "Pending";

export type DisplayItem = {
  name: string;
  productID: string;
  txIndex: number;
  itemIndex: number;
  purchasedDate?: string | Date;
  txId: string;
  receiptTransactionId: string;
  transactionStatus: string;
  result: string;
  originalResult?: string;
  overrideResult?: string;
  reviewStatus?: string;
  result_image_url: string;
  original_image_url?: string;
  resultUpdatedAt?: string;
  status: DisplayItemStatus;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeKey(value: unknown) {
  return clean(value).toLowerCase();
}

function normalizeForStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function isPendingLike(value: unknown) {
  const normalized = normalizeForStatus(value);

  return (
    !normalized ||
    normalized === "pending" ||
    normalized === "not available" ||
    normalized === "n/a" ||
    normalized === "none"
  );
}

function getAnnotatedImage(found: any): string {
  return clean(
    found?.result_image ||
      found?.annotated_image ||
      found?.resultImageUrl ||
      found?.annotatedImageUrl ||
      found?.result_image_url ||
      found?.annotated_image_url,
  );
}

function getOriginalImage(found: any): string {
  return clean(
    found?.original_image ||
      found?.raw_image ||
      found?.originalImageUrl ||
      found?.rawImageUrl ||
      found?.original_image_url ||
      found?.raw_image_url,
  );
}

function getResultTime(value: any) {
  return new Date(
    value?.updatedAt || value?.createdAt || value?.testedDate || 0,
  ).getTime();
}

function getBestResultForItem(
  results: Result[],
  userId: string | undefined,
  transactionId: string,
  productID: string,
) {
  const exactMatches = results.filter(
    (r) =>
      String(r.user_id) === String(userId) &&
      clean((r as any).transaction_id) === clean(transactionId) &&
      normalizeKey(r.productID) === normalizeKey(productID),
  );

  const transactionMatches = results.filter(
    (r) =>
      String(r.user_id) === String(userId) &&
      clean((r as any).transaction_id) === clean(transactionId),
  );

  const matches = exactMatches.length ? exactMatches : transactionMatches;

  if (!matches.length) return null;

  /**
   * Important:
   * Do NOT prefer old rows just because they have an image.
   * A newer pending/no-image row must not inherit or visually reuse an older image.
   */
  return (
    [...matches].sort((a, b) => getResultTime(b) - getResultTime(a))[0] ?? null
  );
}

export function getDisplayStatus(
  result: unknown,
  transactionStatus?: unknown,
  reviewStatus?: unknown,
): DisplayItemStatus {
  const normalizedResult = normalizeForStatus(result);
  const normalizedTransactionStatus = normalizeForStatus(transactionStatus);
  const normalizedReviewStatus = normalizeForStatus(reviewStatus);

  if (normalizedReviewStatus === "under review") {
    return "Under Review";
  }

  if (
    normalizedResult.includes("invalid") ||
    normalizedResult.includes("no object detected") ||
    normalizedResult.includes("uncertain") ||
    normalizedResult.includes("error") ||
    normalizedResult.includes("not detected") ||
    normalizedResult.includes("not_detected")
  ) {
    return "Under Review";
  }

  if (isPendingLike(result) || normalizedTransactionStatus === "pending") {
    return "Pending";
  }

  return "Completed";
}

function extractResultText(found: Result | null, fallback?: unknown): string {
  if (!found) {
    return clean(fallback) || "Pending";
  }

  return getEffectiveResult(found);
}

function extractResultUpdatedAt(found: any): string | undefined {
  const value = found?.updatedAt ?? found?.createdAt ?? found?.testedDate;
  return value ? String(value) : undefined;
}

export function buildDisplayItems(
  transactions: Transaction[],
  results: Result[],
  userId?: string,
): DisplayItem[] {
  return transactions.flatMap((tx, txIndex) => {
    const resolvedReceiptTransactionId = String(
      (tx as any).transaction_id ?? (tx as any).transactionId ?? tx._id,
    );

    const transactionStatus = String(tx.status ?? "");

    return tx.items.map((item, itemIndex) => {
      const foundResult = getBestResultForItem(
        results,
        userId,
        resolvedReceiptTransactionId,
        item.productID,
      );

      const resultText = extractResultText(foundResult, (item as any).result);

      const status = getDisplayStatus(
        resultText,
        transactionStatus,
        foundResult?.review_status,
      );

      const annotatedImage = getAnnotatedImage(foundResult);
      const originalImage = getOriginalImage(foundResult);

      /**
       * Critical fix:
       * Pending transactions must not expose any image URL.
       * This prevents the UI from showing a previous/stale result image.
       */
      const shouldExposeImage = status !== "Pending";
      const displayImage = shouldExposeImage
        ? annotatedImage || originalImage
        : "";
      const displayOriginalImage = shouldExposeImage ? originalImage : "";

      return {
        ...item,
        txIndex,
        itemIndex,
        purchasedDate: tx.purchasedDate,
        txId: String(tx._id),
        receiptTransactionId: resolvedReceiptTransactionId,
        transactionStatus,
        result: resultText,
        originalResult: foundResult?.original_result || foundResult?.result,
        overrideResult: foundResult?.override_result || "",
        reviewStatus: foundResult?.review_status || "none",
        result_image_url: displayImage,
        original_image_url: displayOriginalImage,
        resultUpdatedAt: extractResultUpdatedAt(foundResult),
        status,
      };
    });
  });
}
