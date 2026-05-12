"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Register } from "@/components/auth/register-form";
import { Login } from "@/components/auth/login-form";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "auth_dialog_state";

type AuthDialogStorage = {
  open?: boolean;
  mode?: "register" | "login";
};

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<"register" | "login">("login");
  const [hydrated, setHydrated] = useState(false);

  const restoreState = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: AuthDialogStorage = JSON.parse(raw);

      if (saved?.mode === "register" || saved?.mode === "login") {
        setMode(saved.mode);
      }

      // IMPORTANT:
      // only restore OPEN state, never force-close from stale localStorage
      if (saved?.open === true && !open) {
        onOpenChange(true);
      }
    } catch {}
  }, [onOpenChange, open]);

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
          open,
          mode,
        }),
      );
    } catch {}
  }, [open, mode, hydrated]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      try {
        localStorage.removeItem("auth_dialog_state");
        localStorage.removeItem("login_otp_flow");
        localStorage.removeItem("register_otp_flow");
      } catch {}
    }
  };

  const switchToLogin = () => setMode("login");
  const switchToRegister = () => setMode("register");

  const title =
    mode === "register" ? "Create an Account" : "Login to your Account";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto p-5 sm:max-w-[440px] sm:p-6"
        showCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="gap-2">
          <DialogTitle className="text-center text-[1.35rem] md:text-[1.6rem]">
            {title}
          </DialogTitle>

          <DialogClose className="hidden" />

          <DialogDescription className="mx-auto max-w-sm text-center text-sm text-muted-foreground">
            {mode === "register"
              ? "Join us today. It’s quick and easy."
              : "Welcome back. Please enter your phone number."}
          </DialogDescription>
        </DialogHeader>

        {mode === "register" && (
          <Register
            onSwitchToLogin={switchToLogin}
            onClose={() => handleOpenChange(false)}
          />
        )}

        {mode === "login" && (
          <Login
            onSwitchToRegister={switchToRegister}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
