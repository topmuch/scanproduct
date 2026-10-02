/**
 * VALIDATION e2e — onboarding d'activation artisan + logo de marque +
 * page publique refondue (retour utilisateur « plus simple / logo /
 * authentique & fait main / dates en valeur / conseils trop longs ») :
 *
 *   1. LOGO : upload via /api/artisan/upload → URL servie, persisté sur
 *      Pack.logoUrl via shared.logoUrl de /api/artisan/activate-groups
 *   2. PAGE PUBLIQUE /a/<code> :
 *        - bannière « Produit authentique & fait main » (sceau Vérifié)
 *        - section fraîcheur en vedette (Du frais, prouvé / À utiliser avant le)
 *        - avatar logo rendu (img src = logoUrl)
 *        - CONSEILS : 5 conseils fournis → 3 affichés + bouton
 *          « Voir les 2 autres conseils » (le 4e/5e absents du HTML)
 *   3. WIZARD : /activer-pack/<master> affiche l'écran de choix avec la
 *      mention « guidé étape par étape »
 *
 * BASE=http://localhost:3100 bun scripts/test-onboarding-logo.ts
 */
import { db } from "@/lib/db";

const BASE = process.env.BASE || "http://localhost:3100";
const stamp = Date.now();
const MASTER = `MASTER-ONB-${stamp}`;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// ── Setup : pack de 1 étiquette produit + 1 pack maître vierge pour le wizard ──
async function createPack(master: string, artCount: number) {
  const batch = await db.batch.create({
    data: { totalQuantity: artCount, packSize: 1, numberOfPacks: 1, status: "pending" },
  });
  const pack = await db.pack.create({
    data: { batchId: batch.id, packNumber: 1, quantity: artCount, price: 0, masterQrCode: master },
  });
  await db.preActivatedLot.create({
    data: { packId: pack.id, qrCode: master, isMaster: true },
  });
  const arts: string[] = [];
  for (let i = 1; i <= artCount; i++) {
    const code = `${master.replace("MASTER-", "ART-")}-000${i}`;
    await db.preActivatedLot.create({ data: { packId: pack.id, qrCode: code, isMaster: false } });
    arts.push(code);
  }
  return { batchId: batch.id, packId: pack.id, arts };
}

async function uploadImage(masterCode: string, label: string, size: 600 | 300): Promise<string> {
  const sharp = (await import("sharp")).default;
  const png = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: label === "logo" ? { r: 40, g: 90, b: 200 } : { r: 200, g: 80, b: 40 },
    },
  })
    .png()
    .toBuffer();
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), `${label}.png`);
  fd.append("masterCode", masterCode);
  const res = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: fd });
  const data = (await res.json()) as { url?: string; error?: string; size?: number };
  if (!res.ok || !data.url) throw new Error(`upload ${label} échoué: ${JSON.stringify(data)}`);
  console.log(`   upload ${label} → ${data.url} (${data.size} octets)`);
  return data.url;
}

async function cleanup(batchId: string, packId: string) {
  await db.preActivatedLot.deleteMany({ where: { packId } });
  await db.pack.delete({ where: { id: packId } });
  await db.batch.delete({ where: { id: batchId } });
}

console.log("\n═══ TEST 1 : logo uploadé + persisté sur Pack.logoUrl ═══");
const pack = await createPack(MASTER, 1);
const logoUrl = await uploadImage(MASTER, "logo", 300);
const photoUrl = await uploadImage(MASTER, "photo", 600);
check("URL logo au format /api/artisan/photo/", logoUrl.startsWith("/api/artisan/photo/artisan-"), logoUrl);

const logoImgRes = await fetch(`${BASE}${logoUrl}`);
check("logo servi (200 image)", logoImgRes.ok && (logoImgRes.headers.get("content-type") || "").startsWith("image/"), `${logoImgRes.status} ${logoImgRes.headers.get("content-type")}`);

