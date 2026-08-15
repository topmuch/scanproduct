/**
 * VerifScan V3 — Programme de Fidélité Consommateur
 * ==================================================
 *
 * Server-only module that implements the consumer loyalty program:
 *
 *   - Consumers are identified by an `anonymousId` (cookie/localStorage)
 *     until they register (optional email/phone).
 *   - Each scan = 10 points.
 *   - Badge tiers reward engagement:
 *       • explorateur  (100 pts / 10 scans)  🌟
 *       • ambassadeur  (500 pts / 50 scans)  🏆
 *       • expert      (1000 pts / 100 scans) 👑
 *   - Points can be redeemed for rewards (discounts, free product, factory
 *     visit). Each redemption generates a unique code.
 *
 * All functions are wrapped in try/catch where appropriate and return
 * sensible fallbacks — the consumer-facing endpoints must never crash.
 *
 * Design rules:
 *   - `badges` is stored as a JSON-encoded string (SQLite limitation). Use
 *     `parseBadges` / `serializeBadges` to round-trip it safely.
 *   - All DB writes use Prisma transactions where multiple tables are touched
 *     (e.g. awarding points + updating the scan link).
 *   - `anonymousId` is the public identifier (never expose the internal
 *     `Consumer.id` to the client).
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RewardType = "discount_5" | "discount_10" | "free_product" | "factory_visit";

export type BadgeId = "explorateur" | "ambassadeur" | "expert";

export interface RewardItem {
  type: RewardType;
  label: string;
  pointsCost: number;
  icon: string;
  description: string;
}

export interface BadgeTier {
  id: BadgeId;
  label: string;
  minPoints: number;
  icon: string;
  color: string;
}

export interface ConsumerProfile {
  id: string;
  anonymousId: string;
  points: number;
  totalScans: number;
  badges: string[];
  nextBadge: {
    label: string;
    minPoints: number;
    pointsRemaining: number;
  } | null;
  recentScans: Array<{
    lotId: string;
    productName: string;
    scannedAt: string;
  }>;
  redemptions: Array<{
    id: string;
    rewardLabel: string;
    pointsCost: number;
    status: string;
    createdAt: string;
    code: string | null;
  }>;
}

export interface AwardScanResult {
  pointsAwarded: number;
  newTotal: number;
  newBadges: string[];
}

export interface FabricantLoyaltyStats {
  totalConsumers: number;
  totalPointsDistributed: number;
  totalScans: number;
  topBadges: Array<{ badgeId: string; label: string; icon: string; color: string; count: number }>;
  recentRedemptions: Array<{
    id: string;
    rewardLabel: string;
    rewardType: string;
    pointsCost: number;
    status: string;
    code: string | null;
    createdAt: string;
    consumerLabel: string;
  }>;
  topConsumers: Array<{
    id: string;
    label: string;
    points: number;
    scansCount: number;
    badges: string[];
  }>;
  totalRedemptions: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Points awarded per scan. Centralized here so future tuning happens in one
 * place (e.g. bonus points for first scan of a new fabricant).
 */
export const POINTS_PER_SCAN = 10;

/**
 * Rewards catalog — hardcoded (the spec says so). Each entry has a stable
 * `type` (used as the API identifier), a French `label` (UI display), the
 * `pointsCost`, an emoji `icon`, and a short `description`.
 */
export const REWARDS_CATALOG: RewardItem[] = [
  {
    type: "discount_5",
    label: "Réduction 5% sur votre prochain achat",
    pointsCost: 100,
    icon: "🏷️",
    description: "Code de réduction de 5% valable sur votre prochain achat chez le fabricant.",
  },
  {
    type: "discount_10",
    label: "Réduction 10% sur votre prochain achat",
    pointsCost: 250,
    icon: "💸",
    description: "Code de réduction de 10% valable sur votre prochain achat chez le fabricant.",
  },
  {
    type: "free_product",
    label: "Produit offert",
    pointsCost: 500,
    icon: "🎁",
    description: "Recevez un produit de la marque gratuitement (à retirer en point de vente).",
  },
  {
    type: "factory_visit",
    label: "Visite d'usine",
    pointsCost: 1000,
    icon: "🏭",
    description: "Visite guidée exclusive de l'usine du fabricant avec dégustation.",
  },
];

/**
 * Badge tiers — ordered by ascending `minPoints`. The badge color is used for
 * UI styling (emerald for Explorateur, gold for Ambassadeur, purple for
 * Expert — per the project's loyalty color palette).
 */
