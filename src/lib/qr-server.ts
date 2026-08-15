import QR from "qrcode";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { UPLOAD_DIR, buildUploadUrl } from "@/lib/upload-config";
import { getScanUrl } from "@/lib/qr-url";

/**
 * VerifScan — Server-side QR code rendering utilities.
 *
 * ── Why this exists ──────────────────────────────────────────────
 * The existing `qrcode.react` library only works in the browser
 * (it renders a <canvas> via React). For V2 features like bulk
 * generation, PDF label sheets, and ZIP downloads, we need to render
 * QR codes on the SERVER and persist the resulting PNG to disk.
 *
 * This module uses:
 *   - `qrcode` (Node lib) → generates the raw QR matrix as a PNG buffer
 *   - `sharp`             → composites a logo on top + adds text labels
 *
 * ── Output ───────────────────────────────────────────────────────
 * Each rendered QR is saved to UPLOAD_DIR as a PNG file and the
 * public URL is returned (e.g. "/api/uploads/<uuid>.png"). The URL
 * is stored in `QRCode.imageUrl` so it can be served later without
 * re-rendering.
 */

export interface QRRenderOptions {
  /** QR pixel size (width = height). Default 512. */
  size?: number;
  /** Foreground color (QR modules). Default "#000000". */
  color?: string;
  /** Background color. Default "#FFFFFF". */
  background?: string;
  /** Error correction level. "H" recommended when using a logo. */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  /** Optional logo URL (absolute path on disk or http URL). When set,
   *  the logo is composited at the center (~22% of QR size). */
  logoPath?: string | null;
  /** Lot number to render as text below the QR. */
  lotNumber?: string | null;
  /** Product name to render as text below the QR. */
  productName?: string | null;
  /** Include a quiet-zone (white margin) around the QR. Default 4 modules. */
  margin?: number;
}

export interface QRRenderResult {
  /** Absolute filesystem path where the PNG was saved. */
  filePath: string;
  /** Public URL for serving the file (e.g. "/api/uploads/abc.png"). */
  publicUrl: string;
  /** PNG buffer (useful for PDF / ZIP generation without re-reading disk). */
  buffer: Buffer;
  /** Width = height in pixels of the final composed image. */
  width: number;
}

/**
 * Validate a hex color string (#RGB or #RRGGBB). Returns #000000 fallback.
 */
function safeHex(color: string | undefined | null): string {
  if (!color) return "#000000";
  const c = color.trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c)) return c;
  return "#000000";
}

/**
 * Convert hex color (#RRGGBB) to RGBA string for sharp.
 */
function hexToRgba(hex: string, alpha = 1): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Render a QR code to a PNG buffer with optional logo + text labels.
 *
 * Pipeline:
 *   1. `qrcode.toBuffer()` → raw QR PNG (matrix only)
 *   2. If logo: `sharp` composites the logo centered (22% of QR size)
 *      on a white rounded-rectangle background for readability
 *   3. If lotNumber/productName: extend the canvas downward and
 *      render the text in black below the QR
 *
 * @param text   The data to encode (usually the scan URL).
 * @param options Rendering options.
 * @returns PNG buffer + metadata.
 */
