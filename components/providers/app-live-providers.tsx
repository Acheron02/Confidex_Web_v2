"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { WSProvider } from "@/components/providers/ws-context";
import ResultNotificationListener from "@/components/providers/result-notification-listener";

function shouldEnableLiveUpdates(pathname: string) {
  return (
    pathname.startsWith("/pages/users/") ||
    pathname.startsWith("/pages/admin/dashboard") ||
    pathname.startsWith("/pages/admin/register") ||
    pathname.startsWith("/pages/admin/booths") ||
    pathname.startsWith("/pages/admin/results")
  );
}

export default function AppLiveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const liveUpdatesEnabled = useMemo(() => {
    return shouldEnableLiveUpdates(pathname || "/");
  }, [pathname]);

  if (!liveUpdatesEnabled) {
    return <>{children}</>;
  }

  return (
    <WSProvider>
      <ResultNotificationListener />
      {children}
    </WSProvider>
  );
}
