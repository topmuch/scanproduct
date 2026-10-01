// ============================================================================
// VerifScan — Réinitialisation de mot de passe (token HMAC sans stockage)
// ============================================================================
// Même philosophie que lib/verify-email.ts : token HMAC stateless, aucune
// migration DB nécessaire (fonctionne sur les vieilles DB de prod).
//
//   Token = `${userId}.${expiresAtMs}.${hmac("pwreset." + payload)}`
//   où payload inclut une EMPREINTE du hash de mot de passe ACTUEL.
//
//   - Signé avec NEXTAUTH_SECRET → infalsifiable
//   - Auto-expirant (1 h — court car un mot de passe est sensible)
//   - SINGLE-USE SANS DB : l'empreinte du hash est signée dans le token.
//     Dès que le mot de passe change, l'empreinte ne correspond plus et le
//     token est rejeté — un lien ne peut donc pas être rejoué après usage.
//   - Le préfixe "pwreset" garantit qu'un token de vérification d'email ne
//     peut PAS servir à réinitialiser un mot de passe (et inversement).
//
// Utilisé par :
//   - /api/auth/forgot-password  (demande publique « mot de passe oublié »)
//   - /api/auth/reset-password   (pose du nouveau mot de passe)
// ============================================================================

import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/seo";
import bcrypt from "bcryptjs";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 h

function secret(): string {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "verifscan-password-reset-dev-secret"
  );
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`pwreset.${payload}`)
    .digest("hex");
}

/** Empreinte courte du hash de mot de passe actuel (liée au token). */
function fingerprint(passwordHash: string): string {
  return crypto
    .createHash("sha256")
    .update(passwordHash)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Génère un token de reset stateless pour l'utilisateur (valable 1 h).
 * `currentPasswordHash` est signé dans le token : dès que le mot de passe
 * change, le token devient invalide (single-use sans base de données).
 */
export function generatePasswordResetToken(
  userId: string,
  currentPasswordHash: string,
): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}.${expiresAt}.${fingerprint(currentPasswordHash)}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Vérifie un token de reset. Ne jette jamais.
 * `currentPasswordHash` = hash ACTUEL de l'utilisateur (relit la DB) :
 * si le mot de passe a déjà été changé, l'empreinte ne correspond plus →
 * token refusé.
 */
export function verifyPasswordResetToken(
  token: string,
  currentPasswordHash: string,
): { valid: boolean; userId?: string; expired?: boolean } {
  if (!token || typeof token !== "string") return { valid: false };

  const parts = token.split(".");
  if (parts.length !== 4) return { valid: false };

  const [userId, expiresRaw, fp, signature] = parts;
  const expiresAt = Number(expiresRaw);
  if (!userId || !Number.isFinite(expiresAt) || !fp || !signature) {
    return { valid: false };
  }

  const expected = sign(`${userId}.${expiresRaw}.${fp}`);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false };
  }

  // L'empreinte signée doit correspondre au hash ACTUEL en base.
  if (fp !== fingerprint(currentPasswordHash)) {
    return { valid: false }; // mot de passe déjà changé (token consommé)
  }

  if (Date.now() > expiresAt) {
    return { valid: false, expired: true };
  }

  return { valid: true, userId };
}

/** Hash un mot de passe (bcrypt, même coût que l'inscription). */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Génère un mot de passe temporaire lisible et transmissible par téléphone :
 * format `Verif-XXXX-XXXX` (Z sans ambiguïté, ~10^9 combinaisons).
 */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I,L,O,0,1
  const block = () =>
    Array.from(
      { length: 4 },
      () => alphabet[crypto.randomInt(0, alphabet.length)],
    ).join("");
  return `Verif-${block()}-${block()}`;
}

// ---------------------------------------------------------------------------
// Emails (même coquille table-based que la vérification d'email)
// ---------------------------------------------------------------------------

