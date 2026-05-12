export type BoothConnectionStatus = "online" | "unstable" | "offline";

const ONLINE_GRACE_MS = 90 * 1000;
const UNSTABLE_GRACE_MS = 3 * 60 * 1000;

export function getBoothConnectionStatus(lastSeenAt?: string | Date | null) {
  if (!lastSeenAt) return "offline" as BoothConnectionStatus;

  const lastSeenMs = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(lastSeenMs)) return "offline" as BoothConnectionStatus;

  const ageMs = Date.now() - lastSeenMs;

  if (ageMs <= ONLINE_GRACE_MS) return "online" as BoothConnectionStatus;
  if (ageMs <= UNSTABLE_GRACE_MS) return "unstable" as BoothConnectionStatus;
  return "offline" as BoothConnectionStatus;
}

export function withBoothPresence<T extends { lastSeenAt?: string | Date | null }>(
  booth: T,
) {
  const connectionStatus = getBoothConnectionStatus(booth.lastSeenAt);

  return {
    ...booth,
    connectionStatus,
    isOnline: connectionStatus !== "offline",
  };
}
