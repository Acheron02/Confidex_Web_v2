import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";
import { authenticateBoothSocket } from "@/lib/deviceAuth";
import {
  normalizeInventorySnapshot,
  sendInventoryStockAlertEmail,
} from "@/lib/inventory-mail";

type BoothSocket = WebSocket & {
  boothId?: string;
  deviceId?: string;
  isAlive?: boolean;
  isAuthed?: boolean;
  missedPongs?: number;
  lastPresenceWriteAt?: number;
};

type BoothWsMessage =
  | {
      type: "auth";
      apiKey?: string;
      deviceId?: string;
      deviceSecret?: string;
    }
  | {
      type: "presence";
      status?: "online" | "offline";
      ts?: string;
    }
  | {
      type: "inventory_update";
      inventorySnapshot?: {
        products?: Record<string, unknown>;
        coins?: Record<string, unknown>;
      };
    }
  | {
      type: "pong";
    };

declare global {
  // eslint-disable-next-line no-var
  var __confidex_wss__: WebSocketServer | undefined;
  // eslint-disable-next-line no-var
  var __confidex_booth_connections__: Map<string, BoothSocket> | undefined;
  // eslint-disable-next-line no-var
  var __confidex_ws_ping_interval__: NodeJS.Timeout | undefined;
}

const PRESENCE_WRITE_INTERVAL_MS = 60 * 1000;
const WS_PING_INTERVAL_MS = 60 * 1000;
const MAX_MISSED_PONGS = 3;

function logInfo(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
}

function getConnections() {
  if (!global.__confidex_booth_connections__) {
    global.__confidex_booth_connections__ = new Map<string, BoothSocket>();
  }

  return global.__confidex_booth_connections__;
}

function safeJsonParse(raw: string): BoothWsMessage | null {
  try {
    return JSON.parse(raw) as BoothWsMessage;
  } catch {
    return null;
  }
}

function send(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState !== WebSocket.OPEN) return false;

  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

async function updateBoothPresence(
  boothId: string,
  options: { isOnline: boolean; force?: boolean },
  ws?: BoothSocket,
) {
  const nowMs = Date.now();
  const lastWriteAt = ws?.lastPresenceWriteAt || 0;

  const shouldWrite =
    options.force ||
    !options.isOnline ||
    nowMs - lastWriteAt >= PRESENCE_WRITE_INTERVAL_MS;

  if (!shouldWrite) return false;

  await dbConnect();

  await Booth.findByIdAndUpdate(boothId, {
    $set: {
      isOnline: options.isOnline,
      lastSeenAt: new Date(nowMs),
    },
  });

  if (ws) ws.lastPresenceWriteAt = nowMs;
  return true;
}

async function handleClose(ws: BoothSocket) {
  try {
    if (!ws.boothId) return;

    const connections = getConnections();
    const existing = connections.get(ws.boothId);

    if (existing === ws) {
      connections.delete(ws.boothId);
    }

    await dbConnect();

    await Booth.findByIdAndUpdate(ws.boothId, {
      $set: {
        lastSeenAt: new Date(),
      },
    });

    logInfo(`[WS] Booth socket closed: ${ws.deviceId || ws.boothId}`);
  } catch (error) {
    console.error("[WS] Close handling error:", error);
  }
}

