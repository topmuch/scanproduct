/**
 * Test E2E — faux positif contrefaçon (fuseau UTC) + champ Désignation.
 *
 * Contexte : un artisan qui scannait 2 fois son QR voyait une FAUSSE alerte
 * « scanné depuis Afrique puis UTC en moins de 48 h » — le fuseau "UTC"
 * (valeur par défaut de nombreux navigateurs/WebViews) était traité comme
 * une région géographique valide.
 *
 * Scénarios (lots ISOLÉS créés puis supprimés — aucune pollution des démos) :
 *   1. Scan Dakar puis UTC        → AUCUNE alerte (le fix)
 *   2. Scan Dakar puis Europe     → alerte RÉELLE (la détection légitime marche)
 *   3. Alerte fraîche + rescan    → cooldown respecté (pas de double alerte)
 *   4. Alerte empoisonnée « africa puis utc » en base → purgée au scan fiable
 *   5. POST /api/artisan/activate-pack avec productDesignation → persistée
 *      + firstCode renvoyé (bouton « Voir le produit activé »)
 *   6. Pack de démo : productDesignation remplie pour les captures
 *
 * Prérequis : dev server sur :3000 (hot-reload du code modifié).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});
const BASE = "http://localhost:3000";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

async function trackScan(code: string, timezone: string) {
  const res = await fetch(`${BASE}/api/artisan/track-scan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, timezone, deviceType: "desktop" }),
  });
  return res;
}

type AlertRow = { counterfeitAlert: string | null };

async function makeIsolatedPack(suffix: string, activated: boolean) {
  const batch = await prisma.batch.create({
    data: {
      totalQuantity: 2,
      packSize: 1,
      numberOfPacks: 2,
      status: "printed",
    },
  });
  const masterCode = `MASTER-TESTUTC-${suffix}`;
  const productCode = `ART-TESTUTC-${suffix}`;
  const pack = await prisma.pack.create({
    data: {
      batchId: batch.id,
      packNumber: 1,
      quantity: 1,
      price: 1000,
      masterQrCode: masterCode,
      status: activated ? "activated" : "available",
      soldTo: activated ? "Test UTC" : null,
      soldAt: activated ? new Date() : null,
    },
  });
  await prisma.preActivatedLot.create({
    data: {
      packId: pack.id,
      qrCode: masterCode,
      isMaster: true,
      status: activated ? "active" : "inactive",
      activatedAt: activated ? new Date() : null,
      productName: "Produit Test UTC",
      artisanName: "Artisan Test",
      contactPhone: "771234567",
    },
  });
  await prisma.preActivatedLot.create({
    data: {
      packId: pack.id,
      qrCode: productCode,
      isMaster: false,
      status: activated ? "active" : "inactive",
      activatedAt: activated ? new Date() : null,
      productName: "Produit Test UTC",
      artisanName: "Artisan Test",
      contactPhone: "771234567",
    },
  });
  return { batchId: batch.id, packId: pack.id, masterCode, productCode };
}

async function main() {
  // ── Scénarios 1-3 : lot isolé ACTIVÉ ────────────────────────────────────
  const iso = await makeIsolatedPack("A", true);
  try {
    // 1. Scan Dakar puis UTC → AUCUNE alerte
    await trackScan(iso.productCode, "Africa/Dakar");
    await trackScan(iso.productCode, "UTC");
    let lot = (await prisma.preActivatedLot.findUnique({
      where: { qrCode: iso.productCode },
      select: { counterfeitAlert: true },
    })) as AlertRow | null;
    check(
      "1. Dakar puis UTC → aucune alerte (faux positif corrigé)",
      lot?.counterfeitAlert == null
    );

    // 2. Scan Europe/Paris → alerte RÉELLE (régions fiables distinctes)
    await trackScan(iso.productCode, "Europe/Paris");
    lot = (await prisma.preActivatedLot.findUnique({
      where: { qrCode: iso.productCode },
      select: { counterfeitAlert: true },
    })) as AlertRow | null;
    const realAlert = lot?.counterfeitAlert ? JSON.parse(lot.counterfeitAlert) : null;
    check(
      "2. Dakar puis Europe/Paris → alerte réelle posée (africa puis europe)",
      realAlert?.regionA === "africa" && realAlert?.regionB === "europe"
    );

    // 3. Cooldown : alerte fraîche + rescan → pas de nouvelle alerte
    const detectedAtBefore = realAlert?.detectedAt as string;
    await trackScan(iso.productCode, "Europe/Paris");
    lot = (await prisma.preActivatedLot.findUnique({
      where: { qrCode: iso.productCode },
      select: { counterfeitAlert: true },
    })) as AlertRow | null;
    const afterCooldown = lot?.counterfeitAlert
      ? JSON.parse(lot.counterfeitAlert)
      : null;
    check(
      "3. Cooldown 6 h respecté (detectedAt inchangé)",
      afterCooldown?.detectedAt === detectedAtBefore
    );
  } finally {
    await prisma.batch.delete({ where: { id: iso.batchId } });
    console.log("  (lot isolé A nettoyé)");
  }

  // ── Scénario 4 : purge d'une alerte empoisonnée ─────────────────────────
  const iso2 = await makeIsolatedPack("B", true);
  try {
    const poisoned = JSON.stringify({
      detectedAt: new Date(Date.now() - 3600_000).toISOString(),
      regionA: "africa",
      tzA: "Africa/Dakar",
      regionB: "utc",
      tzB: "UTC",
    });
    await prisma.preActivatedLot.update({
      where: { qrCode: iso2.productCode },
      data: { counterfeitAlert: poisoned },
    });
    // Scan fiable (Dakar) → l'alerte « africa puis utc » doit être purgée
    const res = await trackScan(iso2.productCode, "Africa/Dakar");
    check("4a. track-scan répond 2xx", res.ok);
    const lot2 = (await prisma.preActivatedLot.findUnique({
      where: { qrCode: iso2.productCode },
      select: { counterfeitAlert: true },
    })) as AlertRow | null;
    check(
      "4b. Alerte empoisonnée (UTC) purgée automatiquement",
      lot2?.counterfeitAlert == null
    );
  } finally {
    await prisma.batch.delete({ where: { id: iso2.batchId } });
    console.log("  (lot isolé B nettoyé)");
  }

  // ── Scénario 5 : activation avec productDesignation + firstCode ─────────
  const iso3 = await makeIsolatedPack("C", false);
  try {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    const csrfJson = (await csrfRes.json()) as { csrfToken?: string };
    const res = await fetch(`${BASE}/api/artisan/activate-pack`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `authjs.csrf-token=${encodeURIComponent(`${csrfJson.csrfToken ?? ""}|`)}` },
      body: JSON.stringify({
        masterCode: iso3.masterCode,
        productData: {
          productName: "Savon au karité pur",
          productDesignation:
            "Savon artisanal au beurre de karité brut, saponifié à froid, sans parfum de synthèse — 250 g",
          contenance: "250g",
          ingredients: "Beurre de karité, huile de coco, soude",
          manufacturingDate: "2026-09-01",
          expirationDate: "2027-09-01",
          artisanName: "Aïssata Cosmétiques",
          contactPhone: "771234567",
          productPrice: "3 500 FCFA",
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      firstCode?: string;
      error?: string;
    };
    check("5a. Activation avec productDesignation → 2xx", res.ok && data.success === true);
    check(
      "5b. firstCode renvoyé = 1er produit activé (bouton « Voir le produit activé »)",
      data.firstCode === iso3.productCode
    );
    const pack3 = await prisma.pack.findUnique({
      where: { masterQrCode: iso3.masterCode },
      select: { productDesignation: true, productPrice: true },
    });
    check(
      "5c. productDesignation persistée sur le Pack",
      pack3?.productDesignation ===
        "Savon artisanal au beurre de karité brut, saponifié à froid, sans parfum de synthèse — 250 g"
    );
  } finally {
    await prisma.batch.delete({ where: { id: iso3.batchId } });
    console.log("  (lot isolé C nettoyé)");
  }

  // ── Scénario 6 : pack de démo — désignation réaliste pour les captures ──
  const demoPack = await prisma.pack.findFirst({
    where: { status: "activated" },
    orderBy: { soldAt: "desc" },
    select: { id: true, masterQrCode: true, productPrice: true },
  });
  if (demoPack) {
    await prisma.pack.update({
      where: { id: demoPack.id },
      data: {
        productDesignation:
          "Beurre de karité brut 100 % naturel, non raffiné, préparé à la main dans notre atelier de Dakar",
      },
    });
    console.log(
      `  ✓ Désignation de démo posée sur le pack ${demoPack.masterQrCode}`
    );
  }

  console.log(
    failures === 0
      ? "\n=== FAUX POSITIF UTC + DÉSIGNATION : TOUT EST VERT ==="
      : `\n=== ${failures} ÉCHEC(S) ===`
  );
  if (failures > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
