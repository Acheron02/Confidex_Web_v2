"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";

export type ReceiptPayload = {
  transaction_id?: string;
  user?: {
    user_id?: string;
    username?: string;
  };
  purchase?: {
    date?: string;
    time?: string;
    timestamp_folder?: string;
    datetime_iso?: string;
  };
  product?: {
    name?: string;
    product_id?: string;
    type?: string;
    price?: number;
    quantity?: number;
  };
  amounts?: {
    discount_percent?: number;
    total?: number;
    total_paid?: number;
    change?: number;
    subtotal?: number;
    discount_amount?: number;
  };
  payment?: {
    mode_of_payment?: string;
    payment_method?: string;
    online_payment?: boolean;
    payment_session_id?: string | null;
    payment_reference?: string | null;
    payment_amount?: number | null;
    payment_mode?: string | null;
    simulated?: boolean;
  };
  booth?: {
    booth_id?: string;
    device_id?: string;
    name?: string;
    location?: string;
  };
  seller?: {
    registered_name?: string;
    trade_name?: string;
    tin?: string;
    address?: string;
    vat_status?: string;
  };
  coupon?: {
    token?: string;
    qr_value?: string;
    status?: string;
    reason?: string;
    discount_percent?: number;
    issued_at?: string;
    expires_at?: string;
  };
  coupon_request?: {
    id?: string;
    _id?: string;
    status?: "pending" | "approved" | "rejected" | string;
    note?: string;
    adminNote?: string;
    couponToken?: string | null;
    reviewedAt?: string | Date | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    verification?: {
      boothPrintStatus?: string;
      printerFunctionAvailable?: boolean;
      boothRecordedToken?: string | null;
      attemptedAt?: string | null;
      completedAt?: string | null;
      boothPrintError?: string | null;
    };
  };
  support?: {
    missing_coupon_reported_at?: string;
  };
};

export type ReceiptDialogData = {
  transactionId: string;
  timestamp?: string;
  receipt: ReceiptPayload;
  transactionStatus?: string;
  paymentStatus?: string;
  resultStatus?: "Under Review" | "Completed" | "Pending" | string;
  resultText?: string;
};

type ReceiptDialogProps = {
  open: boolean;
  onClose: () => void;
  data: ReceiptDialogData | null;
};

type RowProps = {
  label: string;
  value?: string | number | null;
  bold?: boolean;
  mono?: boolean;
};

type ReceiptCoupon = NonNullable<ReceiptPayload["coupon"]>;
type ReceiptCouponRequest = NonNullable<ReceiptPayload["coupon_request"]>;

const RECEIPT_LOGO_SRC = "/confidex_light_logo_v2.png";
const COUPON_QR_CANVAS_ID = "confidex-coupon-qr-canvas";

function cleanText(value: unknown, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatPdfCurrency(value: unknown) {
  return `PHP ${toNumber(value).toFixed(2)}`;
}

function formatDateTime(receipt: ReceiptPayload, timestamp?: string) {
  const rawDate =
    receipt?.purchase?.datetime_iso ||
    timestamp ||
    receipt?.purchase?.date ||
    "";

  const parsedDate = rawDate ? new Date(rawDate) : null;
  const isValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());

  const date = receipt?.purchase?.date
    ? receipt.purchase.date
    : isValidDate
      ? new Intl.DateTimeFormat("en-PH", {
          dateStyle: "medium",
          timeZone: "Asia/Manila",
        }).format(parsedDate)
      : "N/A";

  const time = receipt?.purchase?.time
    ? receipt.purchase.time
    : isValidDate
      ? new Intl.DateTimeFormat("en-PH", {
          timeStyle: "short",
          timeZone: "Asia/Manila",
        }).format(parsedDate)
      : "N/A";

  return { date, time };
}

function getCouponValue(coupon?: ReceiptCoupon | null) {
  return cleanText(coupon?.qr_value || coupon?.token, "");
}

