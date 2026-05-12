# Confidex Website Optimization Notes

These changes keep the existing behavior but reduce unnecessary network/database work and improve resilience on weak 4G/5G modem connections.

## Main changes

- Removed the duplicate root `AuthProvider` wrapping so `/api/auth/me` is not restored twice.
- Added short client-side auth caching in `components/providers/auth-context.tsx`.
- Added short user dashboard cache in `hooks/use-dashboard-data.ts` so the dashboard can show recent data immediately while refreshing in the background.
- Changed QR status behavior to WebSocket-first. The HTTP status fallback only runs when the browser WebSocket is not ready, and it checks every 1.5 seconds instead of 300 ms.
- Improved browser WebSocket reconnection with exponential backoff and jitter.
- Reduced noisy WebSocket logs in production.
- Added booth/device auth caching in `lib/deviceAuth.ts` to avoid repeatedly verifying the same device secret on every request.
- Throttled booth heartbeat database writes to reduce MongoDB writes during weak/unstable connectivity.
- Changed booth presence handling so a short WebSocket disconnect does not immediately mark the booth offline.
- Added derived booth `connectionStatus`: `online`, `unstable`, or `offline` based on `lastSeenAt`.
- Removed `next/font/google` Poppins usage from Navbar/Sidebar so `npm run build` will not fail because Google Fonts cannot be fetched.
- Removed eager navbar route prefetching to reduce bandwidth use on poor connections.
- Changed `npm run start` to force production mode using `server/start.ts`.

## Recommended test order

1. Run `npm install` if needed.
2. Run `npm run dev`.
3. Test public pages, user login, admin login, dashboard, QR generation, QR scan, booth WebSocket connection, inventory update, result notification, and payment flow.
4. Then run `npm run build`.
5. Then run `npm run start`.

## Notes

- Payment core logic was not changed.
- Arduino/hardware behavior was not changed.
- Raspberry Pi code was not changed in this package.
