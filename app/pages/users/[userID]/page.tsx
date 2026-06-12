"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-context";
import { isAdminRole } from "@/lib/rbac";
import { useParams, useRouter } from "next/navigation";
import CheckAuth from "@/components/common/check-auth";
import ReceiptDialog from "@/components/custom-ui/receipt_dialog";
import { useWS } from "@/components/providers/ws-context";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useDashboardQr } from "@/hooks/use-dashboard-qr";
import { useDashboardLiveUpdates } from "@/hooks/use-dashboard-live-updates";
import { useDashboardDelete } from "@/hooks/use-dashboard-delete";

import { buildDisplayItems } from "../../../utils/dashboard/build-display-items";

import DashboardHeaderActions from "@/components/dashboard/dashboard-header-actions";
import DashboardUserCard from "@/components/dashboard/dashboard-user-card";
import DashboardQrCard from "@/components/dashboard/dashboard-qr-card";
import DashboardHistoryTable from "@/components/dashboard/dashboard-history-table";
import DashboardPagination from "@/components/dashboard/dashboard-pagination";

import DeleteTransactionsDialog from "@/components/dashboard/dialogs/delete-transactions-dialog";
import QrCodeDialog from "@/components/dashboard/dialogs/qr-code-dialog";
import ResultImageDialog from "@/components/dashboard/dialogs/result-image-dialog";
import SubmitReviewDialog from "@/components/dashboard/dialogs/submit-review-dialog";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ userID: string }>();
  const { ws, isReady } = useWS();

  const [isClient, setIsClient] = useState(false);
  const [clientUser, setClientUser] = useState(user ?? null);
  const [currentPage, setCurrentPage] = useState(1);

  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewTxId, setReviewTxId] = useState<string | null>(null);

  const routeUserID = typeof params?.userID === "string" ? params.userID : "";
  const itemsPerPage = 10;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setClientUser(user ?? null);
  }, [user]);

  const {
    transactions,
    setTransactions,
    results,
    setResults,
    pageLoading,
    pageRefreshing,
    refreshDashboardData,

    isImageDialogOpen,
    selectedImageUrl,
    selectedOriginalImageUrl,
    selectedImageResult,
    imageLoadingTxId,
    fetchAndOpenImage,
    closeImageDialog,

    isReceiptDialogOpen,
    receiptLoadingTxId,
    selectedReceipt,
    fetchAndOpenReceipt,
    closeReceiptDialog,

    reviewRequestLoadingTxId,
    requestResultReview,
  } = useDashboardData(clientUser?._id);

  const {
    qrToken,
    qrTokenRef,
    isQrDialogOpen,
    isQrLoading,
    timeLeft,
    qrCanvasRef,
    clearQrState,
    handleGenerateQr,
  } = useDashboardQr(clientUser?._id, {
    enableStatusFallback: !isReady,
  });

  const {
    deleteMode,
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
  } = useDashboardDelete({
    userId: clientUser?._id,
    transactions,
    setTransactions,
    setResults,
  });

  useDashboardLiveUpdates({
    ws,
    isReady,
    userId: clientUser?._id,
    qrTokenRef,
    clearQrState,
    setTransactions,
    setResults,
  });

  useEffect(() => {
    if (!clientUser?._id) return;
    refreshDashboardData("initial");
  }, [clientUser?._id, refreshDashboardData]);

  useEffect(() => {
    if (!isClient || !clientUser) return;

    if (isAdminRole(clientUser.role)) {
      router.replace("/pages/admin/dashboard");
      return;
    }

    if (routeUserID && clientUser._id !== routeUserID) {
      router.replace(`/pages/users/${clientUser._id}`);
    }
  }, [isClient, clientUser, routeUserID, router]);

  const allItems = useMemo(() => {
    return buildDisplayItems(transactions, results, clientUser?._id);
  }, [transactions, results, clientUser?._id]);

  const totalPages = useMemo(() => {
    return Math.max(Math.ceil(allItems.length / itemsPerPage), 1);
  }, [allItems.length]);

  const startIndex = useMemo(() => {
    return (currentPage - 1) * itemsPerPage;
  }, [currentPage]);

  const currentItems = useMemo(() => {
    return allItems.slice(startIndex, startIndex + itemsPerPage);
  }, [allItems, startIndex]);

  const reviewTarget = useMemo(() => {
    if (!reviewTxId) return null;

    return (
      allItems.find(
        (item) =>
          String(item.txId) === reviewTxId ||
          String(item.receiptTransactionId) === reviewTxId,
      ) ?? null
    );
  }, [allItems, reviewTxId]);

  const isSubmittingReview = Boolean(
    reviewTxId && reviewRequestLoadingTxId === reviewTxId,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleDeleteRow = (txId: string) => {
    setSelectedTransactionIds([txId]);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenReviewDialog = (txId: string) => {
    setReviewTxId(txId);
    setIsReviewDialogOpen(true);
  };

  const handleCloseReviewDialog = () => {
    if (isSubmittingReview) return;

    setIsReviewDialogOpen(false);
    setReviewTxId(null);
  };

  const handleConfirmReview = async () => {
    if (!reviewTxId || isSubmittingReview) return;

    try {
      await Promise.resolve(requestResultReview(reviewTxId));
      setIsReviewDialogOpen(false);
      setReviewTxId(null);
    } catch (error) {
      console.error("[DASHBOARD] Failed to submit result for review:", error);
    }
  };

  if (!isClient || !clientUser) {
    return <CheckAuth />;
  }

  if (pageLoading) {
    return (
      <section className="min-h-full bg-background pb-[calc(var(--footer-height)+1rem)] pt-[calc(var(--navbar-height)+1rem)]">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.4fr)_minmax(180px,0.9fr)]">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="space-y-3">
                  <div className="h-10 animate-pulse rounded-xl bg-muted" />
                  <div className="h-10 animate-pulse rounded-xl bg-muted" />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="space-y-3">
                  <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-52 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="space-y-3">
                  <div className="h-10 w-full animate-pulse rounded-xl bg-muted sm:w-40" />
                  <div className="mx-auto h-4 w-44 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-7 w-44 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>

              <div className="space-y-3">
                <div className="h-12 animate-pulse rounded bg-muted" />
                <div className="h-12 animate-pulse rounded bg-muted" />
                <div className="h-12 animate-pulse rounded bg-muted" />
                <div className="h-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-full bg-background pb-[calc(var(--footer-height)+1rem)] pt-[calc(var(--navbar-height)+1rem)]">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1">
            <div className="flex flex-col gap-4 pb-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.4fr)_minmax(180px,0.9fr)]">
                <DashboardHeaderActions
                  pageRefreshing={pageRefreshing}
                  deleteMode={deleteMode}
                  transactionsCount={transactions.length}
                  selectedTransactionIds={selectedTransactionIds}
                  onRefresh={() => refreshDashboardData("refresh")}
                  onStartDeleteMode={startDeleteMode}
                  onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
                  onCancelDeleteMode={cancelDeleteMode}
                />

                <DashboardUserCard clientUser={clientUser} />

                <DashboardQrCard
                  isQrLoading={isQrLoading}
                  onGenerateQr={handleGenerateQr}
                />
              </div>

              <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-bold text-foreground md:text-xl">
                    Purchase History
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {deleteMode && (
                      <span>{selectedTransactionIds.length} selected</span>
                    )}

                    {pageRefreshing && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        Refreshing...
                      </span>
                    )}

                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                </div>

                <DashboardHistoryTable
                  currentItems={currentItems}
                  startIndex={startIndex}
                  deleteMode={deleteMode}
                  imageLoadingTxId={imageLoadingTxId}
                  receiptLoadingTxId={receiptLoadingTxId}
                  reviewRequestLoadingTxId={reviewRequestLoadingTxId}
                  isTransactionSelected={isTransactionSelected}
                  toggleTransactionSelection={toggleTransactionSelection}
                  onViewResult={fetchAndOpenImage}
                  onViewReceipt={fetchAndOpenReceipt}
                  onSubmitReview={handleOpenReviewDialog}
                  onDeleteRow={handleDeleteRow}
                />

                <DashboardPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPrev={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  onNext={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DeleteTransactionsDialog
          open={isDeleteDialogOpen}
          isDeletingSelected={isDeletingSelected}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteSelected}
        />

        <SubmitReviewDialog
          open={isReviewDialogOpen}
          isSubmitting={isSubmittingReview}
          productName={reviewTarget?.name}
          resultText={reviewTarget?.result}
          onClose={handleCloseReviewDialog}
          onConfirm={handleConfirmReview}
        />

        <QrCodeDialog
          open={isQrDialogOpen}
          isQrLoading={isQrLoading}
          qrToken={qrToken}
          timeLeft={timeLeft}
          username={clientUser?.username}
          qrCanvasRef={qrCanvasRef}
          onClose={clearQrState}
          onRefresh={handleGenerateQr}
        />

        <ResultImageDialog
          open={isImageDialogOpen}
          selectedImageUrl={selectedImageUrl}
          selectedOriginalImageUrl={selectedOriginalImageUrl}
          selectedImageResult={selectedImageResult}
          onClose={closeImageDialog}
        />

        <ReceiptDialog
          open={isReceiptDialogOpen}
          onClose={closeReceiptDialog}
          data={selectedReceipt}
        />
      </div>
    </section>
  );
}
