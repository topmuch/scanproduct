// ============================================================================
// VerifScan — Scheduled email jobs for fabricants
// ============================================================================
// Pure server-side module (no React, no API routes). Powers two jobs meant to
// be triggered by an external scheduler hitting /api/cron/* routes:
//
//   1. runWeeklyDigestJob()   → weekly scan stats per product/lot + expiry
//                               preview, sent as ONE rich email per fabricant.
//   2. runExpiryAlertsJob()   → DLC alerts (J-30 / J-15 / J-7 buckets) with
//                               anti-spam dedup (max 1 email per fabricant/day).
//
// Both jobs:
//   - respect per-user notification preferences via createNotification()
//     (type weekly_report / lot_expiring, channel gating + EmailLog audit),
//   - skip fabricants with nothing to report (never spam empty emails),
//   - are idempotent per period (week key / day) so the cron can be retried
//     or run twice without duplicating emails.
// ============================================================================

import { db } from "@/lib/db";
import { createNotification, type NotificationSeverity } from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Config & helpers
// ---------------------------------------------------------------------------

const APP_URL = (
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://verifscan.com"
).replace(/\/$/, "");

const DAY_MS = 24 * 60 * 60 * 1000;

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
const shortDateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function fmtDate(d: Date): string {
  return dateFmt.format(d);
}

/** Monday of the ISO week containing `d`, as "YYYY-MM-DD". */
function weekKeyOf(d: Date): string {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7; // 1..7 (Monday=1)
  dt.setUTCDate(dt.getUTCDate() - (day - 1));
  return dt.toISOString().slice(0, 10);
}