export function initWebSocket(server: HttpServer) {
  if (global.__confidex_wss__) {
    logInfo("[WS] Reusing existing WebSocket server");
    return global.__confidex_wss__;
  }

  const wss = new WebSocketServer({
    server,
    path: "/ws",
    perMessageDeflate: false,
    clientTracking: true,
  });

  global.__confidex_wss__ = wss;

  console.log("[WS] WebSocket server initialized on /ws");

  wss.on("connection", (ws: BoothSocket) => {
    ws.isAlive = true;
    ws.isAuthed = false;
    ws.missedPongs = 0;

    logInfo("[WS] Client connected. Total:", wss.clients.size);

    ws.on("pong", () => {
      ws.isAlive = true;
      ws.missedPongs = 0;
    });

    ws.on("message", async (message) => {
      const msg = safeJsonParse(message.toString());

      if (!msg) {
        send(ws, { type: "error", message: "Invalid JSON payload" });
        return;
      }

      try {
        if (msg.type === "auth") {
          const booth = await authenticateBoothSocket({
            apiKey: msg.apiKey,
            deviceId: msg.deviceId,
            deviceSecret: msg.deviceSecret,
          });

          ws.boothId = String(booth._id);
          ws.deviceId = booth.deviceId;
          ws.isAuthed = true;
          ws.isAlive = true;
          ws.missedPongs = 0;
          ws.lastPresenceWriteAt = 0;

          const connections = getConnections();
          const existing = connections.get(String(booth._id));

          if (existing && existing !== ws) {
            try {
              existing.close(4000, "New booth connection established");
            } catch {}
          }

          connections.set(String(booth._id), ws);

          booth.isOnline = true;
          booth.lastSeenAt = new Date();
          await booth.save();

          ws.lastPresenceWriteAt = Date.now();

          send(ws, {
            type: "auth_ok",
            boothId: String(booth._id),
            deviceId: booth.deviceId,
            configVersion: booth.configVersion || 1,
            inventoryVersion: booth.inventoryVersion || 1,
            config: booth.config || {},
            inventorySnapshot: booth.inventorySnapshot || {
              products: {},
              coins: {},
            },
          });

          console.log(`[WS] Booth authenticated: ${booth.deviceId}`);
          return;
        }

        if (!ws.isAuthed || !ws.boothId) {
          send(ws, { type: "error", message: "Unauthenticated socket" });
          return;
        }

        if (msg.type === "presence") {
          await updateBoothPresence(
            ws.boothId,
            { isOnline: msg.status !== "offline" },
            ws,
          );
          return;
        }

        if (msg.type === "inventory_update") {
          await dbConnect();

          const booth = await Booth.findById(ws.boothId);

          if (!booth) {
            send(ws, { type: "error", message: "Booth not found" });
            return;
          }

          const previousInventory = normalizeInventorySnapshot(
            booth.inventorySnapshot || {
              products: {},
              coins: {},
            },
          );

          const nextInventory = normalizeInventorySnapshot(
            msg.inventorySnapshot || {
              products: {},
              coins: {},
            },
          );

          booth.inventorySnapshot = nextInventory;
          booth.inventoryVersion = (booth.inventoryVersion || 1) + 1;
          booth.lastSeenAt = new Date();
          booth.isOnline = true;

          await booth.save();

          try {
            const alertResult = await sendInventoryStockAlertEmail({
              booth,
              previousInventory,
              nextInventory,
              source: "Booth WebSocket inventory update",
            });

            if (alertResult?.sent) {
              console.log(
                `[INVENTORY EMAIL] Stock alert sent from WebSocket inventory update for booth=${booth.deviceId || booth._id}`,
              );
            }
          } catch (emailError) {
            console.error(
              "[INVENTORY EMAIL] Failed to send WebSocket inventory stock alert:",
              emailError,
            );
          }

          ws.lastPresenceWriteAt = Date.now();

          send(ws, {
            type: "inventory_ack",
            boothId: String(booth._id),
            inventoryVersion: booth.inventoryVersion,
          });

          return;
        }

        if (msg.type === "pong") {
          ws.isAlive = true;
          ws.missedPongs = 0;
          return;
        }

        send(ws, { type: "error", message: "Unsupported message type" });
      } catch (error: any) {
        console.error("[WS] Message handling error:", error);

        send(ws, {
          type: "error",
          message: error?.message || "Socket processing failed",
        });
      }
    });

    ws.on("close", async () => {
      logInfo("[WS] Client disconnected. Total:", wss.clients.size);
      await handleClose(ws);
    });

    ws.on("error", (error) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[WS] Socket error:", error);
      }
    });
  });

  if (global.__confidex_ws_ping_interval__) {
    clearInterval(global.__confidex_ws_ping_interval__);
  }

  global.__confidex_ws_ping_interval__ = setInterval(() => {
    const connections = getConnections();

    for (const [, ws] of connections) {
      if (ws.readyState !== WebSocket.OPEN) {
        continue;
      }

      if (!ws.isAlive) {
        ws.missedPongs = (ws.missedPongs || 0) + 1;

        if (ws.missedPongs >= MAX_MISSED_PONGS) {
          try {
            ws.terminate();
          } catch {}
        }

        continue;
      }

      ws.isAlive = false;

      try {
        ws.ping();
      } catch {
        try {
          ws.terminate();
        } catch {}
      }
    }
  }, WS_PING_INTERVAL_MS);

  wss.on("close", () => {
    if (global.__confidex_ws_ping_interval__) {
      clearInterval(global.__confidex_ws_ping_interval__);
      global.__confidex_ws_ping_interval__ = undefined;
    }
  });

  return wss;
}

export function sendToBooth(
  boothId: string,
  payload: {
    type: string;
    [key: string]: unknown;
  },
) {
  const socket = getConnections().get(boothId);

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logInfo(`[WS] sendToBooth skipped: booth ${boothId} is not connected`);
    return false;
  }

  try {
    socket.send(JSON.stringify(payload));
    logInfo(`[WS] Sent to booth ${boothId}:`, payload);
    return true;
  } catch (error) {
    console.error("[WS] Failed to send to booth:", error);
    return false;
  }
}

export function broadcast(data: unknown) {
  const wss = global.__confidex_wss__;

  if (!wss) {
    logInfo("[WS] Broadcast skipped: wss is null");
    return false;
  }

  const payload = JSON.stringify(data);
  let sent = 0;

  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    try {
      client.send(payload);
      sent++;
    } catch {}
  }

  logInfo("[WS] Broadcast sent to", sent, "client(s)");
  return sent > 0;
}

export function getWebSocketServer() {
  return global.__confidex_wss__ || null;
}
