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

import { construireUrlQrPourLot, ErreurGs1 } from "./gs1";

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

// ---------------------------------------------------------------------------
// Choix automatique du standard GS1 / standard (côté client)
// ---------------------------------------------------------------------------

/**
 * Paramètres du helper client — calqués sur les données du dashboard
 * (`useFabricantData` : Product.barcode, Lot.numero, QRCode.code).
 */
export interface ParamsUrlQrClient {
  /** Code-barbes produit (GTIN attendu) — absent/null → format STANDARD. */
  barcode?: string | null;
  /** Numéro de lot imprimé (Lot.numero = lotNumber ?? référence) — AI 10. */
  numeroLot: string;
  /** Identifiant interne du lot (URL standard /p/<lotId>). */
  lotId: string;
  /**
   * Code d'impression du QR (QRCode.code) :
   *   - ≤ 20 caractères + GTIN valide → série AI 21 d'une URI GS1 unitaire
   *     (les QR générés par /generate et /bulk-generate stockent la série) ;
   *   - plus long → code analytics de l'URL standard ?code=…
   *     (les codes historiques font toujours > 20 caractères :
   *      `<lot>-<timestamp>-<i>-<random>`) ;
   *   - absent → QR « générique » de lot (GS1 sans AI 21, ou /p/<lotId> nu).
   */
  code?: string | null;
}

/**
 * Construit l'URL à afficher/télécharger dans le dashboard pour un QR,
 * avec le MÊME choix automatique GS1/standard que les routes de génération
 * serveur (`/api/qr-codes/generate`, `/bulk-generate`, `/labels-pdf`).
 *
 * Pourquoi reconstruire plutôt que stocker : l'URI GS1 est 100 %
 * dérivable de { GTIN, lot, série } — données déjà présentes côté client
 * (barcode produit + numéro de lot + QRCode.code). Un QR GS1 téléchargé
 * depuis le dashboard encode donc exactement la même URI que le QR
 * généré/imprimé, et le resolver rattache les scans à la même ligne
 * QRCode (attribution analytics par unité).
 *
 * - Origine : `getScanOrigin()` (origine du navigateur → QR scannables en
 *   dev comme en prod, cf. TestQrPanel).
 * - Sécurité : la validation GS1 (CSET 82, longueurs, check digit) est
 *   appliquée par la bibliothèque ; un lotNumber hors standard retombe
 *   proprement sur l'URL standard au lieu d'échouer.
 *
 * @returns { url, format } — url prête à encoder dans un QRCodeCanvas,
 *          format indiquant le standard retenu (badge UI "GS1").
 */
export function construireUrlQrClient(params: ParamsUrlQrClient): {
  url: string;
  format: "GS1" | "STANDARD";
} {
  const origine = getScanOrigin().replace(/\/$/, "");

  // Série AI 21 : uniquement si le code d'impression est court (≤ 20
  // caractères = limite GS1 de l'AI 21). Les codes d'impression standard
  // historiques dépassent toujours cette longueur (horodatage + aléa).
  const codeTrim = params.code?.trim();
  const serie =
    codeTrim && codeTrim.length <= 20 ? codeTrim : undefined;

  try {
    const construit = construireUrlQrPourLot({
      produit: { id: params.lotId, barcode: params.barcode ?? null },
      lot: { lotNumber: params.numeroLot, reference: params.numeroLot },
      ...(serie ? { serie } : {}),
      fallbackUrl: `${origine}/p/${params.lotId}${
        codeTrim ? `?code=${encodeURIComponent(codeTrim)}` : ""
      }`,
      origine,
    });
    return { url: construit.url, format: construit.format };
  } catch (e) {
    // ErreurGs1 (ex: lotNumber hors CSET 82) → repli standard sûr,
    // aligné sur le comportement des routes serveur.
    if (!(e instanceof ErreurGs1)) throw e;
    return {
      url: `${origine}/p/${params.lotId}${
        codeTrim ? `?code=${encodeURIComponent(codeTrim)}` : ""
      }`,
      format: "STANDARD",
    };
  }
}
