// ============================================================================
// VerifScan — Cron request authentication
// ============================================================================
// The scheduled email jobs (weekly digest, expiry alerts) are triggered by an
// external scheduler (Coolify Scheduled Task, system crontab, uptime pinger…)
// hitting protected API routes. Every /api/cron/* route MUST validate the
// request through validateCronRequest() before doing any work.
//
// Accepted credentials (either one):
//   - Authorization: Bearer <CRON_SECRET>
//   - ?secret=<CRON_SECRET>            (handy for plain curl in Coolify)
//
// Env: CRON_SECRET — a long random string. When missing/empty, ALL cron
// routes reject every request (fail closed), so a forgotten env var can never
// expose the job endpoints publicly.
// ============================================================================

import crypto from "crypto";
import type { NextRequest } from "next/server";

export interface CronAuthResult {
  ok: boolean;
  reason?: string;
}

/** Constant-time string comparison to avoid leaking the secret via timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so short guesses don't return faster.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export function validateCronRequest(req: NextRequest): CronAuthResult {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim() === "") {
    return { ok: false, reason: "CRON_SECRET non configuré côté serveur" };
  }

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const query = req.nextUrl.searchParams.get("secret");
  const provided = bearer ?? (query && query.trim() !== "" ? query.trim() : null);

  if (!provided) {
    return { ok: false, reason: "Secret manquant (Authorization: Bearer ou ?secret=)" };
  }
  if (!safeEqual(provided, secret)) {
    return { ok: false, reason: "Secret invalide" };
  }
  return { ok: true };
}