function formatCouponExpiry(coupon?: ReceiptCoupon | null) {
  const raw = coupon?.expires_at;
  if (!raw) return "N/A";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(parsed);
}

function getCouponDiscount(coupon?: ReceiptCoupon | null) {
  return toNumber(coupon?.discount_percent, 15);
}

function getCouponRequestStatus(request?: ReceiptCouponRequest | null) {
  return String(request?.status || "")
    .trim()
    .toLowerCase();
}

function getCouponRequestLabel(request?: ReceiptCouponRequest | null) {
  const status = getCouponRequestStatus(request);

  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "pending") return "Pending admin review";

  return "No request submitted";
}

function getCouponRequestClassName(request?: ReceiptCouponRequest | null) {
  const status = getCouponRequestStatus(request);

  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
}

function getCouponRequestDescription(request?: ReceiptCouponRequest | null) {
  const status = getCouponRequestStatus(request);

  if (status === "approved") {
    return "Your request was approved. Refresh the receipt if the coupon QR is not visible yet.";
  }

  if (status === "rejected") {
    return (
      cleanText(request?.adminNote, "") ||
      "Your request was reviewed but was not approved."
    );
  }

  if (status === "pending") {
    return "Your request has been submitted. An admin must verify it before a coupon QR is issued.";
  }

  return "";
}

function formatRequestDate(value?: string | Date | null) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(parsed);
}

