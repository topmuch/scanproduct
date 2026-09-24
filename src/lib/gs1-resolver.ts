/**
 * ============================================================================
 * VerifScan — RESOLVER GS1 Digital Link (aiguillage des scans entrants)
 * ============================================================================
 *
 * Rôle : intercepter TOUTE URL scannée (QR Code imprimé sur un emballage) et
 * aiguiller vers la bonne page responsive :
 *
 *   URL GS1   → /01/<GTIN>/10/<LOT>/21/<SERIE>   → 302 vers /p/<lotId>
 *   URL standard → /r/<ID_UNIQUE_PRODUIT>         → 302 vers /p/<lotId>
 *   URL inconnue → page 404 « produit introuvable / potentiellement contrefait »
 *
 * Correspondances DB :
 *   - AI 01 (GTIN)  → Product.barcode (normalisé en GTIN-14 zéro-padé)
 *   - AI 10 (LOT)   → Lot.lotNumber, sinon Lot.reference (fallback)
 *   - AI 21 (SERIE) → numéro sériel unitaire : enregistré dans Scan.qrCodeId
 *     pour l'audit (chaque unité physique porte une série unique ; la page
 *     passeport est résolue au niveau du lot).
 *
 * Sécurité (points clés) :
 *   1. AUCUNE redirection ouverte : la cible est TOUJOURS reconstruite depuis
 *      l'origine du serveur + un identifiant lu en base — jamais depuis l'URL
 *      entrante.
 *   2. Rate limiting par IP (60 req/min) anti-énumération de codes.
 *   3. Les scans des robots/crawlers ne sont PAS comptabilisés.
 *   4. Toutes les valeurs affichées dans la page 404 sont échappées (HTML).
 *   5. En-têtes Cache-Control: no-store (résolution toujours à jour —
 *      indispensable pour les rappels de produit / statuts FRA).
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { recordScan, isBotUserAgent } from "@/lib/public-data";
import {
  estUrlGs1,
  parserUrlGs1,
  ErreurGs1,
  PATTERN_ID_PRODUIT,
} from "./gs1";

// ---------------------------------------------------------------------------
// Utilitaires de réponse
// ---------------------------------------------------------------------------

/**
 * Construit la redirection HTTP 302 vers la page passeport produit.
 * L'origine vient du SERVEUR (request.nextUrl.origin) — jamais de l'URL
 * scannée — ce qui rend toute redirection ouverte impossible.
 */
function redirigerVersPasseport(
  origine: string,
  lotId: string
): NextResponse {
  const cible = new URL(`/p/${encodeURIComponent(lotId)}`, origine);
  const reponse = NextResponse.redirect(cible, 302);
  // Pas de cache : le statut (FRA / rappelé / expiré) doit toujours être frais.
  reponse.headers.set("Cache-Control", "no-store, max-age=0");
  return reponse;
}

/**
 * Échappe les caractères HTML sensibles (défense en profondeur XSS) avant
 * toute interpolation dans la page 404.
 */
