// ============================================================================
// Cron endpoint — Weekly digest emails for fabricants
// ============================================================================
// POST|GET /api/cron/weekly-digest?secret=<CRON_SECRET>
//          (or Authorization: Bearer <CRON_SECRET>)
//
// Triggered by an external scheduler (Coolify Scheduled Task / crontab).
// Recommended schedule: every Monday at 08:00 (server time).
//   Example Coolify task: curl -s https://verifscan.sn/api/cron/weekly-digest?secret=$CRON_SECRET
//
// Behaviour: for every ACTIVE fabricant, aggregate the last 7 days of scans
// per product/lot + expiry preview and send ONE rich email (type
// weekly_report). Idempotent per ISO week — running twice never double-sends.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { runWeeklyDigestJob } from "@/lib/fabricant-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const auth = validateCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await runWeeklyDigestJob();
    return NextResponse.json({
      ok: true,
      job: "weekly-digest",
      ...result,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    console.error("[cron/weekly-digest] fatal:", err);
    return NextResponse.json(
      { ok: false, job: "weekly-digest", error: String(err) },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