/** Start of today (local server time), for daily dedup. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Shared HTML email shell (table-based, email-client safe)
// ---------------------------------------------------------------------------

function emailShell(title: string, accentColor: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Banner -->
        <tr><td style="background:linear-gradient(135deg,#022150,#10B981);padding:20px 28px;">
          <table role="presentation" width="100%"><tr>
            <td style="color:#ffffff;font-size:20px;font-weight:bold;">&#128737;&#65039; VerifScan</td>
            <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;">La v&eacute;rit&eacute; au bout du scan</td>
          </tr></table>
        </td></tr>
        <!-- Title bar -->
        <tr><td style="padding:20px 28px 4px 28px;">
          <div style="font-size:18px;font-weight:bold;color:#111827;">${title}</div>
          <div style="width:48px;height:3px;background:${accentColor};border-radius:2px;margin-top:8px;"></div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:16px 28px 8px 28px;font-size:14px;color:#374151;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:8px 28px 24px 28px;" align="center">
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#022150,#10B981);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">Ouvrir mon tableau de bord</a>
        </td></tr>
        <!-- Footer -->
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

/** KPI card row (4 cells) for the digest email. */
function kpiRow(
  items: Array<{ value: string; label: string; color?: string }>,
): string {
  const cells = items
    .map(
      (it) => `
      <td width="25%" align="center" style="background:#F9FAFB;border-radius:8px;padding:14px 6px;">
        <div style="font-size:22px;font-weight:bold;color:${it.color ?? "#111827"};">${it.value}</div>
        <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${it.label}</div>
      </td>`,
    )
    .join(`<td width="8"></td>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
}

/** Simple data table with header row. */
function dataTable(headers: string[], rows: string[][]): string {
  const th = headers
    .map(
      (h) =>
        `<th align="left" style="padding:8px 10px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #E5E7EB;">${h}</th>`,
    )
    .join("");
  const trs = rows
    .map(
      (cells) =>
        `<tr>${cells
          .map(
            (c) =>
              `<td style="padding:8px 10px;font-size:13px;color:#374151;border-bottom:1px solid #F3F4F6;">${c}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const ths = `<tr>${th}</tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">${ths}${trs}</table>`;
}

// ---------------------------------------------------------------------------
// Weekly digest — aggregation
// ---------------------------------------------------------------------------

export interface DigestTopLot {
  lotId: string;
  lotLabel: string;
  productName: string;
  scans: number;
}

export interface DigestExpiringLot {
  lotId: string;
  lotLabel: string;
  productName: string;
  expiryDate: Date;
  daysLeft: number;
}

export interface WeeklyDigestStats {
  fabricantId: string;
  fabricantName: string;
  weekKey: string;
  periodLabel: string;
  totalScans: number;
  previousScans: number;
  deltaPct: number | null;
  activeProducts: number;
  activeLots: number;
  topLots: DigestTopLot[];
  expiringLots: DigestExpiringLot[];
  recentlyExpired: DigestExpiringLot[];
}

const EXPIRY_WINDOW_DAYS = 30;

export async function aggregateWeeklyStats(
  fabricantId: string,
): Promise<WeeklyDigestStats | null> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);
  const prevStart = new Date(now.getTime() - 14 * DAY_MS);
  const weekKey = weekKeyOf(now);
  const periodLabel = `${fmtDate(weekStart)} au ${fmtDate(now)}`;

  const fabricant = await db.user.findUnique({
    where: { id: fabricantId },
    select: { id: true, name: true, companyName: true, role: true, status: true },
  });
  if (!fabricant || fabricant.status !== "ACTIVE") return null;

  const lots = await db.lot.findMany({
    where: { fabricantId },
    select: {
      id: true,
      reference: true,
      lotNumber: true,
      productId: true,
      expiryDate: true,
      status: true,
    },
  });
  const lotIds = lots.map((l) => l.id);

  // --- Scan counts (current week, previous week, per-lot) -------------------
  const [totalScans, previousScans, perLot] = await Promise.all([
    lotIds.length
      ? db.scan.count({
          where: { lotId: { in: lotIds }, scannedAt: { gte: weekStart } },
        })
      : Promise.resolve(0),
    lotIds.length
      ? db.scan.count({
          where: {
            lotId: { in: lotIds },
            scannedAt: { gte: prevStart, lt: weekStart },
          },
        })
      : Promise.resolve(0),
    lotIds.length
      ? db.scan.groupBy({
          by: ["lotId"],
          where: { lotId: { in: lotIds }, scannedAt: { gte: weekStart } },
          _count: { lotId: true },
          orderBy: { _count: { lotId: "desc" } },
        })
      : Promise.resolve([] as Array<{ lotId: string; _count: { lotId: number } }>),
  ]);

  const deltaPct =
    previousScans === 0
      ? totalScans > 0
        ? null // infinite growth — display "+" only
        : 0
      : Math.round(((totalScans - previousScans) / previousScans) * 100);

  // --- Top lots with product names ------------------------------------------
  const byId = new Map(lots.map((l) => [l.id, l]));
  const topRaw = perLot.slice(0, 5);
  const productIds = [...new Set(topRaw.map((r) => byId.get(r.lotId)?.productId).filter(Boolean))] as string[];
  const products = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const topLots: DigestTopLot[] = topRaw.map((r) => {
    const lot = byId.get(r.lotId);
    return {
      lotId: r.lotId,
      lotLabel: lot?.lotNumber ?? lot?.reference ?? "—",
      productName: productName.get(lot?.productId ?? "") ?? "Produit",
      scans: r._count.lotId,
    };
  });

  // --- Expiry previews -------------------------------------------------------
  const soonLimit = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS);
  const recentlyExpiredLimit = new Date(now.getTime() - 7 * DAY_MS);

  const expiringLots: DigestExpiringLot[] = lots
    .filter(
      (l) =>
        l.status === "ACTIVE" &&
        l.expiryDate &&
        l.expiryDate > now &&
        l.expiryDate <= soonLimit,
    )
    .map((l) => ({
      lotId: l.id,
      lotLabel: l.lotNumber ?? l.reference ?? "—",
      productName: productName.get(l.productId) ?? "Produit",
      expiryDate: l.expiryDate as Date,
      daysLeft: Math.ceil((l.expiryDate!.getTime() - now.getTime()) / DAY_MS),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  const recentlyExpired: DigestExpiringLot[] = lots
    .filter(
      (l) =>
        l.expiryDate &&
        l.expiryDate <= now &&
        l.expiryDate > recentlyExpiredLimit,
    )
    .map((l) => ({
      lotId: l.id,
      lotLabel: l.lotNumber ?? l.reference ?? "—",
      productName: productName.get(l.productId) ?? "Produit",
      expiryDate: l.expiryDate as Date,
      daysLeft: 0,
    }))
    .slice(0, 10);

  const activeLots = lots.filter((l) => l.status === "ACTIVE").length;
  const activeProducts = new Set(
    lots.filter((l) => l.status === "ACTIVE").map((l) => l.productId),
  ).size;

  return {
    fabricantId,
    fabricantName: fabricant.companyName ?? fabricant.name ?? "Fabricant",
    weekKey,
    periodLabel,
    totalScans,
    previousScans,
    deltaPct,
    activeProducts,
    activeLots,
    topLots,
    expiringLots,
    recentlyExpired,
  };
}

// ---------------------------------------------------------------------------
// Weekly digest — email template
// ---------------------------------------------------------------------------

export function renderDigestEmail(stats: WeeklyDigestStats): string {
  const delta = stats.deltaPct;
  const deltaText =
    delta === null
      ? stats.totalScans > 0
        ? "Nouveau !"
        : "—"
      : delta > 0
        ? `+${delta} %`
        : `${delta} %`;
  const deltaColor =
    delta === null ? "#10B981" : delta >= 0 ? "#10B981" : "#EF4444";

  let body = `<p style="margin:0 0 16px 0;">Bonjour <strong>${escapeHtml(stats.fabricantName)}</strong>, voici l'activit&eacute; de vos produits du <strong>${escapeHtml(stats.periodLabel)}</strong>.</p>`;

  body += kpiRow([
    { value: String(stats.totalScans), label: "Scans (7 j)", color: "#022150" },
    { value: deltaText, label: "vs semaine pr&eacute;c.", color: deltaColor },
    { value: String(stats.activeProducts), label: "Produits actifs" },
    { value: String(stats.activeLots), label: "Lots actifs" },
  ]);

  if (stats.topLots.length > 0) {
    body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#128200; Vos produits les plus scann&eacute;s</div>`;
    body += dataTable(
      ["Produit", "Lot", "Scans"],
      stats.topLots.map((l) => [
        escapeHtml(l.productName),
        escapeHtml(l.lotLabel),
        `<strong style="color:#022150;">${l.scans}</strong>`,
      ]),
    );
  } else {
    body += `<div style="background:#F0F4F9;border-radius:8px;padding:14px;margin-top:18px;font-size:13px;color:#0A2B5F;">Aucun scan cette semaine. Pensez &agrave; promouvoir vos QR codes en boutique et sur vos emballages !</div>`;
  }

  if (stats.expiringLots.length > 0) {
    body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#9203; Lots expirant sous ${EXPIRY_WINDOW_DAYS} jours</div>`;
    body += dataTable(
      ["Produit", "Lot", "DLC", "Reste"],
      stats.expiringLots.map((l) => {
        const color =
          l.daysLeft <= 7 ? "#EF4444" : l.daysLeft <= 15 ? "#F59E0B" : "#111827";
        return [
          escapeHtml(l.productName),
          escapeHtml(l.lotLabel),
          shortDateFmt.format(l.expiryDate),
          `<strong style="color:${color};">${l.daysLeft} j</strong>`,
        ];
      }),
    );
  }

  if (stats.recentlyExpired.length > 0) {
    body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#10060; Expir&eacute;s cette semaine (${stats.recentlyExpired.length})</div>`;
    body += dataTable(
      ["Produit", "Lot", "DLC"],
      stats.recentlyExpired.map((l) => [
        escapeHtml(l.productName),
        escapeHtml(l.lotLabel),
        shortDateFmt.format(l.expiryDate),
      ]),
    );
  }

  return emailShell(
    "&#128202; Rapport hebdomadaire",
    "#022150",
    body,
  );
}

// ---------------------------------------------------------------------------
// Weekly digest — job runner
// ---------------------------------------------------------------------------

export interface JobResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
}

export async function runWeeklyDigestJob(): Promise<JobResult> {
  const result: JobResult = { processed: 0, sent: 0, skipped: 0, errors: [] };

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
      const stats = await aggregateWeeklyStats(f.id);
      if (!stats) {
        result.skipped += 1;
        continue;
      }

      // Nothing notable → never send an empty email.
      if (
        stats.totalScans === 0 &&
        stats.expiringLots.length === 0 &&
        stats.recentlyExpired.length === 0
      ) {
        result.skipped += 1;
        continue;
      }

      // Idempotency: one digest per ISO week (data.weekKey match).
      const already = await db.notification.findFirst({
        where: {
          userId: f.id,
          type: "weekly_report",
          data: { contains: `"weekKey":"${stats.weekKey}"` },
        },
        select: { id: true },
      });
      if (already) {
        result.skipped += 1;
        continue;
      }

      const deltaText =
        stats.deltaPct === null
          ? stats.totalScans > 0
            ? "premiers scans !"
            : "0 scan"
          : `${stats.deltaPct >= 0 ? "+" : ""}${stats.deltaPct} % vs semaine précédente`;

      const title = `📊 Rapport hebdomadaire — ${stats.totalScans} scan${stats.totalScans > 1 ? "s" : ""}`;
      const messageParts = [`${stats.totalScans} scans cette semaine (${deltaText}).`];
      if (stats.expiringLots.length > 0) {
        messageParts.push(
          `⚠️ ${stats.expiringLots.length} lot(s) expirent sous ${EXPIRY_WINDOW_DAYS} jours.`,
        );
      }
      if (stats.recentlyExpired.length > 0) {
        messageParts.push(`❌ ${stats.recentlyExpired.length} lot(s) expiré(s) cette semaine.`);
      }

      await createNotification({
        userId: f.id,
        type: "weekly_report",
        title,
        message: messageParts.join(" "),
        severity: "info",
        data: { weekKey: stats.weekKey, periodLabel: stats.periodLabel },
        emailSubject: `📊 VerifScan — votre rapport hebdomadaire (${stats.totalScans} scans)`,
        emailHtml: renderDigestEmail(stats),
      });

      result.sent += 1;
    } catch (err) {
      // Isolate per-fabricant failures so one bad row doesn't kill the job.
      result.errors.push(`fabricant ${f.id}: ${String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Expiry alerts — job
// ---------------------------------------------------------------------------

interface ExpiryBucket {
  key: string;
  maxDays: number;
  severity: NotificationSeverity;
  color: string;
  label: string;
}

export const EXPIRY_BUCKETS: ExpiryBucket[] = [
  { key: "J7", maxDays: 7, severity: "critical", color: "#EF4444", label: "≤ 7 jours" },
  { key: "J15", maxDays: 15, severity: "warning", color: "#F59E0B", label: "≤ 15 jours" },
  { key: "J30", maxDays: 30, severity: "info", color: "#2E5383", label: "≤ 30 jours" },
];

function bucketFor(daysLeft: number): ExpiryBucket | null {
  return EXPIRY_BUCKETS.find((b) => daysLeft <= b.maxDays) ?? null;
}

// ---------------------------------------------------------------------------
// Expiry alerts — email template
// ---------------------------------------------------------------------------

interface ExpiryGroupForRender {
  bucket: ExpiryBucket;
  lots: Array<{
    lotNumber: string | null;
    reference: string | null;
    expiryDate: Date | null;
    product?: { name: string } | null;
  }>;
}

/** Rich multi-section HTML email listing expiring lots grouped by urgency. */
export function renderExpiryAlertEmail(ordered: ExpiryGroupForRender[]): string {
  const now = new Date();
  const totalLots = ordered.reduce((acc, g) => acc + g.lots.length, 0);

  let body = `<p style="margin:0 0 16px 0;">Bonjour, <strong>${totalLots} lot${totalLots > 1 ? "s" : ""}</strong> de votre catalogue arrive${totalLots > 1 ? "nt" : ""} &agrave; expiration. Agissez &agrave; temps pour &eacute;viter les invendus et prot&eacute;ger vos consommateurs.</p>`;

  for (const g of ordered) {
    body += `<div style="font-size:14px;font-weight:bold;color:${g.bucket.color};margin:18px 0 2px 0;">&#9203; Expiration ${g.bucket.label}</div>`;
    body += dataTable(
      ["Produit", "Lot", "DLC", "Reste"],
      g.lots.map((l) => {
        const daysLeft = Math.ceil(
          ((l.expiryDate as Date).getTime() - now.getTime()) / DAY_MS,
        );
        return [
          escapeHtml(l.product?.name ?? "Produit"),
          escapeHtml(l.lotNumber ?? l.reference ?? "—"),
          shortDateFmt.format(l.expiryDate as Date),
          `<strong style="color:${g.bucket.color};">${daysLeft} j</strong>`,
        ];
      }),
    );
  }

  body += `<div style="background:#FEF3C7;border-radius:8px;padding:12px 14px;margin-top:18px;font-size:12px;color:#92400E;">💡 Astuce : lancez une promotion ou contactez vos distributeurs avant la date limite pour écouler les stocks restants.</div>`;

  const worst = ordered[0].bucket;
  return emailShell("&#9203; Alerte p&eacute;remption", worst.color, body);
}

export async function runExpiryAlertsJob(): Promise<JobResult> {
  const result: JobResult = { processed: 0, sent: 0, skipped: 0, errors: [] };
  const now = new Date();
  const horizon = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS);

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
      // Daily dedup: max ONE lot_expiring notification per fabricant per day.
      const alreadyToday = await db.notification.findFirst({
        where: {
          userId: f.id,
          type: "lot_expiring",
          createdAt: { gte: startOfToday() },
        },
        select: { id: true },
      });
      if (alreadyToday) {
        result.skipped += 1;
        continue;
      }

      const lots = await db.lot.findMany({
        where: {
          fabricantId: f.id,
          status: "ACTIVE",
          expiryDate: { gt: now, lte: horizon },
        },
        select: {
          id: true,
          lotNumber: true,
          reference: true,
          expiryDate: true,
          product: { select: { name: true } },
        },
        orderBy: { expiryDate: "asc" },
      });
      if (lots.length === 0) {
        result.skipped += 1;
        continue;
      }

      // Group into urgency buckets.
      const groups = new Map<string, { bucket: ExpiryBucket; lots: typeof lots }>();
      for (const lot of lots) {
        const daysLeft = Math.ceil(
          ((lot.expiryDate as Date).getTime() - now.getTime()) / DAY_MS,
        );
        const bucket = bucketFor(daysLeft);
        if (!bucket) continue;
        const g = groups.get(bucket.key) ?? { bucket, lots: [] };
        g.lots.push(lot);
        groups.set(bucket.key, g);
      }
      if (groups.size === 0) {
        result.skipped += 1;
        continue;
      }

      // Order buckets by urgency (J7 first).
      const ordered = EXPIRY_BUCKETS.map((b) => groups.get(b.key)).filter(Boolean) as Array<{
        bucket: ExpiryBucket;
        lots: typeof lots;
      }>;
      const worst = ordered[0].bucket;

      const totalLots = ordered.reduce((acc, g) => acc + g.lots.length, 0);

      // --- In-app message ----------------------------------------------------
      const title = `⏳ ${totalLots} lot${totalLots > 1 ? "s" : ""} arrive${totalLots > 1 ? "nt" : ""} à expiration`;
      const message = ordered
        .map(
          (g) =>
            `${g.bucket.key} : ${g.lots.length} lot(s) (${g.lots
              .slice(0, 3)
              .map((l) => l.lotNumber ?? l.reference)
              .join(", ")}${g.lots.length > 3 ? "…" : ""})`,
        )
        .join(" · ");

      await createNotification({
        userId: f.id,
        type: "lot_expiring",
        title,
        message,
        severity: worst.severity,
        data: {
          buckets: ordered.map((g) => g.bucket.key),
          lotIds: lots.map((l) => l.id),
          sentAt: now.toISOString(),
        },
        emailSubject: `⏳ VerifScan — ${totalLots} lot(s) expirent bientôt`,
        emailHtml: renderExpiryAlertEmail(ordered),
      });

      result.sent += 1;
    } catch (err) {
      result.errors.push(`fabricant ${f.id}: ${String(err)}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// New quote inquiry ("demande de devis") — email template
// ---------------------------------------------------------------------------

export interface InquiryEmailData {
  inquiryId: string;
  productName: string;
  productId: string;
  requesterName: string;
  requesterCompany?: string | null;
  requesterEmail: string;
  requesterPhone?: string | null;
  requesterCountry?: string | null;
  requesterCity?: string | null;
  message: string;
  quantity?: number | null;
  targetPrice?: string | null;
  deliveryDelay?: string | null;
  createdAt: Date;
}

/**
 * Rich HTML email shown to the fabricant when a distributor/consumer submits
 * a "demande de devis" (marketplace inquiry). Lists every detail the
 * requester provided so the fabricant can reply without opening the dashboard.
 */
export function renderInquiryEmail(inquiry: InquiryEmailData): string {
  const contactRows: string[][] = [
    ["Nom", escapeHtml(inquiry.requesterName)],
  ];
  if (inquiry.requesterCompany) {
    contactRows.push(["Société", escapeHtml(inquiry.requesterCompany)]);
  }
  contactRows.push(["Email", `<a href="mailto:${escapeHtml(inquiry.requesterEmail)}" style="color:#022150;text-decoration:none;">${escapeHtml(inquiry.requesterEmail)}</a>`]);
  if (inquiry.requesterPhone) {
    contactRows.push(["Téléphone", escapeHtml(inquiry.requesterPhone)]);
  }
  if (inquiry.requesterCity || inquiry.requesterCountry) {
    const place = [inquiry.requesterCity, inquiry.requesterCountry]
      .filter(Boolean)
      .join(", ");
    contactRows.push(["Localisation", escapeHtml(place)]);
  }
  if (typeof inquiry.quantity === "number" && inquiry.quantity > 0) {
    contactRows.push(["Quantité", `<strong>${inquiry.quantity}</strong>`]);
  }
  if (inquiry.targetPrice) {
    contactRows.push(["Prix cible", escapeHtml(inquiry.targetPrice)]);
  }
  if (inquiry.deliveryDelay) {
    contactRows.push(["Délai souhaité", escapeHtml(inquiry.deliveryDelay)]);
  }

  let body = `<p style="margin:0 0 16px 0;">Nouvelle demande de devis re&ccedil;ue le <strong>${fmtDate(inquiry.createdAt)}</strong> pour votre produit <strong>${escapeHtml(inquiry.productName)}</strong>.</p>`;

  body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:18px 0 2px 0;">&#128100; Coordonn&eacute;es du demandeur</div>`;
  body += dataTable(["Champ", "Détail"], contactRows);

  body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#128172; Message</div>`;
  body += `<div style="background:#F9FAFB;border-left:3px solid #022150;border-radius:0 8px 8px 0;padding:12px 14px;font-size:13px;color:#374151;line-height:1.6;white-space:pre-line;">${escapeHtml(inquiry.message)}</div>`;

  body += `<div style="background:#ECFDF5;border-radius:8px;padding:12px 14px;margin-top:18px;font-size:12px;color:#065F46;">💡 Répondez rapidement : une réponse sous 48 h augmente nettement vos chances de conclure la vente.</div>`;

  return emailShell("&#128179; Nouvelle demande de devis", "#022150", body);
}

// ---------------------------------------------------------------------------
// Monthly report — aggregation
// ---------------------------------------------------------------------------

/** "YYYY-MM" key for monthly idempotency (month being reported on). */
function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface MonthlyPerProductRow {
  productName: string;
  productId: string;
  scans: number;
}

export interface MonthlyReportStats {
  fabricantId: string;
  fabricantName: string;
  monthKey: string;
  periodLabel: string;
  // Activity
  lotsGenerated: number;
  totalScans: number;
  previousScans: number;
  deltaPct: number | null;
  activeProducts: number;
  activeLots: number;
  // Scans per product
  perProduct: MonthlyPerProductRow[];
  // Marketplace
  inquiriesCount: number;
  newInquiriesPending: number;
  // Expiry
  expiringSoon: DigestExpiringLot[];
  expiredInMonth: DigestExpiringLot[];
}

export async function aggregateMonthlyStats(
  fabricantId: string,
): Promise<MonthlyReportStats | null> {
  const fabricant = await db.user.findUnique({
    where: { id: fabricantId },
    select: { id: true, name: true, companyName: true, role: true, status: true },
  });
  if (!fabricant || fabricant.status !== "ACTIVE") return null;

  const now = new Date();
  // Reported period = previous calendar month.
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // exclusive
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
  const monthKey = monthKeyOf(monthStart);
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(monthStart);
  const periodLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const lots = await db.lot.findMany({
    where: { fabricantId },
    select: {
      id: true,
      reference: true,
      lotNumber: true,
      productId: true,
      expiryDate: true,
      status: true,
      createdAt: true,
      product: { select: { id: true, name: true } },
    },
  });
  const lotIds = lots.map((l) => l.id);
  const productNameByLot = new Map(lots.map((l) => [l.id, l.product?.name ?? "Produit"]));
  const productNameById = new Map(lots.map((l) => [l.productId, l.product?.name ?? "Produit"]));

  const [
    lotsGenerated,
    totalScans,
    previousScans,
    perLot,
    inquiriesCount,
  ] = await Promise.all([
    db.lot.count({
      where: { fabricantId, createdAt: { gte: monthStart, lt: monthEnd } },
    }),
    lotIds.length
      ? db.scan.count({
          where: { lotId: { in: lotIds }, scannedAt: { gte: monthStart, lt: monthEnd } },
        })
      : Promise.resolve(0),
    lotIds.length
      ? db.scan.count({
          where: {
            lotId: { in: lotIds },
            scannedAt: { gte: prevMonthStart, lt: monthStart },
          },
        })
      : Promise.resolve(0),
    lotIds.length
      ? db.scan.groupBy({
          by: ["lotId"],
          where: { lotId: { in: lotIds }, scannedAt: { gte: monthStart, lt: monthEnd } },
          _count: { lotId: true },
          orderBy: { _count: { lotId: "desc" } },
        })
      : Promise.resolve([] as Array<{ lotId: string; _count: { lotId: number } }>),
    db.marketplaceInquiry.count({
      where: { fabricantId, createdAt: { gte: monthStart, lt: monthEnd } },
    }),
  ]);

  const newInquiriesPending = await db.marketplaceInquiry.count({
    where: { fabricantId, status: "pending" },
  });

  const deltaPct =
    previousScans === 0
      ? totalScans > 0
        ? null
        : 0
      : Math.round(((totalScans - previousScans) / previousScans) * 100);

  // --- Scans per product (top 10) -------------------------------------------
  const perProductMap = new Map<string, number>();
  for (const row of perLot) {
    const pid = lots.find((l) => l.id === row.lotId)?.productId;
    if (!pid) continue;
    perProductMap.set(pid, (perProductMap.get(pid) ?? 0) + row._count.lotId);
  }
  const perProduct: MonthlyPerProductRow[] = [...perProductMap.entries()]
    .map(([productId, scans]) => ({
      productId,
      productName: productNameById.get(productId) ?? "Produit",
      scans,
    }))
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 10);

  // --- Expiry ----------------------------------------------------------------
  const soonLimit = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS);
  const expiringSoon: DigestExpiringLot[] = lots
    .filter(
      (l) =>
        l.status === "ACTIVE" &&
        l.expiryDate &&
        l.expiryDate > now &&
        l.expiryDate <= soonLimit,
    )
    .map((l) => ({
      lotId: l.id,
      lotLabel: l.lotNumber ?? l.reference ?? "—",
      productName: productNameByLot.get(l.id) ?? "Produit",
      expiryDate: l.expiryDate as Date,
      daysLeft: Math.ceil((l.expiryDate!.getTime() - now.getTime()) / DAY_MS),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  const expiredInMonth: DigestExpiringLot[] = lots
    .filter(
      (l) =>
        l.expiryDate &&
        l.expiryDate >= monthStart &&
        l.expiryDate < monthEnd,
    )
    .map((l) => ({
      lotId: l.id,
      lotLabel: l.lotNumber ?? l.reference ?? "—",
      productName: productNameByLot.get(l.id) ?? "Produit",
      expiryDate: l.expiryDate as Date,
      daysLeft: 0,
    }))
    .slice(0, 10);

  const activeLots = lots.filter((l) => l.status === "ACTIVE").length;
  const activeProducts = new Set(
    lots.filter((l) => l.status === "ACTIVE").map((l) => l.productId),
  ).size;

  return {
    fabricantId,
    fabricantName: fabricant.companyName ?? fabricant.name ?? "Fabricant",
    monthKey,
    periodLabel,
    lotsGenerated,
    totalScans,
    previousScans,
    deltaPct,
    activeProducts,
    activeLots,
    perProduct,
    inquiriesCount,
    newInquiriesPending,
    expiringSoon,
    expiredInMonth,
  };
}

// ---------------------------------------------------------------------------
// Monthly report — email template
// ---------------------------------------------------------------------------

export function renderMonthlyReportEmail(stats: MonthlyReportStats): string {
  const delta = stats.deltaPct;
  const deltaText =
    delta === null
      ? stats.totalScans > 0
        ? "Nouveau !"
        : "—"
      : delta > 0
        ? `+${delta} %`
        : `${delta} %`;
  const deltaColor =
    delta === null ? "#10B981" : delta >= 0 ? "#10B981" : "#EF4444";

  let body = `<p style="margin:0 0 16px 0;">Bonjour <strong>${escapeHtml(stats.fabricantName)}</strong>, voici le bilan complet de votre activit&eacute; VerifScan pour <strong>${escapeHtml(stats.periodLabel)}</strong>.</p>`;

  body += kpiRow([
    { value: String(stats.totalScans), label: "Scans du mois", color: "#022150" },
    { value: deltaText, label: "vs mois pr&eacute;c.", color: deltaColor },
    { value: String(stats.lotsGenerated), label: "Lots g&eacute;n&eacute;r&eacute;s", color: "#10B981" },
    { value: String(stats.inquiriesCount), label: "Demandes de devis", color: "#8B5CF6" },
  ]);

  if (stats.perProduct.length > 0) {
    body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#128202; Scans par produit</div>`;
    body += dataTable(
      ["Produit", "Scans", "Part"],
      stats.perProduct.map((p) => {
        const share =
          stats.totalScans > 0
            ? Math.round((p.scans / stats.totalScans) * 100)
            : 0;
        return [
          escapeHtml(p.productName),
          `<strong style="color:#022150;">${p.scans}</strong>`,
          `${share} %`,
        ];
      }),
    );
  } else {
    body += `<div style="background:#F0F4F9;border-radius:8px;padding:14px;margin-top:18px;font-size:13px;color:#0A2B5F;">Aucun scan ce mois-ci. Pensez &agrave; promouvoir vos QR codes en boutique et sur vos emballages !</div>`;
  }

  body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#128179; Demandes de devis</div>`;
  body += `<div style="background:#F9FAFB;border-radius:8px;padding:12px 14px;font-size:13px;color:#374151;">${stats.inquiriesCount > 0 ? `<strong>${stats.inquiriesCount}</strong> nouvelle${stats.inquiriesCount > 1 ? "s" : ""} demande${stats.inquiriesCount > 1 ? "s" : ""} de devis re&ccedil;ue${stats.inquiriesCount > 1 ? "s" : ""} ce mois-ci` : "Aucune demande de devis ce mois-ci"}${stats.newInquiriesPending > 0 ? ` &mdash; <strong style="color:#F59E0B;">${stats.newInquiriesPending} en attente de r&eacute;ponse</strong>` : ""}.</div>`;

  if (stats.expiringSoon.length > 0) {
    body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#9203; Lots expirant sous ${EXPIRY_WINDOW_DAYS} jours</div>`;
    body += dataTable(
      ["Produit", "Lot", "DLC", "Reste"],
      stats.expiringSoon.map((l) => {
        const color =
          l.daysLeft <= 7 ? "#EF4444" : l.daysLeft <= 15 ? "#F59E0B" : "#111827";
        return [
          escapeHtml(l.productName),
          escapeHtml(l.lotLabel),
          shortDateFmt.format(l.expiryDate),
          `<strong style="color:${color};">${l.daysLeft} j</strong>`,
        ];
      }),
    );
  }

  if (stats.expiredInMonth.length > 0) {
    body += `<div style="font-size:14px;font-weight:bold;color:#111827;margin:22px 0 2px 0;">&#10060; Expir&eacute;s ce mois-ci (${stats.expiredInMonth.length})</div>`;
    body += dataTable(
      ["Produit", "Lot", "DLC"],
      stats.expiredInMonth.map((l) => [
        escapeHtml(l.productName),
        escapeHtml(l.lotLabel),
        shortDateFmt.format(l.expiryDate),
      ]),
    );
  }

  body += `<div style="background:#F9FAFB;border-radius:8px;padding:12px 14px;margin-top:20px;font-size:12px;color:#6B7280;">Catalogue : <strong>${stats.activeProducts}</strong> produit(s) actif(s) &middot; <strong>${stats.activeLots}</strong> lot(s) actif(s).</div>`;

  return emailShell("&#128202; Rapport mensuel", "#10B981", body);
}

// ---------------------------------------------------------------------------
// Monthly report — job runner
// ---------------------------------------------------------------------------

export async function runMonthlyReportJob(): Promise<JobResult> {
  const result: JobResult = { processed: 0, sent: 0, skipped: 0, errors: [] };

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
      const stats = await aggregateMonthlyStats(f.id);
      if (!stats) {
        result.skipped += 1;
        continue;
      }

      // Idempotency: one report per month key (data.monthKey match).
      const already = await db.notification.findFirst({
        where: {
          userId: f.id,
          type: "monthly_report",
          data: { contains: `"monthKey":"${stats.monthKey}"` },
        },
        select: { id: true },
      });
      if (already) {
        result.skipped += 1;
        continue;
      }

      const title = `📊 Rapport mensuel — ${stats.periodLabel}`;
      const messageParts = [
        `${stats.totalScans} scans · ${stats.lotsGenerated} lot(s) généré(s) · ${stats.inquiriesCount} demande(s) de devis.`,
      ];
      if (stats.expiringSoon.length > 0) {
        messageParts.push(`⚠️ ${stats.expiringSoon.length} lot(s) expirent sous ${EXPIRY_WINDOW_DAYS} jours.`);
      }
      if (stats.expiredInMonth.length > 0) {
        messageParts.push(`❌ ${stats.expiredInMonth.length} lot(s) expiré(s) ce mois-ci.`);
      }

      await createNotification({
        userId: f.id,
        type: "monthly_report",
        title,
        message: messageParts.join(" "),
        severity: "info",
        data: { monthKey: stats.monthKey, periodLabel: stats.periodLabel },
        emailSubject: `📊 VerifScan — votre rapport mensuel (${stats.periodLabel})`,
        emailHtml: renderMonthlyReportEmail(stats),
      });

      result.sent += 1;
    } catch (err) {
      result.errors.push(`fabricant ${f.id}: ${String(err)}`);
    }
  }

  return result;
}
