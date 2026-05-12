"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDashboardQr(
  userId?: string,
  options: { enableStatusFallback?: boolean } = {},
) {
  const enableStatusFallback = options.enableStatusFallback ?? true;
  const [qrToken, setQrToken] = useState<string | null>(null);
  const qrTokenRef = useRef<string | null>(null);

  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isQrLoading, setIsQrLoading] = useState(false);

  const [qrExpiry, setQrExpiry] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const clearQrState = useCallback(() => {
    setIsQrDialogOpen(false);
    setQrToken(null);
    qrTokenRef.current = null;
    setQrExpiry(null);
    setTimeLeft(0);
    setIsQrLoading(false);
  }, []);

  useEffect(() => {
    qrTokenRef.current = qrToken;
  }, [qrToken]);

  const handleGenerateQr = useCallback(async () => {
    if (!userId || isQrLoading) return;

    clearQrState();
    setIsQrDialogOpen(true);
    setIsQrLoading(true);

    try {
      const res = await fetch("/api/qr-tokens/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to generate QR code");
        clearQrState();
        return;
      }

      const data = await res.json();

      setQrToken(data.token);

      const expiresAt = data.expiresAt
        ? new Date(data.expiresAt)
        : new Date(Date.now() + 5 * 60 * 1000);

      setQrExpiry(expiresAt);
      setTimeLeft(
        Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
      );
      setIsQrDialogOpen(true);
    } catch (err) {
      console.error("Failed to generate QR:", err);
      alert("Failed to generate QR code. Please try again.");
      clearQrState();
    } finally {
      setIsQrLoading(false);
    }
  }, [userId, isQrLoading, clearQrState]);

  useEffect(() => {
    if (!enableStatusFallback || !isQrDialogOpen || !qrToken || isQrLoading) {
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/qr-tokens/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: qrToken }),
        });

        if (!res.ok || cancelled) return;

        const data = await res.json();

        if (data.used || data.expired) {
          clearQrState();
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("QR status fallback check failed:", err);
        }
      }
    };

    checkStatus();

    const interval = setInterval(checkStatus, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    enableStatusFallback,
    isQrDialogOpen,
    qrToken,
    isQrLoading,
    clearQrState,
  ]);

  useEffect(() => {
    if (!qrExpiry || !isQrDialogOpen) return;

    const interval = setInterval(() => {
      const secondsLeft = Math.floor((qrExpiry.getTime() - Date.now()) / 1000);

      if (secondsLeft <= 0) {
        clearQrState();
        clearInterval(interval);
      } else {
        setTimeLeft(secondsLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrExpiry, isQrDialogOpen, clearQrState]);

  return {
    qrToken,
    qrTokenRef,
    isQrDialogOpen,
    isQrLoading,
    qrExpiry,
    timeLeft,
    qrCanvasRef,
    clearQrState,
    handleGenerateQr,
    setIsQrDialogOpen,
  };
}
