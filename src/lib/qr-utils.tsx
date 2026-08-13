"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";

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

/**
 * Renders a QR code for the given text off-screen at the requested size,
 * converts it to a PNG data URL and triggers a browser download.
 *
 * The function uses react-dom/client to mount a <QRCodeCanvas /> into a
 * hidden container (via createElement so the file can stay a .ts module),
 * waits for the canvas to be painted, then extracts the data URL and
 * cleans up.
 *
 * @param text     The text/URL to encode in the QR code.
 * @param filename The file name suggested for the download (e.g. "LOT-2026-07-001-qr.png").
 * @param size     Pixel size of the QR code (square). Defaults to 512.
 */
export function downloadQRCode(
  text: string,
  filename: string,
  size = 512
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(
      createElement(
        QRCodeCanvas,
        {
          value: text,
          size,
          fgColor: "#000000",
          bgColor: "#FFFFFF",
          level: "M",
          marginSize: 1,
        }
      )
    );

    // Give React + the underlying canvas paint a tick before extracting the
    // bitmap. 80ms is enough on every browser we target.
    window.setTimeout(() => {
      const canvas = container.querySelector("canvas");
      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch {
          // Silently ignore dataURL extraction failures (e.g. tainted canvas).
        }
      }
      root.unmount();
      document.body.removeChild(container);
      resolve();
    }, 80);
  });
}
