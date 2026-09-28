import { db } from "@/lib/db";

/**
 * Détection de CONTREFAÇON par analyse géographique des scans.
 *
 * Signal utilisé : le fuseau horaire IANA du visiteur (ex. "Africa/Dakar"),
 * collecté côté client (Intl) — gratuit, fiable, sans API externe ni IP.
 *
 * Règle : si le MÊME QR code est scanné depuis 2 régions distinctes
 * (continent différent) en moins de 48 h, le produit est probablement
 * copié — un vrai produit physique ne se déplace pas aussi vite. On pose
 * alors `PreActivatedLot.counterfeitAlert` (JSON) qui déclenche :
 *   - la bannière d'avertissement sur la page publique /a/[code]
 *   - un email à l'artisan (si SMTP configuré + email renseigné)
 *
 * Anti-spam : une nouvelle alerte n'écrase la précédente qu'après 6 h
 * (cooldown) — les scans répétés de la même fraude ne relancent pas
 * d'alerte à chaque scan.
 */

const WINDOW_MS = 48 * 60 * 60 * 1000; // comparaison avec les scans < 48 h
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // pas plus d'une alerte / 6 h

/** Région d'un fuseau IANA : "Africa/Dakar" → "africa". */
export function regionOf(timezone: string): string {
  return (timezone.split("/")[0] || timezone).toLowerCase();
}

/** Libellés FR des régions pour l'affichage public. */
export const REGION_LABELS: Record<string, string> = {
  africa: "Afrique",
  europe: "Europe",
  america: "Amérique",
  asia: "Asie",
  atlantis: "Atlantique",
  australia: "Océanie",
  pacific: "Pacifique",
  arctic: "Arctique",
  indian: "Océan Indien",
  utc: "UTC",
  etc: "UTC",
};

export function regionLabel(region: string): string {
  return REGION_LABELS[region.toLowerCase()] ?? region;
}

export type CounterfeitAlert = {
  detectedAt: string;
  regionA: string;
  tzA: string;
  regionB: string;
  tzB: string;
};

export function parseCounterfeitAlert(raw: string | null | undefined): CounterfeitAlert | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CounterfeitAlert;
    if (parsed && parsed.detectedAt && parsed.regionA && parsed.regionB) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Vérifie si le scan en cours (timezone fournie) contredit des scans
 * récents d'une autre région. Si oui, pose l'alerte sur le lot et la
 * renvoie. Ne lève JAMAIS : tout échec est loggé et silencieux (le scan
 * du client ne doit pas casser à cause de l'anti-fraude).
 */
export async function detectCounterfeit(
  lotId: string,
  currentTimezone: string
): Promise<CounterfeitAlert | null> {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const prevScans = await db.artisanScan.findMany({
      where: { lotId, scannedAt: { gte: since }, timezone: { not: null } },
      orderBy: { scannedAt: "desc" },
      take: 100,
      select: { timezone: true },
    });

    const curRegion = regionOf(currentTimezone);
    const foreign = prevScans.find(
      (s) => s.timezone && regionOf(s.timezone) !== curRegion
    );
    if (!foreign?.timezone) return null;

    // Cooldown : une alerte récente existe déjà → ne pas re-alerter
    const lot = await db.preActivatedLot.findUnique({
      where: { id: lotId },
      select: { counterfeitAlert: true },
    });
    const existing = parseCounterfeitAlert(lot?.counterfeitAlert);
    if (
      existing &&
      Date.now() - new Date(existing.detectedAt).getTime() < COOLDOWN_MS
    ) {
      return null;
    }

    const alert: CounterfeitAlert = {
      detectedAt: new Date().toISOString(),
      regionA: regionOf(foreign.timezone),
      tzA: foreign.timezone,
      regionB: curRegion,
      tzB: currentTimezone,
    };
    await db.preActivatedLot.update({
      where: { id: lotId },
      data: { counterfeitAlert: JSON.stringify(alert) },
    });
    console.log(
      `[anti-contrefacon] Alerte posée lot=${lotId} ${alert.regionA} puis ${alert.regionB} en < 48h`
    );
    return alert;
  } catch (e) {
    console.error("[anti-contrefacon] détection échouée (non bloquant):", e);
    return null;
  }
}

/** Email d'alerte à l'artisan (fire-and-forget, jamais bloquant). */
export async function notifyArtisanCounterfeit(params: {
  to: string | null | undefined;
  productName: string;
  artisanName: string;
  alert: CounterfeitAlert;
}): Promise<void> {
  if (!params.to) return;
  try {
    const { sendEmail } = await import("@/lib/email");
    const regionA = regionLabel(params.alert.regionA);
    const regionB = regionLabel(params.alert.regionB);
    await sendEmail({
      to: params.to,
      subject: `VerifScan — Activité suspecte sur « ${params.productName} »`,
      text:
        `Bonjour ${params.artisanName},\n\n` +
        `VerifScan a détecté que votre produit « ${params.productName} » a été scanné ` +
        `depuis ${regionA} puis ${regionB} en moins de 48 heures.\n\n` +
        `Un produit physique ne peut pas se déplacer aussi vite : cela peut ` +
        `signaler une CONTREFAÇON de votre produit.\n\n` +
        `Détail : dernier fuseau ${params.alert.tzB} vs précédent ${params.alert.tzA}, ` +
        `le ${new Date(params.alert.detectedAt).toLocaleString("fr-FR")}.\n\n` +
        `L'équipe VerifScan`,
    });
  } catch (e) {
    console.error("[anti-contrefacon] email artisan échoué (non bloquant):", e);
  }
}