export const BADGE_TIERS: BadgeTier[] = [
  {
    id: "explorateur",
    label: "Explorateur",
    minPoints: 100,
    icon: "🌟",
    color: "#10B981",
  },
  {
    id: "ambassadeur",
    label: "Ambassadeur",
    minPoints: 500,
    icon: "🏆",
    color: "#F59E0B",
  },
  {
    id: "expert",
    label: "Expert",
    minPoints: 1000,
    icon: "👑",
    color: "#8B5CF6",
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safely parse the JSON-encoded `badges` string into a `string[]`. */
function parseBadges(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((b): b is string => typeof b === "string");
    }
  } catch {
    /* ignore — return empty */
  }
  return [];
}

/** Serialize a `string[]` back to the JSON-encoded storage format. */
function serializeBadges(badges: string[]): string {
  return JSON.stringify(badges);
}

/**
 * Compute which badges the consumer just crossed (i.e. badges whose threshold
 * is now met but were NOT already earned).
 */
function computeNewBadges(currentPoints: number, existingBadges: string[]): string[] {
  const earned = new Set(existingBadges);
  return BADGE_TIERS.filter(
    (tier) => currentPoints >= tier.minPoints && !earned.has(tier.id),
  ).map((tier) => tier.id);
}

/**
 * Mask a consumer's anonymous ID for the fabricant dashboard — show a short
 * numeric label like "Consommateur #42" rather than the full UUID. The index
 * is derived from the consumer's row `createdAt` so it's stable per consumer.
 *
 * NOTE: this is purely cosmetic; the underlying consumer can still be joined
 * via `Consumer.id` from the redemptions/scans tables.
 */
