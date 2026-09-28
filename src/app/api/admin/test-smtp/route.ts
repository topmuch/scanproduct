import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getEmailFrom, isEmailConfigured } from "@/lib/email";

/**
 * POST /api/admin/test-smtp — SuperAdmin uniquement.
 *
 * Test de la configuration SMTP (suggestion « SMTP en prod ») :
 *   - GET  → { configured: boolean, from: string } sans envoi
 *   - POST { to? } → envoie un email de test réel à `to` (ou à l'adresse
 *     From par défaut) et renvoie le résultat détaillé.
 *
 * La config vient des variables d'environnement Coolify :
 *   SMTP_HOST / SMTP_PORT (defaut 587) / SMTP_USER / SMTP_PASS / SMTP_FROM.
 * Voir src/lib/email.ts (transporter singleton + EmailLog d'audit).
 */

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  return NextResponse.json({
    configured: isEmailConfigured(),
    from: getEmailFrom(),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let to = getEmailFrom();
  try {
    const body = (await request.json()) as { to?: string };
    if (body?.to && body.to.trim()) to = body.to.trim();
  } catch {
    // corps absent → destinataire par défaut
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "SMTP non configuré — définissez SMTP_HOST, SMTP_USER et SMTP_PASS dans Coolify (Settings → Environment).",
      },
      { status: 400 }
    );
  }

  try {
    const { sendEmail } = await import("@/lib/email");
    const result = await sendEmail({
      to,
      subject: "VerifScan — Test SMTP réussi",
      text: `Test d'envoi effectué le ${new Date().toLocaleString("fr-FR")} depuis /api/admin/test-smtp. Si vous lisez cet email, votre configuration SMTP fonctionne.`,
      html: `<p>Test d'envoi effectué le <strong>${new Date().toLocaleString("fr-FR")}</strong> depuis <code>/api/admin/test-smtp</code>.</p><p>Si vous lisez cet email, votre configuration SMTP fonctionne. Les alertes contrefaçon partiront bien vers les artisans.</p>`,
    });
    return NextResponse.json({ configured: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { configured: true, success: false, error: msg.slice(0, 300) },
      { status: 500 }
    );
  }
}
