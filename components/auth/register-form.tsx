"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "../ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar22 } from "@/components/custom-ui/birthday-picker";
import { DialogClose } from "@/components/ui/dialog";
import { VerificationForm } from "@/components/auth/verification-form";
import { useAuth } from "@/components/providers/auth-context";
import { useRouter } from "next/navigation";

interface RegisterProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

const STORAGE_KEY = "register_otp_flow";

type RegisterOtpStorage = {
  form?: {
    phoneNumber?: string;
    gender?: string;
    dob?: string;
  };
  open?: boolean;
  otpCode?: string;
  status?: string | null;
  retryAfterSeconds?: number;
  otpExpiresInSeconds?: number;
};


type OtpStartResponse = {
  ok?: boolean;
  delivery?: "sms" | "demo";
  message?: string;
  demoCode?: string;
  error?: string;
  smsProviderUnavailable?: boolean;
  retryAfterSeconds?: number;
};

function getOtpStartStatus(data: OtpStartResponse, normalMessage: string) {
  if (data?.delivery === "demo") {
    if (data.demoCode) {
      return `${data.message || "Demo fallback OTP is enabled."} Use OTP: ${data.demoCode}`;
    }

    return data.message || "Demo fallback OTP is enabled.";
  }

  return normalMessage;
}

function getOtpStartError(data: OtpStartResponse, fallback: string) {
  if (data?.smsProviderUnavailable) {
    return (
      data.error ||
      "SMS provider is currently unavailable. Please ask the booth operator for assistance."
    );
  }

  return data?.error || fallback;
}

