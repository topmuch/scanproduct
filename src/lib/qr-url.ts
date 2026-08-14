/**
 * VerifScan — QR code URL helpers (server-safe).
 *
 * These functions are pure JS and can be imported from BOTH server and
 * client components. They MUST NOT use `window` directly without a
 * `typeof window !== "undefined"` guard, and they MUST NOT import
 * `react-dom/client` or any client-only library.
 *
 * The actual QR-code rendering / download helper lives in `qr-utils.tsx`
 * (which is marked `"use client"`) because it needs `react-dom/client`
 * and `qrcode.react`'s `QRCodeCanvas`.
 */

/**
 * Resolves the absolute origin that QR codes should point to.
 *
 * QR codes MUST encode an absolute URL (https://...) so that, once printed
 * and scanned by a phone, the camera opens the actual product passport page.
 *
 * - On the client we use `window.location.origin` so the URL always matches
 *   the deployment the user is currently browsing (sandbox preview, prod…).
 * - On the server (SSR / API routes) we fall back to the
 *   `NEXT_PUBLIC_SCAN_URL` env var, or a sensible default.
 */
export function getScanOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SCAN_URL || "https://verifscan.sn";
}

/**
 * Builds the absolute, scannable URL for a given lot.
 *
 * The public product passport lives at `/p/[lotId]` (see
 * `src/app/p/[lotId]/page.tsx`), so the URL is `${origin}/p/${lotId}`.
 *
 * @param lotId The lot identifier (database cuid for real lots).
 */
export function getScanUrl(lotId: string): string {
  const base = getScanOrigin().replace(/\/$/, "");
  return `${base}/p/${lotId}`;
}
