/**
 * Test E2E — NOTIFICATION EMAIL « NOUVEAU SCAN » À L'ARTISAN
 * (demande utilisateur : « à chaque scan, l'artisan est informé s'il a
 *  renseigné son email » + revue n°5 : preuve sociale dernier scan).
 *
 * Scénario (SMTP non configuré en local → statut "skipped" = flux OK) :
 *   1. Purge + 1 batch (1 QR) activé AVEC email artisan
 *      (shared.contactEmail → pack.artisanEmail = scan-test@verifscan.sn)
 *   2. POST /api/artisan/track-scan  → 1 email logué (EmailLog)
 *   3. 2e POST < 60 s                → TOUJOURS 1 email (anti-flood)
 *      mais 2 scans enregistrés (le scan compte toujours)
 *   4. Page /a/<code> : « Dernier scan » visible (preuve sociale)
 *   5. Purge finale
 *
 * Run : BASE=http://localhost:3100 DATABASE_URL="file:..." bun scripts/test-scan-notify.ts
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE ?? "http://localhost:3100";
const DB_URL =
  process.env.DATABASE_URL ?? "file:/home/z/my-project/scanproduct/db/custom.db";
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

async function main() {
  console.log("1. Purge + batch de test (1 QR)");
  await prisma.artisanScan.deleteMany({});
  await prisma.artisanReview.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.preActivatedLot.deleteMany({});
  await prisma.pack.deleteMany({});
  await prisma.batch.deleteMany({});

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
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json", cookie: jar },
    body: JSON.stringify({
      csrfToken: csrf.csrfToken,
      email: "admin@verifscan.sn",
      password: process.env.ADMIN_PASSWORD ?? "Admin123!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  capture(loginRes);

  const batchRes = await fetch(`${BASE}/api/admin/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: jar },
    body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
  });
  const batchJson = (await batchRes.json()) as { masterCodes?: string[] };
  const master = batchJson.masterCodes?.[0];
  if (!master) throw new Error("batch non créé");
  check("batch créé", true);

  console.log("2. Activation AVEC email artisan renseigné");
  const actRes = await fetch(`${BASE}/api/artisan/activate-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: master,
      groups: [
        {
          count: 1,
          productData: {
            productName: "Savon test notification",
            contenance: "200 g",
            ingredients: "Huile de coco, Soude",
            manufacturingDate: "2026-08-01",
            expirationDate: "2027-08-01",
          },
        },
      ],
      shared: {
        artisanName: "Test Artisan",
        contactPhone: "+221770000009",
        contactEmail: "scan-test@verifscan.sn",
      },
    }),
  });
  const actJson = (await actRes.json()) as { firstCode?: string; error?: string };
  const code = actJson.firstCode;
  check("lot activé avec pack.artisanEmail", Boolean(code));
  if (!code) throw new Error("activation échouée: " + (actJson.error ?? ""));
  const lot = await prisma.preActivatedLot.findUnique({
    where: { qrCode: code },
    select: { id: true, pack: { select: { artisanEmail: true } } },
  });
  check(
    "pack.artisanEmail = scan-test@verifscan.sn",
    lot?.pack.artisanEmail === "scan-test@verifscan.sn"
  );

  console.log("3. Scan n°1 → 1 email logué");
  const scan1 = await fetch(`${BASE}/api/artisan/track-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, timezone: "Africa/Dakar", deviceType: "mobile" }),
  });
  check("track-scan répond ok", scan1.status === 200);
  await new Promise((r) => setTimeout(r, 2500)); // la notif est fire-and-forget
  const emails1 = await prisma.emailLog.count({
    where: { to: "scan-test@verifscan.sn", subject: { contains: "Nouveau scan" } },
  });
  check("1 email « Nouveau scan » logué (skipped = SMTP dev)", emails1 === 1);

  console.log("4. Scan n°2 < 60 s → pas de 2e email, mais scan compté");
  await fetch(`${BASE}/api/artisan/track-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, timezone: "Africa/Dakar", deviceType: "desktop" }),
  });
  await new Promise((r) => setTimeout(r, 2500));
  const emails2 = await prisma.emailLog.count({
    where: { to: "scan-test@verifscan.sn", subject: { contains: "Nouveau scan" } },
  });
  const scans = await prisma.artisanScan.count({ where: { lotId: lot!.id } });
  check("anti-flood : toujours 1 seul email", emails2 === 1);
  check("les 2 scans sont enregistrés", scans === 2);

  console.log("5. Page publique : preuve sociale « Dernier scan »");
  const page = await fetch(`${BASE}/a/${code}`).then((r) => r.text());
  check("badge « Dernier scan » affiché", page.includes("Dernier scan"));

  console.log("6. Purge finale");
  await prisma.artisanScan.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.preActivatedLot.deleteMany({});
  await prisma.pack.deleteMany({});
  await prisma.batch.deleteMany({});
  check("purge OK", true);

  if (failures > 0) {
    console.error(`\n${failures} échec(s)`);
    process.exit(1);
  }
  console.log("\n✅ TOUS OK");
  await prisma.$disconnect();
}

main();
