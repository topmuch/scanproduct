/**
 * Démo rapide : 1 batch → 1 pack vendu → 1 produit activé (cosmétique
 * artisanal) → 1 avis. Sert aux contrôles visuels mobile.
 * Usage : BASE=http://localhost:3100 DATABASE_URL=... bun scripts/demo-min.ts
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE ?? "http://localhost:3100";
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./db/custom.db" } },
});

async function main() {
  // 1. Login admin
  let jar = "";
  const capture = (res: Response) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const nv = c.split(";")[0];
      const name = nv.split("=")[0];
      jar = jar
        .split("; ")
        .filter((p) => p && !p.startsWith(`${name}=`))
        .concat(nv)
        .join("; ");
    }
  };
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  capture(csrfRes);
  const csrf = (await csrfRes.json()) as { csrfToken: string };
  const login = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json", cookie: jar },
    body: JSON.stringify({
      csrfToken: csrf.csrfToken,
      email: "admin@verifscan.sn",
      password: "Admin123!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  capture(login);

  // 2. Batch + activation
  const batch = await fetch(`${BASE}/api/admin/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: jar },
    body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
  });
  const batchJson = (await batch.json()) as { masterCodes?: string[] };
  const master = batchJson.masterCodes?.[0];
  if (!master) throw new Error("batch KO");

  const act = await fetch(`${BASE}/api/artisan/activate-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: master,
      groups: [
        {
          count: 1,
          productData: {
            productName: "Beurre de karité pur",
            contenance: "150 g",
            ingredients: "100 % beurre de karité brut du Sénégal",
            manufacturingDate: "2026-09-01",
            expirationDate: "2027-09-01",
            productPrice: "2 500 FCFA",
          },
        },
      ],
      shared: {
        artisanName: "Awa Ndiaye",
        contactPhone: "+221771234567",
        contactEmail: "awa@example.sn",
      },
    }),
  });
  const actJson = (await act.json()) as { firstCode?: string; error?: string };
  if (!actJson.firstCode) throw new Error(`activation KO: ${act.status} ${actJson.error}`);
  const code = actJson.firstCode;

  // 3. Avis
  const lot = await prisma.preActivatedLot.findUnique({ where: { qrCode: code } });
  if (lot) {
    await prisma.artisanReview.createMany({
      data: [
        {
          lotId: lot.id,
          authorName: "Fatou S.",
          rating: 5,
          comment: "Beurre magnifique, ma peau adore. Commande rapide via WhatsApp !",
        },
        {
          lotId: lot.id,
          authorName: "Moussa D.",
          rating: 4,
          comment: "Bon produit artisanal, odeur naturelle agréable.",
        },
      ],
    });
  }

  console.log("CODE=", code);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
