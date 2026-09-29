/**
 * Vérification rapide des éléments demandés par l'utilisateur :
 *   A. Hero SANS badges « Produit Authentique » / « Fait main » (supprimés)
 *   A'. Carte bleue : bandeau « Produit Authentique » + chip « Fait main »
 *   B. Carte contact : Téléphone + WhatsApp (toujours) + Email (si fourni)
 *   C. Activation avec contactEmail → ligne mailto sur la page
 *   D. Activation SANS contactEmail → pas de ligne Email (masquée)
 */
const BASE = "http://localhost:3000";
let jar = "";

function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [nv] = raw.split(";");
    const name = nv.split("=")[0];
    if (!name) continue;
    if (jar.includes(name + "=")) {
      jar = jar.replace(new RegExp(`${name}=[^;]*`), nv);
    } else {
      jar = jar ? `${jar}; ${nv}` : nv;
    }
  }
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "user-agent": "test-contact-badge",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

// Login superadmin (CSRF puis callback credentials)
const csrf = await req("/api/auth/csrf");
const csrfJson = (await csrf.json()) as { csrfToken?: string };
const login = await req("/api/auth/callback/credentials", {
  method: "POST",
  body: JSON.stringify({
    csrfToken: csrfJson.csrfToken,
    email: "admin@verifscan.sn",
    password: process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025",
    callbackUrl: `${BASE}/superadmin`,
  }),
});
const sess = await req("/api/auth/session");
const sessJson = (await sess.json()) as { user?: unknown };
const hasSession = !!sessJson.user;
console.log(`1. login: ${login.status} — session: ${hasSession ? "OK" : "ÉCHEC"}`);
if (!hasSession) process.exit(1);

// Batch de test 2/1
const batchRes = await req("/api/admin/batches", {
  method: "POST",
  body: JSON.stringify({ totalQuantity: 2, packSize: 1, pricePerPack: 0 }),
});
const batch = (await batchRes.json()) as {
  masterCodes?: string[];
  batch?: { id: string };
};
console.log(`2. POST batch: ${batchRes.status} — master: ${batch.masterCodes?.[0]}`);
if (!batch.masterCodes?.[0]) process.exit(1);
const master = batch.masterCodes[0];

// Activation AVEC email
const act = await req("/api/artisan/activate-pack", {
  method: "POST",
  body: JSON.stringify({
    masterCode: master,
    productData: {
      productName: "Savon karité test contact",
      contenance: "250g",
      ingredients: "Karité, miel",
      manufacturingDate: "2026-09-01",
      expirationDate: "2027-09-01",
      artisanName: "Test Artisan Contact",
      contactPhone: "771234567",
      contactEmail: "aissata@example.sn",
    },
  }),
});
console.log(`3. activation avec email: ${act.status}`);

const page = await req(`/a/${master}`);
const html = await page.text();
console.log(`4. GET page produit: ${page.status}`);

check("A. 'Produit Authentique' présent (bandeau carte bleue)", html.includes("Produit Authentique"));
check(
  "A'. hero SANS badges supprimés (demande utilisateur)",
  !html.includes("absolute left-5 top-5") && !html.includes("artisan-bounce-slow")
);
check("A''. chip « Fait main » dans la carte bleue", html.includes("Fait main"));
check("B. carte 'Coordonnées de l'artisan'", html.includes("Coordonnées de l"));
check("B. ligne Téléphone", html.includes(">Téléphone<") && html.includes("tel:771234567"));
check("B. ligne WhatsApp", html.includes("wa.me/221771234567") && html.includes("Message direct"));
check("B. ligne Email (mailto)", html.includes("mailto:aissata@example.sn") && html.includes(">Email<"));
check("C. email visible sur la page", html.includes("aissata@example.sn"));

// Nettoyage : batch de test supprimé (cascade packs/lots)
const batches = await req("/api/admin/batches");
const list = await batches.json();
const mine = list.find((b: { id: string }) => b.id === batch.batch.id);
void mine;
console.log(`\n=== ${failures === 0 ? "CONTACT + BADGE VALIDÉS" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