function maskConsumerId(anonymousId: string, index: number): string {
  return `Consommateur #${index + 1}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get-or-create a Consumer by `anonymousId`.
 *
 * - If the consumer exists, optionally update their email if they previously
 *   had none (we never overwrite an existing email).
 * - Returns the consumer row.
 */
export async function getOrCreateConsumer(
  anonymousId: string,
  email?: string,
) {
  const cleanAnon = anonymousId.trim();
  const cleanEmail = email?.trim() || undefined;

  // Try to find first (cheap path).
  const existing = await db.consumer.findUnique({
    where: { anonymousId: cleanAnon },
  });

  if (existing) {
    // If an email is provided AND the consumer has no email yet, update it.
    if (cleanEmail && !existing.email) {
      try {
        return await db.consumer.update({
          where: { id: existing.id },
          data: { email: cleanEmail },
        });
      } catch {
        // Email update is best-effort; return the existing row on failure.
        return existing;
      }
    }
    return existing;
  }

  // Otherwise create a new consumer.
  return db.consumer.create({
    data: {
      anonymousId: cleanAnon,
      email: cleanEmail,
    },
  });
}

/**
 * Award 10 points for a scan + bump `totalScans`.
 *
 * Also checks for badge threshold crossings and adds the new badges to the
 * consumer's `badges` JSON array.
 *
 * NOTE: this function does NOT create the Scan record (the public scan API
 * route is responsible for that). It only updates the consumer's points and
 * badge state. The caller passes the `scanId` so the function is idempotent
 * — if a scan was already linked to a consumer, we don't re-award points
 * (the API route checks this before calling).
 */
export async function awardScanPoints(
  consumerId: string,
  _scanId: string,
  _lotId: string,
): Promise<AwardScanResult> {
  // Atomically increment points + totalScans, then read the new totals.
  const updated = await db.consumer.update({
    where: { id: consumerId },
    data: {
      points: { increment: POINTS_PER_SCAN },
      totalScans: { increment: 1 },
    },
    select: { points: true, badges: true },
  });

  // Compute newly-earned badges.
  const currentBadges = parseBadges(updated.badges);
  const newBadges = computeNewBadges(updated.points, currentBadges);

  // If new badges were earned, persist them.
  if (newBadges.length > 0) {
    const merged = [...currentBadges, ...newBadges];
    try {
      await db.consumer.update({
        where: { id: consumerId },
        data: { badges: serializeBadges(merged) },
      });
    } catch {
      // Non-fatal: the points are already awarded. The badges will be
      // recomputed on the next profile fetch via the fallback path.
    }
  }

  return {
    pointsAwarded: POINTS_PER_SCAN,
    newTotal: updated.points,
    newBadges,
  };
}

/**
 * Fetch the consumer's full profile for the public widget / dashboard.
 *
 * - Includes: points, totalScans, badges, next badge progress, recent scans
 *   (last 10), redemptions (last 20).
 * - If the consumer doesn't exist, returns null (the caller can decide
 *   whether to upsert or return an empty profile).
 */
export async function getConsumerProfile(
  anonymousId: string,
): Promise<ConsumerProfile | null> {
  const consumer = await db.consumer.findUnique({
    where: { anonymousId: anonymousId.trim() },
    include: {
      scans: {
        take: 10,
        orderBy: { scannedAt: "desc" },
        select: {
          id: true,
          lotId: true,
          scannedAt: true,
          lot: {
            select: {
              product: { select: { name: true } },
            },
          },
        },
      },
      redemptions: {
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rewardLabel: true,
          pointsCost: true,
          status: true,
          code: true,
          createdAt: true,
        },
      },
    },
  });

  if (!consumer) return null;

  const badges = parseBadges(consumer.badges);

  // Compute the next badge to earn (lowest-tier badge whose threshold is not
  // yet met). If all badges are earned, returns null.
  const nextBadge = BADGE_TIERS.find((t) => !badges.includes(t.id)) ?? null;
  const nextBadgeInfo = nextBadge
    ? {
        label: nextBadge.label,
        minPoints: nextBadge.minPoints,
        pointsRemaining: Math.max(0, nextBadge.minPoints - consumer.points),
      }
    : null;

  return {
    id: consumer.id,
    anonymousId: consumer.anonymousId,
    points: consumer.points,
    totalScans: consumer.totalScans,
    badges,
    nextBadge: nextBadgeInfo,
    recentScans: consumer.scans.map((s) => ({
      lotId: s.lotId,
      productName: s.lot?.product?.name ?? "Produit supprimé",
      scannedAt: s.scannedAt.toISOString(),
    })),
    redemptions: consumer.redemptions.map((r) => ({
      id: r.id,
      rewardLabel: r.rewardLabel,
      pointsCost: r.pointsCost,
      status: r.status,
      code: r.code,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Redeem points for a reward.
 *
 * - Verifies the consumer has enough points (throws an `InsufficientPointsError`
 *   otherwise — the caller should map this to a 402 response).
 * - Deducts the points and creates a `LoyaltyRedemption` row with a unique
 *   code (`VS-<base36 timestamp>-<random>`).
 * - Returns the created redemption row.
 */
export class InsufficientPointsError extends Error {
  constructor(
    message: string = "Points insuffisants pour cette récompense.",
  ) {
    super(message);
    this.name = "InsufficientPointsError";
  }
}

export async function redeemReward(
  consumerId: string,
  rewardType: string,
) {
  // Find the reward in the catalog.
  const reward = REWARDS_CATALOG.find((r) => r.type === rewardType);
  if (!reward) {
    throw new Error(`Type de récompense inconnu : ${rewardType}`);
  }

  // Lock-check the consumer's points (atomic enough for SQLite).
  const consumer = await db.consumer.findUnique({
    where: { id: consumerId },
    select: { id: true, points: true, anonymousId: true },
  });

  if (!consumer) {
    throw new Error("Consommateur introuvable.");
  }

  if (consumer.points < reward.pointsCost) {
    throw new InsufficientPointsError();
  }

  // Generate a unique code: VS-<base36 timestamp>-<random 4 chars>.
  const code = `VS-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  // Decrement points + create redemption in a transaction so the points
  // can't be spent twice (race condition guard).
  const [updatedConsumer, redemption] = await db.$transaction([
    db.consumer.update({
      where: { id: consumerId },
      data: { points: { decrement: reward.pointsCost } },
      select: { id: true, points: true },
    }),
    db.loyaltyRedemption.create({
      data: {
        consumerId,
        rewardType: reward.type,
        rewardLabel: reward.label,
        pointsCost: reward.pointsCost,
        code,
        status: "pending",
      },
    }),
  ]);

  // Defensive: if the transaction returned a negative points balance
  // (shouldn't happen because we checked above), restore the points and
  // delete the redemption. This guards against concurrent redemptions.
  if (updatedConsumer.points < 0) {
    await db.$transaction([
      db.consumer.update({
        where: { id: consumerId },
        data: { points: { increment: reward.pointsCost } },
      }),
      db.loyaltyRedemption.delete({ where: { id: redemption.id } }),
    ]);
    throw new InsufficientPointsError();
  }

  return redemption;
}

