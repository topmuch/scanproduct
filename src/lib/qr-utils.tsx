"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";

// Re-export the server-safe URL helpers so existing imports from
// `@/lib/qr-utils` keep working. New code should import from `@/lib/qr-url`
// directly, especially server components.
export { getScanOrigin, getScanUrl } from "./qr-url";

/**
 * Télécharge un QR code avec le design officiel « LABEL VERIFSCAN »
 * (cercle jaune, QR noir au centre) via l'API serveur /api/qr-codes/render-badge.
 *
 * @param url      L'URL scannable à encoder (même URL que la génération).
 * @param filename Nom du fichier proposé au téléchargement.
 * @param size     Taille du PNG (défaut 1200 px = 1016 DPI à 3 cm).
 */
export async function downloadBadgeQR(
  url: string,
  filename: string,
  size = 1200
): Promise<void> {
  const res = await fetch("/api/qr-codes/render-badge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, size }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Échec du rendu du badge");
  }
  saveBlobAsFile(await res.blob(), filename);
}

/**
 * Enregistre un blob côté navigateur (déclenche le téléchargement).
 */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const objUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Laisse le temps au navigateur de démarrer le téléchargement avant
  // de libérer l'URL objet.
  window.setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
}

/**
 * Télécharge le PNG d'un QR : image persistée (bulk-generate) si elle
 * existe, sinon rendu à la demande avec le design « LABEL VERIFSCAN ».
 *
 * @param qr       { imageUrl?, code } — l'QR tel qu'exposé par le dashboard.
 * @param scanUrl  L'URL scannable construite côté client (urlQrDe).
 */
export async function downloadQrPng(
  qr: { imageUrl?: string | null; code: string },
  scanUrl: string
): Promise<void> {
  // 1. PNG persisté (rendu exact au moment de la génération).
  if (qr.imageUrl) {
    try {
      const res = await fetch(qr.imageUrl);
      if (res.ok) {
        saveBlobAsFile(await res.blob(), `qr-${qr.code}.png`);
        return;
      }
    } catch {
      // réseau/404 → repli sur le rendu à la demande.
    }
  }
  // 2. Rendu à la demande (design officiel).
  await downloadBadgeQR(scanUrl, `qr-${qr.code}.png`);
}

/**
 * Renders a QR code for the given text off-screen at the requested size,
 * converts it to a PNG data URL and triggers a browser download (QR brut
 * sans design — conservé pour compatibilité).
 *
 * @param text     The text/URL to encode in the QR code.
 * @param filename The file name suggested for the download.
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
