"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { AdminRole, AppRole } from "@/lib/rbac";
import { isAdminRole } from "@/lib/rbac";

interface User {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  dob?: string;
  role?: AppRole;
}

interface Admin extends User {
  role: AdminRole;
}

interface AuthContextType {
  user: User | Admin | null;
  loading: boolean;
  login: (user: User | Admin) => void;
  logout: () => Promise<void>;
  refreshUser: (options?: { force?: boolean }) => Promise<void>;
}

type CachedAuthSession = {
  user: User | Admin;
  savedAt: number;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = "confidex.auth.user.v2";
const AUTH_CACHE_TTL_MS = 10 * 60 * 1000;
const BACKGROUND_REVALIDATE_DELAY_MS = 5000;

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/pages/users/") ||
    pathname.startsWith("/pages/admin/dashboard") ||
    pathname.startsWith("/pages/admin/register")
  );
}

function isAdminProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/pages/admin/dashboard") ||
    pathname.startsWith("/pages/admin/register")
  );
}

function isUserProtectedPath(pathname: string) {
  return pathname.startsWith("/pages/users/");
}

function isAdminLoginPath(pathname: string) {
  return pathname === "/pages/admin";
}

function shouldCheckSessionOnLoad(pathname: string) {
  return isProtectedPath(pathname);
}

function getLoginRedirectPath(pathname: string, role?: AppRole) {
  if (isAdminProtectedPath(pathname) || (role && isAdminRole(role))) {
    return "/pages/admin";
  }

  if (isUserProtectedPath(pathname)) {
    return "/";
  }

  return null;
}

function readCachedAuthUser(): User | Admin | null {
  if (typeof window === "undefined") return null;

  try {
    const raw =
      sessionStorage.getItem(AUTH_CACHE_KEY) ||
      localStorage.getItem(AUTH_CACHE_KEY) ||
      sessionStorage.getItem("confidex.auth.user.v1");

    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedAuthSession;

    if (!cached?.user?._id || typeof cached.savedAt !== "number") {
      clearCachedAuthUser();
      return null;
    }

    if (Date.now() - cached.savedAt > AUTH_CACHE_TTL_MS) {
      clearCachedAuthUser();
      return null;
    }

    return cached.user;
  } catch {
    return null;
  }
}

function writeCachedAuthUser(user: User | Admin) {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify({
      user,
      savedAt: Date.now(),
    } satisfies CachedAuthSession);

    sessionStorage.setItem(AUTH_CACHE_KEY, serialized);
    localStorage.setItem(AUTH_CACHE_KEY, serialized);
  } catch {}
}

function clearCachedAuthUser() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY);
    localStorage.removeItem(AUTH_CACHE_KEY);
    sessionStorage.removeItem("confidex.auth.user.v1");
  } catch {}
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname() || "/";

  const [user, setUser] = useState<User | Admin | null>(null);
  const [loading, setLoading] = useState(() =>
    shouldCheckSessionOnLoad(pathname),
  );

  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const backgroundRefreshTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const clearLocalSession = useCallback(() => {
    setUser(null);
    clearCachedAuthUser();
  }, []);

  const redirectIfNeeded = useCallback(
    (role?: AppRole) => {
      const redirectPath = getLoginRedirectPath(pathname, role);

      if (redirectPath && window.location.pathname !== redirectPath) {
        window.location.replace(redirectPath);
      }
    },
    [pathname],
  );

  const refreshUser = useCallback(
    async (options: { force?: boolean } = {}) => {
      const cachedUser = readCachedAuthUser();

      if (!options.force && cachedUser?._id) {
        setUser(cachedUser);
        setLoading(false);
        return;
      }

      if (refreshInFlightRef.current) {
        await refreshInFlightRef.current;
        return;
      }

      const refreshPromise = (async () => {
        try {
          const res = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });

          if (res.status === 401) {
            clearLocalSession();
            redirectIfNeeded(user?.role);
            return;
          }

          if (!res.ok) {
            const fallbackUser = readCachedAuthUser();

            if (fallbackUser?._id) {
              setUser(fallbackUser);
              return;
            }

            clearLocalSession();
            redirectIfNeeded(user?.role);
            return;
          }

          const data = await res.json();

          if (data?.user?._id) {
            setUser(data.user);
            writeCachedAuthUser(data.user);
            return;
          }

          clearLocalSession();
          redirectIfNeeded(user?.role);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Session restore delayed by network error:", error);
          }

          const fallbackUser = readCachedAuthUser();

          if (fallbackUser?._id) {
            setUser(fallbackUser);
            return;
          }

          if (isProtectedPath(pathname)) {
            clearLocalSession();
            redirectIfNeeded(user?.role);
          }
        } finally {
          refreshInFlightRef.current = null;
          setLoading(false);
        }
      })();

      refreshInFlightRef.current = refreshPromise;
      await refreshPromise;
    },
    [clearLocalSession, pathname, redirectIfNeeded, user?.role],
  );

  useEffect(() => {
    if (backgroundRefreshTimerRef.current) {
      clearTimeout(backgroundRefreshTimerRef.current);
      backgroundRefreshTimerRef.current = null;
    }

    const cachedUser = readCachedAuthUser();

    if (cachedUser?._id) {
      setUser(cachedUser);
      setLoading(false);

      backgroundRefreshTimerRef.current = setTimeout(() => {
        if (navigator.onLine) {
          void refreshUser({ force: true });
        }
      }, BACKGROUND_REVALIDATE_DELAY_MS);

      return;
    }

    if (shouldCheckSessionOnLoad(pathname)) {
      setLoading(true);
      void refreshUser({ force: true });
      return;
    }

    setLoading(false);
  }, [pathname, refreshUser]);

  useEffect(() => {
    return () => {
      if (backgroundRefreshTimerRef.current) {
        clearTimeout(backgroundRefreshTimerRef.current);
        backgroundRefreshTimerRef.current = null;
      }
    };
  }, []);

  const login = useCallback((userData: User | Admin) => {
    setUser(userData);
    writeCachedAuthUser(userData);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearLocalSession();

      if (isAdminProtectedPath(window.location.pathname)) {
        window.location.replace("/pages/admin");
      } else {
        window.location.replace("/");
      }
    }
  }, [clearLocalSession]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
};
