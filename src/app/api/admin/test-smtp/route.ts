import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin-guard";
import nodemailer from "nodemailer";
import {
  getEmailConfig,
  sendEmail,
  verifySmtpConnection,
} from "@/lib/email";
import { getSettings, SETTING_KEYS } from "@/lib/settings";

/**
 * POST /api/admin/test-smtp — SuperAdmin uniquement.
 *
 * Test RÉEL de la configuration SMTP :
 *   - Body vide (ou { to })         → utilise la config EFFECTIVE
 *                                     (Settings table → fallback env) et
 *                                     envoie un email de test tracké dans
 *                                     EmailLog.
 *   - Body { host, port, user, pass, secure?, to? } complet → teste CETTE
 *                                     configuration (les valeurs du
 *                                     formulaire, même non enregistrées) :
 *                                     verify() + envoi réel hors EmailLog.
 *
 * Réponse : { success, configured, source?, message? , error? }
 */

const bodySchema = z.object({
  to: z.string().email().optional(),
  host: z.string().min(1).max(255).optional(),
  port: z.union([z.number().int().min(1).max(65535), z.string()]).optional(),
  user: z.string().max(255).optional(),
  pass: z.string().max(255).optional(),
  secure: z.boolean().optional(),
  from: z.string().max(320).optional(),
});

/**
 * GET /api/admin/test-smtp — statut sans envoi : { configured, from, source }.
 * `configured` reflète la config EFFECTIVE (Settings → env).
 */
export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const cfg = await getEmailConfig();
  return NextResponse.json({
    configured: cfg.configured,
    from: cfg.from,
    source: cfg.source,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // corps absent → config effective
  }

  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Paramètres invalides — vérifiez l'adresse email de destination et le port SMTP.",
      },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // ── Mode A : test ad hoc des valeurs du formulaire ────────────────────────
  const hasAdHoc =
    typeof input.host === "string" &&
    input.host.trim().length > 0 &&
    typeof input.user === "string" &&
    input.user.trim().length > 0 &&
    typeof input.pass === "string" &&
    input.pass.trim().length > 0;

  if (hasAdHoc) {
    const port =
      typeof input.port === "number"
        ? input.port
        : Number(input.port) > 0
          ? Math.floor(Number(input.port))
          : 587;
    const secure =
      typeof input.secure === "boolean" ? input.secure : port === 465;
    const to = input.to?.trim() || input.from?.trim() || "test@verifscan.com";

    const verify = await verifySmtpConnection({
      host: input.host!.trim(),
      port,
      secure,
      user: input.user!.trim(),
      pass: input.pass!.trim(),
    });
    if (!verify.ok) {
      return NextResponse.json({
        success: false,
        configured: true,
        source: "form",
        error: verify.error ?? "Connexion SMTP impossible.",
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: input.host!.trim(),
        port,
        secure,
        auth: { user: input.user!.trim(), pass: input.pass!.trim() },
        connectionTimeout: 10_000,
        greetingTimeout: 8_000,
        socketTimeout: 15_000,
        tls: { rejectUnauthorized: false },
      });
      await transporter.sendMail({
        from: input.from?.trim() || `VerifScan <${input.user!.trim()}>`,
        to,
        subject: "VerifScan — Test SMTP réussi",
        text: `Test d'envoi effectué le ${new Date().toLocaleString("fr-FR")} depuis Paramètres → Email & Notifications. Si vous lisez cet email, votre configuration SMTP fonctionne.`,
        html: `<p>Test d'envoi effectué le <strong>${new Date().toLocaleString("fr-FR")}</strong> depuis <strong>Paramètres → Email &amp; Notifications</strong>.</p><p>Si vous lisez cet email, votre configuration SMTP fonctionne : les notifications (nouvelles inscriptions, tickets, alertes) partiront bien vers ce serveur.</p>`,
      });
      transporter.close();
      return NextResponse.json({
        success: true,
        configured: true,
        source: "form",
        message: `Email de test envoyé à ${to} — vérifiez la boîte de réception.`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({
        success: false,
        configured: true,
        source: "form",
        error: msg.slice(0, 300),
      });
    }
  }

  // ── Mode B : config effective (Settings → env) ────────────────────────────
  const cfg = await getEmailConfig();

  if (!cfg.configured) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        source: cfg.source,
        error:
          "SMTP non configuré — remplissez le serveur, l'utilisateur et le mot de passe ci-dessus (ou définissez SMTP_HOST, SMTP_USER et SMTP_PASS dans Coolify), puis enregistrez.",
      },
      { status: 400 },
    );
  }

  // Recipient: explicit `to` > admin notification recipient setting > From.
  let adminRecipient: string | undefined;
  try {
    const s = await getSettings([SETTING_KEYS.notifEmailRecipient]);
    adminRecipient = s[SETTING_KEYS.notifEmailRecipient]?.trim() || undefined;
  } catch {
    // ignore
  }
  const to = input.to?.trim() || adminRecipient || cfg.from;

  const result = await sendEmail({
    to,
    subject: "VerifScan — Test SMTP réussi",
    text: `Test d'envoi effectué le ${new Date().toLocaleString("fr-FR")} depuis /api/admin/test-smtp. Si vous lisez cet email, votre configuration SMTP fonctionne.`,
    html: `<p>Test d'envoi effectué le <strong>${new Date().toLocaleString("fr-FR")}</strong> depuis <code>/api/admin/test-smtp</code>.</p><p>Si vous lisez cet email, votre configuration SMTP fonctionne. Les notifications (nouvelles inscriptions, tickets, alertes contrefaçon) partiront bien vers ce serveur.</p>`,
  });

  if (result.success) {
    return NextResponse.json({
      success: true,
      configured: true,
      source: cfg.source,
      status: result.status,
      message:
        result.status === "sent"
          ? `Email de test envoyé à ${to} — vérifiez la boîte de réception.`
          : "SMTP non configuré — le message a été journalisé (mode développement).",
    });
  }
  return NextResponse.json(
    {
      success: false,
      configured: true,
      source: cfg.source,
      error: result.error ?? "Échec de l'envoi du message de test.",
    },
    { status: 500 },
  );
}
