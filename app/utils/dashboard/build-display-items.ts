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

function hasAnyImage(found: any) {
  return Boolean(getAnnotatedImage(found) || getOriginalImage(found));
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

  const withImage = matches.filter((r) => hasAnyImage(r));
  const source = withImage.length ? withImage : matches;

  return (
    source.sort((a, b) => {
      const aTime = new Date(
        (a as any)?.updatedAt ||
          (a as any)?.createdAt ||
          (a as any)?.testedDate ||
          0,
      ).getTime();

      const bTime = new Date(
        (b as any)?.updatedAt ||
          (b as any)?.createdAt ||
          (b as any)?.testedDate ||
          0,
      ).getTime();

      return bTime - aTime;
    })[0] ?? null
  );
}

function normalizeForStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
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

  if (
    !normalizedResult ||
    normalizedResult === "pending" ||
    normalizedResult === "not available" ||
    normalizedResult === "n/a" ||
    normalizedResult === "none" ||
    normalizedTransactionStatus === "pending"
  ) {
    return "Pending";
  }

  return "Completed";
}

function extractResultText(found: Result | null): string {
  if (!found) return "Pending";
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

      const resultText = extractResultText(foundResult);
      const annotatedImage = getAnnotatedImage(foundResult);
      const originalImage = getOriginalImage(foundResult);

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
        result_image_url: annotatedImage || originalImage,
        original_image_url: originalImage,
        resultUpdatedAt: extractResultUpdatedAt(foundResult),
        status: getDisplayStatus(
          resultText,
          transactionStatus,
          foundResult?.review_status,
        ),
      };
    });
  });
}
