/**
 * Demo data for visual check of the 5 recommendations (agri-food template).
 * Creates: batch(1 QR) → activation (jus-fruits-frais) → review 4.5 → scan.
 * Run: BASE=http://localhost:3100 bun scripts/demo-visual-check.ts
 * Purge: BASE=... PURGE=1 bun scripts/demo-visual-check.ts
 */
const BASE = process.env.BASE ?? "http://localhost:3100";

let jar = "";
function capture(res: Response) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const nv = c.split(";")[0];
    const name = nv.split("=")[0];
    jar = jar.split("; ").filter((p) => p && !p.startsWith(`${name}=`)).concat(nv).join("; ");
  }
}

async function main() {
  if (process.env.PURGE) {
    // purge handled manually via prisma below
  }

  // 1. admin login
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
      password: "Admin123!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  capture(loginRes);

  // 2. batch 1 QR
  const batchRes = await fetch(`${BASE}/api/admin/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: jar },
    body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
  });
  const batchJson = (await batchRes.json()) as { masterCodes?: string[] };
  const master = batchJson.masterCodes?.[0];
  if (!master) throw new Error("batch non créé: " + JSON.stringify(batchJson).slice(0, 200));

  // 3. activation agroalimentaire (templateId = jus-fruits-frais)
  const actRes = await fetch(`${BASE}/api/artisan/activate-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: master,
      groups: [
        {
          count: 1,
          productData: {
            productName: "Bissap artisanal premium",
            templateId: "jus-fruits-frais",
            contenance: "1 L",
            ingredients: "Hibiscus, menthe fraîche, gingembre, sucre de canne",
            manufacturingDate: "2026-10-02",
            expirationDate: "2026-10-05",
            productPrice: "1500 FCFA",
            artisanBio:
              "Awa prépare son bissap selon la recette de sa grand-mère, avec des fleurs d'hibiscus séchées au soleil de Thiès. Chaque bouteille est pressée du jour, sans conservateur ni arôme ajouté.",
            precautions:
              "À conserver au frais (0–6 °C)\nÀ consommer dans les 3 jours après ouverture\nBien agiter avant de servir",
          },
        },
      ],
      shared: {
        artisanName: "Awa Ndiaye",
        contactPhone: "+221771234567",
        contactEmail: "awa.demo@verifscan.sn",
      },
    }),
  });
  const actJson = (await actRes.json()) as { firstCode?: string; error?: string };
  const code = actJson.firstCode;
  if (!code) throw new Error("activation échouée: " + (actJson.error ?? ""));
  console.log("LOT_CODE=" + code);

  // 4. review 4.5 (half-star)
  const revRes = await fetch(`${BASE}/api/artisan/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      authorName: "Marième D.",
      rating: 4.5,
      comment:
        "Le meilleur bissap que j'ai goûté ! Frais, pas trop sucré, on sent le vrai goût de l'hibiscus. Je recommande à 100 %.",
    }),
  });
  console.log("REVIEW=" + revRes.status);

  // 5. scan (pour « Dernier scan » + compteur)
  const scanRes = await fetch(`${BASE}/api/artisan/track-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, timezone: "Africa/Dakar", deviceType: "mobile" }),
  });
  console.log("SCAN=" + scanRes.status);
  console.log("URL=" + BASE + "/a/" + code);
}

main();
