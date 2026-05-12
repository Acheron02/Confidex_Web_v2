import { sendToBooth } from "@/server/wsServer";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendToBoothWithRetry(
  boothId: string,
  payload: { type: string; [key: string]: unknown },
  attempts = 8,
  delayMs = 400,
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const ok = sendToBooth(boothId, payload);
    if (ok) {
      return true;
    }

    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }

  return false;
}
