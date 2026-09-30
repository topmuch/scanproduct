// ============================================================================
// VerifScan — Subscription lifecycle + end-of-subscription email alerts
// ============================================================================
// Pure server-side module (no React, no API routes).
//
// Responsibilities:
//   - Read the ACTIVE subscription of a user (getUserSubscription).
//   - Auto-provision a Subscription row for legacy users who only have the
//     legacy Setting key `plan:${userId}` (ensureSubscription) — rolling
//     30-day period from now, so nothing breaks and alerts start flowing.
//   - Admin API helper: setUserSubscription (plan change + period).
//   - runSubscriptionAlertsJob(): cron job that emails fabricants whose
//     subscription is about to expire (J-7, J-3) or has just expired (J0+),
//     with per-bucket anti-spam dedup (1 email per bucket per subscription).
//     Also flips expired ACTIVE rows to status "EXPIRED".
//
// Email template: same table-based shell as the weekly digest
// (see fabricant-emails.ts emailShell) — we duplicate the small shell here
// to keep the two modules independent (no circular imports).
// ============================================================================

import { db } from "@/lib/db";
import {
  createNotification,
  type NotificationSeverity,
} from "@/lib/notifications";
import { getUserPlan, PLANS, DEFAULT_PLAN } from "@/lib/plan-limits";

// ---------------------------------------------------------------------------
// Config & helpers
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

const APP_URL = (
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://verifscan.com"
).replace(/\/$/, "");

function escapeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function fmtDate(d: Date): string {
  return dateFmt.format(d);
}

function fmtFCFA(amount: number): string {
  if (amount <= 0) return "Sur devis";
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export interface SubscriptionView {
  id: string;
  plan: string;
  planName: string;
  status: string;
  startedAt: Date;
  expiresAt: Date;
  daysLeft: number;
}

/** Days between now and expiresAt (ceil; negative when already expired). */
function daysLeftOf(expiresAt: Date): number {
  return Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS);
}

/**
 * Return the ACTIVE subscription of a user, or null when none exists
 * (never throws — DB errors are logged and treated as "no subscription").
 */
