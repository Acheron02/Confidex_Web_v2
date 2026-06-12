"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/providers/auth-context";

interface WSContextValue {
  ws: WebSocket | null;
  isReady: boolean;
}

const WSContext = createContext<WSContextValue>({
  ws: null,
  isReady: false,
});

const MIN_RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECT_DELAY_MS = 30000;

function getReconnectDelay(attempt: number) {
  const baseDelay = Math.min(
    MAX_RECONNECT_DELAY_MS,
    MIN_RECONNECT_DELAY_MS * 2 ** Math.max(0, attempt),
  );

  const jitter = Math.floor(Math.random() * 1000);
  return baseDelay + jitter;
}

function getWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export const WSProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptRef = useRef(0);
  const shouldConnectRef = useRef(false);

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const shouldConnect = Boolean(user?._id) && !loading;
    shouldConnectRef.current = shouldConnect;

    const clearReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeCurrentSocket = () => {
      clearReconnect();

      const current = socketRef.current;
      socketRef.current = null;

      setWs(null);
      setIsReady(false);

      if (
        current &&
        (current.readyState === WebSocket.OPEN ||
          current.readyState === WebSocket.CONNECTING)
      ) {
        try {
          current.close(1000, "Client no longer needs live updates");
        } catch {}
      }
    };

    if (!shouldConnect) {
      closeCurrentSocket();
      return;
    }

    let isUnmounted = false;

    const scheduleReconnect = (connect: () => void) => {
      if (
        isUnmounted ||
        !shouldConnectRef.current ||
        reconnectTimeoutRef.current
      ) {
        return;
      }

      const delay = getReconnectDelay(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;

      if (process.env.NODE_ENV !== "production") {
        console.warn(`[WS] Reconnecting in ${Math.round(delay / 1000)}s`);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (isUnmounted || !shouldConnectRef.current) return;

      const current = socketRef.current;
      if (
        current &&
        (current.readyState === WebSocket.OPEN ||
          current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const socket = new WebSocket(getWebSocketUrl());

      socketRef.current = socket;
      setWs(socket);

      socket.onopen = () => {
        if (isUnmounted || !shouldConnectRef.current) return;

        reconnectAttemptRef.current = 0;
        clearReconnect();
        setIsReady(true);

        if (process.env.NODE_ENV !== "production") {
          console.info("[WS] Connected");
        }
      };

      socket.onclose = () => {
        if (isUnmounted) return;

        setIsReady(false);

        if (socketRef.current === socket) {
          socketRef.current = null;
          setWs(null);
        }

        if (shouldConnectRef.current) {
          scheduleReconnect(connect);
        }
      };

      socket.onerror = () => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[WS] Temporary socket error");
        }
      };
    };

    const handleOnline = () => {
      if (!shouldConnectRef.current) return;

      reconnectAttemptRef.current = 0;
      clearReconnect();
      connect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldConnectRef.current) {
        const current = socketRef.current;

        if (!current || current.readyState === WebSocket.CLOSED) {
          reconnectAttemptRef.current = 0;
          clearReconnect();
          connect();
        }
      }
    };

    connect();

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isUnmounted = true;
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearReconnect();
    };
  }, [user?._id, loading]);

  const value = useMemo(() => ({ ws, isReady }), [ws, isReady]);

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export const useWS = () => useContext(WSContext);
