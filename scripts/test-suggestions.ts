/**
 * Test E2E — les 11 suggestions d'amélioration (page artisan + ops).
 *
 *   1. Compteur de scans public        → "N scan(s)" dans le bandeau authentique
 *   2. Alerte contrefaçon géographique → scans Dakar puis Paris → bannière rouge
 *   3. OG metadata WhatsApp riche      → og:title / og:image / twitter:card
 *   4. Avis clients réels              → POST /api/artisan/reviews + affichage
 *   5. Bouton partager                 → présent dans la carte produit
 *   6. Galerie atelier                 → artisanPhotos → "atelier en images"
 *   7. Réseaux sociaux                 → Instagram/Facebook/TikTok sur la page
 *   8. SMTP                            → /api/admin/test-smtp répond (configured:false en dev)
 *   9. (PAT rotation)                  → côté utilisateur GitHub — rien à tester ici
 *  10. Backup auto                     → docker-entrypoint.sh contient la boucle .backup
 *  11. Batchs dupliqués                → db-health détecte + dedupe dry-run/réel
 *
 * Prérequis : dev server sur :3000, DB locale prête.
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
      "user-agent": "test-suggestions",
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

// ── 1. Login superadmin ──────────────────────────────────────────────────
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
console.log(`1. login: ${login.status} — session: ${sessJson.user ? "OK" : "ÉCHEC"}`);
if (!sessJson.user) process.exit(1);

// ── 0. Route du formulaire d'activation /activer-pack/[masterCode] ────────
// (garde-fou : le dossier dynamique doit rester [masterCode] — un mauvais
//  renommage rendrait le scan du QR maître en 404 sans casser aucun test API)
const formPage = await req("/activer-pack/MASTER-TEST-ROUTE");
const formHtml = await formPage.text();
check(
  "0. /activer-pack/[masterCode] rend le formulaire",
  formPage.status === 200 && formHtml.includes("Activez tout votre pack")
);

// ── 2. Deux batchs identiques rapprochés (pour le test doublons #11) ─────
const batchARes = await req("/api/admin/batches", {
  method: "POST",
  body: JSON.stringify({ totalQuantity: 2, packSize: 1, pricePerPack: 0 }),
});
const batchA = (await batchARes.json()) as {
  masterCodes?: string[];
  batch?: { id: string };
};
const batchBRes = await req("/api/admin/batches", {
  method: "POST",
  body: JSON.stringify({ totalQuantity: 2, packSize: 1, pricePerPack: 0 }),
});
const batchB = (await batchBRes.json()) as { batch?: { id: string } };
console.log(`2. batchs A (${batchA.batch?.id}) + B (${batchB.batch?.id}) créés`);
if (!batchA.masterCodes?.[0] || !batchB.batch?.id) process.exit(1);
const master = batchA.masterCodes[0];

// ── 3. Activation AVEC email + réseaux sociaux + photo (produit) ─────────
const act = await req("/api/artisan/activate-pack", {
  method: "POST",
  body: JSON.stringify({
    masterCode: master,
    productData: {
      productName: "Savon karité suggestions",
      contenance: "250g",
      ingredients: "Karité, miel",
      manufacturingDate: "2026-09-01",
      expirationDate: "2027-09-01",
      artisanName: "Test Artisan Suggestions",
      contactPhone: "771234567",
      contactEmail: "aissata@example.sn",
      photoUrl: "/api/uploads/artisan-test-suggestions.jpg",
      instagramUrl: "https://instagram.com/aissata.cosmetics",
      facebookUrl: "https://facebook.com/aissata.cosmetics",
      tiktokUrl: "https://tiktok.com/@aissata",
      productPrice: "5 000 FCFA",
      artisanPhotos: [
        "/api/uploads/artisan-atelier-1.jpg",
        "/api/uploads/artisan-atelier-2.jpg",
      ],
    },
  }),
});
console.log(`3. activation: ${act.status}`);
check("3. activation 201/200", act.ok);

// ── 4. Page produit : OG, sociaux, galerie, partage, avis ────────────────
const page = await req(`/a/${master}`);
const html = await page.text();
console.log(`4. GET page: ${page.status} (${html.length} octets)`);

check("4a. badge Produit Authentique", html.includes("Produit Authentique"));
check("4b. og:title présent", html.includes("og:title"));
check("4c. og:image absolu (photo produit)", html.includes("og:image") && html.includes("http://localhost:3000/api/uploads/artisan-test-suggestions.jpg"));
check("4d. twitter:card summary_large_image", html.includes("summary_large_image"));
check("4e. ligne Instagram", html.includes("instagram.com/aissata.cosmetics") && html.includes(">Instagram<"));
check("4f. ligne Facebook", html.includes("facebook.com/aissata.cosmetics") && html.includes(">Facebook<"));
check("4g. ligne TikTok", html.includes("tiktok.com/@aissata") && html.includes(">TikTok<"));
check("4h. galerie atelier", html.includes("atelier en images") && html.includes("artisan-atelier-1.jpg"));
check("4i. bouton partager", html.includes("Partager ce produit authentique"));
check("4k. prix affiché sur la page", html.includes("5 000 FCFA"));
check("4j. section avis présente", html.includes("Avis des clients"));
// (ScanTracker ne rend rien en HTML — il est validé par l'appel réel étape 5)

// ── 5. Scan #1 (Dakar) → compteur ────────────────────────────────────────
const scan1 = await req("/api/artisan/track-scan", {
  method: "POST",
  body: JSON.stringify({ code: master, timezone: "Africa/Dakar", deviceType: "mobile" }),
});
const scan1Json = (await scan1.json()) as { ok?: boolean };
console.log(`5. track-scan Dakar: ${scan1.status} ok=${scan1Json.ok}`);
check("5a. track-scan ok", scan1.ok && scan1Json.ok === true);

const page2 = await req(`/a/${master}`);
const html2 = await page2.text();
check("5b. compteur affiche 1 scan", /text-green-700[^>]*>1</.test(html2) || html2.includes(">1<"));

// ── 6. Scan #2 (Paris, région différente) → ALERTE CONTREFAÇON ───────────
const scan2 = await req("/api/artisan/track-scan", {
  method: "POST",
  body: JSON.stringify({ code: master, timezone: "Europe/Paris", deviceType: "desktop" }),
});
console.log(`6. track-scan Paris: ${scan2.status}`);

const page3 = await req(`/a/${master}`);
const html3 = await page3.text();
check("6a. bannière 'Activité suspecte détectée'", html3.includes("Activité suspecte détectée"));
check("6b. régions citées (Afrique puis Europe)", html3.includes("Afrique") && html3.includes("Europe"));

// ── 7. Avis client réel ───────────────────────────────────────────────────
const reviewRes = await req("/api/artisan/reviews", {
  method: "POST",
  body: JSON.stringify({
    code: master,
    authorName: "Fatou D.",
    rating: 5,
    comment: "Savon magnifique, l'odeur est incroyable. Je recommande !",
  }),
});
console.log(`7. POST review: ${reviewRes.status}`);
check("7a. review 201", reviewRes.status === 201);

const page4 = await req(`/a/${master}`);
const html4raw = await page4.text();
// React SSR insère des <!-- --> entre expressions texte adjacentes → on les retire
const html4 = html4raw.replace(/<!--.*?-->/g, "");
check("7b. avis affiché (auteur)", html4.includes("Fatou D."));
check("7c. avis affiché (commentaire)", html4.includes("odeur est incroyable"));
check("7d. résumé '1 avis'", html4.includes("1 avis"));
check("7e. moyenne 5.0/5", html4.includes("5.0/5"));

// Avis refusé sur code inconnu
const reviewBad = await req("/api/artisan/reviews", {
  method: "POST",
  body: JSON.stringify({ code: "ART-INEXISTANT-0001", authorName: "X Y", rating: 3, comment: "test" }),
});
check("7f. review code inconnu → 404", reviewBad.status === 404);

// ── 8. SMTP test endpoint (SuperAdmin) ───────────────────────────────────
const smtp = await req("/api/admin/test-smtp");
const smtpJson = (await smtp.json()) as { configured?: boolean };
console.log(`8. test-smtp: ${smtp.status} configured=${smtpJson.configured}`);
check("8a. endpoint SMTP répond avec 'configured'", smtp.ok && typeof smtpJson.configured === "boolean");

// ── 9. Backup : l'entrypoint contient la boucle .backup (vérif statique) ──
const fs = await import("fs");
const entry = fs.readFileSync("docker-entrypoint.sh", "utf-8");
check("9. entrypoint: boucle backup quotidien (.backup + rétention)", entry.includes(".backup") && entry.includes("86400") && entry.includes("tail -n +15"));

// ── 10. Batchs dupliqués : détection + dédoublonnage ──────────────────────
const health = await req("/api/admin/db-health");
const healthJson = (await health.json()) as {
  duplicateBatches?: Array<{ keepId: string; duplicates: Array<{ id: string }> }>;
};
const groups = healthJson.duplicateBatches ?? [];
// keepId = le plus ANCIEN du cluster — ça peut être un batch d'un run
// précédent si la fenêtre de 90 s le rattache ; on vérifie donc seulement
// que B est bien identifié comme doublon dans un groupe.
const myGroup = groups.find((g) => g.duplicates.some((d) => d.id === batchB.batch!.id));
console.log(`10. db-health: ${groups.length} groupe(s) de doublons`);
check("10a. groupe de doublons détecté (B listé comme doublon)", !!myGroup);

// dry-run : B serait supprimé (vide), rien n'est encore supprimé
const dry = await req("/api/admin/db-health", {
  method: "POST",
  body: JSON.stringify({ action: "dedupe", dryRun: true }),
});
const dryJson = (await dry.json()) as { deleted?: string[]; dryRun?: boolean };
check("10b. dry-run: B listé, dryRun=true", dryJson.dryRun === true && (dryJson.deleted ?? []).includes(batchB.batch!.id));

const batchesAfterDry = await req("/api/admin/batches");
const listAfterDry = (await batchesAfterDry.json()) as Array<{ id: string }>;
check("10c. dry-run n'a rien supprimé", listAfterDry.some((b) => b.id === batchB.batch!.id));

// réel : B supprimé
const real = await req("/api/admin/db-health", {
  method: "POST",
  body: JSON.stringify({ action: "dedupe", dryRun: false }),
});
const realJson = (await real.json()) as { deleted?: string[] };
check("10d. dédoublonnage réel: B supprimé", (realJson.deleted ?? []).includes(batchB.batch!.id));

const batchesAfter = await req("/api/admin/batches");
const listAfter = (await batchesAfter.json()) as Array<{ id: string }>;
check("10e. B n'existe plus, A toujours là", !listAfter.some((b) => b.id === batchB.batch!.id) && listAfter.some((b) => b.id === batchA.batch!.id));

console.log(`\n=== ${failures === 0 ? "SUGGESTIONS 1-11 VALIDÉES" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
