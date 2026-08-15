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

// ---------------------------------------------------------------------------
// SMTP configuration
// ---------------------------------------------------------------------------

const DEFAULT_FROM = "VerifScan <no-reply@verifscan.sn>";

function smtpHost(): string | undefined {
  const v = process.env.SMTP_HOST;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}
function smtpUser(): string | undefined {
  const v = process.env.SMTP_USER;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}
function smtpPass(): string | undefined {
  const v = process.env.SMTP_PASS;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}
function smtpPort(): number {
  const raw = Number(process.env.SMTP_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : 587;
}

/**
 * Returns true only when SMTP_HOST AND SMTP_USER AND SMTP_PASS are all set.
 * Used to decide whether to actually send mail or to log to console (dev mode).
 */
export function isEmailConfigured(): boolean {
  return Boolean(smtpHost() && smtpUser() && smtpPass());
}

/**
 * Returns the configured "From" address (SMTP_FROM env or the default).
 */
export function getEmailFrom(): string {
  const v = process.env.SMTP_FROM;
  return v && v.trim().length > 0 ? v.trim() : DEFAULT_FROM;
}

// ---------------------------------------------------------------------------
// Lazy transporter singleton
// ---------------------------------------------------------------------------

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: smtpHost(),
    port: smtpPort(),
    secure: smtpPort() === 465,
    auth: {
      user: smtpUser(),
      pass: smtpPass(),
    },
  });
  return _transporter;
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
  const from = getEmailFrom();
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

  // 2) Dev mode — SMTP not configured: mark skipped + console.log.
  if (!isEmailConfigured()) {
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
    const transporter = getTransporter();
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
