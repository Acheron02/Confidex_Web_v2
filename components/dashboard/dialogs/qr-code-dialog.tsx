"use client";

import { QRCodeCanvas } from "qrcode.react";

type Props = {
  open: boolean;
  isQrLoading: boolean;
  qrToken: string | null;
  timeLeft: number;
  username?: string;
  qrCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
  onRefresh: () => void;
};

export default function QrCodeDialog({
  open,
  isQrLoading,
  qrToken,
  timeLeft,
  username,
  qrCanvasRef,
  onClose,
  onRefresh,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-3 py-4 sm:px-4"
      onClick={() => {
        if (!isQrLoading) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-sm flex-col items-center justify-center rounded-2xl bg-white p-5 md:min-w-[360px] md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!isQrLoading && (
          <button
            className="absolute right-4 top-4 hover:opacity-80"
            onClick={onClose}
          >
            <img
              src="/close_icon.png"
              alt="Close"
              className="h-6 w-6 cursor-pointer"
            />
          </button>
        )}

        <h2 className="mb-4 text-xl font-bold text-black">
          {isQrLoading ? "Generating QR Code..." : "Your QR Code"}
        </h2>

        {isQrLoading ? (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="h-[180px] w-[180px] animate-pulse rounded-xl bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="flex gap-4">
              <div className="h-7 w-7 animate-pulse rounded bg-muted" />
              <div className="h-7 w-7 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : qrToken ? (
          <>
            <div className="rounded-xl bg-white p-2">
              <QRCodeCanvas value={qrToken} size={180} ref={qrCanvasRef} />
            </div>

            <div className="mt-3 text-sm font-bold text-red-600">
              Expires in:{" "}
              {Math.floor(timeLeft / 60)
                .toString()
                .padStart(2, "0")}
              :{(timeLeft % 60).toString().padStart(2, "0")}
            </div>

            <div className="mt-4 flex w-full justify-center gap-4">
              <button onClick={onRefresh}>
                <img
                  src="/refresh.png"
                  alt="Refresh QR"
                  className="h-7 w-7 cursor-pointer hover:opacity-80"
                />
              </button>

              <button
                onClick={() => {
                  if (!qrCanvasRef.current) return;
                  const url = qrCanvasRef.current.toDataURL("image/png");
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${username?.toUpperCase() || "USER"}-QR.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <img
                  src="/download_icon.png"
                  alt="Download QR"
                  className="h-7 w-7 cursor-pointer hover:opacity-80"
                />
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-gray-700">
            Failed to generate QR code.
          </div>
        )}
      </div>
    </div>
  );
}
