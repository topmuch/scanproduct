/**
 * Test fonctionnel des jobs emails fabricants :
 *   1. runExpiryAlertsJob()  → alertes péremption (J-30/J-15/J-7)
 *   2. runWeeklyDigestJob()  → digest hebdo scans
 *
 * En dev sans SMTP : les emails sont "skipped" (contenu loggé en console)
 * mais les notifications in-app sont bien créées — idéal pour valider la
 * logique d'agrégation, les templates HTML et l'idempotence.
 *
 * Usage : bun run scripts/test-email-jobs.ts
 */
import { db } from "../src/lib/db";
import {
  runWeeklyDigestJob,
  runExpiryAlertsJob,
  aggregateWeeklyStats,
} from "../src/lib/fabricant-emails";

async function main() {
  console.log("=== Fabricants actifs ===");
  const fabricants = await db.user.findMany({
    where: { role: "FABRICANT", status: "ACTIVE" },
    select: { id: true, email: true, companyName: true },
  });
  console.table(fabricants);

  if (fabricants.length === 0) {
    console.error("Aucun fabricant actif — seed la base d'abord.");
    process.exit(1);
  }

  console.log("\n=== Aperçu agrégation (fabricant #1) ===");
  const stats = await aggregateWeeklyStats(fabricants[0].id);
  console.log(
    JSON.stringify(
      stats
        ? {
            fabricantName: stats.fabricantName,
            weekKey: stats.weekKey,
            periodLabel: stats.periodLabel,
            totalScans: stats.totalScans,
            previousScans: stats.previousScans,
            deltaPct: stats.deltaPct,
            activeProducts: stats.activeProducts,
            activeLots: stats.activeLots,
            topLots: stats.topLots.length,
            expiringLots: stats.expiringLots.length,
            recentlyExpired: stats.recentlyExpired.length,
          }
        : null,
      null,
      2,
    ),
  );

  console.log("\n=== JOB 1 : Alertes péremption ===");
  const r1 = await runExpiryAlertsJob();
  console.log(JSON.stringify(r1, null, 2));

  console.log("\n=== JOB 2 : Digest hebdomadaire ===");
  const r2 = await runWeeklyDigestJob();
  console.log(JSON.stringify(r2, null, 2));

  console.log("\n=== Idempotence : re-exécution immédiate ===");
  const r1b = await runExpiryAlertsJob();
  const r2b = await runWeeklyDigestJob();
  console.log(
    "expiry-alerts 2e run → sent:",
    r1b.sent,
    "(attendu 0)",
    "| weekly-digest 2e run → sent:",
    r2b.sent,
    "(attendu 0)",
  );

  console.log("\n=== Notifications créées (dernières 5) ===");
  const notifs = await db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      type: true,
      title: true,
      severity: true,
      emailedAt: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });
  console.table(
    notifs.map((n) => ({
      type: n.type,
      title: n.title.slice(0, 60),
      severity: n.severity,
      emailedAt: n.emailedAt?.toISOString() ?? null,
      pour: n.user.email,
    })),
  );

  console.log("\n=== EmailLog (derniers 5) ===");
  const logs = await db.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { to: true, subject: true, status: true, createdAt: true },
  });
  console.table(logs);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
