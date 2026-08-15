import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getOrCreateConsumer,
  awardScanPoints,
  getConsumerProfile,
} from "@/lib/loyalty";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/loyalty/scan
 * PUBLIC endpoint (no auth) — called from the public LoyaltyWidget when a
 * consumer scans a product QR code for the first time on a given device.
 *
 * Body:
 *   { anonymousId: string, lotId: string, scanId?: string, email?: string }
 *
 * Behavior:
 *   1. Rate-limit by IP (prevents a single attacker from inflating points
 *      by hammering the endpoint).
 *   2. `getOrCreateConsumer(anonymousId)` — upserts the consumer row.
 *   3. Link the existing Scan record to the consumer:
 *      - If `scanId` is provided, use it directly.
 *      - Otherwise, find the most-recent unlinked Scan for this lot
 *        (the public product page records a scan on mount via `recordScan`
 *        in `src/lib/public-data.ts` — that scan has `consumerId = null`).
 *      - If the scan is already linked to ANOTHER consumer, do nothing
 *        (this is a re-scan from a different device — we don't want to
 *        re-award points to the new consumer).
 *      - If the scan is already linked to THIS consumer, don't re-award
 *        points (idempotency).
 *   4. `awardScanPoints(consumerId, scanId, lotId)` — adds 10 pts + bumps
 *      totalScans + checks badge thresholds.
 *   5. Returns the points awarded + new badges + refreshed consumer profile.
 *
 * The widget uses `localStorage` to track which lots were already scanned
 * (so it doesn't call this endpoint twice for the same lot). This endpoint
 * also has server-side idempotency (scan already linked → no double award).
 */
export async function POST(request: NextRequest) {
  // --- Rate limit (IP-based, since this is public) ---
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "loyalty:scan",
    key: "", // overridden by applyRateLimit (uses IP)
  });
  if (limited) return limited;

  try {
    const body = await request.json();

    // --- Validate input ---
    if (
      typeof body?.anonymousId !== "string" ||
      !body.anonymousId.trim() ||
      typeof body?.lotId !== "string" ||
      !body.lotId.trim()
    ) {
      return NextResponse.json(
        { error: "Paramètres invalides : anonymousId et lotId sont requis." },
        { status: 400 },
      );
    }

    const anonymousId = body.anonymousId.trim();
    const lotId = body.lotId.trim();
    const scanId =
      typeof body.scanId === "string" && body.scanId.trim()
        ? body.scanId.trim()
        : null;
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : undefined;

    // --- 1. Get-or-create the consumer ---
    const consumer = await getOrCreateConsumer(anonymousId, email);

    // --- 1b. Server-side idempotency ---
    // If the consumer already has a scan for this lot, don't re-award points.
    // This guards against the client's localStorage being cleared (which would
    // otherwise let a determined user inflate their points by re-calling this
    // endpoint for the same lot).
    const existingScan = await db.scan.findFirst({
      where: { lotId, consumerId: consumer.id },
      select: { id: true },
    });
    if (existingScan) {
      const profile = await getConsumerProfile(anonymousId);
      return NextResponse.json({
        pointsAwarded: 0,
        newTotal: profile?.points ?? 0,
        newBadges: [],
        alreadyScanned: true,
        profile,
      });
    }

    // --- 2. Find the Scan to link ---
    let scan: { id: string; consumerId: string | null } | null = null;

    if (scanId) {
      // Use the explicit scanId (verify it belongs to the lot).
      scan = await db.scan.findFirst({
        where: { id: scanId, lotId },
        select: { id: true, consumerId: true },
      });
    } else {
      // Find the most-recent unlinked scan for this lot (created by the
      // public product page's `recordScan` call).
      scan = await db.scan.findFirst({
        where: { lotId, consumerId: null },
        orderBy: { scannedAt: "desc" },
        select: { id: true, consumerId: true },
      });
    }

    if (!scan) {
      // No unlinked scan found — fall back to creating a fresh scan record
      // linked directly to this consumer. This handles the case where the
      // public page's `recordScan` was skipped (e.g. bot detection, error),
      // OR the consumer is scanning via the API directly (curl tests).
      const newScan = await db.scan.create({
        data: {
          lotId,
          consumerId: consumer.id,
          userAgent: request.headers.get("user-agent") ?? undefined,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("x-real-ip") ??
            undefined,
        },
      });
      // Skip the idempotency check below (we just created this scan with
      // the consumer already linked) and go straight to awarding points.
      const award = await awardScanPoints(consumer.id, newScan.id, lotId);
      const profile = await getConsumerProfile(anonymousId);
      return NextResponse.json({
        pointsAwarded: award.pointsAwarded,
        newTotal: award.newTotal,
        newBadges: award.newBadges,
        alreadyScanned: false,
        profile,
      });
    }

    // --- 3. Idempotency check (for found existing scans) ---
    // If the scan is already linked to this consumer → no points awarded.
    // If the scan is linked to ANOTHER consumer → return current profile
    // (no points) so the widget doesn't crash.
    if (scan.consumerId && scan.consumerId !== consumer.id) {
      const profile = await getConsumerProfile(anonymousId);
      return NextResponse.json({
        pointsAwarded: 0,
        newTotal: profile?.points ?? 0,
        newBadges: [],
        alreadyScanned: true,
        profile,
      });
    }

    if (scan.consumerId === consumer.id) {
      // Already linked to this consumer — don't re-award.
      const profile = await getConsumerProfile(anonymousId);
      return NextResponse.json({
        pointsAwarded: 0,
        newTotal: profile?.points ?? 0,
        newBadges: [],
        alreadyScanned: true,
        profile,
      });
    }

    // --- 4. Link the scan to the consumer ---
    await db.scan.update({
      where: { id: scan.id },
      data: { consumerId: consumer.id },
    });

    // --- 5. Award points + check badges ---
    const award = await awardScanPoints(consumer.id, scan.id, lotId);

    // --- 6. Refresh profile ---
    const profile = await getConsumerProfile(anonymousId);

    return NextResponse.json({
      pointsAwarded: award.pointsAwarded,
      newTotal: award.newTotal,
      newBadges: award.newBadges,
      alreadyScanned: false,
      profile,
    });
  } catch (error) {
    console.error("[POST /api/loyalty/scan] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'enregistrement du scan fidélité." },
      { status: 500 },
    );
  }
}
