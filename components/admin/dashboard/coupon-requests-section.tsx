"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw, TicketCheck, XCircle } from "lucide-react";
import type { CouponRequestRecord } from "@/components/admin/dashboard/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  requests: CouponRequestRecord[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  onReview: (
    id: string,
    payload: {
      action: "approve" | "reject";
      adminNote?: string;
    },
  ) => Promise<void>;
};

function formatDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;

  if (!date || Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
  }

  if (normalized === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }

  return <Badge variant="secondary">Pending</Badge>;
}

function getPrintStatusBadge(status?: string) {
  const normalized = String(status || "unknown").toLowerCase();

  if (normalized === "printed") {
    return (
      <Badge className="bg-amber-500 text-white">Booth says printed</Badge>
    );
  }

  if (
    normalized === "failed" ||
    normalized === "printer_unavailable" ||
    normalized === "token_missing"
  ) {
    return <Badge variant="destructive">Print failed</Badge>;
  }

  return <Badge variant="outline">Unknown print status</Badge>;
}

export function CouponRequestsSection({
  requests,
  loading,
  onRefresh,
  onReview,
}: Props) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    try {
      setBusyId(id);

      await onReview(id, {
        action,
        adminNote: notes[id] || "",
      });

      setNotes((current) => ({
        ...current,
        [id]: "",
      }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TicketCheck className="size-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Coupon Requests
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Review users who reported that their printed coupon was not
            received.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            className={["mr-2 size-4", loading ? "animate-spin" : ""].join(" ")}
          />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading coupon requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <TicketCheck className="mx-auto size-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            No coupon requests
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pending reports will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const isBusy = busyId === request._id;
            const printStatus = request.verification?.boothPrintStatus;

            return (
              <article
                key={request._id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(request.status)}
                      {getPrintStatusBadge(printStatus)}
                    </div>

                    <h3 className="break-words text-lg font-bold text-foreground">
                      {request.productName || "Health Screening Kit"}
                    </h3>

                    <p className="break-all font-mono text-xs text-muted-foreground">
                      Transaction: {request.transactionId}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      User:{" "}
                      <span className="font-semibold text-foreground">
                        {request.username}
                      </span>
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Requested: {formatDate(request.createdAt)}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground lg:min-w-[280px]">
                    <p>
                      Booth print status:{" "}
                      <span className="font-semibold text-foreground">
                        {printStatus || "unknown"}
                      </span>
                    </p>

                    <p>
                      Printer function available:{" "}
                      <span className="font-semibold text-foreground">
                        {request.verification?.printerFunctionAvailable
                          ? "Yes"
                          : "No"}
                      </span>
                    </p>

                    {request.verification?.boothPrintError ? (
                      <p className="text-destructive">
                        Error: {request.verification.boothPrintError}
                      </p>
                    ) : null}
                  </div>
                </div>

                {request.note ? (
                  <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
                    <p className="font-semibold text-foreground">User note</p>
                    <p className="mt-1 text-muted-foreground">{request.note}</p>
                  </div>
                ) : null}

                {request.status === "pending" ? (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={notes[request._id] || ""}
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [request._id]: event.target.value,
                        }))
                      }
                      placeholder="Admin note, optional"
                      className="min-h-20"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={isBusy}
                        onClick={() => handleReview(request._id, "reject")}
                      >
                        <XCircle className="mr-2 size-4" />
                        Reject
                      </Button>

                      <Button
                        type="button"
                        className="cursor-pointer"
                        disabled={isBusy}
                        onClick={() => handleReview(request._id, "approve")}
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        Approve & Generate Coupon
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-border p-3 text-sm text-muted-foreground">
                    <p>
                      Reviewed:{" "}
                      <span className="font-semibold text-foreground">
                        {formatDate(request.reviewedAt)}
                      </span>
                    </p>

                    {request.adminNote ? (
                      <p className="mt-1">Admin note: {request.adminNote}</p>
                    ) : null}

                    {request.couponToken ? (
                      <p className="mt-1 break-all font-mono text-xs">
                        Coupon token: {request.couponToken}
                      </p>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
