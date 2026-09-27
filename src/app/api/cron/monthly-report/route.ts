// ============================================================================
// Cron endpoint — Monthly report emails for fabricants
// ============================================================================
// POST|GET /api/cron/monthly-report?secret=<CRON_SECRET>
//          (or Authorization: Bearer <CRON_SECRET>)
//
// Triggered by an external scheduler (Coolify Scheduled Task / crontab).
// Recommended schedule: 1st of each month at 08:00 (server time).
//   Example Coolify task: curl -s https://verifscan.sn/api/cron/monthly-report?secret=$CRON_SECRET
//
// Behaviour: for every ACTIVE fabricant, aggregate the PREVIOUS calendar
// month (lots générés, scans par produit, demandes de devis reçues,
// lots expirant bientôt / expirés) and send ONE rich email (type
// monthly_report). Idempotent per month key — running twice never
// double-sends.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { runMonthlyReportJob } from "@/lib/fabricant-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const auth = validateCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await runMonthlyReportJob();
    return NextResponse.json({
      ok: true,
      job: "monthly-report",
      ...result,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    console.error("[cron/monthly-report] fatal:", err);
    return NextResponse.json(
      { ok: false, job: "monthly-report", error: String(err) },
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
