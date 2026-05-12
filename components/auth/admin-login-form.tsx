"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { VerificationForm } from "@/components/auth/verification-form";
import { useAuth } from "@/components/providers/auth-context";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/custom-ui/password-input";

interface LoginProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

export function AdminLogin({ onSwitchToLogin, onClose }: LoginProps) {
  const { login } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStatus, setOtpStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpStatus(null);
    setLoading(true);
    setFieldErrors({});

    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = "Email is required";
    if (!password.trim()) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/adminLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }

      setOtpStatus("A 6-digit OTP was sent to the admin email.");
      setOpen(true);
    } catch (err) {
      console.error("Admin OTP request error:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (code: string) => {
    try {
      const res = await fetch("/api/auth/adminLogin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpStatus(data.error || "OTP verification failed");
        return;
      }

      login(data.user);
      setOpen(false);
      router.push("/pages/admin/dashboard");
    } catch (err) {
      console.error("OTP verification error:", err);
      setOtpStatus("Something went wrong during verification.");
    }
  };

  const handleResendOTP = async () => {
    try {
      const res = await fetch("/api/auth/adminLogin/resend-otp", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpStatus(data.error || "Failed to resend OTP");
        return;
      }

      setOtpStatus("OTP resent to the admin email.");
    } catch (err) {
      console.error("Resend OTP error:", err);
      setOtpStatus("Failed to resend OTP.");
    }
  };

  return (
    <>
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
        <p className="text-sm text-muted-foreground">
          Authorized administrators only
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            name="email"
            id="email"
            value={email}
            className="mb-1"
            placeholder="Enter email"
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
          />
          {fieldErrors.email && (
            <p className="px-1 text-sm text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
          />
          {fieldErrors.password && (
            <p className="px-1 text-sm text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <div className="rounded-2xl bg-muted/70 px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            I'm not an Admin.
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="ml-1 font-semibold text-primary hover:underline hover:decoration-2 hover:cursor-pointer"
            >
              Login
            </button>
          </p>
        </div>

        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            type="button"
            formNoValidate
            onClick={onClose}
            className="w-full sm:w-auto hover:cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto hover:cursor-pointer"
          >
            {loading ? "Sending OTP..." : "Continue"}
          </Button>
        </div>
      </form>

      <VerificationForm
        open={open}
        onOpenChange={setOpen}
        code={code}
        onCodeChange={setCode}
        onSubmit={handleVerificationSubmit}
        onCancel={() => setOpen(false)}
        onResend={handleResendOTP}
        status={otpStatus}
      />
    </>
  );
}