export function Register({ onSwitchToLogin, onClose }: RegisterProps) {
  const { login } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [form, setForm] = useState({
    phoneNumber: "",
    gender: "",
    dob: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const restoreState = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: RegisterOtpStorage = JSON.parse(raw);

      if (saved?.form) {
        setForm({
          phoneNumber: saved.form.phoneNumber ?? "",
          gender: saved.form.gender ?? "",
          dob: saved.form.dob ?? "",
        });
      }

      if (saved?.open === true) {
        setOpen(true);
      }

      setOtpCode(saved?.otpCode ?? "");
      setStatus(saved?.status ?? null);
      setRetryAfterSeconds(Number(saved?.retryAfterSeconds ?? 0));
      setOtpExpiresInSeconds(Number(saved?.otpExpiresInSeconds ?? 0));
    } catch {}
  }, []);

  useEffect(() => {
    restoreState();
    setHydrated(true);
  }, [restoreState]);

  useEffect(() => {
    const onPageShow = () => restoreState();
    const onFocus = () => restoreState();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        restoreState();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [restoreState]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          form,
          open,
          otpCode,
          status,
          retryAfterSeconds,
          otpExpiresInSeconds,
        }),
      );
    } catch {}
  }, [
    form,
    open,
    otpCode,
    status,
    retryAfterSeconds,
    otpExpiresInSeconds,
    hydrated,
  ]);

  const clearOtpFlow = () => {
    setOpen(false);
    setOtpCode("");
    setStatus(null);
    setRetryAfterSeconds(0);
    setOtpExpiresInSeconds(0);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }
    if (!form.gender.trim()) {
      newErrors.gender = "Gender is required";
    }
    if (!form.dob.trim()) {
      newErrors.dob = "Date of birth is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: keyof typeof form) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setStatus(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setStatus(null);
    setRetryAfterSeconds(0);
    setOtpExpiresInSeconds(0);

    try {
      const res = await fetch("/api/auth/register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setStatus(getOtpStartError(data, "Failed to send verification code"));
        setRetryAfterSeconds(Number(data.retryAfterSeconds ?? 0));
        return;
      }

      setOpen(true);
      setStatus(getOtpStartStatus(data, "Verification code sent."));
      setRetryAfterSeconds(0);
      setOtpExpiresInSeconds(5 * 60);
    } catch {
      setLoading(false);
      setStatus("Failed to send verification code");
    }
  };

  const handleVerificationSubmit = async (code: string) => {
    setLoading(true);
    setStatus("Verifying...");

    try {
      const verifyRes = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: form.phoneNumber,
          code,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setLoading(false);
        setStatus(verifyData.error || "Verification failed");
        setRetryAfterSeconds(Number(verifyData.retryAfterSeconds ?? 0));
        return;
      }

      try {
        const optionsRes = await fetch("/api/auth/passkey/register/options", {
          method: "POST",
        });
        const options = await optionsRes.json();

        if (optionsRes.ok) {
          const credential = await startRegistration({ optionsJSON: options });

          const finishRes = await fetch("/api/auth/passkey/register/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              credential,
              expectedChallenge: options.challenge,
            }),
          });

          if (!finishRes.ok) {
            setStatus("Registered, but passkey setup was skipped.");
          }
        }
      } catch {
        setStatus("Registered, but passkey setup was skipped.");
      }

      setRetryAfterSeconds(0);
      setOtpExpiresInSeconds(0);
      login(verifyData.user);
      clearOtpFlow();
      onClose();
      router.push(`/pages/users/${verifyData.user._id}`);
    } catch {
      setStatus("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setStatus("Resending verification code...");

    try {
      const res = await fetch("/api/auth/register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setStatus(getOtpStartError(data, "Failed to resend"));
        setRetryAfterSeconds(Number(data.retryAfterSeconds ?? 0));
        return;
      }

      setStatus(getOtpStartStatus(data, "Verification code resent."));
      setRetryAfterSeconds(0);
      setOtpExpiresInSeconds(5 * 60);
    } catch {
      setLoading(false);
      setStatus("Failed to resend");
    }
  };

  return (
    <>
      <form className="grid grid-cols-1 gap-5" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="number">Phone Number</Label>
          <PhoneInput
            defaultCountry="PH"
            international
            value={form.phoneNumber}
            onChange={(value) => {
              setForm((s) => ({ ...s, phoneNumber: value ?? "" }));
              clearError("phoneNumber");
            }}
            name="phoneNumber"
            className="mb-1"
          />
          {errors.phoneNumber && (
            <p className="text-sm text-destructive">{errors.phoneNumber}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={form.gender}
            onValueChange={(value) => {
              setForm((s) => ({ ...s, gender: value }));
              clearError("gender");
            }}
          >
            <SelectTrigger className="w-full hover:cursor-pointer">
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-sm text-destructive">{errors.gender}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="date">Date of Birth</Label>
          <Calendar22
            value={form.dob}
            onChange={(date: Date | undefined) => {
              setForm((s) => ({ ...s, dob: date ? date.toISOString() : "" }));
              clearError("dob");
            }}
          />
          {errors.dob && (
            <p className="text-sm text-destructive">{errors.dob}</p>
          )}
        </div>

        {!open && status && (
          <p className="text-center text-sm text-destructive">{status}</p>
        )}

        <div className="grid gap-3 rounded-2xl bg-muted/70 px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="ml-1 font-semibold text-primary hover:underline hover:cursor-pointer"
            >
              Login
            </button>
          </p>
        </div>

        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto cursor-pointer"
              onClick={clearOtpFlow}
            >
              Cancel
            </Button>
          </DialogClose>

          <Button
            type="submit"
            className="w-full sm:w-auto cursor-pointer"
            disabled={loading}
          >
            {loading ? "Sending..." : "Sign Up"}
          </Button>
        </div>
      </form>

      <VerificationForm
        open={open}
        onOpenChange={setOpen}
        code={otpCode}
        onCodeChange={setOtpCode}
        onSubmit={handleVerificationSubmit}
        onCancel={clearOtpFlow}
        onResend={handleResendOTP}
        status={status}
        loading={loading}
        retryAfterSeconds={retryAfterSeconds}
        otpExpiresInSeconds={otpExpiresInSeconds}
      />
    </>
  );
}
