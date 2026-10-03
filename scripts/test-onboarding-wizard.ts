/**
 * E2E — Onboarding activation + badge « Produit authentique » (retour test n°3).
 *
 * 1. Login SuperAdmin
 * 2. POST batch 10 étiquettes (1 pack de 10) → code maître
 * 3. GET /activer-pack/<maître> → écran « Activez votre pack » :
 *    - titre + sous-titre « Choisissez la façon d'activer vos étiquettes »
 *    - 2 cartes de choix (simple / flexible)
 * 4. POST /api/artisan/activate-groups (payload IDENTIQUE au wizard) :
 *    marque + WhatsApp → produit → ingrédients → dates
 * 5. GET /a/<premier code> → page produit activée
 *    + badge « Produit authentique » EN VEDETTE sous le bouton Découvrir
 *
 * Usage : BASE=http://localhost:3100 ADMIN_PASSWORD=… DATABASE_URL=file:… \
 *          bun scripts/test-onboarding-wizard.ts
 */
const BASE = process.env.BASE ?? "http://localhost:3100";

let cookieJar = "";

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
      "user-agent": "test-onboarding-wizard",
      ...(init.headers ?? {}),
      cookie: cookieJar,
    },
  });
  captureCookies(res);
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function login(password: string) {
  const csrf = await req("/api/auth/csrf");
  const res = await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email: "admin@verifscan.sn",
      password,
      callbackUrl: `${BASE}/admin`,
    }),
  });
  const sess = await req("/api/auth/session");
  return !!(sess.body as any)?.user;
}

let failed = 0;
function expect(html: string, label: string, needle: string, mustHave = true) {
  const ok = html.includes(needle);
  if (mustHave && !ok) {
    console.error(`   ✗ ${label} — « ${needle} » ABSENT`);
    failed++;
  } else {
    console.log(`   ✓ ${label}${mustHave ? "" : " (absent comme attendu)"}`);
  }
}

async function main() {
  console.log("1. Login SuperAdmin...");
  const ok = await login(process.env.ADMIN_PASSWORD ?? "Admin123!2025");
  console.log("   login:", ok ? "OK" : "ÉCHEC");
  if (!ok) process.exit(1);

  console.log("2. POST batch de test (1 pack de 10 étiquettes)...");
  const create = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 10, packSize: 10, pricePerPack: 0 }),
  });
  if (create.status !== 201) {
    console.error("   ✗ création batch:", create.status, create.body);
    process.exit(1);
  }
  const master: string = create.body.masterCodes[0];
  console.log(`   201 ✓ maître: ${master}`);

  console.log("3. GET /activer-pack — écran d'accueil de l'onboarding...");
  const page = await req(`/activer-pack/${master}`);
  console.log("   status:", page.status);
  if (page.status !== 200) process.exit(1);
  const html: string = page.body;

  expect(html, "titre « Activez votre pack »", "Activez votre pack");
  expect(
    html,
    "sous-titre « Choisissez la façon d'activer vos étiquettes »",
    "Choisissez la façon",
  );
  expect(html, "badge ACTIVEZ VOTRE PACK", "ACTIVEZ VOTRE PACK");
  expect(html, "carte MODE 1 (tout d'un coup)", 'data-testid="choose-simple"');
  expect(html, "carte MODE 2 (produits différents)", 'data-testid="choose-flexible"');
  expect(html, "code maître affiché", master);

  console.log("4. POST /api/artisan/activate-groups — payload du wizard...");
  const mfg = new Date().toISOString().split("T")[0];
  const exp = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const act = await req("/api/artisan/activate-groups", {
    method: "POST",
    body: JSON.stringify({
      masterCode: master,
      groups: [
        {
          count: 10,
          productData: {
            productName: "Savon au karité pur",
            productDesignation: "Savon artisanal au beurre de karité, fabriqué à la main",
            contenance: "150g",
            ingredients:
              "Beurre de karité 500g, huile de coco, soude, eau, huile essentielle de citron",
            manufacturingDate: mfg,
            expirationDate: exp,
          },
        },
      ],
      shared: {
        artisanName: "Aïssata Cosmétiques",
        contactPhone: "77 123 45 67",
        contactEmail: "",
        instagramUrl: "",
        facebookUrl: "",
        tiktokUrl: "",
        artisanPhotos: [],
        logoUrl: "",
      },
    }),
  });
  console.log("   status:", act.status, act.body?.message ?? act.body?.error ?? "");
  if (act.status !== 200) {
    console.error("   ✗ activation:", JSON.stringify(act.body).slice(0, 400));
    process.exit(1);
  }
  expect(String(act.body?.activated), "10 QR codes activés d'un coup", "10");
  const firstCode: string = act.body?.firstCode ?? "";
  console.log(`   premier code produit: ${firstCode}`);

  console.log("5. GET /a/<produit> — page activée + badge en vedette...");
  const prod = await req(`/a/${firstCode}`);
  console.log("   status:", prod.status);
  if (prod.status !== 200) process.exit(1);
  const prodHtml: string = prod.body;
  const visible = prodHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  const hero = visible.split("<header")[1]?.split("</header>")[0] ?? "";

  expect(visible, "nom du produit affiché", "Savon au karité pur");
  expect(visible, "marque affichée", "Aïssata Cosmétiques");
  expect(hero, "badge « Produit authentique » SOUS le bouton Découvrir", "Produit authentique");
  expect(hero, "badge en pilule emerald pleine", "bg-emerald-500 px-4 py-1.5");
  expect(hero, "bouton Découvrir présent", "Découvrir");
  expect(hero, "SANS anciens badges flottants", "art-float", false);

  console.log(
    failed === 0
      ? "\n✓ Onboarding + badge : tous les changements sont en place."
      : `\n✗ ${failed} assertion(s) en échec.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