function Row({ label, value, bold = false, mono = false }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-4 text-[12px] leading-relaxed sm:text-[13px]">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span
        className={[
          "min-w-0 break-words text-right text-gray-900",
          bold ? "font-bold" : "font-semibold",
          mono ? "font-mono" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {cleanText(value)}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="my-4 border-t border-dashed border-gray-300" />;
}

async function loadImageAsDataUrl(src: string) {
  const response = await fetch(src, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load logo: ${response.status}`);
  }

  const blob = await response.blob();

  return await new Promise<{
    dataUrl: string;
    width: number;
    height: number;
  }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || "");

      const img = new Image();

      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth || 1,
          height: img.naturalHeight || 1,
        });
      };

      img.onerror = () => reject(new Error("Failed to decode logo image."));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error("Failed to read logo image."));
    reader.readAsDataURL(blob);
  });
}

export default function ReceiptDialog({
  open,
  onClose,
  data,
}: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmittingCouponRequest, setIsSubmittingCouponRequest] =
    useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<ReceiptCoupon | null>(null);
  const [couponRequest, setCouponRequest] =
    useState<ReceiptCouponRequest | null>(null);

  useEffect(() => {
    if (!open || !data?.receipt) {
      setCoupon(null);
      setCouponRequest(null);
      setCouponMessage(null);
      setIsSubmittingCouponRequest(false);
      return;
    }

    setCoupon(data.receipt.coupon ?? null);
    setCouponRequest(data.receipt.coupon_request ?? null);
    setCouponMessage(null);
    setIsSubmittingCouponRequest(false);
  }, [open, data?.transactionId, data?.receipt]);

  const prepared = useMemo(() => {
    if (!data) return null;

    const receipt = data.receipt || {};

    const quantity = Math.max(1, toNumber(receipt?.product?.quantity, 1));
    const unitPrice = toNumber(receipt?.product?.price, 0);
    const subtotal = toNumber(receipt?.amounts?.subtotal, unitPrice * quantity);

    const discountPercent = toNumber(receipt?.amounts?.discount_percent, 0);
    const discountAmount = toNumber(
      receipt?.amounts?.discount_amount,
      discountPercent > 0 ? subtotal * (discountPercent / 100) : 0,
    );

    const total = toNumber(receipt?.amounts?.total, subtotal - discountAmount);
    const paid = toNumber(
      receipt?.amounts?.total_paid ?? receipt?.payment?.payment_amount,
      total,
    );

    const change = toNumber(
      receipt?.amounts?.change,
      Math.max(paid - total, 0),
    );

    const transactionId = cleanText(
      receipt?.transaction_id || data.transactionId,
      "N/A",
    );

    const paymentMethod = cleanText(
      receipt?.payment?.mode_of_payment ||
        receipt?.payment?.payment_method ||
        receipt?.payment?.payment_mode,
      "N/A",
    );

    const { date, time } = formatDateTime(receipt, data.timestamp);

    return {
      receipt,
      quantity,
      unitPrice,
      subtotal,
      discountAmount,
      total,
      paid,
      change,
      transactionId,
      paymentMethod,
      date,
      time,
      fileName: `CONFIDEX-Receipt-${transactionId}.pdf`.replace(
        /[^a-zA-Z0-9_.-]/g,
        "_",
      ),
    };
  }, [data]);

  const handleSubmitCouponRequest = async () => {
    if (!prepared || isSubmittingCouponRequest) return;

    try {
      setIsSubmittingCouponRequest(true);
      setCouponMessage(null);

      const res = await fetch("/api/receipts/coupon-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          transactionId: prepared.transactionId,
          note: "User reported that the printed coupon was not received.",
        }),
      });

      const responseData = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          responseData?.error || "Failed to submit coupon request",
        );
      }

      if (responseData?.alreadyHasCoupon && responseData?.coupon) {
        setCoupon(responseData.coupon);
        setCouponMessage(
          "This receipt already has an approved digital coupon QR.",
        );
        return;
      }

      if (responseData?.request) {
        setCouponRequest(responseData.request);
      }

      setCouponMessage(
        responseData?.alreadyRequested
          ? "You already submitted a coupon request. Please wait for admin verification."
          : "Coupon request submitted. An admin must verify it before a QR coupon is issued.",
      );
    } catch (error) {
      console.error("[RECEIPT COUPON REQUEST]", error);

      setCouponMessage(
        error instanceof Error
          ? error.message
          : "Failed to submit coupon request. Please try again.",
      );
    } finally {
      setIsSubmittingCouponRequest(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!prepared || isDownloading) return;

    try {
      setIsDownloading(true);

      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;

      let y = 16;

      const centerText = (
        text: string,
        size = 12,
        style: "normal" | "bold" = "normal",
      ) => {
        pdf.setFont("helvetica", style);
        pdf.setFontSize(size);
        pdf.setTextColor(17, 24, 39);
        pdf.text(text, pageWidth / 2, y, { align: "center" });
        y += size * 0.42 + 2;
      };

      const divider = () => {
        y += 2;
        pdf.setDrawColor(210, 210, 210);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;
      };

      const row = (
        label: string,
        value: string | number | null | undefined,
        options?: {
          bold?: boolean;
          mono?: boolean;
        },
      ) => {
        const labelText = cleanText(label, "");
        const valueText = cleanText(value);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text(labelText, margin, y);

        pdf.setFont(
          options?.mono ? "courier" : "helvetica",
          options?.bold ? "bold" : "normal",
        );
        pdf.setFontSize(9);
        pdf.setTextColor(17, 24, 39);

        const maxValueWidth = contentWidth * 0.58;
        const wrapped = pdf.splitTextToSize(valueText, maxValueWidth);

        if (wrapped.length <= 1) {
          pdf.text(valueText, pageWidth - margin, y, { align: "right" });
          y += 5;
          return;
        }

        y += 4;

        wrapped.forEach((line: string) => {
          pdf.text(line, pageWidth - margin, y, { align: "right" });
          y += 4.5;
        });

        y += 1;
      };

      try {
        const logo = await loadImageAsDataUrl(RECEIPT_LOGO_SRC);

        const logoWidth = 70;
        const logoHeight = (logo.height * logoWidth) / logo.width;
        const logoX = (pageWidth - logoWidth) / 2;

        pdf.addImage(logo.dataUrl, "PNG", logoX, y, logoWidth, logoHeight);
        y += logoHeight + 5;
      } catch (logoError) {
        console.warn("[RECEIPT PDF] Logo skipped:", logoError);
        centerText("CONFIDEX", 20, "bold");
        y += 2;
      }

      centerText("Health Screening System", 9, "normal");
      centerText("Transaction Receipt", 12, "bold");

      divider();

      row("Transaction No.", prepared.transactionId, {
        bold: true,
        mono: true,
      });
      row("Date", prepared.date);
      row("Time", prepared.time);
      row("Payment Method", prepared.paymentMethod);

      divider();

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text("ITEM", margin, y);
      y += 6;

      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(margin, y, contentWidth, 22, 3, 3);

      const itemTop = y + 7;
      const productName = cleanText(
        prepared.receipt?.product?.name,
        "Health Screening Kit",
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(17, 24, 39);

      const itemNameLines = pdf.splitTextToSize(productName, contentWidth - 45);
      pdf.text(itemNameLines.slice(0, 2), margin + 4, itemTop);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Qty: ${prepared.quantity}`, margin + 4, itemTop + 9);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(17, 24, 39);
      pdf.text(
        formatPdfCurrency(prepared.unitPrice),
        pageWidth - margin - 4,
        itemTop,
        { align: "right" },
      );

      y += 28;

      divider();

      row("Subtotal", formatPdfCurrency(prepared.subtotal));

      if (prepared.discountAmount > 0) {
        row("Discount", `-${formatPdfCurrency(prepared.discountAmount)}`);
      }

      y += 2;
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;

      row("Total", formatPdfCurrency(prepared.total), { bold: true });
      row("Paid", formatPdfCurrency(prepared.paid), { bold: true });
      row("Change", formatPdfCurrency(prepared.change), { bold: true });

      if (coupon && getCouponValue(coupon)) {
        divider();

        centerText("Next Purchase Discount", 10, "bold");

        const qrCanvas = document.getElementById(
          COUPON_QR_CANVAS_ID,
        ) as HTMLCanvasElement | null;

        if (qrCanvas) {
          const qrDataUrl = qrCanvas.toDataURL("image/png");
          const qrSize = 34;

          pdf.addImage(
            qrDataUrl,
            "PNG",
            (pageWidth - qrSize) / 2,
            y,
            qrSize,
            qrSize,
          );

          y += qrSize + 5;
        }

        centerText(`${getCouponDiscount(coupon)}% discount coupon`, 9, "bold");

        row("Coupon Code", getCouponValue(coupon), {
          bold: true,
          mono: true,
        });

        row("Expires", formatCouponExpiry(coupon));
      }

      divider();

      centerText("Thank you for using CONFIDEX.", 10, "bold");

      pdf.save(prepared.fileName);
    } catch (error) {
      console.error("Failed to generate receipt PDF:", error);

      alert(
        error instanceof Error
          ? `Failed to download receipt PDF: ${error.message}`
          : "Failed to download receipt PDF.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (!open || !data || !prepared) return null;

  const { receipt } = prepared;
  const couponValue = getCouponValue(coupon);
  const couponRequestStatus = getCouponRequestStatus(couponRequest);
  const hasCouponRequest = Boolean(couponRequestStatus);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Receipt
            </p>

            <h2 className="mt-1 truncate text-xl font-bold text-foreground sm:text-2xl">
              Transaction Receipt
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            X
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          <div
            ref={receiptRef}
            className="mx-auto w-full max-w-[430px] rounded-2xl border border-gray-200 bg-white p-5 font-mono text-sm text-gray-950 shadow-sm sm:p-6"
          >
            <div className="text-center">
              <div className="mx-auto flex justify-center">
                <img
                  src={RECEIPT_LOGO_SRC}
                  alt="CONFIDEX"
                  className="h-auto w-48 object-contain sm:w-56"
                  crossOrigin="anonymous"
                  draggable={false}
                />
              </div>

              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Health Screening System
              </p>

              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-gray-900">
                Transaction Receipt
              </p>
            </div>

            <Divider />

            <section className="space-y-2">
              <Row
                label="Transaction No."
                value={prepared.transactionId}
                bold
                mono
              />
              <Row label="Date" value={prepared.date} />
              <Row label="Time" value={prepared.time} />
              <Row label="Payment Method" value={prepared.paymentMethod} />
            </section>

            <Divider />

            <section className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
                Item
              </p>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-gray-950">
                      {cleanText(
                        receipt?.product?.name,
                        "Health Screening Kit",
                      )}
                    </p>

                    <p className="mt-1 text-[11px] text-gray-500">
                      Qty: {prepared.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-gray-950">
                    {formatCurrency(prepared.unitPrice)}
                  </p>
                </div>
              </div>
            </section>

            <Divider />

            <section className="space-y-2">
              <Row label="Subtotal" value={formatCurrency(prepared.subtotal)} />

              {prepared.discountAmount > 0 ? (
                <Row
                  label="Discount"
                  value={`-${formatCurrency(prepared.discountAmount)}`}
                />
              ) : null}

              <div className="my-3 border-t border-gray-200" />

              <Row label="Total" value={formatCurrency(prepared.total)} bold />
              <Row label="Paid" value={formatCurrency(prepared.paid)} bold />
              <Row
                label="Change"
                value={formatCurrency(prepared.change)}
                bold
              />
            </section>

            <Divider />

            <section className="space-y-3 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
                Coupon Support
              </p>

              {coupon && couponValue ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-900">
                    Approved Discount QR
                  </p>

                  <div className="mt-3 flex justify-center">
                    <div className="rounded-xl bg-white p-2 shadow-sm">
                      <QRCodeCanvas
                        id={COUPON_QR_CANVAS_ID}
                        value={couponValue}
                        size={150}
                        level="M"
                        includeMargin
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] font-bold text-gray-700">
                    Show this QR code on your next booth purchase.
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                    Discount: {getCouponDiscount(coupon)}% · Expires:{" "}
                    {formatCouponExpiry(coupon)}
                  </p>

                  <p className="mt-2 break-all font-mono text-[10px] font-semibold text-gray-500">
                    {couponValue}
                  </p>
                </div>
              ) : hasCouponRequest ? (
                <div
                  className={[
                    "rounded-xl border p-4 text-left",
                    getCouponRequestClassName(couponRequest),
                  ].join(" ")}
                >
                  <p className="text-center text-xs font-black uppercase tracking-[0.16em]">
                    {getCouponRequestLabel(couponRequest)}
                  </p>

                  <p className="mt-3 text-center text-[11px] font-semibold leading-relaxed">
                    {getCouponRequestDescription(couponRequest)}
                  </p>

                  {couponRequest?.createdAt ? (
                    <p className="mt-3 text-center text-[10px] leading-relaxed opacity-80">
                      Requested: {formatRequestDate(couponRequest.createdAt)}
                    </p>
                  ) : null}

                  {couponRequest?.verification?.boothPrintStatus ? (
                    <p className="mt-2 text-center text-[10px] leading-relaxed opacity-80">
                      Booth print record:{" "}
                      {couponRequest.verification.boothPrintStatus}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[11px] leading-relaxed text-gray-600">
                    Did the booth fail to release your printed coupon? Submit a
                    request here. An admin must verify the request before a QR
                    coupon is issued.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full border-gray-300 bg-white text-xs font-bold text-gray-900 hover:bg-gray-100"
                    onClick={handleSubmitCouponRequest}
                    disabled={isSubmittingCouponRequest}
                  >
                    {isSubmittingCouponRequest
                      ? "Submitting Request..."
                      : "I did not receive a coupon"}
                  </Button>
                </div>
              )}

              {couponMessage ? (
                <p className="text-[11px] font-semibold leading-relaxed text-gray-600">
                  {couponMessage}
                </p>
              ) : null}
            </section>

            <Divider />

            <div className="text-center text-[11px] leading-relaxed text-gray-500">
              <p className="font-bold text-gray-700">
                Thank you for using CONFIDEX.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background p-4 sm:px-6">
          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full hover:cursor-pointer"
          >
            {isDownloading ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
