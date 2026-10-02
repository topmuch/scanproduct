/**
 * Test e2e — Système d'AUTO-COMPLÉTION INTELLIGENTE (produits types).
 *
 * Couvre les 8 phases de l'implémentation :
 *   1. Templates : 24 produits types complets (cosmétique + agroalimentaire)
 *   2. Calculateur de péremption : mois + jours fins + statuts fraîcheur
 *   3. Schéma DB : nouvelles colonnes Product + PreActivatedLot
 *   4. API /api/product-templates (GET) + /api/calculate-expiration (POST)
 *   5. Version CLASSIQUE : POST/PATCH /api/products persiste templateId,
 *      usageTips, precautions, storageConditions, shelfLifeMonths
 *   6. Version ARTISAN : POST /api/artisan/activate-groups persiste les
 *      mêmes champs sur PreActivatedLot (mode simple = 1 groupe)
 *   7. Pages publiques : /p/[lotId] affiche « Conseils & Précautions »,
 *      /a/[code] affiche Précautions + Conservation
 *
 *   TEST_BASE_URL=http://localhost:3100 bun scripts/test-auto-completion.ts
 */
import { db } from "@/lib/db";
import {
  PRODUCT_TEMPLATES,
  AGROALIMENTAIRE_TEMPLATES,
  getProductTemplateById,
} from "@/lib/product-templates";
import {
  calculateExpirationDate,
  getDaysUntilExpiration,
  getFreshnessStatus,
} from "@/lib/expiration-calculator";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";
const EMAIL = "sarine@biocosmetique.sn";
const PASSWORD = "Demo1234!";

let passed = 0;
let failed = 0;
let cookieJar = "";

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [nv] = raw.split(";");
    const name = nv.split("=")[0];
    if (!name) continue;
    if (cookieJar.includes(name + "=")) {
      cookieJar = cookieJar.replace(new RegExp(`${name}=[^;]*`), nv);
    } else {
      cookieJar = cookieJar ? `${cookieJar}; ${nv}` : nv;
    }
  }
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "user-agent": "test-auto-completion",
      ...(init.headers ?? {}),
      cookie: cookieJar,
    },
  });
  captureCookies(res);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return { status: res.status, body: await res.json().catch(() => null), res };
  }
  return { status: res.status, body: null, res, text: await res.text() };
}

async function login(email: string, password: string): Promise<string | null> {
  const csrf = await req("/api/auth/csrf");
  await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: (csrf.body as { csrfToken?: string })?.csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
    }),
  });
  const sess = await req("/api/auth/session");
  return (sess.body as { user?: { role?: string } })?.user?.role ?? null;
}

