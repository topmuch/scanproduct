/**
 * Test ciblé du job d'alertes péremption :
 *  - crée 3 lots temporaires (J-5, J-12, J-25) sur le fabricant Sarine
 *  - lance runExpiryAlertsJob()
 *  - exporte l'HTML de l'email généré (EmailLog) vers /tmp/email-preview.html
 *  - NETTOIE : supprime les lots temporaires, la notification et l'EmailLog de test
 */
import { db } from "../src/lib/db";
import { runExpiryAlertsJob } from "../src/lib/fabricant-emails";
import { writeFileSync } from "fs";

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const fabricant = await db.user.findFirst({
    where: { email: "sarine@biocosmetique.sn" },
    select: { id: true },
  });
  if (!fabricant) throw new Error("Fabricant Sarine introuvable");

  const product = await db.product.findFirst({
    where: { fabricantId: fabricant.id },
    select: { id: true },
  });
  if (!product) throw new Error("Produit Sarine introuvable");

  const now = Date.now();
  const mk = (days: number, suffix: string) => ({
    productId: product.id,
    fabricantId: fabricant.id,
    reference: `REF-TEST-${suffix}`,
    lotNumber: `TEST-DLC-${suffix}`,
    quantity: 10,
    expiryDate: new Date(now + days * DAY),
    status: "ACTIVE",
  });

  const created = await Promise.all([
    db.lot.create({ data: mk(5, "J5") }),
    db.lot.create({ data: mk(12, "J12") }),
    db.lot.create({ data: mk(25, "J25") }),
  ]);
  console.log("Lots de test créés:", created.map((c) => c.lotNumber).join(", "));

  const result = await runExpiryAlertsJob();
  console.log("Job:", JSON.stringify(result, null, 2));

  const log = await db.emailLog.findFirst({
    where: { to: "sarine@biocosmetique.sn" },
    orderBy: { createdAt: "desc" },
  });
  if (log?.body) {
    writeFileSync("/tmp/email-preview.html", log.body);
    console.log("HTML exporté → /tmp/email-preview.html (" + log.body.length + " chars)");
  }

  const notif = await db.notification.findFirst({
    where: { userId: fabricant.id, type: "lot_expiring" },
    orderBy: { createdAt: "desc" },
  });
  console.log("Notification:", notif ? `${notif.title} | severity=${notif.severity}` : "AUCUNE");

  // --- Cleanup ---
  await db.lot.deleteMany({ where: { id: { in: created.map((c) => c.id) } } });
  if (notif) await db.notification.delete({ where: { id: notif.id } });
  if (log) await db.emailLog.delete({ where: { id: log.id } });
  console.log("Cleanup OK (lots de test supprimés, notif + log de test purgés)");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
