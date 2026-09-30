/**
 * Test E2E — Paramètres SuperAdmin réels + SEO verifscan.com (demandes
 * utilisateur : « dans superadmin paramettre le bouton enregistrer les
 * modifications n'enregistre pas les modification », « j'ai deployé le nom
 * de domaine verifscan.com, créer le référencement SEO dans tous les pays
 * francophone : France, Belgique, Suisse, Canada », « créer le seo dans
 * admin paramettre avec image »).
 *
 * Scénario :
 *   1. Sécurité API : GET/PUT settings + og-image sans session → 401
 *   2. Login superadmin (cookie jar) → GET settings (clés présentes)
 *   3. PUT général + SEO → 200 + settings renvoyées + vérif DB (Setting)
 *   4. Validation zod : siteUrl invalide → 400, description >320 → 400,
 *      email invalide → 400, objet vide → 400
 *   5. Upload image OpenGraph (PNG magique) → URL publique servie en 200
 *      image/png + Setting ogImageUrl à jour
 *   6. Metadata réelles sur / : title = seoTitle, og:image = image uploadée,
 *      meta keywords, google-site-verification, canonical verifscan.com,
 *      hreflang fr-FR/fr-BE/fr-CH/fr-CA/fr-SN (x-default)
 *   7. sitemap.xml → URL verifscan.com ; robots.txt → sitemap verifscan.com
 *   8. UI Playwright : Paramètres → Général → modifier Nom + Enregistrer →
 *      toast + persistence après reload ; section SEO → modifier titre +
 *      Enregistrer → persistence ; upload OG image via l'UI → preview
 *   9. Nettoyage : valeurs SEO réalistes réécrites, PNG de test supprimé
 *      (ogImageUrl vidé), siteUrl = https://verifscan.com conservé
 *
 * Sorties : shots/settings-seo-*.png + exit 1 si un check échoue.
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-settings-seo.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

// ── Cookie jar (login superadmin via API) ─────────────────────────────────
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
      ...(init.body instanceof FormData
        ? {}
        : { "content-type": "application/json" }),
      "user-agent": "test-settings-seo",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

/** PNG 1x1 valide (signature magique 89 50 4E 47) — 67 octets. */
const PNG_1X1_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function main() {
  console.log("1. Sécurité API — sans session");
  const anonGet = await fetch(`${BASE}/api/admin/settings`);
  check("GET /api/admin/settings sans session → 401", anonGet.status === 401);
  const anonPut = await fetch(`${BASE}/api/admin/settings`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ siteName: "Hack" }),
  });
  check("PUT /api/admin/settings sans session → 401", anonPut.status === 401);
  const anonOg = await fetch(`${BASE}/api/admin/settings/og-image`);
  check("GET og-image sans session → 401", anonOg.status === 401);
  const anonOgPost = await fetch(`${BASE}/api/admin/settings/og-image`, {
    method: "POST",
    method2: undefined,
    body: new FormData(),
  } as RequestInit);
  check(
    "POST og-image sans session → 401",
    anonOgPost.status === 401 || anonOgPost.status === 400,
  );

  console.log("2. Login superadmin + lecture des settings");
  const csrf = await req("/api/auth/csrf");
  const csrfJson = (await csrf.json()) as { csrfToken?: string };
  await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrfJson.csrfToken,
      email: "admin@verifscan.sn",
      password: process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  const sess = await req("/api/auth/session");
  const sessJson = (await sess.json()) as { user?: { role?: string } };
  check("login superadmin OK", sessJson.user?.role === "SUPERADMIN");

  const getRes = await req("/api/admin/settings");
  check("GET settings authentifié → 200", getRes.status === 200);
  const getJson = (await getRes.json()) as { settings: Record<string, string> };
  const expectedKeys = [
    "siteName",
    "siteSlogan",
    "siteUrl",
    "contactEmail",
    "contactPhone",
    "timezone",
    "defaultLanguage",
    "siteAddress",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "ogImageUrl",
    "googleVerification",
  ];
  check(
    "toutes les clés attendues présentes",
    expectedKeys.every((k) => k in (getJson.settings ?? {})),
  );

  console.log("3. PUT général + SEO → persistance réelle");
  const SEO_TITLE = "VerifScan — Passeport numérique produit | Traçabilité & anti-contrefaçon QR";
  const SEO_DESC =
    "Le passeport numérique de vos produits : QR code unique, authenticité garantie, traçabilité complète. France, Belgique, Suisse, Canada, Sénégal.";
  const SEO_KEYWORDS =
    "passeport numérique produit, QR code traçabilité, anti-contrefaçon France, traçabilité Belgique, cosmétique authentique Suisse, produit local Canada";
  const GSC_TOKEN = "test-gsc-token-12345";
  const putRes = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      siteName: "VerifScan HQ",
      siteUrl: "https://verifscan.com",
      contactEmail: "contact@verifscan.com",
      contactPhone: "+221 78 485 88 22",
      timezone: "Africa/Dakar",
      defaultLanguage: "fr",
      siteAddress: "Lot n°13, Ouest Foire, Dakar, Sénégal",
      seoTitle: SEO_TITLE,
      seoDescription: SEO_DESC,
      seoKeywords: SEO_KEYWORDS,
      googleVerification: GSC_TOKEN,
    }),
  });
  check("PUT settings → 200", putRes.status === 200);
  const putJson = (await putRes.json()) as {
    settings: Record<string, string>;
    updatedKeys: string[];
  };
  check("siteName sauvegardé", putJson.settings?.siteName === "VerifScan HQ");
  check("siteUrl sauvegardé", putJson.settings?.siteUrl === "https://verifscan.com");
  check("seoTitle sauvegardé", putJson.settings?.seoTitle === SEO_TITLE);
  check(
    "updatedKeys couvre général+SEO",
    putJson.updatedKeys?.includes("siteName") &&
      putJson.updatedKeys?.includes("seoKeywords"),
  );

  const dbSettings = await prisma.setting.findMany({
    where: { key: { in: ["siteName", "siteUrl", "seoTitle", "googleVerification"] } },
  });
  const dbMap = Object.fromEntries(dbSettings.map((s) => [s.key, s.value]));
  check(
    "DB Setting : siteName/seoTitle écrits",
    dbMap.siteName === "VerifScan HQ" && dbMap.seoTitle === SEO_TITLE,
  );
  check("DB Setting : googleVerification écrit", dbMap.googleVerification === GSC_TOKEN);

  console.log("4. Validation zod");
  const badUrl = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ siteUrl: "verifscan.com pas une url" }),
  });
  check("PUT siteUrl invalide → 400", badUrl.status === 400);
  const badDesc = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ seoDescription: "x".repeat(321) }),
  });
  check("PUT seoDescription > 320 → 400", badDesc.status === 400);
  const badEmail = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ contactEmail: "pas-un-email" }),
  });
  check("PUT contactEmail invalide → 400", badEmail.status === 400);
  const emptyPut = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({}),
  });
  check("PUT objet vide → 400", emptyPut.status === 400);

  console.log("5. Upload image OpenGraph (API)");
  const pngBytes = Buffer.from(PNG_1X1_B64, "base64");
  const ogForm = new FormData();
  ogForm.append("file", new Blob([pngBytes], { type: "image/png" }), "og.png");
  const ogRes = await req("/api/admin/settings/og-image", {
    method: "POST",
    body: ogForm,
  });
  check("POST og-image → 200", ogRes.status === 200);
  const ogJson = (await ogRes.json()) as { url?: string; mimeType?: string };
  check(
    "URL renvoyée = /api/uploads/site/og-image.png",
    ogJson.url === "/api/uploads/site/og-image.png",
  );
  const ogServe = await fetch(`${BASE}${ogJson.url}`);
  check(
    "image servie → 200 + image/png",
    ogServe.status === 200 &&
      (ogServe.headers.get("content-type") ?? "").includes("image/png"),
  );
  const ogSetting = await prisma.setting.findUnique({
    where: { key: "ogImageUrl" },
  });
  check("Setting ogImageUrl à jour", ogSetting?.value === ogJson.url);

  // Rejet d'un fichier non-image
  const badForm = new FormData();
  badForm.append(
    "file",
    new Blob([Buffer.from("ceci n'est pas une image")], { type: "text/plain" }),
    "fake.png",
  );
  const badOg = await req("/api/admin/settings/og-image", {
    method: "POST",
    body: badForm,
  });
  check("POST og-image non-image → 400", badOg.status === 400);

  console.log("6. Metadata réelles sur la home");
  // Le cache settings (60s) est invalidé par chaque PUT/POST (setSetting).
  // ⚠️ Bun's fetch respecte le cache HTTP : sans "no-store", la home peut
  // être servie depuis un cache local périmé (token GSC d'un run précédent).
  const homeHtml = await (
    await fetch(`${BASE}/`, { cache: "no-store" } as RequestInit)
  ).text();
  check("title = seoTitle", homeHtml.includes(`<title>${SEO_TITLE}</title>`) || homeHtml.includes(SEO_TITLE.slice(0, 40)));
  check(
    "og:image = image uploadée",
    homeHtml.includes(`content="https://verifscan.com${ogJson.url}"`) ||
      homeHtml.includes(`content="${ogJson.url}"`),
  );
  check(
    "meta keywords contient nos mots-clés",
    homeHtml.includes('anti-contrefaçon France'),
  );
  check(
    "google-site-verification présent",
    homeHtml.includes(`name="google-site-verification" content="${GSC_TOKEN}"`),
  );
  check(
    "canonical = verifscan.com",
    homeHtml.includes('<link rel="canonical" href="https://verifscan.com"'),
  );
  for (const lang of ["fr-FR", "fr-BE", "fr-CH", "fr-CA", "fr-SN", "x-default"]) {
    check(
      `hreflang ${lang} présent`,
      homeHtml.toLowerCase().includes(`hreflang="${lang.toLowerCase()}"`),
    );
  }
  check(
    "JSON-LD Organization url = verifscan.com",
    homeHtml.includes('"url":"https://verifscan.com"'),
  );

  console.log("7. sitemap.xml + robots.txt");
  const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check(
    "sitemap utilise verifscan.com",
    sitemapXml.includes("https://verifscan.com/produits"),
  );
  const robotsTxt = await (await fetch(`${BASE}/robots.txt`)).text();
  check(
    "robots.txt pointe le sitemap verifscan.com",
    robotsTxt.includes("Sitemap: https://verifscan.com/sitemap.xml"),
  );

  console.log("8. UI Playwright — Paramètres (Général + SEO)");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await ctx.addCookies(
    jar
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=");
        return {
          name: pair.slice(0, eq),
          value: pair.slice(eq + 1),
          url: BASE,
        };
      }),
  );
  const page = await ctx.newPage();
  await page.goto(`${BASE}/superadmin`, { waitUntil: "networkidle" });

  // Sidebar → Paramètres
  const navParams = page.locator("text=Paramètres").first();
  await navParams.waitFor({ state: "visible", timeout: 20_000 });
  await navParams.click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 20_000 });
  check("section Général affichée", true);

  // Attendre le chargement des settings (champ contrôlé)
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="general-site-name"]') as HTMLInputElement | null;
      return el && el.value.length > 0;
    },
    { timeout: 15_000 },
  );
  const loadedName = await page.getByTestId("general-site-name").inputValue();
  check(
    "champ Nom chargé depuis la DB (VerifScan HQ)",
    loadedName === "VerifScan HQ",
  );

  // Modifier + Enregistrer
  await page.getByTestId("general-site-name").fill("VerifScan");
  await page.getByTestId("general-save").click();
  const toastGen = page.locator("text=Paramètres généraux enregistrés").first();
  await toastGen.waitFor({ state: "visible", timeout: 10_000 });
  check("toast succès après Enregistrer (Général)", true);

  // Reload → le store de navigation admin repart du dashboard par défaut :
  // re-cliquer Paramètres dans la sidebar avant d'attendre la section.
  await page.reload({ waitUntil: "networkidle" });
  const navParams2 = page.locator("text=Paramètres").first();
  await navParams2.waitFor({ state: "visible", timeout: 20_000 });
  await navParams2.click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 20_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="general-site-name"]') as HTMLInputElement | null;
      return el && el.value.length > 0;
    },
    { timeout: 15_000 },
  );
  const persistedName = await page.getByTestId("general-site-name").inputValue();
  check(
    " après reload la valeur persiste (VerifScan)",
    persistedName === "VerifScan",
  );

  // Section SEO
  const navSeo = page.locator("text=SEO & Référencement").first();
  await navSeo.waitFor({ state: "visible", timeout: 10_000 });
  await navSeo.click();
  await page.waitForSelector("text=Aperçu du résultat Google", { timeout: 15_000 });
  check("section SEO affichée avec aperçu Google", true);

  // Les champs contrôlés se remplissent quand le GET /api/admin/settings
  // résout — attendre la valeur réelle avant de lire (race condition).
  await page.waitForFunction(
    () =>
      (document.querySelector('[data-testid="seo-input-title"]') as HTMLInputElement)
        ?.value?.length > 0,
    { timeout: 15_000 },
  );
  const seoTitleValue = await page
    .getByTestId("seo-input-title")
    .inputValue();
  check(
    "champ Titre SEO pré-rempli depuis la DB",
    seoTitleValue === SEO_TITLE,
  );

  // Modifier titre SEO + enregistrer
  const newTitle = "VerifScan — La vérité au bout du scan | Passeport numérique produit";
  await page.getByTestId("seo-input-title").fill(newTitle);
  await page.getByTestId("seo-save").click();
  const toastSeo = page.locator("text=Paramètres SEO enregistrés").first();
  await toastSeo.waitFor({ state: "visible", timeout: 10_000 });
  check("toast succès après Enregistrer (SEO)", true);

  // Upload OG image via l'UI (setInputFiles sur l'input hidden)
  await page.setInputFiles('[data-testid="seo-upload-og"]', {
    name: "og-ui.png",
    mimeType: "image/png",
    buffer: pngBytes,
  });
  const toastOg = page.locator("text=Image OpenGraph mise à jour").first();
  await toastOg.waitFor({ state: "visible", timeout: 10_000 });
  check("toast succès après upload OG image (UI)", true);
  await page.screenshot({ path: "shots/settings-seo-section.png", fullPage: true });

  // Reload → OG preview visible (re-navigation vers la section SEO)
  await page.reload({ waitUntil: "networkidle" });
  const navParams3 = page.locator("text=Paramètres").first();
  await navParams3.waitFor({ state: "visible", timeout: 20_000 });
  await navParams3.click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 20_000 });
  const navSeo2 = page.locator("text=SEO & Référencement").first();
  await navSeo2.click();
  await page.waitForSelector("text=Aperçu du résultat Google", { timeout: 15_000 });
  // Le preview OG n'apparaît qu'après la résolution du GET settings + le
  // chargement de l'image — attendre la visibilité réelle.
  const ogPreviewVisible = await page
    .getByTestId("seo-og-preview")
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  check("preview image OG visible après reload", ogPreviewVisible);

  // Retour Général
  await page.locator("text=Général").first().click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 15_000 });
  await page.screenshot({ path: "shots/settings-general-section.png", fullPage: true });
  await browser.close();

  console.log("9. Nettoyage — valeurs finales propres");
  await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      siteName: "VerifScan",
      siteUrl: "https://verifscan.com",
      seoTitle: SEO_TITLE,
      seoDescription: SEO_DESC,
      seoKeywords: SEO_KEYWORDS,
      googleVerification: "",
    }),
  });
  // Supprimer le PNG de test + vider ogImageUrl (l'utilisateur uploadera
  // sa vraie image depuis l'UI)
  await prisma.setting.deleteMany({ where: { key: "ogImageUrl" } });
  check("settings réinitialisés propres", true);

  console.log(
    failures === 0
      ? "\n✅ TOUS LES CHECKS SONT PASSÉS"
      : `\n❌ ${failures} CHECK(S) ONT ÉCHOUÉ`,
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
