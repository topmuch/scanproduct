import { db } from "@/lib/db";
import { resolveLogoPath } from "@/lib/qr-server";

/**
 * Résout le template de badge QR à utiliser pour un fabricant donné.
 *
 * Priorité :
 *   1. Design personnel du fabricant (User.badgeTemplateUrl)
 *   2. Design officiel de la plateforme (Setting "qrBadgeTemplateUrl",
 *      importé par le SuperAdmin)
 *   3. null → badge jaune « LABEL VERIFSCAN » par défaut (rendu SVG)
 *
 * @returns Chemin absolu du fichier template (ou null si aucun design
 * importé / fichier introuvable sur disque).
 */
export async function resolveBadgeTemplatePath(
  fabricantId: string
): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: fabricantId },
    select: { badgeTemplateUrl: true },
  });
  const url =
    user?.badgeTemplateUrl ??
    (await db.setting.findUnique({ where: { key: "qrBadgeTemplateUrl" } }))
      ?.value ??
    null;
  return resolveLogoPath(url);
}
