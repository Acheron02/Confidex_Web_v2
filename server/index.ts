import dotenv from "dotenv";
import path from "path";
import { createServer } from "http";
import next from "next";

const envPath = path.resolve(process.cwd(), ".env.local");

const envResult = dotenv.config({ path: envPath });

console.log("[ENV] Loading .env.local from:", envPath);

if (envResult.error) {
  console.warn("[ENV] Failed to load .env.local:", envResult.error);
} else {
  console.log("[ENV] .env.local loaded");
}

console.log("[ENV] Gmail config visible:", {
  GMAIL_USER: Boolean(process.env.GMAIL_USER),
  GMAIL_APP_PASSWORD: Boolean(process.env.GMAIL_APP_PASSWORD),
  COMPANY_EMAIL: Boolean(process.env.COMPANY_EMAIL),
  ADMIN_ALERT_EMAILS: Boolean(process.env.ADMIN_ALERT_EMAILS),
  STOCK_ALERT_EMAILS: Boolean(process.env.STOCK_ALERT_EMAILS),
});

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const { initWebSocket } = await import("./webSocket");

  const server = createServer((req, res) => {
    void handle(req, res);
  });

  initWebSocket(server);

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket endpoint: ws://localhost:${port}/ws`);
  });
});