const actRes = await fetch(`${BASE}/api/artisan/activate-groups`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    masterCode: MASTER,
    groups: [
      {
        count: 1,
        productData: {
          productName: "Beurre de karité pur",
          productDesignation: "Préparé à la main à Thiès",
          contenance: "250g",
          ingredients: "Karité brut, rien d'autre",
          manufacturingDate: "2026-10-01",
          expirationDate: "2027-04-01",
          photoUrl,
          productPrice: "3 500 FCFA",
          artisanBio: "Atelier de Thiès",
          usageTips: "Conseil un\nConseil deux\nConseil trois\nConseil quatre\nConseil cinq",
          templateId: "",
          precautions: "Usage externe",
          storageConditions: "Au frais",
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
const actData = (await actRes.json()) as { firstCode?: string; error?: unknown };
check("activation avec shared.logoUrl → 200", actRes.ok && !!actData.firstCode, actRes.ok ? actData.firstCode : JSON.stringify(actData).slice(0, 160));

const packRow = await db.pack.findUnique({ where: { masterQrCode: MASTER }, select: { logoUrl: true } });
check("Pack.logoUrl persisté en base", packRow?.logoUrl === logoUrl, packRow?.logoUrl ?? "null");

console.log("\n═══ TEST 2 : page publique /a/<code> refondue ═══");
const pageRes = await fetch(`${BASE}/a/${actData.firstCode}`);
const html = await pageRes.text();
check("page 200", pageRes.ok, String(pageRes.status));

// DOM « réel » : on retire les payloads RSC (<script>self.__next_f…) et les
// marqueurs de commentaire React (<!-- -->) que Next.js insère dans le HTML.
// Sinon les props sérialisées font apparaître les 5 conseils dans le HTML
// brut alors qu'ils ne sont pas rendus à l'écran.
const dom = html
  .replace(/<script[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<!--[\s\S]*?-->/g, "");

// Bannière authenticité
check("bannière « Produit authentique »", dom.includes("Produit authentique"));
check("bannière « fait main »", /fait main/i.test(dom));
check("sceau « Vérifié » (bannière)", dom.includes("Authentifié à chaque scan par VerifScan"));

// Fraîcheur en vedette
check("section fraîcheur « Du frais, prouvé »", dom.includes("Du frais, prouvé"));
check("date en grand « À utiliser avant le »", dom.includes("À utiliser avant le"));
check("badge jours restants", dom.includes("jours restants"));
check("chip statut fraîcheur (Très frais)", dom.includes("Très frais"));

// Logo rendu sur la page (avatar + histoire = 2 occurrences attendues)
const logoOccurrences = dom.split(logoUrl).length - 1;
check("logoUrl rendu dans le DOM (avatar + histoire)", logoOccurrences >= 2, `${logoOccurrences} occurrence(s)`);

// Conseils : 3 affichés, les suivants cachés + bouton « Voir les autres »
check("conseil 1 visible", dom.includes("Conseil un"));
check("conseil 2 visible", dom.includes("Conseil deux"));
check("conseil 3 visible", dom.includes("Conseil trois"));
check("conseil 4 ABSENT du rendu initial", !dom.includes("Conseil quatre"));
check("conseil 5 ABSENT du rendu initial", !dom.includes("Conseil cinq"));
check("bouton « Voir les 2 autres conseils »", dom.includes("Voir les 2 autres conseils"));

// Non-régression : photo produit toujours rendue, autres produits absents (1 seul produit)
check("photo produit rendue (hero)", dom.includes(photoUrl));
check("section « Autres produits » absente (1 seul produit)", !dom.includes("Autres produits de"));

console.log("\n═══ TEST 3 : wizard d'activation (écran de choix) ═══");
const MASTER2 = `MASTER-ONB2-${stamp}`;
const pack2 = await createPack(MASTER2, 1);
const wizardRes = await fetch(`${BASE}/activer-pack/${MASTER2}`);
const wizardHtml = await wizardRes.text();
check("/activer-pack 200", wizardRes.ok, String(wizardRes.status));
check("mention « guidé étape par étape »", wizardHtml.includes("guidé étape par étape"));
check("écran de choix des modes affiché", wizardHtml.includes("ACTIVATION DU PACK"));

// ── Cleanup ──
await cleanup(pack.batchId, pack.packId);
await cleanup(pack2.batchId, pack2.packId);
console.log("\n🧹 Données de test nettoyées");

console.log(`\n${failures === 0 ? "🎉 TOUS LES TESTS PASSENT" : `💥 ${failures} ÉCHEC(S)`}`);
process.exit(failures === 0 ? 0 : 1);
