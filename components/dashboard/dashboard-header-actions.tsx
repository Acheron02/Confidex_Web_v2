"use client";

import { Button } from "@/components/ui/button";

type Props = {
  pageRefreshing: boolean;
  deleteMode: boolean;
  transactionsCount: number;
  selectedTransactionIds: string[];
  onRefresh: () => void;
  onStartDeleteMode: () => void;
  onOpenDeleteDialog: () => void;
  onCancelDeleteMode: () => void;
};

export default function DashboardHeaderActions({
  pageRefreshing,
  deleteMode,
  transactionsCount,
  selectedTransactionIds,
  onRefresh,
  onStartDeleteMode,
  onOpenDeleteDialog,
  onCancelDeleteMode,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex h-full flex-col justify-center gap-3 sm:flex-row lg:flex-col">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={pageRefreshing}
          className="w-full hover:cursor-pointer"
        >
          {pageRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>

        {!deleteMode ? (
          <Button
            variant="outline"
            disabled={transactionsCount === 0}
            className="w-full hover:cursor-pointer"
            onClick={onStartDeleteMode}
          >
            Delete History
          </Button>
        ) : (
          <>
            <Button
              variant="destructive"
              disabled={selectedTransactionIds.length === 0}
              className="w-full hover:cursor-pointer"
              onClick={onOpenDeleteDialog}
            >
              Delete Selected
            </Button>

            <Button
              variant="outline"
              className="w-full hover:cursor-pointer"
              onClick={onCancelDeleteMode}
            >
              Cancel Selection
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