export async function renderQRBuffer(
  text: string,
  options: QRRenderOptions = {}
): Promise<QRRenderResult> {
  const size = Math.max(128, Math.min(2048, options.size || 512));
  const fgColor = safeHex(options.color);
  const bgColor = safeHex(options.background) === "#000000" ? "#FFFFFF" : safeHex(options.background);
  const ecc = options.errorCorrectionLevel || (options.logoPath ? "H" : "M");
  const margin = options.margin ?? 2;

  // 1. Generate raw QR PNG via the `qrcode` Node library.
  const qrPngBuffer = await QR.toBuffer(text, {
    type: "png",
    errorCorrectionLevel: ecc,
    margin,
    width: size,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });

  // 2. Composite logo if provided.
  let composed = sharp(qrPngBuffer);
  if (options.logoPath && existsSync(options.logoPath)) {
    const logoSize = Math.round(size * 0.22);
    const padding = Math.round(logoSize * 0.12);
    const boxSize = logoSize + padding * 2;

    // Create a white rounded background for the logo for contrast.
    const bgSvg = Buffer.from(
      `<svg width="${boxSize}" height="${boxSize}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${boxSize}" height="${boxSize}" rx="${Math.round(
        boxSize * 0.18
      )}" ry="${Math.round(boxSize * 0.18)}" fill="white"/>
      </svg>`
    );

    // Resize logo to fit inside the white box.
    const logoResized = await sharp(options.logoPath)
      .resize(logoSize, logoSize, { fit: "inside" })
      .png()
      .toBuffer();

    // Composite: white bg first, then logo on top.
    const logoComposite = await sharp(bgSvg)
      .composite([
        {
          input: logoResized,
          top: padding,
          left: padding,
        },
      ])
      .png()
      .toBuffer();

    // Center the logo box on the QR.
    const logoX = Math.round((size - boxSize) / 2);
    const logoY = Math.round((size - boxSize) / 2);
    composed = composed.composite([
      { input: logoComposite, top: logoY, left: logoX },
    ]);
  }

  // 3. Add text labels (lot number + product name) below the QR.
  const labels = [options.productName, options.lotNumber].filter(
    (l): l is string => !!l && l.trim().length > 0
  );

  if (labels.length > 0) {
    // Resize the QR composition to its final size first.
    const qrFinal = await composed.resize(size, size).png().toBuffer();

    // Build an SVG text block below the QR.
    const textHeight = labels.length * 38 + 20;
    const svgWidth = size;
    const svgHeight = textHeight;
    const fontSize = 26;
    const lines = labels
      .map((label, i) => {
        // Truncate long labels to fit within the QR width.
        const maxChars = Math.floor((size - 20) / (fontSize * 0.55));
        const truncated =
          label.length > maxChars ? label.slice(0, maxChars - 1) + "…" : label;
        const y = 28 + i * 36;
        return `<text x="${svgWidth / 2}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#111827" text-anchor="middle">${truncated
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</text>`;
      })
      .join("\n");

    const textSvg = Buffer.from(
      `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${bgColor}"/>
        ${lines}
      </svg>`
    );

    // Extend the canvas: QR on top, text block below.
    composed = sharp({
      create: {
        width: svgWidth,
        height: size + svgHeight,
        channels: 4,
        background: bgColor,
      },
    }).composite([
      { input: qrFinal, top: 0, left: 0 },
      { input: textSvg, top: size, left: 0 },
    ]);

    const finalBuffer = await composed.png().toBuffer();
    return {
      filePath: "",
      publicUrl: "",
      buffer: finalBuffer,
      width: svgWidth,
    };
  }

  const finalBuffer = await composed.resize(size, size).png().toBuffer();
  return {
    filePath: "",
    publicUrl: "",
    buffer: finalBuffer,
    width: size,
  };
}

/**
 * Render a QR code for a lot, save it to UPLOAD_DIR, and return the
 * public URL. Used by the bulk-generate API to persist each QR PNG.
 *
 * @param lotId        The lot ID (encoded in the QR URL).
 * @param uniqueCode   The unique tracking code (appended as ?code=).
 * @param options      Rendering options (color, logo, labels…).
 * @returns            The saved file path + public URL + buffer.
 */
export async function renderAndSaveQR(
  lotId: string,
  uniqueCode: string,
  options: QRRenderOptions = {}
): Promise<QRRenderResult> {
  const scanUrl = `${getScanUrl(lotId)}?code=${uniqueCode}`;
  const rendered = await renderQRBuffer(scanUrl, options);

  // Ensure upload dir exists.
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `qr-${randomUUID()}.png`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, rendered.buffer);

  return {
    filePath,
    publicUrl: buildUploadUrl(filename),
    buffer: rendered.buffer,
    width: rendered.width,
  };
}

/**
 * Resolve a fabricant's logo to an absolute filesystem path (if it's
 * stored locally under /api/uploads/...). Returns null for external
 * URLs or missing logos.
 */
export function resolveLogoPath(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  // Logo stored via our upload system: "/api/uploads/..."
  if (logoUrl.startsWith("/api/uploads/")) {
    const relative = logoUrl.replace("/api/uploads/", "").replace(/^\/+/, "");
    const abs = path.join(UPLOAD_DIR, relative);
    // UPLOAD_DIR is the products subdir; logos may be in a sibling subdir.
    // Try the resolved path first, then the uploads parent.
    if (existsSync(abs)) return abs;
    const parentAbs = path.join(path.dirname(UPLOAD_DIR), relative);
    if (existsSync(parentAbs)) return parentAbs;
    return null;
  }
  // Absolute filesystem path already.
  if (logoUrl.startsWith("/") && existsSync(logoUrl)) return logoUrl;
  return null;
}
