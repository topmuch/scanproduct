import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { stat } from "fs/promises";
import { db } from "@/lib/db";
import { resolveLogoPath } from "@/lib/qr-server";

/**
 * GET /api/qr-codes/badge-template/preview — PUBLIC (session optionnelle).
 *
 * Renvoie le design de badge à afficher dans les APERÇUS navigateur
 * (BadgeQRPreview) — la même résolution que les rendus serveur :
 *
 *   1. Design personnel de l'utilisateur connecté (User.badgeTemplateUrl)
 *   2. Design officiel de la plateforme (Setting "qrBadgeTemplateUrl",
 *      importé par le SuperAdmin dans Paramètres → Design QR officiel)
 *   3. null → l'aperçu client retombe sur le badge jaune « LABEL VERIFSCAN »
 *
 * (Le design personnel s'uploade via /api/qr-codes/badge-template —
 * POST/DELETE réservés au fabricant connecté ; ce sous-path LIT seulement.)
 *
 * ── Réponse ─────────────────────────────────────────────────────
 *   { url: string | null, version: number | null }
 *   - url      URL publique de l'image importée (ou null).
 *   - version  mtime du fichier en ms — cache-busting fiable pour le
 *              <img> client : l'URL /api/uploads/site/qr-badge.<ext>
 *              est STABLE d'un upload à l'autre, sans version le
 *              navigateur sert l'ancienne image (cache immutable).
 *
 * ── Pourquoi public ─────────────────────────────────────────────
 * L'URL du design officiel est déjà exposée publiquement (démonstrations
 * landing, badges imprimés) : aucune donnée sensible. Le design personnel
 * d'un fabricant n'est renvoyé qu'à lui-même (session requise).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let url: string | null = null;

  try {
    // 1. Design personnel de l'utilisateur connecté (si session).
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (token?.sub) {
      const user = await db.user.findUnique({
        where: { id: token.sub },
        select: { badgeTemplateUrl: true },
      });
      url = user?.badgeTemplateUrl ?? null;
    }

    // 2. Design officiel de la plateforme (repli + cas anonyme).
    url =
      url ??
      (await db.setting.findUnique({ where: { key: "qrBadgeTemplateUrl" } }))
        ?.value ??
      null;
  } catch {
    url = null;
  }

  // Version = mtime du fichier → cache-busting du <img> client.
  // Si le fichier local est introuvable on renvoie null (l'aperçu
  // retombera sur le badge jaune plutôt qu'une image cassée).
  let version: number | null = null;
  if (url && !/^https?:\/\//i.test(url)) {
    const path = resolveLogoPath(url);
    if (!path) {
      url = null;
    } else {
      try {
        version = Math.round((await stat(path)).mtimeMs);
      } catch {
        version = null;
      }
    }
  }

  return NextResponse.json(
    { url, version },
    { headers: { "Cache-Control": "no-store" } }
  );
}
