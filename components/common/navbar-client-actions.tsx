"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ModeToggle } from "@/components/common/mode-toggle";
import { Skeleton } from "@/components/common/skeleton";
import { useAuth } from "@/components/providers/auth-context";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/rbac";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

declare global {
  interface Window {
    __confidexHomeReady?: boolean;
  }
}

let authDialogPromise: Promise<{
  default: ComponentType<AuthDialogProps>;
}> | null = null;

function loadAuthDialog() {
  if (!authDialogPromise) {
    authDialogPromise = import("@/components/common/auth-dialog").then(
      (mod) => ({
        default: mod.AuthDialog,
      }),
    );
  }

  return authDialogPromise;
}

const LazyAuthDialog = lazy(loadAuthDialog);

function shouldAutoOpenLogin(pathname: string) {
  if (pathname.startsWith("/pages/admin")) return false;
  if (pathname.startsWith("/pages/users/")) return false;

  return true;
}

function DialogLoadingOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex min-h-[100dvh] items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Loading login form"
        className="w-full max-w-sm overflow-hidden rounded-[28px] border-2 border-border bg-card text-card-foreground shadow-2xl"
      >
        <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="size-7 animate-spin" />
          </div>

          <p className="text-lg font-black text-foreground">
            Loading sign in...
          </p>

          <div className="w-full space-y-3 pt-2">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />

            <div className="flex justify-center">
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavbarActionLoading() {
  return (
    <div
      aria-label="Loading account controls"
      className="flex items-center gap-2 md:gap-3"
    >
      <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/25 bg-white/10 shadow-inner">
        <div className="size-4 rounded-full bg-white/30 animate-pulse" />
      </div>

      <div className="hidden h-10 w-24 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-white/10 px-4 shadow-inner md:flex">
        <div className="h-3 w-14 rounded-full bg-white/30 animate-pulse" />
      </div>

      <div className="flex h-9 w-20 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-white/10 px-3 shadow-inner md:hidden">
        <div className="h-3 w-12 rounded-full bg-white/30 animate-pulse" />
      </div>
    </div>
  );
}

export default function NavbarClientActions() {
  const [mounted, setMounted] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authDialogRequested, setAuthDialogRequested] = useState(false);
  const [authDialogReady, setAuthDialogReady] = useState(false);
  const [loginSkeletonVisible, setLoginSkeletonVisible] = useState(false);
  const [loginDismissed, setLoginDismissed] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  const authLoadIdRef = useRef(0);

  const { user, logout } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    authLoadIdRef.current += 1;

    setAuthOpen(false);
    setLoginSkeletonVisible(false);
    setAutoStarted(false);
  }, [pathname, user?._id]);

  const requestAuthDialog = useCallback(
    (source: "auto" | "manual" = "manual") => {
      setAuthDialogRequested(true);

      try {
        localStorage.setItem(
          "auth_dialog_state",
          JSON.stringify({
            open: true,
            mode: "login",
          }),
        );
      } catch {
        // Ignore localStorage errors.
      }

      if (authDialogReady) {
        setLoginSkeletonVisible(false);
        setAuthOpen(true);
        return;
      }

      setLoginSkeletonVisible(true);

      const currentLoadId = authLoadIdRef.current + 1;
      authLoadIdRef.current = currentLoadId;

      void loadAuthDialog()
        .then(() => {
          if (authLoadIdRef.current !== currentLoadId) return;

          setAuthDialogReady(true);
          setLoginSkeletonVisible(false);
          setAuthOpen(true);
        })
        .catch(() => {
          if (authLoadIdRef.current !== currentLoadId) return;

          setLoginSkeletonVisible(false);

          if (source === "manual") {
            setAuthOpen(true);
          }
        });
    },
    [authDialogReady],
  );

  useEffect(() => {
    if (!mounted) return;

    void loadAuthDialog().then(() => {
      setAuthDialogReady(true);
    });
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!shouldAutoOpenLogin(pathname)) return;
    if (user) return;
    if (loginDismissed) return;
    if (autoStarted || authOpen || authDialogRequested) return;

    const startAutoLogin = () => {
      setAutoStarted(true);
      requestAuthDialog("auto");
    };

    if (pathname === "/") {
      if (window.__confidexHomeReady) {
        startAutoLogin();
        return;
      }

      window.addEventListener("confidex:home-ready", startAutoLogin, {
        once: true,
      });

      return () => {
        window.removeEventListener("confidex:home-ready", startAutoLogin);
      };
    }

    startAutoLogin();
  }, [
    authDialogRequested,
    authOpen,
    autoStarted,
    loginDismissed,
    mounted,
    pathname,
    requestAuthDialog,
    user,
  ]);

  useEffect(() => {
    if (!user) return;

    setAuthOpen(false);
    setLoginSkeletonVisible(false);
  }, [user]);

  const handleAuthOpenChange = (nextOpen: boolean) => {
    setAuthOpen(nextOpen);

    if (!nextOpen) {
      setLoginSkeletonVisible(false);

      if (!user) {
        setLoginDismissed(true);
      }

      try {
        localStorage.removeItem("auth_dialog_state");
      } catch {
        // Ignore localStorage errors.
      }
    }
  };

  const actionContent = useMemo(() => {
    if (!mounted) {
      return <NavbarActionLoading />;
    }

    if (!user) {
      return (
        <>
          <ModeToggle />

          <Button
            size="sm"
            onClick={() => requestAuthDialog("manual")}
            className="cursor-pointer px-4 font-bold md:h-10 md:px-5"
          >
            Sign In
          </Button>
        </>
      );
    }

    if (isAdminRole(user.role)) {
      return (
        <>
          <ModeToggle />

          <Button
            size="sm"
            onClick={() => router.push("/pages/admin/dashboard")}
            className="cursor-pointer px-4 font-bold md:h-10 md:px-5"
          >
            Admin
          </Button>
        </>
      );
    }

    if (user._id) {
      if (pathname === `/pages/users/${user._id}`) {
        return (
          <>
            <ModeToggle />

            <Button
              size="sm"
              variant="destructive"
              onClick={logout}
              className="cursor-pointer px-4 font-bold md:h-10 md:px-5"
            >
              Logout
            </Button>
          </>
        );
      }

      return (
        <>
          <ModeToggle />

          <Button
            asChild
            size="sm"
            className="cursor-pointer px-4 font-bold md:h-10 md:px-5"
          >
            <Link href={`/pages/users/${user._id}`} prefetch={false}>
              Profile
            </Link>
          </Button>
        </>
      );
    }

    return (
      <>
        <ModeToggle />

        <span className="flex items-center gap-2 px-2 py-2 text-sm text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden md:inline">Loading...</span>
        </span>
      </>
    );
  }, [logout, mounted, pathname, requestAuthDialog, router, user]);

  return (
    <>
      <div className="flex items-center gap-2 md:gap-3">{actionContent}</div>

      {loginSkeletonVisible ? <DialogLoadingOverlay /> : null}

      {authDialogRequested || authOpen ? (
        <Suspense fallback={null}>
          <LazyAuthDialog open={authOpen} onOpenChange={handleAuthOpenChange} />
        </Suspense>
      ) : null}
    </>
  );
}