// ════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("═".repeat(66));
  console.log("TEST AUTO-COMPLÉTION INTELLIGENTE — produits types");
  console.log(`  BASE = ${BASE}`);
  console.log("═".repeat(66));

  // ── 1. Templates ────────────────────────────────────────────────────────
  console.log("\n[1] Bibliothèque de produits types");
  check("14 templates cosmétiques", PRODUCT_TEMPLATES.length === 14, `${PRODUCT_TEMPLATES.length}`);
  check("10 templates agroalimentaires", AGROALIMENTAIRE_TEMPLATES.length === 10, `${AGROALIMENTAIRE_TEMPLATES.length}`);
  const all = [...PRODUCT_TEMPLATES, ...AGROALIMENTAIRE_TEMPLATES];
  check(
    "Chaque template : conseils + précautions + conservation",
    all.every((t) => t.usageTips.length >= 4 && t.precautions.length >= 3 && t.storageConditions.length > 10),
  );
  check(
    "IDs uniques",
    new Set(all.map((t) => t.id)).size === all.length,
  );
  check(
    "Lookup par id (beurre de karité)",
    getProductTemplateById("beurre-karite-pur")?.name === "Beurre de karité pur",
  );
  check(
    "Durées adaptées (pain 7 j via shelfLifeDays)",
    getProductTemplateById("pain-artisanal")?.shelfLifeDays === 7,
  );

  // ── 2. Calculateur ──────────────────────────────────────────────────────
  console.log("\n[2] Calculateur de date de péremption");
  const mfg = new Date("2026-01-15T00:00:00");
  const exp6 = calculateExpirationDate(mfg, 6);
  check(
    "+6 mois → 15 juillet 2026",
    exp6.toISOString().slice(0, 10) === "2026-07-15",
    exp6.toISOString().slice(0, 10),
  );
  const expDays = calculateExpirationDate(mfg, 0, 7);
  check(
    "+7 jours (prime jours) → 22 janvier 2026",
    expDays.toISOString().slice(0, 10) === "2026-07-22" ? false : expDays.toISOString().slice(0, 10) === "2026-01-22",
    expDays.toISOString().slice(0, 10),
  );
  const vieux = calculateExpirationDate(new Date(Date.now() - 100 * 86400000), 1);
  check(
    "getFreshnessStatus(-10j) = expired",
    getFreshnessStatus(getDaysUntilExpiration(vieux)).status === "expired",
  );
  check(
    "getFreshnessStatus(200j) = fresh",
    getFreshnessStatus(200).status === "fresh",
  );
  check(
    "getFreshnessStatus(15j) = critical",
    getFreshnessStatus(15).status === "critical",
  );

  // ── 3. Schéma DB ────────────────────────────────────────────────────────
  console.log("\n[3] Colonnes DB (Product + PreActivatedLot)");
  const prodProbe = await db.product.create({
    data: {
      name: "[TEST] Auto-complétion produit",
      fabricantId: (
        await db.user.findUnique({ where: { email: EMAIL } })
      )?.id ?? "",
      templateId: "creme-visage",
      shelfLifeMonths: 6,
      usageTips: JSON.stringify(["Test conseil 1", "Test conseil 2"]),
      precautions: JSON.stringify(["Test précaution"]),
      storageConditions: "Test conservation",
    },
  });
  const prodRead = await db.product.findUnique({ where: { id: prodProbe.id } });
  check(
    "Product : templateId/shelfLifeMonths/usageTips/precautions/storageConditions persistés",
    prodRead?.templateId === "creme-visage" &&
      prodRead?.shelfLifeMonths === 6 &&
      JSON.parse(prodRead?.usageTips ?? "[]").length === 2 &&
      JSON.parse(prodRead?.precautions ?? "[]").length === 1 &&
      prodRead?.storageConditions === "Test conservation",
  );
  await db.product.delete({ where: { id: prodProbe.id } });

  // ── 4. API publiques ────────────────────────────────────────────────────
  console.log("\n[4] API product-templates + calculate-expiration");
  const tplRes = await req("/api/product-templates?q=karit%C3%A9");
  const tplBody = tplRes.body as { templates?: { id: string }[] };
  check(
    "GET /api/product-templates?q=karité → beurre de karité",
    tplRes.status === 200 &&
      tplBody.templates?.some((t) => t.id === "beurre-karite-pur") === true,
    `${tplRes.status}`,
  );
  const catRes = await req("/api/product-templates?category=agroalimentaire");
  check(
    "GET ?category=agroalimentaire → 10 templates",
    (catRes.body as { templates?: unknown[] })?.templates?.length === 10,
  );
  const calcRes = await req("/api/calculate-expiration", {
    method: "POST",
    body: JSON.stringify({ manufacturingDate: "2026-03-01", shelfLifeMonths: 12 }),
  });
  check(
    "POST /api/calculate-expiration (12 mois) → 2027-03-01",
    calcRes.status === 200 &&
      (calcRes.body as { expirationDate?: string })?.expirationDate === "2027-03-01",
  );
  const calcBad = await req("/api/calculate-expiration", {
    method: "POST",
    body: JSON.stringify({ shelfLifeMonths: 12 }),
  });
  check("POST sans date → 400", calcBad.status === 400);

  // ── 5. Version classique : POST/PATCH /api/products ────────────────────
  console.log("\n[5] Version CLASSIQUE — POST /api/products avec template");
  const role = await login(EMAIL, PASSWORD);
  check("Login fabricant", role === "FABRICANT", `role=${role}`);
  const karite = getProductTemplateById("beurre-karite-pur")!;
  const createRes = await req("/api/products", {
    method: "POST",
    body: JSON.stringify({
      name: "[TEST] Beurre de karité assistant",
      templateId: karite.id,
      shelfLifeMonths: karite.shelfLifeMonths,
      usageTips: karite.usageTips,
      precautions: karite.precautions,
      storageConditions: karite.storageConditions,
    }),
  });
  const created = createRes.body as { id?: string };
  check("POST /api/products → 201", createRes.status === 201, `${createRes.status}`);
  const dbProd = created.id ? await db.product.findUnique({ where: { id: created.id } }) : null;
  check(
    "Champs template persistés en DB",
    dbProd?.templateId === "beurre-karite-pur" &&
      dbProd?.shelfLifeMonths === 24 &&
      JSON.parse(dbProd?.usageTips ?? "[]").length === 5 &&
      JSON.parse(dbProd?.precautions ?? "[]").length === 4,
  );
  // PATCH : mise à jour vers un autre template
  const patchRes = await req(`/api/products/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      templateId: "creme-visage",
      shelfLifeMonths: 6,
      usageTips: ["Nouveau conseil"],
      precautions: ["Nouvelle précaution"],
      storageConditions: "Nouvelle conservation",
    }),
  });
  check("PATCH /api/products/:id → 200", patchRes.status === 200);
  const dbProd2 = await db.product.findUnique({ where: { id: created.id! } });
  check(
    "PATCH persiste les nouveaux champs",
    dbProd2?.templateId === "creme-visage" && dbProd2?.shelfLifeMonths === 6 &&
      JSON.parse(dbProd2?.usageTips ?? "[]")[0] === "Nouveau conseil",
  );

  // Lot + QR pour la page publique /p/[lotId]
  const lotRes = await req("/api/lots", {
    method: "POST",
    body: JSON.stringify({
      productId: created.id,
      lotNumber: `LOT-AC-${Date.now()}`,
      manufactureDate: "2026-09-01",
      expiryDate: "2027-03-01",
      ingredients: "Karité test",
      weight: "100g",
      manufacturingLocation: "Dakar",
      salesCountries: ["Sénégal"],
      quantity: 1,
    }),
  });
  const lot = lotRes.body as { id?: string };
  check("POST /api/lots → 201 (lot de test)", lotRes.status === 201, `${lotRes.status}`);

  // ── 6. Version artisan : activation d'un pack de test ─────────────────
  console.log("\n[6] Version ARTISAN — activate-groups avec template");
  const masterCode = `MASTER-AC-${Date.now()}`;
  const batch = await db.batch.create({
    data: { totalQuantity: 2, packSize: 1, numberOfPacks: 1, status: "pending" },
  });
  const pack = await db.pack.create({
    data: {
      batchId: batch.id,
      packNumber: 1,
      quantity: 2,
      price: 0,
      masterQrCode: masterCode,
    },
  });
  await db.preActivatedLot.create({
    data: { packId: pack.id, qrCode: masterCode, isMaster: true },
  });
  for (const i of [1, 2]) {
    await db.preActivatedLot.create({
      data: { packId: pack.id, qrCode: `ART-AC-${Date.now()}-000${i}`, isMaster: false },
    });
  }
  const savon = getProductTemplateById("savon-solide-saponification-a-froid")!;
  const artRes = await req("/api/artisan/activate-groups", {
    method: "POST",
    body: JSON.stringify({
      masterCode,
      groups: [
        {
          count: 2,
          productData: {
            productName: "Savon de test assistant",
            contenance: "100g",
            ingredients: "Karité, soude, coco",
            manufacturingDate: "2026-09-15",
            expirationDate: "2028-03-15",
            artisanName: "Artisan Test",
            contactPhone: "771234567",
            usageTips: savon.usageTips.join("\n"),
            templateId: savon.id,
            precautions: savon.precautions.join("\n"),
            storageConditions: savon.storageConditions,
          },
        },
      ],
      shared: { artisanName: "Artisan Test", contactPhone: "771234567" },
    }),
  });
  check(
    "POST /api/artisan/activate-groups → 200 (2 QR activés)",
    artRes.status === 200 && (artRes.body as { activated?: number })?.activated === 2,
    `${artRes.status} ${JSON.stringify((artRes.body as { error?: string })?.error ?? "")}`,
  );
  const artLotByPack = (
    await db.preActivatedLot.findMany({ where: { packId: pack.id, isMaster: false } })
  )[0];
  const artPrecautions = JSON.parse(artLotByPack?.precautions ?? "[]") as string[];
  check(
    "PreActivatedLot : templateId/precautions(JSON)/storageConditions/usageTips",
    artLotByPack?.templateId === savon.id &&
      artPrecautions.length === savon.precautions.length &&
      artPrecautions[0] === savon.precautions[0] &&
      (artLotByPack?.storageConditions ?? "").length > 10 &&
      (artLotByPack?.usageTips ?? "").split("\n").filter(Boolean).length === 5,
    `templateId=${artLotByPack?.templateId} preca=${artPrecautions.length}`,
  );

  // ── 7. Pages publiques ─────────────────────────────────────────────────
  console.log("\n[7] Pages publiques");
  const pageP = await fetch(`${BASE}/p/${lot.id}`);
  const htmlP = await pageP.text();
  check(
    "GET /p/[lotId] : 200 + section Conseils & Précautions",
    pageP.status === 200 &&
      htmlP.includes("Conseils") && htmlP.includes("Précautions"),
    `${pageP.status}`,
  );
  const artCode = artLotByPack?.qrCode ?? "";
  const pageA = await fetch(`${BASE}/a/${artCode}`);
  const htmlA = await pageA.text();
  check(
    "GET /a/[code] : 200 + Précautions + Conservation",
    pageA.status === 200 &&
      htmlA.includes("Précautions") &&
      htmlA.includes("Conservation") &&
      htmlA.includes("Usage externe uniquement"),
    `${pageA.status}`,
  );

  // ── Nettoyage ───────────────────────────────────────────────────────────
  console.log("\n[Nettoyage]");
  if (lot.id) await db.lot.deleteMany({ where: { id: lot.id } });
  if (created.id) {
    const del = await req(`/api/products/${created.id}`, { method: "DELETE" });
    check("DELETE produit de test", del.status === 200 || del.status === 204, `${del.status}`);
  }
  await db.batch.delete({ where: { id: batch.id } });
  console.log("  batch/packs/lots artisanaux supprimés (cascade)");

  await db.$disconnect();
  console.log("\n" + "═".repeat(66));
  console.log(`RÉSULTAT : ${passed} OK / ${failed} ÉCHEC(S)`);
  console.log("═".repeat(66));
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("ERREUR FATALE:", e);
  process.exit(1);
});
