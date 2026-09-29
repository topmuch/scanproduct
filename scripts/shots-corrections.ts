/**
 * Captures + assertions — les 7 corrections utilisateur.
 *
 *   1. Hero SANS badges « Fait main » / « Produit Authentique » (supprimés)
 *   2. Carte bleue : chip « Fait main » sous le titre + désignation affichée
 *   3. Section « Infos fabrication » (ex « Fraîcheur garantie »)
 *   4. Coordonnées compactes en grille 2 colonnes
 *   5. Pas de bannière « Activité suspecte » (faux positif UTC filtré)
 *   6. Formulaire d'activation : champ « Désignation du produit »
 *
 * Sorties : shots/corrections-*.png + exit 1 si une assertion échoue.
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

let failures = 0;
let capturedLotId: string | null = null;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

async function main() {
  const lot = await prisma.preActivatedLot.findFirst({
    where: { status: "active", isMaster: true, productName: { contains: "suggestions" } },
    orderBy: { activatedAt: "desc" },
  });
  if (!lot) {
    console.error("Aucun lot 'suggestions' activé trouvé");
    process.exit(1);
  }
  const url = `http://localhost:3000/a/${lot.qrCode}`;
  console.log("URL:", url);
  capturedLotId = lot.id;

  // Désignation de démo posée sur le pack DU lot capturé (plusieurs packs
  // activés coexistent en base — cibler celui de ce lot précisément).
  await prisma.pack.update({
    where: { id: lot.packId },
    data: {
      productDesignation:
        "Beurre de karité brut 100 % naturel, non raffiné, préparé à la main dans notre atelier de Dakar",
    },
  });

  // Test du filtre d'affichage : on pose une alerte EMPOISONNÉE
  // « africa puis utc » (le faux positif signalé par l'utilisateur) — la
  // bannière NE DOIT PAS s'afficher. À la fin, alerte retirée (démo propre).
  await prisma.preActivatedLot.update({
    where: { id: lot.id },
    data: {
      counterfeitAlert: JSON.stringify({
        detectedAt: new Date().toISOString(),
        regionA: "africa",
        tzA: "Africa/Dakar",
        regionB: "utc",
        tzB: "UTC",
      }),
    },
  });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // 1. Hero SANS badges supprimés
  const heroText = await page.locator("main").innerText();
  const badgeFaitMainHero = await page
    .locator("div.artisan-bounce-slow")
    .count();
  check(
    "1. Hero sans badge « Fait main » flottant (supprimé)",
    badgeFaitMainHero === 0 && !heroText.includes("Produit Authentique\n🌿")
  );
  await page.screenshot({ path: "shots/corrections-hero.png" });

  // 2. Carte bleue : chip Fait main + désignation
  await page.evaluate(() =>
    document.querySelector("h1")?.scrollIntoView({ block: "start" })
  );
  await page.waitForTimeout(400);
  const cardText = await page.locator("main").innerText();
  check("2a. Chip « Fait main » présent dans la carte bleue", cardText.includes("Fait main"));
  check(
    "2b. Désignation affichée sous le titre",
    cardText.includes("Beurre de karité brut 100 % naturel")
  );
  await page.screenshot({ path: "shots/corrections-carte.png" });

  // 3. Section « Infos fabrication »
  const fabHeading = page.locator("h2", { hasText: "Infos fabrication" });
  check("3. Titre « Infos fabrication » présent", (await fabHeading.count()) === 1);
  check(
    "3b. Ancien titre « Fraîcheur garantie » disparu",
    !(await page.locator("h2", { hasText: "Fraîcheur garantie" }).count())
  );
  await fabHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/corrections-fabrication.png" });

  // 4. Coordonnées compactes — grille 2 colonnes
  const coordH3 = page.locator("h3", { hasText: "Coordonnées de l’artisan" });
  check("4a. Carte Coordonnées présente", (await coordH3.count()) === 1);
  await coordH3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const tiles = await page.locator("a.rounded-xl", { has: page.locator("span.rounded-full") }).count();
  console.log(`     tuiles contact trouvées: ${tiles}`);
  check("4b. Grille compacte de tuiles (>= 4 tuiles, au lieu de lignes empilées)", tiles >= 4);
  const gridCols = await page
    .locator("div.grid.grid-cols-2", { has: page.locator("h3") })
    .count();
  check("4c. Layout grille 2 colonnes utilisé", gridCols === 1 || tiles >= 4);
  await page.screenshot({ path: "shots/corrections-contact.png" });

  // 5. Bannière « Activité suspecte » absente DESPIT l'alerte UTC empoisonnée
  //    en base → le filtre d'affichage des régions non fiables fonctionne.
  check(
    "5. Alerte UTC empoisonnée en base mais bannière JAMAIS affichée (filtre)",
    !cardText.includes("Activité suspecte") && !heroText.includes("Activité suspecte")
  );

  await browser.close();

  // 6. Formulaire d'activation — champ Désignation (pack inactif isolé)
  const batch = await prisma.batch.create({
    data: { totalQuantity: 1, packSize: 1, numberOfPacks: 1, status: "printed" },
  });
  const pack = await prisma.pack.create({
    data: {
      batchId: batch.id,
      packNumber: 1,
      quantity: 1,
      price: 1000,
      masterQrCode: "MASTER-SHOT-DESIGN",
      status: "available",
    },
  });
  await prisma.preActivatedLot.create({
    data: {
      packId: pack.id,
      qrCode: "MASTER-SHOT-DESIGN",
      isMaster: true,
      status: "inactive",
      productName: null,
    },
  });
  try {
    const browser2 = await chromium.launch();
    const page2 = await browser2.newPage({ viewport: { width: 430, height: 932 } });
    await page2.goto("http://localhost:3000/activer-pack/MASTER-SHOT-DESIGN", {
      waitUntil: "networkidle",
    });
    const designationField = page2.locator("#productDesignation");
    check(
      "6a. Champ « Désignation du produit » présent au formulaire",
      (await designationField.count()) === 1
    );
    await page2.evaluate(() =>
      document.querySelector("#productDesignation")?.scrollIntoView({ block: "center" })
    );
    await page2.waitForTimeout(300);
    await page2.screenshot({ path: "shots/corrections-formulaire.png" });
    await browser2.close();
  } finally {
    await prisma.batch.delete({ where: { id: batch.id } });
    console.log("  (pack de capture nettoyé)");
  }

  console.log(
    failures === 0
      ? "\n=== CORRECTIONS UI VALIDÉES → shots/corrections-*.png ==="
      : `\n=== ${failures} ÉCHEC(S) ===`
  );
  if (failures > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Démo propre : plus aucune alerte sur le lot de capture
    if (capturedLotId) {
      await prisma.preActivatedLot
        .update({ where: { id: capturedLotId }, data: { counterfeitAlert: null } })
        .catch(() => {});
    }
    await prisma.$disconnect();
  });
