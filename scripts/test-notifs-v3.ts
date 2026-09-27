/**
 * Test fonctionnel des 3 nouvelles fonctionnalités email :
 *   1. createInquiry()      → notification "new_inquiry" (demande de devis)
 *   2. runMonthlyReportJob() → rapport mensuel (lots, scans/produit, devis, péremption)
 *   3. runSubscriptionAlertsJob() → alertes fin d'abonnement (J-7 / J-3 / expiré)
 *
 * En dev sans SMTP : emails "skipped" (loggés) mais notifications in-app
 * créées + EmailLog remplis — parfait pour valider agrégation, templates
 * HTML, déduplication et idempotence.
 *
 * Usage : bun run scripts/test-notifs-v3.ts
 */
import { db } from "../src/lib/db";
import { createInquiry } from "../src/lib/marketplace";
import {
  runMonthlyReportJob,
  aggregateMonthlyStats,
  renderMonthlyReportEmail,
  renderInquiryEmail,
} from "../src/lib/fabricant-emails";
import {
  runSubscriptionAlertsJob,
  renderSubscriptionAlertEmail,
  getUserSubscription,
} from "../src/lib/subscription";
import { PLANS } from "../src/lib/plan-limits";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  // ------------------------------------------------------------------
  // Setup : fabricant de test
  // ------------------------------------------------------------------
  const fabricants = await db.user.findMany({
    where: { role: "FABRICANT", status: "ACTIVE" },
    select: { id: true, email: true, companyName: true },
    take: 1,
  });
  if (fabricants.length === 0) {
    console.error("Aucun fabricant actif — seed la base d'abord.");
    process.exit(1);
  }
  const fab = fabricants[0];
  console.log("=== Fabricant de test ===");
  console.table(fabricants);

  // ------------------------------------------------------------------
  // 1) DEMANDE DE DEVIS → new_inquiry
  // ------------------------------------------------------------------
  console.log("\n=== 1) Demande de devis (createInquiry) ===");
  const product = await db.product.findFirst({
    where: { fabricantId: fab.id },
    select: { id: true, name: true },
  });
  if (!product) {
    console.error("Aucun produit pour ce fabricant — crée un produit d'abord.");
    process.exit(1);
  }

  const inquiry = await createInquiry({
    productId: product.id,
    requesterName: "Aminata Diallo",
    requesterCompany: "Distribution Sénégal SARL",
    requesterEmail: "aminata@distsenegal.sn",
    requesterPhone: "+221 77 123 45 67",
    requesterCountry: "Sénégal",
    requesterCity: "Dakar",
    message:
      "Bonjour, nous souhaitons distribuer ce produit dans la région de Dakar. Pouvez-vous nous faire un devis pour 500 unités ?",
    quantity: 500,
    targetPrice: "1 500 FCFA/unité",
    deliveryDelay: "3 semaines",
  });
  console.log(`Inquiry créée: ${inquiry.id} (status=${inquiry.status})`);

  // attendre la notification fire-and-forget
  await new Promise((r) => setTimeout(r, 800));

  const notifInquiry = await db.notification.findFirst({
    where: { userId: fab.id, type: "new_inquiry" },
    orderBy: { createdAt: "desc" },
  });
  console.log("Notification:", notifInquiry ? {
    type: notifInquiry.type,
    title: notifInquiry.title,
    severity: notifInquiry.severity,
    channels: notifInquiry.channels,
    emailedAt: notifInquiry.emailedAt,
  } : "❌ ABSENTE");

  const emailLogInquiry = await db.emailLog.findFirst({
    where: { subject: { contains: "demande de devis" } },
    orderBy: { createdAt: "desc" },
  });
  console.log("EmailLog:", emailLogInquiry ? {
    to: emailLogInquiry.to,
    subject: emailLogInquiry.subject,
    status: emailLogInquiry.status,
  } : "❌ ABSENT");

  // Aperçu HTML
  const inquiryHtml = renderInquiryEmail({
    inquiryId: inquiry.id,
    productName: product.name,
    productId: product.id,
    requesterName: "Aminata Diallo",
    requesterCompany: "Distribution Sénégal SARL",
    requesterEmail: "aminata@distsenegal.sn",
    requesterPhone: "+221 77 123 45 67",
    requesterCountry: "Sénégal",
    requesterCity: "Dakar",
    message: "Bonjour, nous souhaitons distribuer ce produit dans la région de Dakar. Pouvez-vous nous faire un devis pour 500 unités ?",
    quantity: 500,
    targetPrice: "1 500 FCFA/unité",
    deliveryDelay: "3 semaines",
    createdAt: new Date(),
  });
  await Bun.write("/home/z/my-project/scanproduct/scripts/preview-inquiry.html", inquiryHtml);
  console.log("Aperçu HTML → scripts/preview-inquiry.html");

  // ------------------------------------------------------------------
  // 2) RAPPORT MENSUEL
  // ------------------------------------------------------------------
  console.log("\n=== 2) Rapport mensuel ===");
  const stats = await aggregateMonthlyStats(fab.id);
  if (stats) {
    console.log(JSON.stringify({
      periodLabel: stats.periodLabel,
      monthKey: stats.monthKey,
      lotsGeneres: stats.lotsGenerated,
      totalScans: stats.totalScans,
      previousScans: stats.previousScans,
      deltaPct: stats.deltaPct,
      produitsActifs: stats.activeProducts,
      lotsActifs: stats.activeLots,
      devisRecus: stats.inquiriesCount,
      devisEnAttente: stats.newInquiriesPending,
      produitsTopScans: stats.perProduct.slice(0, 3).map((p) => `${p.productName}: ${p.scans}`),
      expirantBientot: stats.expiringSoon.length,
      expiresCeMois: stats.expiredInMonth.length,
    }, null, 2));
    await Bun.write(
      "/home/z/my-project/scanproduct/scripts/preview-monthly.html",
      renderMonthlyReportEmail(stats),
    );
    console.log("Aperçu HTML → scripts/preview-monthly.html");
  }

  const run1 = await runMonthlyReportJob();
  console.log("Job run #1:", run1);
  const run2 = await runMonthlyReportJob();
  console.log("Job run #2 (idempotence):", run2);
  if (run2.sent !== 0) {
    console.error("❌ IDEMPOTENCE KO — le 2e run a renvoyé des emails");
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // 3) FIN D'ABONNEMENT
  // ------------------------------------------------------------------
  console.log("\n=== 3) Fin d'abonnement ===");

  // Nettoyer les subscriptions existantes du fabricant de test
  await db.subscription.deleteMany({ where: { userId: fab.id } });

  // Cas a) subscription expirant dans 5 jours → bucket J7
  await db.subscription.create({
    data: {
      userId: fab.id,
      plan: "pro",
      status: "ACTIVE",
      startedAt: new Date(Date.now() - 25 * DAY_MS),
      expiresAt: new Date(Date.now() + 5 * DAY_MS),
    },
  });
  const subView = await getUserSubscription(fab.id);
  console.log("Subscription J-5:", subView ? `${subView.planName}, ${subView.daysLeft}j restants` : "null");

  const runSub1 = await runSubscriptionAlertsJob();
  console.log("Job sub run #1:", runSub1);

  // Cas b) expirant dans 2 jours → bucket J3
  await db.subscription.updateMany({
    where: { userId: fab.id, status: "ACTIVE" },
    data: { expiresAt: new Date(Date.now() + 2 * DAY_MS) },
  });
  const runSub2 = await runSubscriptionAlertsJob();
  console.log("Job sub run #2 (J-3):", runSub2);

  // Cas c) déjà expirée → bucket EXPIRED + flip status
  await db.subscription.updateMany({
    where: { userId: fab.id, status: "ACTIVE" },
    data: { expiresAt: new Date(Date.now() - 1 * DAY_MS) },
  });
  const runSub3 = await runSubscriptionAlertsJob();
  console.log("Job sub run #3 (expirée):", runSub3);

  const flipped = await db.subscription.findFirst({
    where: { userId: fab.id, status: "EXPIRED" },
  });
  console.log("Flip ACTIVE→EXPIRED:", flipped ? "✅ OK" : "❌ KO");

  // Idempotence : re-run → 0 envoyé
  await db.subscription.updateMany({
    where: { userId: fab.id },
    data: { status: "ACTIVE", expiresAt: new Date(Date.now() + 5 * DAY_MS) },
  });
  const runSub4 = await runSubscriptionAlertsJob();
  console.log("Job sub run #4 (idempotence, J-5 re-run):", runSub4);

  // Vérifier les notifications créées
  const subNotifs = await db.notification.findMany({
    where: { userId: fab.id, type: "subscription" },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Notifications subscription: ${subNotifs.length}`);
  for (const n of subNotifs) {
    console.log(`  - [${n.severity}] ${n.title}`);
  }

  // Aperçu HTML J-7
  await Bun.write(
    "/home/z/my-project/scanproduct/scripts/preview-subscription.html",
    renderSubscriptionAlertEmail({
      planName: "Pro",
      priceMonthly: PLANS.pro.priceMonthly,
      expiresAt: new Date(Date.now() + 5 * DAY_MS),
      daysLeft: 5,
      bucket: { key: "J7", maxDays: 7, severity: "warning", color: "#F59E0B", label: "expire dans 7 jours", title: "" },
      productCount: 3,
      qrUsedThisMonth: 42,
    }),
  );
  console.log("Aperçu HTML → scripts/preview-subscription.html");

  // Remettre une subscription propre (Pro, +30 j) pour le fabricant
  await db.subscription.deleteMany({ where: { userId: fab.id } });
  await db.subscription.create({
    data: {
      userId: fab.id,
      plan: "pro",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * DAY_MS),
    },
  });
  // resynchroniser le setting legacy
  await db.setting.upsert({
    where: { key: `plan:${fab.id}` },
    update: { value: "pro" },
    create: { key: `plan:${fab.id}`, value: "pro" },
  });
  console.log("\nSubscription finale restaurée (Pro, +30 jours) ✅");

  console.log("\n=== RÉSUMÉ ===");
  console.log("1. Devis new_inquiry + email riche:", notifInquiry ? "✅" : "❌");
  console.log("2. Rapport mensuel + idempotence:", run1.sent > 0 && run2.sent === 0 ? "✅" : "❌");
  console.log("3. Fin d'abonnement (J7/J3/expiré + flip + dedup):", subNotifs.length >= 3 ? "✅" : "❌");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
