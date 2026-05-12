"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTPPattern } from "@/components/custom-ui/input-otp";
import { Label } from "@/components/ui/label";

interface VerificationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: (code: string) => void;
  onCancel?: () => void;
  status?: string | null;
  onResend?: () => void;
  loading?: boolean;
  retryAfterSeconds?: number;
  otpExpiresInSeconds?: number;
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VerificationForm({
  open,
  onOpenChange,
  code,
  onCodeChange,
  onSubmit,
  onCancel,
  status,
  onResend,
  loading = false,
  retryAfterSeconds = 0,
  otpExpiresInSeconds = 0,
}: VerificationFormProps) {
  const [remaining, setRemaining] = useState(retryAfterSeconds);
  const [otpRemaining, setOtpRemaining] = useState(otpExpiresInSeconds);

  useEffect(() => {
    setRemaining(retryAfterSeconds);
  }, [retryAfterSeconds]);

  useEffect(() => {
    setOtpRemaining(otpExpiresInSeconds);
  }, [otpExpiresInSeconds]);

  useEffect(() => {
    if (!open || remaining <= 0) return;

    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, remaining]);

  useEffect(() => {
    if (!open || otpRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setOtpRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, otpRemaining]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const isLocked = remaining > 0;
  const isExpired = otpExpiresInSeconds > 0 && otpRemaining <= 0;

  const lockMessage = useMemo(() => {
    if (!isLocked) return null;
    return `Too many incorrect OTP attempts. Try again in ${formatDuration(
      remaining,
    )}.`;
  }, [isLocked, remaining]);

  const expiryMessage = useMemo(() => {
    if (isExpired) {
      return "This OTP has expired. Please click Resend to request a new code.";
    }

    if (otpRemaining > 0) {
      return `OTP expires in ${formatDuration(otpRemaining)}.`;
    }

    return null;
  }, [isExpired, otpRemaining]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || isExpired) return;
    onSubmit(code);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-dialog-title"
    >
      <div
        className="w-full max-w-[400px] rounded-xl border bg-background px-5 py-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-center">
          <h2
            id="otp-dialog-title"
            className="text-base font-semibold text-center"
          >
            Account Verification
          </h2>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Enter the OTP sent to your number.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Label className="block w-full text-center text-sm">
              Verification Code
            </Label>

            <div className="mx-auto flex w-full justify-center">
              <InputOTPPattern
                value={code}
                onChange={(val: string) => onCodeChange(val)}
              />
            </div>

            {status && (
              <p className="w-full text-center text-xs leading-relaxed text-destructive">
                {status}
              </p>
            )}

            {lockMessage && (
              <p className="w-full px-1 text-center text-xs font-medium leading-relaxed text-amber-600">
                {lockMessage}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="w-full text-center text-xs leading-relaxed text-muted-foreground">
              Didn’t receive a code?
              <button
                type="button"
                className="ml-1 font-semibold text-primary hover:underline hover:cursor-pointer disabled:opacity-50"
                onClick={onResend}
                disabled={loading || isLocked}
              >
                {isLocked ? `Resend in ${formatDuration(remaining)}` : "Resend"}
              </button>
            </p>

            {expiryMessage && (
              <p
                className={`w-full px-2 text-center text-xs font-medium leading-relaxed break-words ${
                  isExpired ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {expiryMessage}
              </p>
            )}
          </div>

          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onCancel();
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto cursor-pointer"
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={
                loading ||
                isLocked ||
                isExpired ||
                (code ?? "").trim().length === 0
              }
              className="w-full sm:w-auto cursor-pointer"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
