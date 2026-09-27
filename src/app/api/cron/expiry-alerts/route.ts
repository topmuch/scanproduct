// ============================================================================
// Cron endpoint — Expiry alert emails for fabricants
// ============================================================================
// POST|GET /api/cron/expiry-alerts?secret=<CRON_SECRET>
//          (or Authorization: Bearer <CRON_SECRET>)
//
// Triggered by an external scheduler (Coolify Scheduled Task / crontab).
// Recommended schedule: daily at 08:00.
//   Example Coolify task: curl -s https://verifscan.sn/api/cron/expiry-alerts?secret=$CRON_SECRET
//
// Behaviour: for every ACTIVE fabricant, find ACTIVE lots whose expiryDate
// falls within 30 days, group them into urgency buckets (≤7 j / ≤15 j /
// ≤30 j) and send ONE email per fabricant per day (type lot_expiring,
// severity = worst bucket). Daily dedup — running twice never double-sends.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { runExpiryAlertsJob } from "@/lib/fabricant-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const auth = validateCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await runExpiryAlertsJob();
    return NextResponse.json({
      ok: true,
      job: "expiry-alerts",
      ...result,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    console.error("[cron/expiry-alerts] fatal:", err);
    return NextResponse.json(
      { ok: false, job: "expiry-alerts", error: String(err) },
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
