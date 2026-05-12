"use client";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  isDeletingSelected: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteTransactionsDialog({
  open,
  isDeletingSelected,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => {
        if (!isDeletingSelected) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-black">Delete Transactions</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete the selected transaction(s)? This
          action cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeletingSelected}
            className="hover:cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeletingSelected}
            className="hover:cursor-pointer"
          >
            {isDeletingSelected ? "Deleting..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
