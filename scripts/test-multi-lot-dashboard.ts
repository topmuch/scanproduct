/**
 * test-multi-lot-dashboard.ts — E2E du RACHAT DE LOT (dashboard existant).
 *
 * Scénario utilisateur :
 *   « Un client qui a déjà acheté un lot et créé son dashboard, rachète un
 *   autre lot demain → ce nouveau lot doit être associé à SON dashboard
 *   existant (pas de second compte). »
 *
 * Couverture (ordres de priorité de src/lib/artisan-link.ts) :
 *   1. Vente admin : nouveau client → compte créé (existingClient=false,
 *      WhatsApp avec mot de passe 0000)
 *   2. Vente admin au MÊME client (rachat) → existingClient=true,
 *      WhatsApp « tableau de bord existant » sans nouveau mot de passe
 *   3. Activation d'un lot NON vendu par un client CONNECTÉ (JWT) avec un
 *      AUTRE numéro → linkedBy=session → son dashboard
 *   4. Lot vendu à un TIERS + activé par le client connecté → reste au
 *      tiers (la vente admin est prioritaire — pas de vol de lot)
 *   5. Activation d'un lot NON vendu avec un AUTRE numéro mais le MÊME
 *      EMAIL → linkedBy=email → son dashboard (rattrapage email)
 *   6. Activation d'un lot NON vendu avec le MÊME TÉLÉPHONE (formats
 *      différents) → linkedBy=phone → son dashboard (normalisation)
 *   7. /api/artisan/me : profil + packsCount (préremplissage wizard)
 *   8. Lookup admin (SellPackModal) : détection client existant
 *
 * Usage : BASE=http://localhost:3100 DATABASE_URL="file:./db/custom.db" \
 *         ADMIN_PASSWORD="Admin123!2025" bun scripts/test-multi-lot-dashboard.ts
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE ?? "http://localhost:3100";
const prisma = new PrismaClient();

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

// ── Cookie jar cumulatif (NextAuth pose plusieurs cookies) ────────────────
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

async function cleanupArtisans(phones: string[]) {
  for (const phone of phones) {
    const a = await prisma.artisan.findUnique({ where: { phone } });
    if (!a) continue;
    const packs = await prisma.pack.findMany({ where: { artisanId: a.id } });
    const packIds = packs.map((p) => p.id);
    if (packIds.length > 0) {
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
    }
    await prisma.artisan.delete({ where: { id: a.id } }).catch(() => {});
  }
}

function groupData(productName: string) {
  return {
    productName,
    productDesignation: `${productName} — test multi-lots`,
    contenance: "250g",
    ingredients: "Ingrédients naturels du test",
    manufacturingDate: "2026-10-01",
    expirationDate: "2027-04-01",
    photoUrl: "",
    productPrice: "5000 FCFA",
    artisanBio: "",
    usageTips: "",
    templateId: "",
    precautions: "",
    storageConditions: "",
  };
}

async function activateGroups(
  masterCode: string,
  productName: string,
  count: number,
  shared: Record<string, string>,
  token?: string | null
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}/api/artisan/activate-groups`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      masterCode,
      groups: [{ count, productData: groupData(productName) }],
      shared,
    }),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

async function dashboardData(token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/api/artisan/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as Record<string, unknown>;
}

async function preCleanup() {
  // Les runs précédents ont pu laisser des données (process.exit court-circuite
  // le finally) → nettoyage GARANTI avant le test, par téléphone.
  const phones = ["775110010", "777330030", "700999888", "781234567"];
  for (const phone of phones) {
    const ids: string[] = [];
    const byId = await prisma.artisan.findUnique({ where: { phone } });
    if (byId) ids.push(...(await prisma.pack.findMany({ where: { artisanId: byId.id } })).map((x) => x.id));
    ids.push(...(await prisma.pack.findMany({ where: { artisanPhone: phone } })).map((x) => x.id));
    if (ids.length > 0) {
      const lots = await prisma.preActivatedLot.findMany({
        where: { packId: { in: ids } },
        select: { id: true },
      });
      if (lots.length > 0) {
        await prisma.artisanScan.deleteMany({ where: { lotId: { in: lots.map((l) => l.id) } } });
        await prisma.artisanReview.deleteMany({ where: { lotId: { in: lots.map((l) => l.id) } } });
      }
      await prisma.preActivatedLot.deleteMany({ where: { packId: { in: ids } } });
      await prisma.pack.deleteMany({ where: { id: { in: ids } } });
    }
    if (byId) await prisma.artisan.delete({ where: { id: byId.id } }).catch(() => {});
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  RACHAT DE LOT — le nouveau lot rejoint le dashboard  ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  await preCleanup();

  let batchId = "";
  // Les téléphones de test (le compte A est 775110010)
  const testPhones = ["775110010", "777330030", "700999888", "781234567"];
  const EMAIL = "client-multi@test-verifscan.sn";

  try {
    // ═══ SETUP : batch de 6 packs de 200 ═════════════════════════════════
    console.log("\n── SETUP : batch (6 packs × 200 QR) + login admin ──");
    const csrf = (await (await req("/api/auth/csrf")).json()) as { csrfToken: string };
    const loginRes = await req("/api/auth/callback/credentials", {
      method: "POST",
      body: JSON.stringify({
        csrfToken: csrf.csrfToken,
        email: "admin@verifscan.sn",
        password: process.env.ADMIN_PASSWORD ?? "Admin123!2025",
        callbackUrl: `${BASE}/superadmin`,
      }),
    });
    check("login SuperAdmin", loginRes.status === 200 || loginRes.status === 302, String(loginRes.status));

    const batchRes = await req("/api/admin/batches", {
      method: "POST",
      body: JSON.stringify({ totalQuantity: 1200, packSize: 200, pricePerPack: 70000 }),
    });
    const batchJson = (await batchRes.json()) as { batch?: { id: string } };
    batchId = batchJson.batch!.id;
    check("batch créé (1200 QR, 6 packs)", batchRes.status === 201 || batchRes.status === 200);

    const packs = await prisma.pack.findMany({
      where: { batchId },
      orderBy: { packNumber: "asc" },
    });
    check("6 packs présents", packs.length === 6, String(packs.length));
    const [pack1, pack2, pack3, pack4, pack5, pack6] = packs;

    // ═══ 1. PREMIER ACHAT : vente crée le compte, l'activation le lie ════
    console.log("\n── 1. Premier achat : lot 1 → création du compte client ──");
    const lookup0 = (await (
      await req(`/api/admin/artisan-lookup?phone=775110010`)
    ).json()) as { artisan: unknown };
    check("lookup avant achat : client inconnu", lookup0.artisan === null);

    const sell1 = (await (
      await req("/api/admin/sell-pack", {
        method: "POST",
        body: JSON.stringify({
          packId: pack1.id,
          artisanPhone: "77 511 00 10", // format espacé → normalisé
          artisanName: "Atelier MultiLots",
        }),
      })
    ).json()) as Record<string, unknown>;
    check("lot 1 vendu", sell1.success === true);
    check("vente lot 1 : existingClient=false (nouveau client)", sell1.existingClient === false);
    const msg1 = String(sell1.whatsappMessage ?? "");
    check("WhatsApp lot 1 : mot de passe 0000 fourni", msg1.includes("0000"));

    const act1 = await activateGroups(pack1.masterQrCode, "Jus de bissap", 200, {
      artisanName: "Atelier MultiLots",
      contactPhone: "775110010",
      contactEmail: EMAIL,
    });
    check("lot 1 activé (200 QR)", act1.status === 200, JSON.stringify(act1.json).slice(0, 120));
    check("lot 1 : lié via la vente (linkedBy=pack)", act1.json.linkedBy === "pack", String(act1.json.linkedBy));
    check("lot 1 : existingClient=true (compte créé à la vente)", act1.json.existingClient === true);

    // Connexion du client → JWT
    const loginArt = (await (
      await fetch(`${BASE}/api/artisan/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "775110010", password: "0000" }),
      })
    ).json()) as { token?: string; artisan?: { id: string } };
    check("client connecté (JWT reçu)", Boolean(loginArt.token));
    const tokenA = loginArt.token!;

    const dash1 = await dashboardData(tokenA);
    const dash1Packs = (dash1.packs as Array<{ id: string }>) ?? [];
    check("dashboard contient 1 lot", dash1Packs.length === 1, String(dash1Packs.length));

    // ═══ 2. RACHAT vendu au MÊME client (vente admin) ════════════════════
    console.log("\n── 2. Rachat lot 2 : même numéro → même dashboard ──");
    const lookup1 = (await (
      await req(`/api/admin/artisan-lookup?phone=${encodeURIComponent("77 511 00 10")}`)
    ).json()) as { artisan?: { name: string | null; packsCount: number } | null };
    check("lookup : client existant détecté", Boolean(lookup1.artisan));
    check("lookup : nom prérempli", lookup1.artisan?.name === "Atelier MultiLots");
    check("lookup : packsCount=1", lookup1.artisan?.packsCount === 1);

    const sell2 = (await (
      await req("/api/admin/sell-pack", {
        method: "POST",
        body: JSON.stringify({
          packId: pack2.id,
          artisanPhone: "775110010",
          artisanName: "Atelier MultiLots",
        }),
      })
    ).json()) as Record<string, unknown>;
    check("lot 2 vendu", sell2.success === true);
    check("vente lot 2 : existingClient=true (rachat)", sell2.existingClient === true);
    const msg2 = String(sell2.whatsappMessage ?? "");
    check(
      "WhatsApp lot 2 : « tableau de bord existant » + pas de nouveau mdp",
      msg2.includes("tableau de bord") && !msg2.includes("Mot de passe")
    );

    const act2 = await activateGroups(pack2.masterQrCode, "Jus de gingembre", 200, {
      artisanName: "Atelier MultiLots",
      contactPhone: "775110010",
      contactEmail: EMAIL,
    });
    check("lot 2 activé", act2.status === 200);
    check("lot 2 : linkedBy=pack (déjà lié à la vente)", act2.json.linkedBy === "pack");

    const dash2 = await dashboardData(tokenA);
    const dash2Packs = (dash2.packs as Array<{ id: string }>) ?? [];
    check("dashboard contient DÉSORMAIS 2 lots", dash2Packs.length === 2, String(dash2Packs.length));

    // ═══ 3. RACHAT activé EN ÉTANT CONNECTÉ, avec un AUTRE numéro ════════
    // Lot NON vendu : la session JWT doit rattacher le lot au compte A.
    console.log("\n── 3. Rachat lot 3 (non vendu) : la session JWT fait foi ──");
    const act3 = await activateGroups(
      pack3.masterQrCode,
      "Thiakry",
      200,
      {
        artisanName: "Atelier MultiLots",
        contactPhone: "700999888", // autre numéro tapé à l'activation
        contactEmail: EMAIL,
      },
      tokenA
    );
    check("lot 3 activé avec JWT", act3.status === 200);
    check("lot 3 : existingClient=true (session reconnue)", act3.json.existingClient === true);
    check("lot 3 : linkedBy=session", act3.json.linkedBy === "session", String(act3.json.linkedBy));

    const pack3After = await prisma.pack.findUnique({ where: { id: pack3.id } });
    check("lot 3 lié au MÊME artisan", pack3After?.artisanId === loginArt.artisan!.id);
    const dash3 = await dashboardData(tokenA);
    const dash3Packs = (dash3.packs as Array<{ id: string }>) ?? [];
    check("dashboard contient 3 lots", dash3Packs.length === 3, String(dash3Packs.length));

    // ═══ 4. Lot vendu à un TIERS → il reste chez le tiers ════════════════
    console.log("\n── 4. Lot 4 vendu à un tiers : la vente admin est prioritaire ──");
    const sell4 = (await (
      await req("/api/admin/sell-pack", {
        method: "POST",
        body: JSON.stringify({
          packId: pack4.id,
          artisanPhone: "777330030",
          artisanName: "Boutique Tiers",
        }),
      })
    ).json()) as Record<string, unknown>;
    check("lot 4 vendu à un tiers", sell4.success === true);

    const act4 = await activateGroups(
      pack4.masterQrCode,
      "Gari",
      200,
      {
        artisanName: "Atelier MultiLots",
        contactPhone: "775110010",
        contactEmail: EMAIL,
      },
      tokenA // le client A est connecté mais le pack est vendu au tiers
    );
    check("lot 4 activé par le tiers", act4.status === 200);
    const pack4After = await prisma.pack.findUnique({ where: { id: pack4.id } });
    const artisanTiers = await prisma.artisan.findUnique({ where: { phone: "777330030" } });
    check(
      "lot 4 RESTE lié au tiers (pas de vol de lot)",
      pack4After?.artisanId === artisanTiers?.id,
      `pack.artisanId=${pack4After?.artisanId}`
    );

    const loginTiers = (await (
      await fetch(`${BASE}/api/artisan/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "777330030", password: "0000" }),
      })
    ).json()) as { token?: string };
    const dashTiers = await dashboardData(loginTiers.token!);
    const dashTiersPacks = (dashTiers.packs as Array<{ id: string }>) ?? [];
    check("dashboard du tiers : 1 lot (le sien)", dashTiersPacks.length === 1);
    const dash4 = await dashboardData(tokenA);
    const dash4Packs = (dash4.packs as Array<{ id: string }>) ?? [];
    check("dashboard A : toujours 3 lots", dash4Packs.length === 3, String(dash4Packs.length));

    // ═══ 5. AUTRE numéro mais MÊME EMAIL → rattrapage par email ══════════
    console.log("\n── 5. Rachat lot 5 (non vendu) : email identique → même compte ──");
    const act5 = await activateGroups(pack5.masterQrCode, "Pâte de tamarin", 200, {
      artisanName: "Atelier MultiLots",
      contactPhone: "781234567", // numéro différent (faute de frappe simulée)
      contactEmail: EMAIL, // même email que le lot 1
      // Pas de JWT : le rattrapage doit venir de l'EMAIL
    });
    check("lot 5 activé", act5.status === 200);
    check("lot 5 : linkedBy=email", act5.json.linkedBy === "email", String(act5.json.linkedBy));
    const pack5After = await prisma.pack.findUnique({ where: { id: pack5.id } });
    check("lot 5 rattaché au compte A (par email)", pack5After?.artisanId === loginArt.artisan!.id);

    // ═══ 6. MÊME TÉLÉPHONE, formats différents → rattrapage par tél ══════
    console.log("\n── 6. Rachat lot 6 (non vendu) : même numéro, format différent ──");
    const act6 = await activateGroups(pack6.masterQrCode, "Bissap gingembre", 200, {
      artisanName: "Atelier MultiLots",
      contactPhone: "+221 77 511 00 10", // même numéro, format international
      contactEmail: "",
      // Pas de JWT : le rattrapage doit venir du TÉLÉPHONE normalisé
    });
    check("lot 6 activé", act6.status === 200);
    check("lot 6 : linkedBy=phone", act6.json.linkedBy === "phone", String(act6.json.linkedBy));
    const pack6After = await prisma.pack.findUnique({ where: { id: pack6.id } });
    check("lot 6 rattaché au compte A (par téléphone)", pack6After?.artisanId === loginArt.artisan!.id);

    const dash5 = await dashboardData(tokenA);
    const dash5Packs = (dash5.packs as Array<{ id: string }>) ?? [];
    check("dashboard A contient 5 lots (1+2+3+5+6)", dash5Packs.length === 5, String(dash5Packs.length));
    const dash5Stats = dash5.stats as { totalPacks?: number } | undefined;
    check("stats.totalPacks = 5", dash5Stats?.totalPacks === 5);

    // ═══ 7. /api/artisan/me — préremplissage du wizard ═══════════════════
    console.log("\n── 7. /api/artisan/me (préremplissage wizard) ──");
    const meRes = await fetch(`${BASE}/api/artisan/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const me = (await meRes.json()) as {
      artisan?: { name: string | null; phone: string };
      packsCount?: number;
    };
    check("GET /api/artisan/me : 200", meRes.status === 200);
    check("me : nom du client", me.artisan?.name === "Atelier MultiLots");
    check("me : packsCount=5", me.packsCount === 5, String(me.packsCount));

    const meAnon = await fetch(`${BASE}/api/artisan/me`);
    check("me sans token : 401", meAnon.status === 401);

    // ═══ RÉCAP ════════════════════════════════════════════════════════════
    console.log("\n──────────────────────────────────────────────");
    console.log(`RÉSULTAT : ${passed} OK / ${failed} échec(s)`);
    console.log("──────────────────────────────────────────────");
    if (failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error("💥 Erreur fatale:", err);
    process.exitCode = 1;
  } finally {
    // ── Nettoyage complet ──
    if (batchId) await cleanupBatch(batchId);
    await cleanupArtisans(testPhones);
    await prisma.$disconnect();
  }
}

main();
