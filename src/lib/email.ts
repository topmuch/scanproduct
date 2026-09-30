// ============================================================================
// VerifScan — Email service (nodemailer-based, safe fallback)
// ============================================================================
// Pure server-side module. No React, no API routes.
//
// Behaviour:
//   - SMTP config read from env (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
//     / SMTP_FROM).
//   - Transporter is a module-level singleton, lazily created on first
//     `sendEmail` call (so dev servers without SMTP configured don't crash).
//   - Every outbound email is recorded in the EmailLog table:
//       "queued"  → created just before send attempt
//       "sent"    → SMTP accepted the message
//       "failed"  → SMTP rejected (error message stored)
//       "skipped" → SMTP not configured (dev mode) — body logged to console
//   - Email failures NEVER crash the caller: all DB writes + sendMail are
//     wrapped in try/catch and the returned `success` flag is the only signal.
//
// Used by:
//   - src/lib/notifications.ts (notification dispatch)
//   - future API routes (subscription receipts, password reset, etc.)
// ============================================================================

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { db } from "@/lib/db";
import { getSettings, SETTING_KEYS } from "@/lib/settings";

// ---------------------------------------------------------------------------
// SMTP configuration
// ---------------------------------------------------------------------------
// Resolution order (per field):
//   1. Setting table  (Admin → Paramètres → Email & Notifications)
//   2. Environment    (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM)
//   3. Defaults
//
// The SMTP server is considered "configured" when host AND user AND pass
// are all non-empty in whichever source wins (settings take priority as a
// whole block, so a half-filled settings form falls back to env entirely).

const DEFAULT_FROM = "VerifScan <no-reply@verifscan.com>";

/** Setting keys that make up the SMTP configuration block. */
export const SMTP_SETTING_KEYS = [
  SETTING_KEYS.smtpHost,
  SETTING_KEYS.smtpPort,
  SETTING_KEYS.smtpUser,
  SETTING_KEYS.smtpPass,
  SETTING_KEYS.smtpSecure,
  SETTING_KEYS.smtpFrom,
] as const;

function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export interface EffectiveEmailConfig {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  /** Where the winning config block came from. */
  source: "settings" | "env" | "none";
  /** true when host+user+pass are all present (mail can actually be sent). */
  configured: boolean;
}

function buildConfig(fields: {
  host?: string;
  portRaw?: string;
  user?: string;
  pass?: string;
  secureRaw?: string;
  from?: string;
  source: EffectiveEmailConfig["source"];
}): EffectiveEmailConfig {
  const host = clean(fields.host);
  const user = clean(fields.user);
  const pass = clean(fields.pass);
  const port = Number(fields.portRaw) > 0 ? Math.floor(Number(fields.portRaw)) : 587;
  const secureRaw = clean(fields.secureRaw);
  const secure =
    secureRaw === "true" || secureRaw === "ssl"
      ? true
      : secureRaw === "false" || secureRaw === "tls" || secureRaw === "none"
        ? false
        : port === 465;
  const from = clean(fields.from) ?? DEFAULT_FROM;
  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    source: fields.source,
    configured: Boolean(host && user && pass),
  };
}

/**
 * Resolve the effective SMTP configuration: Settings table first, then env.
 * Safe on unmigrated DBs (getSettings fails gracefully → env fallback).
 */
export async function getEmailConfig(): Promise<EffectiveEmailConfig> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings([...SMTP_SETTING_KEYS]);
  } catch {
    s = {};
  }

  const dbHost = clean(s[SETTING_KEYS.smtpHost]);
  const dbUser = clean(s[SETTING_KEYS.smtpUser]);
  const dbPass = clean(s[SETTING_KEYS.smtpPass]);
  if (dbHost && dbUser && dbPass) {
    return buildConfig({
      host: dbHost,
      portRaw: s[SETTING_KEYS.smtpPort],
      user: dbUser,
      pass: dbPass,
      secureRaw: s[SETTING_KEYS.smtpSecure],
      from: s[SETTING_KEYS.smtpFrom],
      source: "settings",
    });
  }

  const envHost = clean(process.env.SMTP_HOST);
  const envUser = clean(process.env.SMTP_USER);
  const envPass = clean(process.env.SMTP_PASS);
  if (envHost && envUser && envPass) {
    return buildConfig({
      host: envHost,
      portRaw: process.env.SMTP_PORT,
      user: envUser,
      pass: envPass,
      secureRaw: undefined,
      from: process.env.SMTP_FROM,
      source: "env",
    });
  }

  // Nothing usable — still return a "from" so skipped logs look correct.
  const partialFrom =
    clean(s[SETTING_KEYS.smtpFrom]) ?? clean(process.env.SMTP_FROM) ?? DEFAULT_FROM;
  return {
    host: dbHost ?? envHost,
    port: Number(s[SETTING_KEYS.smtpPort] ?? process.env.SMTP_PORT) > 0
      ? Math.floor(Number(s[SETTING_KEYS.smtpPort] ?? process.env.SMTP_PORT))
      : 587,
    secure: false,
    user: dbUser ?? envUser,
    pass: dbPass ?? envPass,
    from: partialFrom,
    source: "none",
    configured: false,
  };
}

/**
 * Legacy env-only check (kept for callers that cannot await). Prefer
 * `getEmailConfig().configured` for the real answer.
 */
