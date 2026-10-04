// ============================================================================
// artisan-scan-notify — Email « Nouveau scan » à l'artisan (demande directe)
// ============================================================================
// À CHAQUE scan d'un produit actif, l'artisan est informé par email SI il a
// renseigné son adresse (champ « Email » de l'assistant d'activation →
// pack.artisanEmail). Demande utilisateur : « je veux qu'à chaque fois
// qu'il y a un scan, l'artisan soit informé s'il a renseigné son email ».
//
// Design :
//   - NON BLOQUANT : appelé en fire-and-forget depuis /api/artisan/track-scan,
//     jamais dans le chemin critique du scan (le client attend déjà la réponse).
//   - ANTI-FLOOD mémoire : 1 email / 60 s / (destinataire × lot). Le scan
//     lui-même reste comptabilisé partout (dashboard, stats, preuve sociale) ;
//     seul l'EMAIL est agrégé pour ne pas saturer la boîte de l'artisan ni le
//     quota SMTP lors d'un pic (produit viral, rafraîchissements, robot).
//     Au-delà de la fenêtre, chaque scan re-génère un email — le total de
//     scans dans l'email est toujours à jour.
//   - Traçabilité : chaque envoi passe par sendEmail() → journal EmailLog
//     (queued/sent/failed/skipped) visible dans l'admin.
// ============================================================================

/** Dernière génération d'email par clé « to:lotId » (anti-flood 60 s). */
const recentSends = new Map<string, number>();
const THROTTLE_MS = 60_000;

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Téléphone",
  desktop: "Ordinateur",
  tablet: "Tablette",
};

/** Nom de région lisible à partir d'un fuseau IANA (Africa/Dakar → Dakar). */
function tzCityLabel(tz: string | null | undefined): string | null {
  if (!tz) return null;
  const city = tz.split("/").pop()?.replace(/_/g, " ");
  return city && city !== tz ? city : null;
}

export async function notifyArtisanScan(params: {
  to: string | null | undefined;
  lotId: string;
  productName: string;
  artisanName: string;
  qrCode: string;
  deviceType?: string | null;
  timezone?: string | null;
  city?: string | null;
  country?: string | null;
  totalScans: number;
}): Promise<void> {
  const to = params.to?.trim();
  if (!to) return; // pas d'email renseigné → pas de notification (exigence)

  // Anti-flood : un email max / 60 s / (destinataire × produit)
  const key = `${to.toLowerCase()}:${params.lotId}`;
  const now = Date.now();
  const last = recentSends.get(key) ?? 0;
  if (now - last < THROTTLE_MS) return;
  recentSends.set(key, now);
  // Nettoyage périodique de la map (évite une croissance infinie en prod)
  if (recentSends.size > 500) {
    for (const [k, t] of recentSends) {
      if (now - t > THROTTLE_MS) recentSends.delete(k);
    }
  }

  try {
    const { sendEmail } = await import("@/lib/email");
    const when = new Date().toLocaleString("fr-FR", {
      timeZone: "Africa/Dakar",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const device = DEVICE_LABELS[params.deviceType ?? ""] ?? null;
    const city = params.city ?? tzCityLabel(params.timezone);
    const place = [city, params.country].filter(Boolean).join(", ") || null;

    const detailRows = [
      ["Produit", params.productName],
      ["Quand", when],
      ...(device ? [["Appareil", device]] : []),
      ...(place ? [["Lieu approximatif", place]] : []),
      ["Total de scans", String(params.totalScans)],
    ] as const;

    await sendEmail({
      to,
      subject: `🛒 Nouveau scan de « ${params.productName} » — VerifScan`,
      text:
        `Bonjour ${params.artisanName},\n\n` +
        `Bonne nouvelle : votre produit « ${params.productName} » vient d'être scanné !\n\n` +
        detailRows.map(([k, v]) => `${k} : ${v}`).join("\n") +
        `\n\nChaque scan prouve l'authenticité de votre produit et développe ` +
        `votre clientèle. Consultez vos statistiques sur votre tableau de bord.\n\n` +
        `L'équipe VerifScan`,
      html:
        `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;">` +
        `<div style="max-width:520px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eee7da;">` +
        `<div style="background:linear-gradient(135deg,#059669,#0d9488);padding:24px 28px;color:#ffffff;">` +
        `<p style="margin:0;font-size:13px;opacity:.85;">VerifScan · Alerte scan</p>` +
        `<h1 style="margin:6px 0 0;font-size:20px;line-height:1.3;">🛒 Votre produit vient d&#39;être scanné !</h1>` +
        `</div>` +
        `<div style="padding:24px 28px;">` +
        `<p style="margin:0 0 16px;font-size:14px;color:#374151;">Bonjour <strong>${params.artisanName}</strong>, un client vient de vérifier l&#39;authenticité de votre produit :</p>` +
        `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">` +
        detailRows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f0e8;color:#9ca3af;width:42%;">${k}</td>` +
              `<td style="padding:8px 0;border-bottom:1px solid #f3f0e8;font-weight:bold;color:#111827;">${v}</td></tr>`
          )
          .join("") +
        `</table>` +
        `<p style="margin:18px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Chaque scan prouve l&#39;authenticité de votre produit et développe votre clientèle. Partagez vos étiquettes pour multiplier les scans !</p>` +
        `<a href="https://verifscan.com/artisan/dashboard" style="display:block;margin:20px 0 4px;background:linear-gradient(90deg,#f59e0b,#f97316);color:#ffffff;text-decoration:none;text-align:center;padding:13px 16px;border-radius:12px;font-weight:bold;font-size:14px;">Voir mon tableau de bord</a>` +
        `</div>` +
        `<div style="padding:14px 28px;background:#faf8f3;border-top:1px solid #f0ebe0;font-size:11px;color:#9ca3af;text-align:center;">` +
        `Vous recevez cet email car vous avez renseigné votre adresse sur VerifScan.<br/>L&#39;équipe VerifScan — La vérité au bout du scan` +
        `</div>` +
        `</div></body></html>`,
    });
  } catch (e) {
    console.error("[scan-notify] email artisan échoué (non bloquant):", e);
  }
}