function echapperHtml(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Page 404 « Produit introuvable » — servie quand :
 *   - le QR Code ne correspond à aucun produit enregistré ;
 *   - les valeurs GS1 sont malformées ;
 *   - le produit existe mais aucun lot n'est publié.
 *
 * C'est une FONCTION DE SÉCURITÉ de VerifScan : un consommateur qui scanne
 * une contrefaçon doit voir un message clair, pas une erreur générique.
 * Page autonome (aucune dépendance) avec en-têtes de sécurité renforcés.
 */
function pageIntrouvable(origine: string, detail?: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Produit introuvable — VerifScan</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(160deg, #f8fafc 0%, #eef2f7 100%);
    padding: 1.5rem; color: #0f172a;
  }
  .carte {
    max-width: 420px; width: 100%; background: #fff; border-radius: 16px;
    box-shadow: 0 10px 40px rgba(15, 23, 42, .08); padding: 2.5rem 2rem;
    text-align: center;
  }
  .badge { font-size: 3rem; line-height: 1; }
  h1 { font-size: 1.25rem; margin: 1rem 0 .5rem; }
  p { font-size: .95rem; color: #475569; line-height: 1.55; }
  .detail {
    margin-top: 1rem; font-size: .8rem; color: #94a3b8;
    word-break: break-all; font-family: ui-monospace, monospace;
  }
  a.bouton {
    display: inline-block; margin-top: 1.5rem; padding: .7rem 1.4rem;
    background: #0f766e; color: #fff; border-radius: 10px;
    text-decoration: none; font-weight: 600; font-size: .95rem;
  }
</style>
</head>
<body>
  <main class="carte">
    <div class="badge" aria-hidden="true">⚠️</div>
    <h1>Produit introuvable</h1>
    <p>Ce code ne correspond à aucun produit enregistré dans VerifScan.
    Le produit peut être contrefait, retiré du catalogue, ou le code endommagé.</p>
    ${detail ? `<p class="detail">Réf. : ${echapperHtml(detail)}</p>` : ""}
    <a class="bouton" href="${echapperHtml(origine)}">Aller à l'accueil VerifScan</a>
  </main>
</body>
</html>`;

  const reponse = new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  reponse.headers.set("Cache-Control", "no-store, max-age=0");
  reponse.headers.set("X-Content-Type-Options", "nosniff");
  reponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  return reponse;
}

// ---------------------------------------------------------------------------
// Résolution en base de données
// ---------------------------------------------------------------------------

/** Choix des statuts de lots résolvables publiquement (DRAFT exclu). */
const STATUTS_RESOLVABLES = { not: "DRAFT" } as const;

/**
 * Résout une identité GS1 (GTIN [+ lot] [+ série]) vers le lot VerifScan.
 *
 * @returns { lotId, nomProduit, qrCodeId? } — qrCodeId est fourni quand la
 *          série (AI 21) correspond à un QR Code VerifScan enregistré
 *          (attribution analytics par unité imprimée), absent sinon
 *          (série tierce ou contrefacte : le scan reste résolu mais non
 *          attribuable à un QR imprimé par VerifScan).
 */
async function resoudreGs1(
  gtin: string,
  lot?: string,
  serie?: string
): Promise<{ lotId: string; nomProduit: string; qrCodeId?: string } | null> {
  // Le GTIN est stocké dans Product.barcode tel que saisi par le fabricant
  // (souvent GTIN-13). On teste les variantes canoniques : GTIN-14 zéro-padé
  // et forme « dépouillée » de ses zéros de tête (13/12/8 chiffres).
  const gtin14 = gtin; // déjà normalisé par la bibliothèque
  const variantes = Array.from(new Set([gtin14, gtin14.replace(/^0+/, "")]));

  const produit = await db.product.findFirst({
    where: { barcode: { in: variantes } },
    select: { id: true, name: true },
  });
  if (!produit) return null;

  // GTIN seul (QR sans AI 10) → lot le plus récent publié du produit.
  if (!lot) {
    const lotRecent = await db.lot.findFirst({
      where: { productId: produit.id, status: STATUTS_RESOLVABLES },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return lotRecent
      ? { lotId: lotRecent.id, nomProduit: produit.name }
      : null;
  }

  // GTIN + lot → le lot exact (lotNumber d'abord, référence en fallback).
  const lotCible = await db.lot.findFirst({
    where: {
      productId: produit.id,
      status: STATUTS_RESOLVABLES,
      OR: [{ lotNumber: lot }, { reference: lot }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!lotCible) return null;

  // Série (AI 21) → rattachement au QR Code imprimé si VerifScan l'a généré.
  // (QRCode.code est la clé d'impression unique ; on récupère l'id réel pour
  //  la FK Scan.qrCodeId. Si la série est inconnue, on résout quand même —
  //  c'est précisément le signal anti-contrefaçon.)
  let qrCodeId: string | undefined;
  if (serie) {
    const qr = await db.qRCode.findFirst({
      where: { code: serie, lotId: lotCible.id },
      select: { id: true },
    });
    qrCodeId = qr?.id;
  }

  return { lotId: lotCible.id, nomProduit: produit.name, qrCodeId };
}

/**
 * Résout un identifiant produit « standard » (petits producteurs) vers le
 * lot publié le plus récent de ce produit.
 */
async function resoudreStandard(
  idProduit: string
): Promise<{ lotId: string; nomProduit: string } | null> {
  const produit = await db.product.findUnique({
    where: { id: idProduit },
    select: { id: true, name: true },
  });
  if (!produit) return null;

  const lot = await db.lot.findFirst({
    where: { productId: produit.id, status: STATUTS_RESOLVABLES },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return lot ? { lotId: lot.id, nomProduit: produit.name } : null;
}

// ---------------------------------------------------------------------------
// Gestionnaire principal (partagé par les deux routes resolver)
// ---------------------------------------------------------------------------

/**
 * Point d'entrée unique du resolver. `segments` est le tableau de segments
 * de chemin fourni par la route Next.js catch-all (déjà URL-décodé par
 * Next.js mais revalidé par la bibliothèque gs1.ts).
 *
 * Aiguillage :
 *   [01, <gtin>, …] | [gtin, …]        → GS1 Digital Link
 *   [<idProduit>]                      → QR standard VerifScan
 *   tout le reste                      → 404 « produit introuvable »
 */
export async function gererRequeteResolver(
  request: NextRequest,
  segments: string[]
): Promise<NextResponse> {
  // Seule la méthode GET a du sens pour un scan QR.
  if (request.method !== "GET") {
    return NextResponse.json(
      { error: "Méthode non autorisée." },
      { status: 405, headers: { Allow: "GET" } }
    );
  }

  // 1) Rate limiting anti-énumération (60 scans/min/IP — burst toléré car
  //    un rayon entier peut être scanné d'affilée par un même téléphone).
  const limite = applyRateLimit(request, {
    ...RATE_LIMITS.PUBLIC_SCAN,
    namespace: "resolver",
  });
  if (limite) return limite;

  const origine = request.nextUrl.origin;
  const segmentsFiltres = segments.filter((s) => s.length > 0);

  // 2) Aucun segment (ex: GET /r) → page d'accueil.
  if (segmentsFiltres.length === 0) {
    return NextResponse.redirect(new URL("/", origine), 302);
  }

  // 3) Enregistrement du contexte (bot ?).
  const userAgent = request.headers.get("user-agent") ?? "";
  const estBot = isBotUserAgent(userAgent);

  try {
    // ── CAS A : URI GS1 Digital Link ────────────────────────────────────
    if (estUrlGs1(segmentsFiltres)) {
      const decodage = parserUrlGs1(segmentsFiltres); // peut lever ErreurGs1
      if (!decodage) return pageIntrouvable(origine);

      const cible = await resoudreGs1(
        decodage.gtin,
        decodage.lot,
        decodage.serie
      );
      if (!cible) {
        // GTIN inconnu ou lot inconnu → message anti-contrefaçon.
        return pageIntrouvable(
          origine,
          `GTIN ${decodage.gtin}${decodage.lot ? ` · lot ${decodage.lot}` : ""}`
        );
      }

      // Journalisation du scan. Les identifiants GS1 sont stockés dans
      // `metadata` (JSON) ; `qrCodeId` ne reçoit QUE l'id réel d'un QR Code
      // VerifScan retrouvé via la série (AI 21) — jamais une valeur libre.
      if (!estBot) {
        await recordScan(cible.lotId, {
          userAgent,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            undefined,
          qrCodeId: cible.qrCodeId,
          metadata: JSON.stringify({
            standard: "GS1",
            gtin: decodage.gtin,
            ...(decodage.lot ? { lot: decodage.lot } : {}),
            ...(decodage.serie ? { serie: decodage.serie } : {}),
            // Série non attribuée = QR inconnu (utile au anti-contrefaçon).
            ...(decodage.serie && !cible.qrCodeId
              ? { serieInconnue: true }
              : {}),
          }),
        });
      }
      return redirigerVersPasseport(origine, cible.lotId);
    }

    // ── CAS B : QR standard (petit producteur) : /r/<ID_UNIQUE> ─────────
    const [premier] = segmentsFiltres;
    if (segmentsFiltres.length === 1 && PATTERN_ID_PRODUIT.test(premier)) {
      const cible = await resoudreStandard(premier);
      if (!cible) return pageIntrouvable(origine, `produit ${premier}`);

      if (!estBot) {
        await recordScan(cible.lotId, {
          userAgent,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            undefined,
          qrCodeId: `STD|produit=${premier}`,
        });
      }
      return redirigerVersPasseport(origine, cible.lotId);
    }

    // ── CAS C : chemin inconnu → 404 VerifScan (et non une 404 générique).
    return pageIntrouvable(origine);
  } catch (erreur) {
    // URI GS1 malformée (ErreurGs1) ou erreur DB → page introuvable sûre.
    if (erreur instanceof ErreurGs1) {
      console.warn(`[resolver] URI GS1 rejetée (${erreur.code}) :`, erreur.message);
      return pageIntrouvable(origine);
    }
    console.error("[resolver] Erreur interne :", erreur);
    return pageIntrouvable(origine);
  }
}

/**
 * Construit l'URL à encoder dans un QR Code pour un couple produit/lot.
 *
 * ⚠️ Déplacé dans `gs1.ts` (module PUR, utilisable côté client pour les
 * aperçus du dashboard) — ré-exporté ici pour compatibilité avec les
 * imports serveur existants (`@/lib/gs1-resolver`).
 */
export { construireUrlQrPourLot } from "./gs1";
