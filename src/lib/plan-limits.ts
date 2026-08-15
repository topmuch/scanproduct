// ============================================================================
// VerifScan — Plan quota config + helpers
// ============================================================================
// Pure server-side module. No React, no API routes.
//
// Three plans match the AbonnementPage.tsx UI (Starter / Pro / Business).
// The plan a fabricant is on is currently read from the Setting key/value
// store (key = `plan:${userId}`). When a proper Subscription model is added
// later, only getUserPlan() needs to change — the rest of the file is
// agnostic to the storage backend.
//
// Used by:
//   - QR generate API (canGenerateQr — enforce monthly QR quota)
//   - Product create API (getFabricantProductUsage — enforce product cap)
//   - Cron / on-demand worker (checkQuotaAlert — fire quota_warning/exceeded)
// ============================================================================

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Plan configuration
// ---------------------------------------------------------------------------

export interface PlanConfig {
  id: "starter" | "pro" | "business";
  name: string;
  /** Max QR codes generated per calendar month. */
  qrLimit: number;
  /** Max active products. */
  productLimit: number;
  /** Monthly price in FCFA (0 = "sur devis" for Business). */
  priceMonthly: number;
}

/**
 * Plan catalog. `business` uses large finite numbers (100 000) instead of
 * Infinity — Infinity is not JSON-serializable and would break any
 * Setting/JSON roundtrip, and 100k is effectively unlimited for any real
 * fabricant.
 */
export const PLANS: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    qrLimit: 100,
    productLimit: 10,
    priceMonthly: 10000,
  },
  pro: {
    id: "pro",
    name: "Pro",
    qrLimit: 1000,
    productLimit: 50,
    priceMonthly: 25000,
  },
  business: {
    id: "business",
    name: "Business",
    qrLimit: 100000,
    productLimit: 100000,
    priceMonthly: 0, // sur devis
  },
};

export const DEFAULT_PLAN = "starter";

// ---------------------------------------------------------------------------
// Usage snapshot type
// ---------------------------------------------------------------------------

export interface UsageSnapshot {
  used: number;
  limit: number;
  /** (used / limit) * 100, capped at 100. */
  percent: number;
  /** max(0, limit - used). */
  remaining: number;
}

// ---------------------------------------------------------------------------
// Plan lookup
// ---------------------------------------------------------------------------

/**
 * Read the fabricant's current plan from the Setting key/value store.
 *
 *   - Key: `plan:${userId}`
 *   - Value: "starter" | "pro" | "business"
 *
 * If the key is missing or the value doesn't match a known plan, falls back
 * to DEFAULT_PLAN. Any DB error → DEFAULT_PLAN (never throws).
 */
export async function getUserPlan(
  userId: string,
): Promise<{ plan: string; config: PlanConfig }> {
  try {
    const row = await db.setting.findUnique({
      where: { key: `plan:${userId}` },
    });
    const planId = row?.value?.trim();
    if (planId && PLANS[planId]) {
      return { plan: planId, config: PLANS[planId] };
    }
    return { plan: DEFAULT_PLAN, config: PLANS[DEFAULT_PLAN] };
  } catch (err) {
    console.error("[plan-limits] getUserPlan failed:", err);
    return { plan: DEFAULT_PLAN, config: PLANS[DEFAULT_PLAN] };
  }
}

// ---------------------------------------------------------------------------
// Month boundary helper
// ---------------------------------------------------------------------------

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

// ---------------------------------------------------------------------------
// QR usage
// ---------------------------------------------------------------------------

/**
 * Count QR codes created by this fabricant in the current calendar month,
 * compared against their plan's monthly QR quota.
 *
 * Used by:
 *   - The dashboard "Quota QR" widget
 *   - checkQuotaAlert / canGenerateQr
 */
