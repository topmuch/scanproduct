/**
 * Setup éphémère pour la vérification visuelle du logo sur /a/<code>.
 * Crée : batch (2 packs de 2) → vente pack 1 → upload photo → activation.
 * Affiche les codes à tester ; le nettoyage se fait via --cleanup <batchId>.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";


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

// PNG 1x1 transparent minimal
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  const mode = process.argv[2] ?? "setup";

  if (mode === "--cleanup") {
    const batchId = process.argv[3]!;
    const packs = await prisma.pack.findMany({ where: { batchId } });
    const packIds = packs.map((p) => p.id);
    const lots = await prisma.preActivatedLot.findMany({
      where: { packId: { in: packIds } },
      select: { id: true },
    });
    if (lots.length > 0) {
      await prisma.artisanScan.deleteMany({ where: { lotId: { in: lots.map((l) => l.id) } } });
    }
    await prisma.preActivatedLot.deleteMany({ where: { packId: { in: packIds } } });
    await prisma.pack.deleteMany({ where: { id: { in: packIds } } });
    await prisma.batch.delete({ where: { id: batchId } }).catch(() => {});
    console.log("batch", batchId, "supprimé");
    return;
  }

  // ── setup ──
  const csrf = await (await req("/api/auth/csrf")).json() as { csrfToken: string };
  await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.csrfToken,
      email: "admin@verifscan.sn",
      password: process.env.ADMIN_PASSWORD ?? "Admin123!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });

  const batchRes = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 4, packSize: 2, pricePerPack: 5000 }),
  });
  const batchJson = await batchRes.json() as { batch?: { id: string } };
  const batchId = batchJson.batch!.id;

  const packs = await prisma.pack.findMany({ where: { batchId }, orderBy: { packNumber: "asc" } });
  const pack1 = packs.find((p) => p.packNumber === 1)!;
  const pack2 = packs.find((p) => p.packNumber === 2)!;

  const sellRes = await req("/api/admin/sell-pack", {
    method: "POST",
    body: JSON.stringify({
      packId: pack1.id,
      artisanPhone: "776009988",
      artisanName: "Atelier Logo Test",
    }),
  });
  if (!sellRes.ok && sellRes.status !== 409) {
    console.error("sell-pack a échoué:", sellRes.status, await sellRes.text());
  }

  const upForm = new FormData();
  upForm.append("masterCode", pack1.masterQrCode!);
  upForm.append("file", new File([PNG_1X1], "karite.png", { type: "image/png" }));
  const uploadRes = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: upForm });
  const uploadJson = await uploadRes.json() as { url?: string; error?: string };
  console.log("upload:", uploadRes.status, uploadJson.error ?? uploadJson.url);
  if (!uploadRes.ok) process.exit(1);

  const activateRes = await fetch(`${BASE}/api/artisan/activate-pack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      masterCode: pack1.masterQrCode,
      productData: {
        productName: "Beurre de Karité Logo",
        artisanName: "Atelier Logo Test",
        contenance: "250 g",
        ingredients: "Karité pur",
        manufacturingDate: "2026-01-15",
        expirationDate: "2027-01-15",
        contactPhone: "+221776009988",
        artisanBio: "Atelier de test",
        usageTips: "Conserver au sec",
      },
      photoUrl: uploadJson.url ?? "",
    }),
  });
  const activateJson = await activateRes.json() as { activated?: number; error?: string };
  console.log("activate:", activateRes.status, activateJson.error ?? `${activateJson.activated} étiquettes`);

  const art1 = await prisma.preActivatedLot.findFirst({
    where: { packId: pack1.id, isMaster: false },
  });
  console.log(JSON.stringify({
    batchId,
    masterActive: pack1.masterQrCode,
    artActive: art1?.qrCode,
    artInactive: (await prisma.preActivatedLot.findFirst({
      where: { packId: pack2.id, isMaster: false },
    }))?.qrCode,
    masterInactive: pack2.masterQrCode,
  }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
