/**
 * Captures Playwright — onboarding d'activation artisan (wizard 5 étapes,
 * logo) + page publique refondue (bannière « authentique & fait main »,
 * fraîcheur en vedette, conseils pliables, avatar logo).
 *
 * Sorties : /home/z/my-project/download/proof-onboarding-*.png
 *           /home/z/my-project/download/proof-page-*.png
 *
 * BASE=http://localhost:3100 bun scripts/shot-onboarding.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = "/home/z/my-project/download";
const stamp = Date.now();
const MASTER = `MASTER-SHOT-${stamp}`;
const MASTER2 = `MASTER-SHOT2-${stamp}`;

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function createPack(master: string, artCount: number) {
  const batch = await prisma.batch.create({
    data: { totalQuantity: artCount, packSize: 1, numberOfPacks: 1, status: "pending" },
  });
  const pack = await prisma.pack.create({
    data: { batchId: batch.id, packNumber: 1, quantity: artCount, price: 0, masterQrCode: master },
  });
  await prisma.preActivatedLot.create({ data: { packId: pack.id, qrCode: master, isMaster: true } });
  const arts: string[] = [];
  for (let i = 1; i <= artCount; i++) {
    const code = `${master.replace("MASTER-", "ART-")}-000${i}`;
    await prisma.preActivatedLot.create({ data: { packId: pack.id, qrCode: code, isMaster: false } });
    arts.push(code);
  }
  return { batchId: batch.id, packId: pack.id, arts };
}

async function makePng(size: number, r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();
}

async function main() {
  const browser = await chromium.launch();

  // ═══ PARTIE A — WIZARD D'ONBOARDING ═══
  console.log("\n── A. Wizard d'activation (5 étapes guidées) ──");
  const packA = await createPack(MASTER, 1);
  const ctxA = await browser.newContext({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctxA.newPage();

  await page.goto(`${BASE}/activer-pack/${MASTER}`, { waitUntil: "networkidle" });
  await page.click('[data-testid="choose-simple"]');
  await page.waitForSelector('[data-testid="wizard-next"]');
  await page.screenshot({ path: `${OUT}/proof-onboarding-etape1-produit.png`, fullPage: true });
  check("étape 1 affichée (Produit)", (await page.textContent("body")).includes("Votre produit"));

  // Upload du LOGO à l'étape 1 — chaque PhotoPicker contient 2 inputs
  // (caméra + galerie) : photo produit = 0/1, logo = 2/3 → on vise la
  // GALERIE du logo (nth 3).
  const logoPng = await makePng(300, 40, 90, 200);
  const logoInput = page.locator('input[type="file"]').nth(3);
  await logoInput.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logoPng });
  await page.waitForTimeout(400);

  // Remplit nom + contenance puis continue (le prix est à l'étape 3)
  await page.fill("#productName", "Savon au karité & miel");
  await page.fill("#contenance", "150g");
  await page.screenshot({ path: `${OUT}/proof-onboarding-etape1-remplie.png`, fullPage: true });
  await page.click('[data-testid="wizard-next"]');

  // Étape 2 — Recette & fraîcheur
  await page.waitForSelector("#ingredients");
  check("étape 2 affichée (Recette & fraîcheur)", (await page.textContent("body")).includes("Recette & fraîcheur"));
  await page.fill("#ingredients", "Beurre de karité, miel de kédougou, huile de coco, soude");
  await page.fill("#manufacturingDate", "2026-10-01");
  // Aucun produit type sélectionné ici → saisie manuelle de la péremption
  // (l'auto-calcul est couvert par scripts/test-auto-completion.ts)
  await page.fill("#expirationDate", "2027-04-01");
  await page.screenshot({ path: `${OUT}/proof-onboarding-etape2-recette.png`, fullPage: true });
  await page.click('[data-testid="wizard-next"]');

  // Étape 3 — Vous & contact
  await page.waitForSelector("#artisanName");
  await page.fill("#artisanName", "Inso Beauty");
  await page.fill("#contactPhone", "78 382 18 22");
  await page.fill("#productPrice", "2 500 FCFA");
  await page.screenshot({ path: `${OUT}/proof-onboarding-etape3-vous.png`, fullPage: true });
  await page.click('[data-testid="wizard-next"]');

  // Étape 4 — Pour mieux vendre
  await page.waitForSelector("#instagramUrl");
  check("étape 4 affichée (Pour mieux vendre)", (await page.textContent("body")).includes("Pour mieux vendre"));
  await page.screenshot({ path: `${OUT}/proof-onboarding-etape4-vendre.png`, fullPage: true });
  await page.click('[data-testid="wizard-next"]');

  // Étape 5 — Récapitulatif
  await page.waitForSelector('[data-testid="activation-submit"]');
  const recapText = (await page.textContent("body")) || "";
  check("récap affiché", recapText.includes("Récapitulatif") && recapText.includes("À utiliser avant"));
  check("logo listé au récap", recapText.includes("logo.png"));
  await page.screenshot({ path: `${OUT}/proof-onboarding-etape5-recap.png`, fullPage: true });
  await ctxA.close();

  // ═══ PARTIE B — PAGE PUBLIQUE REFAONDUE (avec logo + 5 conseils) ═══
  console.log("\n── B. Page publique refondue ──");
  const packB = await createPack(MASTER2, 1);
  // Photo + logo réels uploadés par l'API (WebP en base, comme en prod)
  const photoPng = await makePng(600, 190, 120, 60);
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(photoPng)], { type: "image/png" }), "produit.png");
  fd.append("masterCode", MASTER2);
  const up1 = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: fd });
  const photoUrl = ((await up1.json()) as { url: string }).url;
  const logoPng2 = await makePng(300, 40, 90, 200);
  const fd2 = new FormData();
  fd2.append("file", new Blob([new Uint8Array(logoPng2)], { type: "image/png" }), "logo.png");
  fd2.append("masterCode", MASTER2);
  const up2 = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: fd2 });
  const logoUrl = ((await up2.json()) as { url: string }).url;

  const actRes = await fetch(`${BASE}/api/artisan/activate-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: MASTER2,
      groups: [
        {
          count: 1,
          productData: {
            productName: "Beurre de karité pur",
            productDesignation: "100 % naturel, préparé à la main à Thiès",
            contenance: "250g",
            ingredients: "Karité brut non raffiné, vitamine E naturelle",
            manufacturingDate: "2026-10-01",
            expirationDate: "2027-04-01",
            photoUrl,
            productPrice: "3 500 FCFA le pot",
            artisanBio: "Inso Beauty transforme le karité brut avec 12 femmes productrices de la région de Thiès.",
            usageTips:
              "Chauffer légèrement entre les paumes avant application\nAppliquer sur peau humide après la douche\nInsister sur coudes, genoux et talons\nUtiliser sur les pointes pour nourrir les cheveux\nConserver le pot bien fermé",
            templateId: "",
            precautions: "Usage externe uniquement",
            storageConditions: "À l'abri de la chaleur",
          },
        },
      ],
      shared: {
        artisanName: "Inso Beauty",
        contactPhone: "+221 78 382 18 22",
        contactEmail: "",
        instagramUrl: "",
        facebookUrl: "",
        tiktokUrl: "",
        artisanPhotos: [],
        logoUrl,
      },
    }),
  });
  const firstCode = ((await actRes.json()) as { firstCode: string }).firstCode;
  check("activation B ok", actRes.ok && !!firstCode, firstCode);

  const ctxB = await browser.newContext({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
  });
  const p2 = await ctxB.newPage();
  await p2.goto(`${BASE}/a/${firstCode}`, { waitUntil: "networkidle" });

  const body2 = (await p2.textContent("body")) || "";
  check("bannière « Produit authentique & fait main » visible", body2.includes("Produit authentique") && /fait main/i.test(body2));
  check("fraîcheur en vedette (« À utiliser avant le »)", body2.includes("À utiliser avant le"));
  const logoVisible = await p2.locator(`img[src="${logoUrl}"]`).count();
  check("logo affiché sur la page", logoVisible >= 2, `${logoVisible} img`);
  // Localisateurs = éléments rendus uniquement (textContent inclurait le payload RSC)
  const tip5Rendered = await p2.getByText("Conserver le pot bien fermé").count();
  check("conseil 5 masqué avant clic", tip5Rendered === 0, `${tip5Rendered} élément(s)`);

  await p2.screenshot({ path: `${OUT}/proof-page-banniere-authentique.png`, fullPage: false });
  // Scroll sur la section fraîcheur
  await p2.getByText("Du frais, prouvé").scrollIntoViewIfNeeded();
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: `${OUT}/proof-page-fraicheur-vedette.png`, fullPage: false });

  // Déplier les conseils
  await p2.getByText("Voir les 2 autres conseils").scrollIntoViewIfNeeded();
  await p2.waitForTimeout(200);
  await p2.screenshot({ path: `${OUT}/proof-page-conseils-plies.png`, fullPage: false });
  await p2.getByText("Voir les 2 autres conseils").click();
  await p2.waitForTimeout(300);
  const tip5After = await p2.getByText("Conserver le pot bien fermé").count();
  check("clic déplie les conseils restants", tip5After === 1);
  await p2.screenshot({ path: `${OUT}/proof-page-conseils-deplies.png`, fullPage: false });

  // Vue pleine page (tout le scroll)
  await p2.goto(`${BASE}/a/${firstCode}`, { waitUntil: "networkidle" });
  await p2.waitForTimeout(600);
  await p2.screenshot({ path: `${OUT}/proof-page-complete.png`, fullPage: true });
  await ctxB.close();

  await browser.close();

  // Cleanup
  for (const pk of [packA, packB]) {
    await prisma.preActivatedLot.deleteMany({ where: { packId: pk.packId } });
    await prisma.pack.delete({ where: { id: pk.packId } });
    await prisma.batch.delete({ where: { id: pk.batchId } });
  }
  console.log("🧹 Données de capture nettoyées");

  console.log(failures === 0 ? "\n🎉 CAPTURES + ASSERTIONS OK" : `\n💥 ${failures} ÉCHEC(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