export async function getFabricantQrUsage(
  userId: string,
): Promise<UsageSnapshot> {
  const { config } = await getUserPlan(userId);
  const limit = config.qrLimit;

  let used = 0;
  try {
    used = await db.qRCode.count({
      where: {
        fabricantId: userId,
        createdAt: { gte: startOfCurrentMonth() },
      },
    });
  } catch (err) {
    console.error("[plan-limits] getFabricantQrUsage count failed:", err);
    used = 0;
  }

  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = Math.max(0, limit - used);

  return { used, limit, percent, remaining };
}

// ---------------------------------------------------------------------------
// Product usage
// ---------------------------------------------------------------------------

/**
 * Count active (non-archived) products owned by this fabricant, compared
 * against their plan's product cap.
 *
 * Note: unlike QR codes, products are not reset monthly — the count is the
 * total active products at this moment.
 */
export async function getFabricantProductUsage(
  userId: string,
): Promise<UsageSnapshot> {
  const { config } = await getUserPlan(userId);
  const limit = config.productLimit;

  let used = 0;
  try {
    used = await db.product.count({
      where: {
        fabricantId: userId,
        status: { not: "ARCHIVED" },
      },
    });
  } catch (err) {
    console.error("[plan-limits] getFabricantProductUsage count failed:", err);
    used = 0;
  }

  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = Math.max(0, limit - used);

  return { used, limit, percent, remaining };
}

// ---------------------------------------------------------------------------
// Quota alerts
// ---------------------------------------------------------------------------

export interface QuotaAlertResult {
  /** True when percent >= 80 (warning) or >= 100 (exceeded). */
  shouldAlert: boolean;
  /** "quota_warning" (80–99%) | "quota_exceeded" (>=100%) | undefined. */
  type?: "quota_warning" | "quota_exceeded";
  percent: number;
  used: number;
  limit: number;
}

/**
 * Check whether the fabricant's QR usage has crossed an alert threshold.
 *
 *   - percent >= 100 → "quota_exceeded" (critical, blocks further QR creation)
 *   - percent >= 80  → "quota_warning"  (heads-up, still allowed)
 *   - below 80       → no alert
 *
 * Used by the QR generate API to decide whether to fire a notification
 * alongside the regular response.
 */
export async function checkQuotaAlert(userId: string): Promise<QuotaAlertResult> {
  const usage = await getFabricantQrUsage(userId);
  const { used, limit, percent } = usage;

  if (percent >= 100) {
    return { shouldAlert: true, type: "quota_exceeded", percent, used, limit };
  }
  if (percent >= 80) {
    return { shouldAlert: true, type: "quota_warning", percent, used, limit };
  }
  return { shouldAlert: false, percent, used, limit };
}

// ---------------------------------------------------------------------------
// Hard quota enforcement
// ---------------------------------------------------------------------------

export interface CanGenerateQrResult {
  allowed: boolean;
  /** Human-readable reason when `allowed` is false (French, for the UI). */
  reason?: string;
  /** Remaining QR codes the fabricant can still generate this month. */
  remaining: number;
}

/**
 * Decide whether a fabricant can generate `requestedQty` more QR codes this
 * month without exceeding their plan quota.
 *
 *   allowed = (used + requestedQty) <= limit
 *
 * Used as a hard gate by the QR generate API (POST /api/qrcodes/bulk).
 * Returns `allowed: false` with a French reason message when the request
 * would push the fabricant over their plan's monthly QR quota.
 */
export async function canGenerateQr(
  userId: string,
  requestedQty: number,
): Promise<CanGenerateQrResult> {
  const usage = await getFabricantQrUsage(userId);
  const { used, limit, remaining } = usage;

  // Guard against nonsensical input.
  const qty = Math.max(0, Math.floor(requestedQty));

  if (used + qty > limit) {
    return {
      allowed: false,
      reason:
        `Quota dépassé : votre plan autorise ${limit} QR codes par mois, ` +
        `vous en avez déjà utilisé ${used}. ` +
        `Il vous reste ${remaining} QR codes — vous demandez ${qty}.`,
      remaining,
    };
  }

  return { allowed: true, remaining };
}
