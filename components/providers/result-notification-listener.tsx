"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-context";
import { useWS } from "@/components/providers/ws-context";

function cleanResultText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "Analyzed";
}

function getResultKey(result: any) {
  return String(
    result?._id ||
      result?.transaction_id ||
      `${result?.user_id || "unknown"}-${result?.productID || "unknown"}-${
        result?.createdAt || result?.updatedAt || Date.now()
      }`,
  );
}

const NOTIFICATION_FETCH_CACHE_MS = 30 * 1000;

function getNotificationFetchKey(userId: string) {
  return `confidex.notifications.lastFetch.${userId}`;
}

function recentlyCheckedNotifications(userId: string) {
  try {
    const lastFetch = Number(
      sessionStorage.getItem(getNotificationFetchKey(userId)) || 0,
    );

    return Date.now() - lastFetch < NOTIFICATION_FETCH_CACHE_MS;
  } catch {
    return false;
  }
}

function markNotificationsChecked(userId: string) {
  try {
    sessionStorage.setItem(getNotificationFetchKey(userId), String(Date.now()));
  } catch {}
}

function showUserNotification(notification: any, userId: string) {
  const title = String(notification?.title || "Notification");
  const message = String(notification?.message || "");
  const href = String(notification?.href || `/pages/users/${userId}`);

  toast.success(title, {
    description: message,
    duration: 12000,
    action: {
      label: "View",
      onClick: () => {
        window.location.href = href;
      },
    },
  });
}

export default function ResultNotificationListener() {
  const { user } = useAuth();
  const { ws, isReady } = useWS();
  const seenResultKeysRef = useRef<Set<string>>(new Set());
  const seenNotificationKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?._id) return;

    let cancelled = false;

    const fetchUnreadNotifications = async () => {
      if (recentlyCheckedNotifications(user._id)) return;

      try {
        const res = await fetch("/api/notifications", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || cancelled) return;

        markNotificationsChecked(user._id);

        const notifications = Array.isArray(data?.notifications)
          ? data.notifications
          : [];

        const idsToMarkRead: string[] = [];

        for (const notification of notifications) {
          const key = String(notification?._id || "");

          if (!key || seenNotificationKeysRef.current.has(key)) continue;

          seenNotificationKeysRef.current.add(key);
          idsToMarkRead.push(key);

          showUserNotification(notification, user._id);
        }

        if (idsToMarkRead.length > 0) {
          await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ids: idsToMarkRead }),
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[NOTIFICATIONS] Failed to fetch unread:", error);
        }
      }
    };

    void fetchUnreadNotifications();

    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  useEffect(() => {
    if (!ws || !isReady || !user?._id) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.type === "new_result") {
          const result = data.result;
          if (!result) return;

          const resultUserId = String(result.user_id || result.userId || "");
          const currentUserId = String(user._id || "");

          if (resultUserId !== currentUserId) return;

          const key = getResultKey(result);

          if (seenResultKeysRef.current.has(key)) return;
          seenResultKeysRef.current.add(key);

          const resultText = cleanResultText(
            result.override_result || result.overrideResult || result.result,
          );

          toast.success("Your test result is ready", {
            description: `Result: ${resultText}`,
            duration: 10000,
            action: {
              label: "View",
              onClick: () => {
                window.location.href = `/pages/users/${user._id}`;
              },
            },
          });

          return;
        }

        if (data?.type === "coupon_request_updated") {
          const eventUserId = String(data?.userId || "");

          if (eventUserId !== String(user._id)) return;

          const notification = data?.notification;
          const key = String(notification?._id || data?.transactionId || "");

          if (key && seenNotificationKeysRef.current.has(key)) return;
          if (key) seenNotificationKeysRef.current.add(key);

          if (data?.status === "approved") {
            toast.success("Coupon request approved", {
              description: "Your discount QR is now available in your receipt.",
              duration: 12000,
              action: {
                label: "View receipt",
                onClick: () => {
                  window.location.href = `/pages/users/${user._id}`;
                },
              },
            });
            return;
          }

          if (data?.status === "rejected") {
            toast.error("Coupon request reviewed", {
              description:
                notification?.message ||
                "Your coupon request was not approved.",
              duration: 12000,
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/pages/users/${user._id}`;
                },
              },
            });
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[RESULT NOTIFICATION] WebSocket parse error:", error);
        }
      }
    };

    ws.addEventListener("message", handleMessage);

    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, isReady, user?._id]);

  return null;
}