export function isEmailConfigured(): boolean {
  return Boolean(
    clean(process.env.SMTP_HOST) && clean(process.env.SMTP_USER) && clean(process.env.SMTP_PASS),
  );
}

/**
 * Returns the configured "From" address (settings → SMTP_FROM env → default).
 */
export function getEmailFrom(): string {
  const v = process.env.SMTP_FROM;
  return v && v.trim().length > 0 ? v.trim() : DEFAULT_FROM;
}

/**
 * Verify an SMTP connection (used by /api/admin/test-smtp). Never throws.
 * Returns `{ ok: true }` or `{ ok: false, error }`.
 */
export async function verifySmtpConnection(cfg: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
      tls: { rejectUnauthorized: false },
    });
    await transporter.verify();
    transporter.close();
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 300) };
  }
}

// ---------------------------------------------------------------------------
// Lazy transporter singleton — keyed by config fingerprint so a settings
// change (or env change) transparently creates a fresh transporter.
// ---------------------------------------------------------------------------

let _transporter: Transporter | null = null;
let _fingerprint = "";

function getTransporter(cfg: EffectiveEmailConfig): Transporter {
  const fingerprint = JSON.stringify([
    cfg.host,
    cfg.port,
    cfg.secure,
    cfg.user,
    cfg.pass,
  ]);
  if (_transporter && _fingerprint === fingerprint) return _transporter;
  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
    tls: { rejectUnauthorized: false },
  });
  _fingerprint = fingerprint;
  return _transporter;
}

/**
 * Force the next sendEmail() to rebuild the transporter (called after the
 * SuperAdmin saves new SMTP settings).
 */
export function resetEmailTransporter(): void {
  _transporter = null;
  _fingerprint = "";
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  /** Optional link back to the user who triggered the email (for EmailLog). */
  userId?: string;
}

export interface SendEmailResult {
  success: boolean;
  status: "sent" | "failed" | "skipped";
  error?: string;
  logId?: string;
}

export interface EmailTemplateVars {
  [key: string]: string | number | undefined;
}

// ---------------------------------------------------------------------------
// Template helper
// ---------------------------------------------------------------------------

/**
 * Replace `{{varName}}` placeholders in a template string with values from
 * `vars`. Missing/undefined values are replaced with an empty string.
 *
 * Example:
 *   renderTemplate("Hello {{name}}, your plan is {{plan}}", { name: "Awa", plan: "Pro" })
 *   → "Hello Awa, your plan is Pro"
 */
export function renderTemplate(template: string, vars: EmailTemplateVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

// ---------------------------------------------------------------------------
// Truncation helper — keeps EmailLog.body from growing unbounded
// ---------------------------------------------------------------------------

function truncateBody(body: string | undefined): string | null {
  if (!body) return null;
  if (body.length <= 5000) return body;
  return body.slice(0, 5000) + "…[truncated]";
}

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------

/**
 * Send an email via SMTP, with full audit trail in EmailLog.
 *
 * - Always creates an EmailLog row with status="queued" first.
 * - If SMTP is not configured: marks the log as "skipped", console.logs the
 *   message, and returns `{ success: true, status: "skipped" }` (dev mode).
 * - If SMTP is configured: calls transporter.sendMail, updates the log to
 *   "sent" (with sentAt) or "failed" (with error).
 * - NEVER throws. All errors are caught and returned in `SendEmailResult`.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { to, subject, html, text, userId } = input;
  const cfg = await getEmailConfig();
  const from = cfg.from;
  const bodyForLog = truncateBody(text || html);

  // 1) Create the EmailLog row as "queued" — try/catch so DB hiccups don't
  //    bubble up to the caller.
  let logId: string | undefined;
  try {
    const log = await db.emailLog.create({
      data: {
        to,
        from,
        subject,
        body: bodyForLog,
        status: "queued",
        userId: userId ?? null,
      },
    });
    logId = log.id;
  } catch (err) {
    // If we can't even write the log, we still attempt the send below — but
    // we won't be able to update a log row.
    console.error("[email] Failed to create EmailLog row:", err);
  }

  // 2) Not configured — mark skipped + console.log (body is fully logged
  //    so dev environments can still "read" the mail).
  if (!cfg.configured) {
    console.log(
      `[email:skipped] to=${to} subject="${subject}" body="${(text || html || "").slice(0, 200)}"`,
    );
    if (logId) {
      try {
        await db.emailLog.update({
          where: { id: logId },
          data: { status: "skipped" },
        });
      } catch (err) {
        console.error("[email] Failed to update EmailLog → skipped:", err);
      }
    }
    return { success: true, status: "skipped", logId };
  }

  // 3) Configured — actually send via SMTP.
  try {
    const transporter = getTransporter(cfg);
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    if (logId) {
      try {
        await db.emailLog.update({
          where: { id: logId },
          data: { status: "sent", sentAt: new Date() },
        });
      } catch (err) {
        console.error("[email] Failed to update EmailLog → sent:", err);
      }
    }

    return { success: true, status: "sent", logId };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown SMTP error";

    if (logId) {
      try {
        await db.emailLog.update({
          where: { id: logId },
          data: { status: "failed", error: errorMsg },
        });
      } catch (updateErr) {
        console.error("[email] Failed to update EmailLog → failed:", updateErr);
      }
    }

    console.error(`[email:failed] to=${to} subject="${subject}" error=${errorMsg}`);
    return { success: false, status: "failed", error: errorMsg, logId };
  }
}
