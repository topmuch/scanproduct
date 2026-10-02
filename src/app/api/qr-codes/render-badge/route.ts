import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { renderBadgeQR } from "@/lib/qr-badge";
import { resolveBadgeTemplatePath } from "@/lib/qr-badge-template";

/**
 * POST /api/qr-codes/render-badge
 *
 * Rend un QR code avec le design officiel « LABEL VERIFSCAN » (cercle
 * jaune, textes en arc, QR noir au centre) et renvoie le PNG.
 *
 * Utilisé par le dashboard fabricant pour les TÉLÉCHARGEMENTS : les QR
 * unitaires n'ont pas de PNG persisté (contrairement au bulk-generate),
 * donc le client demande le rendu à la demande avec l'URL scannable
 * exacte construite côté client (même choix GS1/standard que la
 * génération — voir construireUrlQrClient).
 *
 * ── Body ────────────────────────────────────────────────────────
 *   url        — string  (requis) URL à encoder. SÉCURITÉ : seul le
 *                        domaine de déploiement est autorisé (host de
 *                        NEXT_PUBLIC_SCAN_URL ou host de la requête) —
 *                        empêche la fabrication de badges VerifScan
 *                        pointant vers des sites tiers (brand abuse).
 *   size?      — number  (256..2048, défaut 1200 = 1016 DPI à 3 cm)
 *   topText?   — string  (défaut « LABEL VERIFSCAN »)
 *   bottomText?— string  (défaut « SCANNEZ POUR EN SAVOIR PLUS »)
 *
 * ── Réponse ─────────────────────────────────────────────────────
 *   image/png (binaire) ou JSON { error } en cas de refus.
 */
export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Rate-limit dédié (cap élevé : les téléchargements par lot enchaînent
  // jusqu'à ~100 rendus d'affilée côté client).
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.QR_RENDER,
    namespace: "qr:badge",
    key: token.sub,
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json({ error: "url est requis" }, { status: 400 });
    }

    // ── Validation stricte de l'URL (anti brand-abuse) ────────────
    // Host autorisé = host de déploiement (NEXT_PUBLIC_SCAN_URL) OU host
    // de la requête elle-même (couvre la preview/dev et les scans via le
    // domaine servi). Tout autre domaine est refusé en 403.
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "url invalide" }, { status: 400 });
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json(
        { error: "Protocole non autorisé" },
        { status: 400 }
      );
    }
    const allowedHosts = new Set(
      [
        process.env.NEXT_PUBLIC_SCAN_URL
          ? new URL(process.env.NEXT_PUBLIC_SCAN_URL).hostname
          : null,
        request.nextUrl.hostname,
        request.headers.get("host")
          ? request.headers.get("host")!.split(":")[0]
          : null,
      ].filter((h): h is string => !!h)
    );
    if (!allowedHosts.has(parsed.hostname)) {
      return NextResponse.json(
        { error: "Domaine non autorisé — seules les URL VerifScan peuvent être rendues" },
        { status: 403 }
      );
    }

    // ── Options de rendu ───────────────────────────────────────────
    const size = Math.max(256, Math.min(2048, parseInt(body?.size, 10) || 1200));
    const topText =
      typeof body?.topText === "string" && body.topText.trim()
        ? body.topText
        : undefined;
    const bottomText =
      typeof body?.bottomText === "string" && body.bottomText.trim()
        ? body.bottomText
        : undefined;

    // ── Résolution du design (template importé) ────────────────────
    // Priorité : design personnel du fabricant → design officiel de la
    // plateforme (Setting qrBadgeTemplateUrl) → badge jaune par défaut.
    let templatePath: string | undefined;
    try {
      templatePath = (await resolveBadgeTemplatePath(token.sub)) ?? undefined;
    } catch (e) {
      console.error("[POST /api/qr-codes/render-badge] Résolution template:", e);
    }

    const { buffer, width } = await renderBadgeQR(parsed.toString(), {
      size,
      ...(topText ? { topText } : {}),
      ...(bottomText ? { bottomText } : {}),
      ...(templatePath ? { templatePath } : {}),
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
        "X-Badge-Width": width.toString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/qr-codes/render-badge] Error:", error);
    return NextResponse.json(
      { error: "Échec du rendu du badge" },
      { status: 500 }
    );
  }
}
