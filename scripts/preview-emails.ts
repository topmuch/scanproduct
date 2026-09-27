/**
 * Génère des aperçus HTML des deux emails riches (digest + alerte péremption)
 * pour validation visuelle : /tmp/preview-digest.html et /tmp/preview-expiry.html
 */
import { db } from "../src/lib/db";
import {
  aggregateWeeklyStats,
  renderDigestEmail,
  renderExpiryAlertEmail,
  EXPIRY_BUCKETS,
} from "../src/lib/fabricant-emails";
import { writeFileSync } from "fs";

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const fabricant = await db.user.findFirst({
    where: { email: "sarine@biocosmetique.sn" },
    select: { id: true },
  });
  if (!fabricant) throw new Error("Fabricant introuvable");

  // --- Digest (vraies données de la seed) ---
  const stats = await aggregateWeeklyStats(fabricant.id);
  if (!stats) throw new Error("Stats indisponibles");
  writeFileSync("/tmp/preview-digest.html", renderDigestEmail(stats));
  console.log("→ /tmp/preview-digest.html");

  // --- Expiry (données simulées J-5 / J-12 / J-25) ---
  const now = Date.now();
  const mk = (days: number, name: string, lot: string) => ({
    bucket: EXPIRY_BUCKETS.find((b) => days <= b.maxDays)!,
    lots: [
      {
        lotNumber: lot,
        reference: lot,
        expiryDate: new Date(now + days * DAY),
        product: { name },
      },
    ],
  });
  const ordered = [
    mk(5, "Huile de Baobab Bio 250ml", "SAR-BAO-250-001"),
    mk(12, "Beurre de Karité pur 150g", "SAR-KAR-150-004"),
    mk(25, "Savon noir traditionnel 200g", "SAR-SAV-200-002"),
  ];
  writeFileSync("/tmp/preview-expiry.html", renderExpiryAlertEmail(ordered));
  console.log("→ /tmp/preview-expiry.html");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