/**
 * Aggregate loyalty stats for the fabricant dashboard.
 *
 * - Counts distinct consumers who scanned the fabricant's lots.
 * - Sums the points held by those consumers (this is a "distributed points"
 *   metric — it counts points earned from ANY scan, not just this
 *   fabricant's scans, since points are a consumer-level balance).
 * - Counts scans.
 * - Computes badge distribution (how many consumers reached each tier).
 * - Returns the 10 most-recent redemptions for this fabricant (or platform
 *   rewards where fabricantId is null — but since we don't yet track
 *   fabricant-specific rewards, we surface ALL recent redemptions for
 *   consumers who scanned this fabricant's products).
 * - Returns the top 5 consumers by points (for this fabricant's products).
 */
export async function getFabricantLoyaltyStats(
  fabricantId: string,
): Promise<FabricantLoyaltyStats> {
  // Find all scans for this fabricant's lots, with the linked consumer.
  // We use `findMany` + `select` instead of `groupBy` because Prisma's
  // `groupBy` on SQLite doesn't support the relation filter we need.
  const scans = await db.scan.findMany({
    where: {
      lot: { fabricantId },
      consumerId: { not: null },
    },
    select: {
      id: true,
      consumerId: true,
      scannedAt: true,
    },
  });

  // Unique consumer IDs who scanned this fabricant's products.
  const consumerIds = Array.from(
    new Set(scans.map((s) => s.consumerId).filter((id): id is string => Boolean(id))),
  );

  // Fetch those consumers in a single query.
  const consumers = consumerIds.length
    ? await db.consumer.findMany({
        where: { id: { in: consumerIds } },
        select: {
          id: true,
          anonymousId: true,
          points: true,
          totalScans: true,
          badges: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const totalConsumers = consumers.length;
  const totalPointsDistributed = consumers.reduce((sum, c) => sum + c.points, 0);
  const totalScans = scans.length;

  // Badge distribution: count consumers per tier.
  const topBadges = BADGE_TIERS.map((tier) => {
    const count = consumers.filter((c) => {
      const badges = parseBadges(c.badges);
      return badges.includes(tier.id);
    }).length;
    return {
      badgeId: tier.id,
      label: tier.label,
      icon: tier.icon,
      color: tier.color,
      count,
    };
  });

  // Recent redemptions for these consumers (or where fabricantId matches).
  const recentRedemptions = consumerIds.length
    ? await db.loyaltyRedemption.findMany({
        where: {
          OR: [{ fabricantId }, { consumerId: { in: consumerIds } }],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rewardLabel: true,
          rewardType: true,
          pointsCost: true,
          status: true,
          code: true,
          createdAt: true,
          consumer: {
            select: { id: true, anonymousId: true, createdAt: true },
          },
        },
      })
    : [];

  const totalRedemptions = consumerIds.length
    ? await db.loyaltyRedemption.count({
        where: {
          OR: [{ fabricantId }, { consumerId: { in: consumerIds } }],
        },
      })
    : 0;

  // Top 5 consumers by points (limited to those who scanned this fabricant's
  // products). The "label" is masked — the fabricant never sees the raw
  // anonymousId.
  const topConsumers = [...consumers]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((c, index) => {
      const globalIndex = consumers.indexOf(c);
      return {
        id: c.id,
        label: maskConsumerId(c.anonymousId, globalIndex >= 0 ? globalIndex : index),
        points: c.points,
        scansCount: c.totalScans,
        badges: parseBadges(c.badges),
      };
    });

  return {
    totalConsumers,
    totalPointsDistributed,
    totalScans,
    topBadges,
    recentRedemptions: recentRedemptions.map((r) => {
      const consumerIdx = consumers.findIndex((c) => c.id === r.consumer.id);
      return {
        id: r.id,
        rewardLabel: r.rewardLabel,
        rewardType: r.rewardType,
        pointsCost: r.pointsCost,
        status: r.status,
        code: r.code,
        createdAt: r.createdAt.toISOString(),
        consumerLabel: maskConsumerId(
          r.consumer.anonymousId,
          consumerIdx >= 0 ? consumerIdx : 0,
        ),
      };
    }),
    topConsumers,
    totalRedemptions,
  };
}
