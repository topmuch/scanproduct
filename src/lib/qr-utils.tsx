"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";

/**
 * Base URL used to build the scan URL embedded inside QR codes.
 * Falls back to the production VerifScan URL when the env var is not set.
 */
export const SCAN_BASE_URL =
  process.env.NEXT_PUBLIC_SCAN_URL || "https://verifscan.sn/scan";

/** Builds the scannable URL for a given QR code identifier. */
export function getScanUrl(code: string): string {
  return `${SCAN_BASE_URL}/${code}`;
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
