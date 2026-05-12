"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface WSContextValue {
  ws: WebSocket | null;
  isReady: boolean;
}

const WSContext = createContext<WSContextValue>({
  ws: null,
  isReady: false,
});

const MIN_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

function getReconnectDelay(attempt: number) {
  const baseDelay = Math.min(
    MAX_RECONNECT_DELAY_MS,
    MIN_RECONNECT_DELAY_MS * 2 ** Math.max(0, attempt),
  );

  const jitter = Math.floor(Math.random() * 750);
  return baseDelay + jitter;
}

export const WSProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isUnmounted = false;

    const clearReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const scheduleReconnect = (connect: () => void) => {
      if (isUnmounted || reconnectTimeoutRef.current) return;

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
      if (isUnmounted) return;

      const current = socketRef.current;
      if (
        current &&
        (current.readyState === WebSocket.OPEN ||
          current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socketRef.current = socket;
      setWs(socket);

      socket.onopen = () => {
        if (isUnmounted) return;

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
        socketRef.current = null;
        setWs(null);
        scheduleReconnect(connect);
      };

      socket.onerror = () => {
        // Let onclose handle the reconnect. Keeping this quiet prevents noisy logs
        // during weak 4G/5G modem drops.
        if (process.env.NODE_ENV !== "production") {
          console.warn("[WS] Temporary socket error");
        }
      };
    };

    const handleOnline = () => {
      reconnectAttemptRef.current = 0;
      clearReconnect();
      connect();
    };

    connect();
    window.addEventListener("online", handleOnline);

    return () => {
      isUnmounted = true;
      window.removeEventListener("online", handleOnline);
      clearReconnect();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const value = useMemo(() => ({ ws, isReady }), [ws, isReady]);

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
};

export const useWS = () => useContext(WSContext);
