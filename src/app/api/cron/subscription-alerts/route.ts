// ============================================================================
// Cron endpoint — End-of-subscription alert emails
// ============================================================================
// POST|GET /api/cron/subscription-alerts?secret=<CRON_SECRET>
//          (or Authorization: Bearer <CRON_SECRET>)
//
// Triggered by an external scheduler (Coolify Scheduled Task / crontab).
// Recommended schedule: daily at 08:00 (server time).
//   Example Coolify task: curl -s https://verifscan.sn/api/cron/subscription-alerts?secret=$CRON_SECRET
//
// Behaviour: for every ACTIVE fabricant, check the ACTIVE Subscription row
// (auto-provisioned for legacy users) and email alerts at J-7 / J-3, then a
// final "expired" email. One email per bucket per subscription period —
// running the cron twice never double-sends. Also flips overdue ACTIVE
// subscriptions to status EXPIRED.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { runSubscriptionAlertsJob } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const auth = validateCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await runSubscriptionAlertsJob();
    return NextResponse.json({
      ok: true,
      job: "subscription-alerts",
      ...result,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    console.error("[cron/subscription-alerts] fatal:", err);
    return NextResponse.json(
      { ok: false, job: "subscription-alerts", error: String(err) },
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