export async function getUserSubscription(
  userId: string,
): Promise<SubscriptionView | null> {
  try {
    const sub = await db.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { expiresAt: "desc" },
    });
    if (!sub) return null;
    const config = PLANS[sub.plan] ?? PLANS[DEFAULT_PLAN];
    return {
      id: sub.id,
      plan: sub.plan,
      planName: config.name,
      status: sub.status,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      daysLeft: daysLeftOf(sub.expiresAt),
    };
  } catch (err) {
    console.error("[subscription] getUserSubscription failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Create or replace the ACTIVE subscription of a user.
 * Used by the admin API (PATCH /api/admin/users/[id] with plan/planExpiresAt)
 * and by ensureSubscription for legacy provisioning.
 */
export async function setUserSubscription(
  userId: string,
  plan: string,
  options?: { expiresAt?: Date; startedAt?: Date },
): Promise<SubscriptionView> {
  const planId = PLANS[plan] ? plan : DEFAULT_PLAN;

  // Close any currently ACTIVE subscription so only one row is ACTIVE.
  await db.subscription.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  const startedAt = options?.startedAt ?? new Date();
  const expiresAt =
    options?.expiresAt ?? new Date(startedAt.getTime() + 30 * DAY_MS);

  const sub = await db.subscription.create({
    data: {
      userId,
      plan: planId,
      status: "ACTIVE",
      startedAt,
      expiresAt,
    },
  });

  // Keep the legacy Setting key in sync so plan-limits keeps working even
  // before every code path is migrated to Subscription.
  try {
    await db.setting.upsert({
      where: { key: `plan:${userId}` },
      update: { value: planId },
      create: { key: `plan:${userId}`, value: planId },
    });
  } catch (err) {
    console.error("[subscription] Failed to sync plan setting:", err);
  }

  return {
    id: sub.id,
    plan: sub.plan,
    planName: PLANS[sub.plan].name,
    status: sub.status,
    startedAt: sub.startedAt,
    expiresAt: sub.expiresAt,
    daysLeft: daysLeftOf(sub.expiresAt),
  };
}

/**
 * Auto-provisioning for legacy users: when a fabricant has NO subscription
 * row at all, create one from the legacy plan Setting (or DEFAULT_PLAN) with
 * a rolling 30-day period starting now. Returns the active subscription.
 */
export async function ensureSubscription(
  userId: string,
): Promise<SubscriptionView | null> {
  const existing = await getUserSubscription(userId);
  if (existing) return existing;

  const hasAny = await db.subscription.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (hasAny) return null; // had subscriptions before; don't resurrect

  const { plan } = await getUserPlan(userId);
  try {
    return await setUserSubscription(userId, plan);
  } catch (err) {
    console.error("[subscription] ensureSubscription failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Alert buckets
// ---------------------------------------------------------------------------

interface SubBucket {
  key: string;
  /** true when daysLeft <= maxDays AND daysLeft >= 0 */
  maxDays: number;
  severity: NotificationSeverity;
  color: string;
  label: string;
  title: string;
}

export const SUBSCRIPTION_BUCKETS: SubBucket[] = [
  {
    key: "J3",
    maxDays: 3,
    severity: "critical",
    color: "#EF4444",
    label: "expire dans 3 jours",
    title: "Derniers jours — votre abonnement expire dans 3 jours",
  },
  {
    key: "J7",
    maxDays: 7,
    severity: "warning",
    color: "#F59E0B",
    label: "expire dans 7 jours",
    title: "Votre abonnement expire dans 7 jours",
  },
  {
    key: "EXPIRED",
    maxDays: -1_000_000, // handled separately (daysLeft < 0)
    severity: "critical",
    color: "#DC2626",
    label: "a expiré",
    title: "Votre abonnement VerifScan a expiré",
  },
];

/**
 * Most urgent bucket first: J3 (≤3 j) before J7 (≤7 j). Ordered so that
 * `find` picks J3 when both match (daysLeft = 2 must be J3, not J7).
 */
function bucketFor(daysLeft: number): SubBucket | null {
  if (daysLeft < 0) {
    return SUBSCRIPTION_BUCKETS.find((b) => b.key === "EXPIRED") ?? null;
  }
  return SUBSCRIPTION_BUCKETS.find((b) => b.key !== "EXPIRED" && daysLeft <= b.maxDays) ?? null;
}

// ---------------------------------------------------------------------------
// Email shell (mini duplicate of fabricant-emails.emailShell — keep in sync)
// ---------------------------------------------------------------------------

function subEmailShell(title: string, accentColor: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#022150,#10B981);padding:20px 28px;">
          <table role="presentation" width="100%"><tr>
            <td style="color:#ffffff;font-size:20px;font-weight:bold;">&#128737;&#65039; VerifScan</td>
            <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;">La v&eacute;rit&eacute; au bout du scan</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 28px 4px 28px;">
          <div style="font-size:18px;font-weight:bold;color:#111827;">${title}</div>
          <div style="width:48px;height:3px;background:${accentColor};border-radius:2px;margin-top:8px;"></div>
        </td></tr>
        <tr><td style="padding:16px 28px 8px 28px;font-size:14px;color:#374151;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:8px 28px 24px 28px;" align="center">
          <a href="${APP_URL}/dashboard/abonnement" style="display:inline-block;background:linear-gradient(135deg,#022150,#10B981);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">G&eacute;rer mon abonnement</a>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:16px 28px;border-top:1px solid #F3F4F6;">
          <div style="font-size:11px;color:#9CA3AF;line-height:1.5;">
            Vous recevez cet email selon vos pr&eacute;f&eacute;rences de notification VerifScan.
            G&eacute;rez-les depuis votre tableau de bord &rarr; Param&egrave;tres &rarr; Notifications.<br />
            &copy; ${new Date().getFullYear()} VerifScan &mdash; Dakar, S&eacute;n&eacute;gal
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

interface SubscriptionAlertRenderInput {
  planName: string;
  priceMonthly: number;
  expiresAt: Date;
  daysLeft: number;
  bucket: SubBucket;
  productCount: number;
  qrUsedThisMonth: number;
}

export function renderSubscriptionAlertEmail(
  input: SubscriptionAlertRenderInput,
): string {
  const { planName, priceMonthly, expiresAt, daysLeft, bucket } = input;

  const isExpired = daysLeft < 0;

  let body = isExpired
    ? `<p style="margin:0 0 16px 0;">Votre abonnement <strong>VerifScan ${escapeHtml(planName)}</strong> a expir&eacute; le <strong>${fmtDate(expiresAt)}</strong>.</p>
       <div style="background:#FEF2F2;border-radius:8px;padding:12px 14px;font-size:13px;color:#991B1B;margin-bottom:16px;">⚠️ Pour continuer &agrave; g&eacute;n&eacute;rer des QR codes et prot&eacute;ger vos produits, renouvelez votre abonnement d&egrave;s maintenant.</div>`
    : `<p style="margin:0 0 16px 0;">Votre abonnement <strong>VerifScan ${escapeHtml(planName)}</strong> expire dans <strong style="color:${bucket.color};">${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong>, le <strong>${fmtDate(expiresAt)}</strong>.</p>`;

  body += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
    <tr>
      <td style="background:#F9FAFB;border-radius:8px;padding:14px;">
        <div style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Plan actuel</div>
        <div style="font-size:16px;font-weight:bold;color:#111827;margin-top:4px;">${escapeHtml(planName)} &middot; ${fmtFCFA(priceMonthly)}/mois</div>
      </td>
    </tr>
  </table>`;

  body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">Ce qui vous attend si l'abonnement expire</div>`;
  body += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 10px;font-size:13px;color:#374151;border-bottom:1px solid #F3F4F6;">&#128274; Blocage de la g&eacute;n&eacute;ration de nouveaux QR codes</td></tr>
    <tr><td style="padding:8px 10px;font-size:13px;color:#374151;border-bottom:1px solid #F3F4F6;">&#128202; Perte de l'acc&egrave;s aux statistiques avanc&eacute;es</td></tr>
    <tr><td style="padding:8px 10px;font-size:13px;color:#374151;">&#128241; Vos pages produits restent en ligne (les scans existants continuent de fonctionner)</td></tr>
  </table>`;

  body += `<div style="background:${isExpired ? "#FEF2F2" : "#FFFBEB"};border-radius:8px;padding:12px 14px;margin-top:18px;font-size:12px;color:${isExpired ? "#991B1B" : "#92400E"};">${isExpired ? "Renouvelez pour réactiver tous vos privilèges immédiatement." : `Renouvelez avant le ${fmtDate(expiresAt)} pour conserver tous vos privilèges sans interruption.`}</div>`;

  return subEmailShell(
    isExpired
      ? "&#128274; Abonnement expir&eacute;"
      : "&#9203; Fin d'abonnement proche",
    bucket.color,
    body,
  );
}

// ---------------------------------------------------------------------------
// Job runner
// ---------------------------------------------------------------------------

export interface SubJobResult {
  processed: number;
  sent: number;
  skipped: number;
  flipped: number; // ACTIVE → EXPIRED transitions
  errors: string[];
}

export async function runSubscriptionAlertsJob(): Promise<SubJobResult> {
  const result: SubJobResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    flipped: 0,
    errors: [],
  };

  let fabricants: Array<{ id: string }> = [];
  try {
    fabricants = await db.user.findMany({
      where: { role: "FABRICANT", status: "ACTIVE" },
      select: { id: true },
    });
  } catch (err) {
    result.errors.push(`Listing fabricants: ${String(err)}`);
    return result;
  }

  for (const f of fabricants) {
    result.processed += 1;
    try {
      // Auto-provision legacy users (no subscription row at all).
      const sub = await ensureSubscription(f.id);
      if (!sub) {
        result.skipped += 1;
        continue;
      }

      const daysLeft = daysLeftOf(sub.expiresAt);

      // Flip expired ACTIVE rows to EXPIRED (housekeeping).
      if (daysLeft < 0) {
        await db.subscription.updateMany({
          where: { id: sub.id, status: "ACTIVE", expiresAt: { lt: new Date() } },
          data: { status: "EXPIRED" },
        });
        result.flipped += 1;
      }

      const bucket = bucketFor(daysLeft);
      if (!bucket) {
        result.skipped += 1; // more than 7 days away → nothing to say
        continue;
      }

      // Anti-spam dedup: one notification per (subscription, bucket).
      const already = await db.notification.findFirst({
        where: {
          userId: f.id,
          type: "subscription",
          data: { contains: `"subBucket":"${bucket.key}"` },
          createdAt: { gte: sub.startedAt },
        },
        select: { id: true },
      });
      if (already) {
        result.skipped += 1;
        continue;
      }

      const { config } = await getUserPlan(f.id);
      const [productCount, qrUsed] = await Promise.all([
        db.product.count({ where: { fabricantId: f.id, status: { not: "ARCHIVED" } } }),
        db.qRCode.count({
          where: {
            fabricantId: f.id,
            createdAt: { gte: sub.startedAt },
          },
        }),
      ]);

      const isExpired = daysLeft < 0;
      const title = isExpired
        ? "🔒 Votre abonnement a expiré"
        : `⏳ Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`;
      const message = isExpired
        ? `Votre abonnement ${sub.planName} a expiré le ${fmtDate(sub.expiresAt)}. Renouvelez pour continuer à générer des QR codes.`
        : `Votre abonnement ${sub.planName} expire le ${fmtDate(sub.expiresAt)} (dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}). Pensez à le renouveler.`;

      await createNotification({
        userId: f.id,
        type: "subscription",
        title,
        message,
        severity: bucket.severity,
        data: {
          subscriptionId: sub.id,
          subBucket: bucket.key,
          plan: sub.plan,
          expiresAt: sub.expiresAt.toISOString(),
          daysLeft,
        },
        emailSubject: isExpired
          ? `🔒 VerifScan — votre abonnement a expiré`
          : `⏳ VerifScan — votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`,
        emailHtml: renderSubscriptionAlertEmail({
          planName: sub.planName,
          priceMonthly: config.priceMonthly,
          expiresAt: sub.expiresAt,
          daysLeft,
          bucket,
          productCount,
          qrUsedThisMonth: qrUsed,
        }),
      });

      result.sent += 1;
    } catch (err) {
      result.errors.push(`fabricant ${f.id}: ${String(err)}`);
    }
  }

  return result;
}
