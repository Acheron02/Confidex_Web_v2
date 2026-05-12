"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Dispatch, SetStateAction } from "react";
import type { Result } from "@/app/utils/fetchResult";
import type { Transaction } from "@/app/utils/fetchTransaction";

type Params = {
  userId?: string;
  transactions: Transaction[];
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setResults: Dispatch<SetStateAction<Result[]>>;
};

function getTransactionIdentityValues(tx: Transaction) {
  return [
    String((tx as any)?._id ?? ""),
    String((tx as any)?.transaction_id ?? ""),
    String((tx as any)?.transactionId ?? ""),
  ].filter(Boolean);
}

function transactionMatchesSelected(tx: Transaction, selectedIds: Set<string>) {
  return getTransactionIdentityValues(tx).some((id) => selectedIds.has(id));
}

export function useDashboardDelete({
  userId,
  transactions,
  setTransactions,
  setResults,
}: Params) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const isTransactionSelected = useCallback(
    (txId: string) => selectedTransactionIds.includes(String(txId)),
    [selectedTransactionIds],
  );

  const toggleTransactionSelection = useCallback((txId: string) => {
    const normalizedTxId = String(txId);

    setSelectedTransactionIds((prev) =>
      prev.includes(normalizedTxId)
        ? prev.filter((id) => id !== normalizedTxId)
        : [...prev, normalizedTxId],
    );
  }, []);

  const startDeleteMode = useCallback(() => {
    setDeleteMode(true);
    setSelectedTransactionIds([]);
  }, []);

  const cancelDeleteMode = useCallback(() => {
    setDeleteMode(false);
    setSelectedTransactionIds([]);
    setIsDeleteDialogOpen(false);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (!userId) {
      toast.error("Unable to delete", {
        description: "You must be signed in to delete transactions.",
      });
      return;
    }

    if (selectedTransactionIds.length === 0) {
      toast.error("No transaction selected", {
        description: "Select at least one transaction before deleting.",
      });
      return;
    }

    const selectedSet = new Set(selectedTransactionIds.map(String));

    try {
      setIsDeletingSelected(true);

      const res = await fetch(`/api/users/${userId}/transactions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transactionIds: selectedTransactionIds,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to delete selected transactions",
        );
      }

      /**
       * Important:
       * Only remove the selected transactions from the transaction list.
       *
       * Do NOT remove results by productID.
       * Multiple transactions can share the same productID, so filtering results
       * by productID makes unrelated rows lose their result and become Pending.
       */
      setTransactions((prev) =>
        prev.filter((tx) => !transactionMatchesSelected(tx, selectedSet)),
      );

      /**
       * Intentionally keep results untouched.
       * Orphaned result records are safer than deleting result records that may
       * still be needed by other transactions.
       */
      void setResults;

      setSelectedTransactionIds([]);
      setDeleteMode(false);
      setIsDeleteDialogOpen(false);

      toast.success("Transaction deleted", {
        description:
          selectedTransactionIds.length === 1
            ? "The selected transaction was removed from your history."
            : "The selected transactions were removed from your history.",
      });
    } catch (err) {
      console.error("Failed to delete selected transactions:", err);

      toast.error("Failed to delete transaction", {
        description:
          err instanceof Error ? err.message : "Please try again later.",
      });
    } finally {
      setIsDeletingSelected(false);
    }
  }, [userId, selectedTransactionIds, setTransactions, setResults]);

  return {
    deleteMode,
    setDeleteMode,
    selectedTransactionIds,
    setSelectedTransactionIds,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isDeletingSelected,
    isTransactionSelected,
    toggleTransactionSelection,
    startDeleteMode,
    cancelDeleteMode,
    handleDeleteSelected,
  };
}