function emailShell(title: string, bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;min-height:100%;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#022150;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.01em;">VerifScan</td>
            <td align="right" style="font-size:12px;color:#DCE7F2;">La vérité au bout du scan</td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#10B981;height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
        ${bodyRows}
        <tr><td style="background-color:#F9FAFB;padding:20px 24px;border-top:1px solid #E5E7EB;">
          <p style="margin:0;font-size:12px;color:#6B7280;text-align:center;line-height:1.5;">© 2026 VerifScan — La vérité au bout du scan</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0;font-size:11px;color:#9CA3AF;text-align:center;">Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
    </td></tr>
  </table>
</body></html>`;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Envoie l'email « mot de passe oublié » avec le lien de réinitialisation.
 * Fire-and-forget friendly : ne jette jamais. SMTP non configuré → EmailLog
 * status "skipped" (l'appelant peut alors retourner le lien en direct).
 */
export async function sendPasswordResetEmail(user: {
  id: string;
  email: string;
  name?: string | null;
  passwordHash: string;
}): Promise<{ sent: boolean; resetUrl: string }> {
  const token = generatePasswordResetToken(user.id, user.passwordHash);
  const siteUrl = (await getSiteUrl()).replace(/\/$/, "");
  const resetUrl = `${siteUrl}/mot-de-passe-oublie?token=${token}`;
  const firstName = (user.name || "").split(" ")[0] || "";

  const html = emailShell(
    "Réinitialisation de votre mot de passe",
    `
    <tr><td style="padding:32px 24px 8px 24px;">
      <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">Réinitialiser votre mot de passe</h1>
    </td></tr>
    <tr><td style="padding:0 24px 12px 24px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
        Bonjour ${esc(firstName || user.email)}, vous avez demandé la réinitialisation
        de votre mot de passe VerifScan. Cliquez sur le bouton ci-dessous pour en
        choisir un nouveau.
      </p>
    </td></tr>
    <tr><td style="padding:16px 24px 8px 24px;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#022150;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">Choisir un nouveau mot de passe</a>
    </td></tr>
    <tr><td style="padding:12px 24px 24px 24px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
        Si le bouton ne fonctionne pas, copiez-collez ce lien :<br>
        <a href="${resetUrl}" style="color:#022150;word-break:break-all;">${resetUrl}</a>
      </p>
      <p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#9CA3AF;">
        Ce lien expire dans <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette
        demande, ignorez cet email — votre mot de passe actuel reste valable.
      </p>
    </td></tr>`,
  );

  try {
    await sendEmail({
      to: user.email,
      subject: "VerifScan — Réinitialisez votre mot de passe",
      html,
      text: [
        `Bonjour ${firstName},`,
        "",
        "Vous avez demandé la réinitialisation de votre mot de passe VerifScan.",
        `Ouvrez ce lien (valable 1 h) pour en choisir un nouveau : ${resetUrl}`,
        "",
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
      ].join("\n"),
      userId: user.id,
    });
    return { sent: true, resetUrl };
  } catch (err) {
    console.error("[password-reset] sendPasswordResetEmail failed:", err);
    return { sent: false, resetUrl };
  }
}

/**
 * Envoie le mot de passe temporaire au fabricant après un reset par le
 * SuperAdmin. Ne jette jamais.
 */
export async function sendTempPasswordEmail(user: {
  id: string;
  email: string;
  name?: string | null;
}, tempPassword: string): Promise<{ sent: boolean }> {
  const firstName = (user.name || "").split(" ")[0] || "";
  const siteUrl = (await getSiteUrl()).replace(/\/$/, "");
  const loginUrl = `${siteUrl}/login`;

  const html = emailShell(
    "Votre nouveau mot de passe VerifScan",
    `
    <tr><td style="padding:32px 24px 8px 24px;">
      <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">Votre mot de passe a été réinitialisé</h1>
    </td></tr>
    <tr><td style="padding:0 24px 12px 24px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
        Bonjour ${esc(firstName || user.email)}, l'équipe VerifScan a réinitialisé
        votre mot de passe. Voici votre mot de passe temporaire :
      </p>
    </td></tr>
    <tr><td style="padding:16px 24px 8px 24px;">
      <div style="background-color:#F0F4F9;border:1px dashed #022150;border-radius:8px;padding:16px;text-align:center;font-size:22px;font-weight:700;letter-spacing:1px;color:#022150;font-family:monospace;">${esc(tempPassword)}</div>
    </td></tr>
    <tr><td style="padding:16px 24px 8px 24px;">
      <a href="${loginUrl}" style="display:inline-block;background-color:#022150;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">Se connecter</a>
    </td></tr>
    <tr><td style="padding:12px 24px 24px 24px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">
        Pour votre sécurité, connectez-vous avec ce mot de passe puis changez-le
        depuis les paramètres de votre compte.
      </p>
    </td></tr>`,
  );

  try {
    await sendEmail({
      to: user.email,
      subject: "VerifScan — Votre nouveau mot de passe",
      html,
      text: [
        `Bonjour ${firstName},`,
        "",
        "Votre mot de passe VerifScan a été réinitialisé par l'équipe.",
        `Mot de passe temporaire : ${tempPassword}`,
        `Connectez-vous ici : ${loginUrl}`,
        "",
        "Changez ce mot de passe depuis les paramètres après connexion.",
      ].join("\n"),
      userId: user.id,
    });
    return { sent: true };
  } catch (err) {
    console.error("[password-reset] sendTempPasswordEmail failed:", err);
    return { sent: false };
  }
}
