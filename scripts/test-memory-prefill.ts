/**
 * test-memory-prefill.ts — E2E du PRÉREMPLISSAGE + MÉMOIRE D'ACTIVATION.
 *
 * Couvre la demande utilisateur :
 *   1. Catalogue agroalimentaire élargi (produits locaux 🇸🇳 + tables durées)
 *      — chaque template porte une désignation préremplie.
 *   2. Préremplissage ÉDITABLE : désignation (toutes catégories) + ingrédients
 *      (agroalimentaire) avec note « adaptez à votre recette réelle ».
 *   3. MÉMOIRE : activer 2 QR puis revenir → la marque, le WhatsApp et les
 *      produits déjà activés sont repris automatiquement (bannière + chips
 *      « Reprendre »). Mode simple prérempli aussi.
 *
 * Usage : BASE=http://localhost:3100 DATABASE_URL=file:... ADMIN_PASSWORD=... bun scripts/test-memory-prefill.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import {
  ALL_PRODUCT_TEMPLATES,
  AGROALIMENTAIRE_TEMPLATES,
  getProductTemplateById,
} from "../src/lib/product-templates";

const BASE = process.env.BASE ?? "http://localhost:3100";
const prisma = new PrismaClient();
const SHOTS = "shots";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, extra = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

let jar = "";
function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) {
    const nv = c.split(";")[0];
    const name = nv.split("=")[0];
    jar = jar
      .split("; ")
      .filter((p) => p && !p.startsWith(`${name}=`))
      .concat(nv)
      .join("; ");
  }
}
async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

async function cleanupBatch(batchId: string) {
  const packs = await prisma.pack.findMany({ where: { batchId } });
  const packIds = packs.map((p) => p.id);
  const lots = await prisma.preActivatedLot.findMany({
    where: { packId: { in: packIds } },
    select: { id: true },
  });
  if (lots.length > 0) {
    await prisma.artisanScan.deleteMany({ where: { lotId: { in: lots.map((l) => l.id) } } });
    await prisma.artisanReview.deleteMany({ where: { lotId: { in: lots.map((l) => l.id) } } });
  }
  await prisma.preActivatedLot.deleteMany({ where: { packId: { in: packIds } } });
  await prisma.pack.deleteMany({ where: { id: { in: packIds } } });
  await prisma.batch.delete({ where: { id: batchId } }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  let batchId = "";

  try {
    // ═══ 0. BIBLIOTHÈQUE DE TEMPLATES (sans navigateur) ═══════════════════
    console.log("\n── Bibliothèque de templates (désignation + catalogue 🇸🇳) ──");
    check(
      "tous les templates ont une désignation",
      ALL_PRODUCT_TEMPLATES.every((t) => t.designation && t.designation.length > 5),
    );
    check(
      "catalogue agro ≥ 30 produits",
      AGROALIMENTAIRE_TEMPLATES.length >= 30,
      `${AGROALIMENTAIRE_TEMPLATES.length}`,
    );
    const attendus = [
      "jus-bissap",
      "jus-gingembre",
      "jus-bouye",
      "jus-tamarin",
      "thiakry-degue",
      "gari",
      "attieke-frais",
      "fonio-precuit",
      "noix-cajou-grillees",
      "plantain-chips",
      "netetou-soumbala",
      "oeufs-frais",
      "yaourt-lait-caille",
      "beurre-frais",
      "poisson-frais",
      "guedj-poisson-seche",
      "biscuits-secs-maison",
      "patisserie-fraiche",
      "farine-mil",
      "couscous-mil",
      "riz-local",
    ];
    const manquants = attendus.filter((id) => !getProductTemplateById(id));
    check("21 nouveaux produits 🇸🇳 présents", manquants.length === 0, manquants.join(", "));
    const jus = getProductTemplateById("jus-fruits-frais")!;
    check("jus frais = 3 jours (table utilisateur)", jus.shelfLifeDays === 3);

    // ═══ SETUP : batch de 50 QR ═══════════════════════════════════════════
    console.log("\n── SETUP : batch (1 pack de 50 QR) ──");
    const csrf = (await (await req("/api/auth/csrf")).json()) as { csrfToken: string };
    await req("/api/auth/callback/credentials", {
      method: "POST",
      body: JSON.stringify({
        csrfToken: csrf.csrfToken,
        email: "admin@verifscan.sn",
        password: process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025",
        callbackUrl: `${BASE}/superadmin`,
      }),
    });
    const batchRes = await req("/api/admin/batches", {
      method: "POST",
      body: JSON.stringify({ totalQuantity: 50, packSize: 50, pricePerPack: 25000 }),
    });
    const batchJson = (await batchRes.json()) as { batch?: { id: string } };
    batchId = batchJson.batch!.id;
    const pack = (await prisma.pack.findFirst({ where: { batchId } }))!;
    const master = pack.masterQrCode;
    check("pack 50 QR créé + maître", Boolean(master), master);
    await req("/api/admin/sell-pack", {
      method: "POST",
      body: JSON.stringify({ packId: pack.id, artisanPhone: "775551234", artisanName: "Mémoire Test" }),
    });

    // ═══ 1. PACK FRAIS : pas de mémoire + préremplissage assistant ════════
    console.log("\n── Pack frais : assistant agro préremplit désignation + ingrédients ──");
    await page.goto(`${BASE}/activer-pack/${master}?mode=simple`, { waitUntil: "networkidle" });
    check("pas de bannière mémoire (pack frais)", (await page.getByTestId("memory-banner").count()) === 0);
    await page.fill("#artisanName", "Mémoire Test");
    await page.fill("#contactPhone", "775551234");
    await page.getByTestId("wizard-next").click();

    // Étape 2 — produit : catégorie AGRO puis choisir « Jus de bissap »
    await page.waitForSelector("#productName", { timeout: 10000 });
    await page.getByRole("button", { name: /Agroalimentaire/ }).click();
    await page.fill('input[placeholder*="crème de corps"]', "bissap");
    await page.getByRole("button", { name: /Jus de bissap/ }).click();
    await page.waitForTimeout(300);
    const designation = await page.inputValue("#productDesignation");
    check(
      "désignation préremplie par le template",
      designation.includes("Jus de bissap artisanal"),
      designation,
    );
    await page.fill("#contenance", "1 L");
    await page.getByTestId("wizard-next").click();

    // Étape 3 — ingrédients : préremplis (agro) + note éditable
    await page.waitForSelector("#ingredients", { timeout: 10000 });
    const ing = await page.inputValue("#ingredients");
    check(
      "ingrédients préremplis (agro, éditable)",
      ing.includes("Fleurs d'hibiscus"),
      ing.slice(0, 40),
    );
    check("note « adaptez à votre recette réelle » visible", await page.getByTestId("ingredients-prefill-note").isVisible());
    await page.screenshot({ path: `${SHOTS}/memory-agro-prefill.png`, fullPage: true });

    // Abandonner (pas de soumission) → retour au choix
    await page.getByRole("button", { name: /Changer de mode/ }).click();
    await page.waitForTimeout(400);

    // ═══ 2. PASS 1 — activation flexible de 2 QR ══════════════════════════
    console.log("\n── PASS 1 : activation flexible de 2 QR « Karité Mémoire » ──");
    await page.getByTestId("choose-flexible").click();
    await page.waitForSelector("#sharedName", { timeout: 10000 });
    await page.fill("#sharedName", "Mémoire Test");
    await page.fill("#sharedPhone", "775551234");
    await page.getByTestId("wizard-next").click();

    await page.waitForSelector('[data-testid="group-count-0"]', { timeout: 10000 });
    await page.fill('[data-testid="group-count-0"]', "2");
    await page.fill('[data-testid="group-name-0"]', "Karité Mémoire");
    await page.getByTestId("wizard-next").click();

    await page.waitForSelector('[data-testid="group-ingredients-0"]', { timeout: 10000 });
    await page.fill('[data-testid="group-ingredients-0"]', "Beurre de karité bio, eau");
    await page.getByTestId("wizard-next").click();

    await page.waitForSelector('[data-testid="group-contenance-0"]', { timeout: 10000 });
    await page.fill('[data-testid="group-contenance-0"]', "500 g");
    await page.fill('[data-testid="group-price-0"]', "3 000 FCFA");
    await page.fill('[data-testid="group-mfg-0"]', "2026-09-20");
    await page.fill('[data-testid="group-exp-0"]', "2027-04-01");
    // Sélection d'un produit type → péremption auto-calculée + mémorisée
    await page.getByRole("button", { name: /Agroalimentaire/ }).click();
    await page.fill('input[placeholder*="crème de corps"]', "pâte d'arachide");
    await page.getByRole("button", { name: /Pâte d'arachide/ }).click();
    await page.waitForTimeout(300);
    check(
      "template sélectionné → péremption auto-calculée (6 mois)",
      (await page.inputValue('[data-testid="group-exp-0"]')) === "2027-03-20",
      await page.inputValue('[data-testid="group-exp-0"]'),
    );
    await page.getByTestId("wizard-next").click();
    await page.getByTestId("wizard-next").click(); // Photos (skip)
    await page.getByTestId("flexible-submit").click();
    await page.waitForSelector("text=QR codes activés", { timeout: 20000 });
    check("pass 1 : 2 QR activés", (await page.locator("text=2/50").count()) > 0);

    // ═══ 3. PASS 2 — RETOUR : la mémoire reprend tout ═════════════════════
    console.log("\n── PASS 2 : retour sur le pack → mémoire d'activation ──");
    await page.goto(`${BASE}/activer-pack/${master}?mode=flexible`, { waitUntil: "networkidle" });
    check("bannière mémoire visible", await page.getByTestId("memory-banner").isVisible());
    check("marque reprise", (await page.inputValue("#sharedName")) === "Mémoire Test");
    check("WhatsApp repris", (await page.inputValue("#sharedPhone")) === "775551234");
    await page.screenshot({ path: `${SHOTS}/memory-pass2-marque.png`, fullPage: true });
    await page.getByTestId("wizard-next").click();

    await page.waitForSelector('[data-testid="memory-chips-0"]', { timeout: 10000 });
    const chip = page.locator('[data-testid="reprendre-0-0"]');
    check("chip « Reprendre » visible", await chip.isVisible());
    check(
      "chip mentionne le produit + le nombre",
      (await chip.textContent())?.includes("Karité Mémoire · déjà activé ×2") === true,
      (await chip.textContent()) ?? "",
    );
    await page.fill('[data-testid="group-count-0"]', "3");
    await chip.click();
    check(
      "chip : nom repris",
      (await page.inputValue('[data-testid="group-name-0"]')) === "Karité Mémoire",
    );
    await page.screenshot({ path: `${SHOTS}/memory-pass2-produits.png`, fullPage: true });
    await page.getByTestId("wizard-next").click();

    await page.waitForSelector('[data-testid="group-ingredients-0"]', { timeout: 10000 });
    check(
      "chip : ingrédients repris",
      (await page.inputValue('[data-testid="group-ingredients-0"]')) === "Beurre de karité bio, eau",
    );
    await page.getByTestId("wizard-next").click();
    await page.waitForSelector('[data-testid="group-contenance-0"]', { timeout: 10000 });
    check("chip : contenance reprise", (await page.inputValue('[data-testid="group-contenance-0"]')) === "500 g");
    check("chip : prix repris", (await page.inputValue('[data-testid="group-price-0"]')) === "3 000 FCFA");
    check(
      "chip : date fabrication reprise",
      (await page.inputValue('[data-testid="group-mfg-0"]')) === "2026-09-20",
    );
    check(
      "chip : date péremption reprise (auto-calculée en pass 1)",
      (await page.inputValue('[data-testid="group-exp-0"]')) === "2027-03-20",
    );
    await page.getByTestId("wizard-next").click(); // Fraîcheur → Photos
    await page.getByTestId("wizard-next").click(); // Photos → Récap
    await page.getByTestId("flexible-submit").click();
    await page.waitForSelector("text=QR codes activés", { timeout: 20000 });
    check("pass 2 : 3 QR activés → total 5/50", (await page.locator("text=5/50").count()) > 0);

    // ═══ 4. MODE SIMPLE AU RETOUR : tout est prérempli ════════════════════
    console.log("\n── Mode simple au retour : préremplissage complet ──");
    await page.goto(`${BASE}/activer-pack/${master}?mode=simple`, { waitUntil: "networkidle" });
    check("bannière mémoire (mode simple)", await page.getByTestId("memory-banner").isVisible());
    check("marque préremplie (simple)", (await page.inputValue("#artisanName")) === "Mémoire Test");
    await page.getByTestId("wizard-next").click();
    await page.waitForSelector("#productName", { timeout: 10000 });
    check("produit prérempli (simple)", (await page.inputValue("#productName")) === "Karité Mémoire");
    check("contenance préremplie (simple)", (await page.inputValue("#contenance")) === "500 g");
    check(
      "désignation préremplie (template mémorisé)",
      (await page.inputValue("#productDesignation")).includes("Pâte d'arachide artisanale"),
    );
    check("template mémorisé réaffiché", (await page.locator("text=✅ Pâte d'arachide").count()) > 0);

    await page.screenshot({ path: `${SHOTS}/memory-simple-prefill.png`, fullPage: true });
  } catch (e) {
    failed++;
    console.log(`  ❌ EXCEPTION : ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    if (batchId) await cleanupBatch(batchId);
    await browser.close();
  }

  console.log(`\n══════════ RÉSULTAT : ${passed} OK / ${failed} KO ══════════`);
  if (failed > 0) process.exit(1);
  console.log("batchs de test supprimés");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
