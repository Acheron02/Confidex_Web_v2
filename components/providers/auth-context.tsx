"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
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

const AUTH_CACHE_KEY = "confidex.auth.user.v1";
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000;

const isProtectedPath = (pathname: string) => {
  return (
    pathname.startsWith("/pages/users/") || pathname.startsWith("/pages/admin/")
  );
};

const isAdminProtectedPath = (pathname: string) => {
  return pathname.startsWith("/pages/admin/");
};

const isUserProtectedPath = (pathname: string) => {
  return pathname.startsWith("/pages/users/");
};

const getCurrentPath = () => {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
};

function readCachedAuthUser(): User | Admin | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedAuthSession;
    if (!cached?.user?._id || typeof cached.savedAt !== "number") return null;

    if (Date.now() - cached.savedAt > AUTH_CACHE_TTL_MS) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
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
    const cached: CachedAuthSession = {
      user,
      savedAt: Date.now(),
    };

    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cached));
  } catch {}
}

function clearCachedAuthUser() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch {}
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | Admin | null>(() =>
    readCachedAuthUser(),
  );

  const [loading, setLoading] = useState(() => !readCachedAuthUser());
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const clearLocalSession = () => {
    setUser(null);
    clearCachedAuthUser();
  };

  const handleExpiredSession = (role?: AppRole) => {
    const pathname = getCurrentPath();

    clearLocalSession();

    // Only redirect when the user is currently on a protected page.
    // Public pages like /pages/admin must NOT redirect on 401.
    if (!isProtectedPath(pathname)) return;

    if (isAdminProtectedPath(pathname) || (role && isAdminRole(role))) {
      window.location.replace("/pages/admin");
      return;
    }

    if (isUserProtectedPath(pathname)) {
      window.location.replace("/");
    }
  };

  const refreshUser = async (options: { force?: boolean } = {}) => {
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
          handleExpiredSession(user?.role);
          return;
        }

        if (!res.ok) {
          clearLocalSession();

          const pathname = getCurrentPath();
          if (isProtectedPath(pathname)) {
            if (isAdminProtectedPath(pathname)) {
              window.location.replace("/pages/admin");
            } else {
              window.location.replace("/");
            }
          }
          return;
        }

        const data = await res.json();

        if (data?.user?._id) {
          setUser(data.user);
          writeCachedAuthUser(data.user);
        } else {
          handleExpiredSession(user?.role);
        }
      } catch (err) {
        // A weak/unstable modem should not instantly log the user out.
        // Keep any valid cached user for UI continuity; server APIs still protect data.
        console.warn("Session restore delayed by network error:", err);

        const fallbackUser = readCachedAuthUser();
        if (fallbackUser?._id) {
          setUser(fallbackUser);
          return;
        }

        const pathname = getCurrentPath();
        if (isProtectedPath(pathname)) {
          if (isAdminProtectedPath(pathname)) {
            window.location.replace("/pages/admin");
          } else {
            window.location.replace("/");
          }
        }
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    await refreshPromise;
  };

  useEffect(() => {
    const cachedUser = readCachedAuthUser();

    if (cachedUser?._id) {
      setUser(cachedUser);
      setLoading(false);
      void refreshUser({ force: true });
      return;
    }

    refreshUser({ force: true }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (userData: User | Admin) => {
    setUser(userData);
    writeCachedAuthUser(userData);
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      clearLocalSession();

      const pathname = getCurrentPath();
      if (isAdminProtectedPath(pathname)) {
        window.location.replace("/pages/admin");
      } else {
        window.location.replace("/");
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
