// ============================================================================
// VerifScan — Email verification (token HMAC sans stockage + email dédié)
// ============================================================================
// Pure server-side module. No React, no API routes.
//
// Why HMAC (stateless) instead of a DB token table:
//   - No schema migration needed (works on existing production DBs).
//   - Token = `${userId}.${expiresAtMs}.${hmacSha256(payload, secret)}`.
//   - Verifiable by anyone holding NEXTAUTH_SECRET; tamper-proof and
//     self-expiring (48 h). Replay after verification is harmless: the page
//     simply re-marks emailVerified (idempotent).
//
// Used by:
//   - src/app/api/register/route.ts (send the welcome/verification email)
//   - src/app/verification-email/page.tsx (verify the link clicked in the mail)
// ============================================================================

import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/seo";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 h

function secret(): string {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "verifscan-email-verification-dev-secret"
  );
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

/**
 * Build a stateless, self-expiring email verification token for a user.
 */
export function generateEmailVerificationToken(userId: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify a token produced by generateEmailVerificationToken.
 * Never throws. `userId` is only returned for valid, unexpired tokens.
 */
export function verifyEmailVerificationToken(
  token: string,
): { valid: boolean; userId?: string; expired?: boolean } {
  if (!token || typeof token !== "string") return { valid: false };

  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };

  const [userId, expiresRaw, signature] = parts;
  const expiresAt = Number(expiresRaw);
  if (!userId || !Number.isFinite(expiresAt) || !signature) {
    return { valid: false };
  }

  const expected = sign(`${userId}.${expiresRaw}`);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false };
  }

  if (Date.now() > expiresAt) {
    return { valid: false, expired: true };
  }

  return { valid: true, userId };
}

/**
 * Mark a user's email as verified (idempotent). Returns the pre-update state
 * so the UI can distinguish "just verified" from "already verified".
 */
export async function markEmailVerified(
  userId: string,
): Promise<{ ok: boolean; alreadyVerified: boolean }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, emailVerified: true },
  });
  if (!user) return { ok: false, alreadyVerified: false };
  if (user.emailVerified) return { ok: true, alreadyVerified: true };

  await db.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
  return { ok: true, alreadyVerified: false };
}

/**
 * Send the welcome + email-verification mail to a freshly registered user.
 * Fire-and-forget friendly: never throws. When SMTP is not configured the
 * sendEmail call logs the full body to console + EmailLog (status "skipped").
 */
export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<{ sent: boolean; status?: "sent" | "failed" | "skipped" }> {
  try {
    const token = generateEmailVerificationToken(user.id);
    const siteUrl = (await getSiteUrl()).replace(/\/$/, "");
    const verifyUrl = `${siteUrl}/verification-email?token=${token}`;

    const firstName = (user.name || "").split(" ")[0] || "";
    const html = renderVerificationEmail({ firstName, email: user.email, verifyUrl });
    const result = await sendEmail({
      to: user.email,
      subject: "Bienvenue sur VerifScan — validez votre email",
      html,
      text: [
        `Bonjour ${firstName},`,
        "",
        "Bienvenue sur VerifScan — la plateforme de traçabilité et de lutte contre la contrefaçon.",
        "Confirmez votre adresse email en ouvrant le lien ci-dessous :",
        verifyUrl,
        "",
        "Ce lien est valable 48 heures. Si vous n'êtes pas à l'origine de ce compte, ignorez cet email.",
      ].join("\n"),
      userId: user.id,
    });
    return { sent: result.success, status: result.status };
  } catch (err) {
    console.error("[verify-email] sendVerificationEmail failed:", err);
    return { sent: false };
  }
}

function renderVerificationEmail(vars: {
  firstName: string;
  email: string;
  verifyUrl: string;
}): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const name = esc(vars.firstName || vars.email);
  const url = esc(vars.verifyUrl);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur VerifScan</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;min-height:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#022150;padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.01em;">VerifScan</td>
                  <td align="right" style="font-size:12px;color:#DCE7F2;">La vérité au bout du scan</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#10B981;height:4px;line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 24px 8px 24px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">
                Bonjour ${name}, bienvenue !
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 12px 24px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
                Votre compte VerifScan vient d'être créé. Pour activer pleinement votre espace
                fabricant (tableau de bord, QR codes, statistiques de scans), confirmez votre
                adresse email en cliquant sur le bouton ci-dessous.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 8px 24px;">
              <a href="${url}"
                 style="display:inline-block;background-color:#022150;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">
                Valider mon adresse email
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 24px 24px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
                <a href="${url}" style="color:#022150;word-break:break-all;">${url}</a>
              </p>
              <p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                Ce lien expire dans 48 heures. Si vous n'êtes pas à l'origine de ce compte, ignorez simplement cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F9FAFB;padding:20px 24px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#6B7280;text-align:center;line-height:1.5;">
                © 2026 VerifScan — La vérité au bout du scan
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:#9CA3AF;text-align:center;">
          Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
