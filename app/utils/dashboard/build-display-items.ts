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
  resultUpdatedAt?: string;
  status: DisplayItemStatus;
};

function getBestResultForTransaction(
  results: Result[],
  userId: string | undefined,
  transactionId: string,
) {
  const matches = results.filter(
    (r) =>
      String(r.user_id) === String(userId) &&
      String((r as any).transaction_id ?? "") === String(transactionId),
  );

  if (!matches.length) return null;

  const withImage = matches.filter((r) => {
    const img =
      r.result_image ||
      (r as any)?.resultImageUrl ||
      (r as any)?.result_image_url ||
      null;

    return Boolean(img);
  });

  const source = withImage.length ? withImage : matches;

  return (
    source.sort((a, b) => {
      const aTime = new Date(
        (a as any)?.updatedAt || (a as any)?.createdAt || 0,
      ).getTime();
      const bTime = new Date(
        (b as any)?.updatedAt || (b as any)?.createdAt || 0,
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
    normalizedResult.includes("no object detected")
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

function extractResultImage(found: any): string {
  return String(
    found?.result_image ?? found?.resultImageUrl ?? found?.result_image_url ?? "",
  );
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

    const foundResult = getBestResultForTransaction(
      results,
      userId,
      resolvedReceiptTransactionId,
    );

    const resultText = extractResultText(foundResult);
    const transactionStatus = String(tx.status ?? "");

    return tx.items.map((item, itemIndex) => ({
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
      result_image_url: extractResultImage(foundResult),
      resultUpdatedAt: extractResultUpdatedAt(foundResult),
      status: getDisplayStatus(
        resultText,
        transactionStatus,
        foundResult?.review_status,
      ),
    }));
  });
}
