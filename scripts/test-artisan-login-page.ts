/**
 * Vérification visuelle de la page /artisan/login refaite.
 * - Desktop 1440x900 : header avec menu visible, panneau marque, footer visible
 * - Mobile 390x844   : header + hamburger, formulaire, footer (masqué mobile
 *   comme sur tout le site public — pattern PublicFooter)
 * - Testids du formulaire conservés (couverts par test-artisan-portal.ts)
 * Sortie : shots/artisan-login-refonte-{desktop,mobile}.png
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
let failures = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

(async () => {
  const browser = await chromium.launch();

  // ── Desktop ──
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const resp = await page.goto(`${BASE}/artisan/login`, { waitUntil: "networkidle" });
  check("HTTP 200 sur /artisan/login", resp?.status() === 200, `status=${resp?.status()}`);

  check("testid page présent", await page.isVisible("[data-testid='artisan-login-page']"));
  check("header public présent (menu)", (await page.locator("header").count()) >= 1);
  const navLinks = await page.locator("header nav a, header nav a[href]").count();
  check("menu header ≥ 5 liens", navLinks >= 5, `liens=${navLinks}`);
  check("lien Accueil dans header", (await page.locator("header a[href='/']").count()) >= 1);
  check("lien Catalogue dans header", (await page.locator("header a[href='/produits']").count()) >= 1);
  check("CTA Devenir partenaire", (await page.locator("header a[href='/register']").count()) >= 1);
  check("footer public présent", (await page.locator("footer").count()) >= 1);
  const footerVisible = await page.locator("footer").isVisible();
  check("footer visible (desktop)", footerVisible);
  check("panneau marque desktop", await page.isVisible("text=Espace Artisan"));
  check("badge 0000 présent", (await page.locator("text=0000").count()) >= 1);
  check("testids form (phone/password/submit)",
    (await page.locator("[data-testid='login-phone']").count()) === 1 &&
    (await page.locator("[data-testid='login-password']").count()) === 1 &&
    (await page.locator("[data-testid='login-submit']").count()) === 1);
  check("lien croisé Espace Fabricant", (await page.locator("a[href='/login']").count()) >= 1);

  await page.screenshot({ path: "shots/artisan-login-refonte-desktop.png", fullPage: true });

  // ── Mobile ──
  const mp = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mp.goto(`${BASE}/artisan/login`, { waitUntil: "networkidle" });
  check("[mobile] header présent", (await mp.locator("header").count()) >= 1);
  check("[mobile] hamburger menu visible", await mp.isVisible("button[aria-label='Ouvrir le menu']"));
  // Ouvrir le drawer mobile → le menu s'affiche
  await mp.click("button[aria-label='Ouvrir le menu']");
  await mp.waitForTimeout(600);
  check("[mobile] drawer avec lien Catalogue", (await mp.locator("aside a[href='/produits']").count()) >= 1);
  await mp.keyboard.press("Escape");
  await mp.click("button[aria-label='Fermer le menu']").catch(() => {});
  await mp.waitForTimeout(500);
  check("[mobile] testid page présent", await mp.isVisible("[data-testid='artisan-login-page']"));
  await mp.screenshot({ path: "shots/artisan-login-refonte-mobile.png", fullPage: true });

  // ── Cycle de rendu du formulaire (erreur mauvais mdp → login-error) ──
  // NB : première connexion = auto-création du compte (pas d'erreur). Pour
  // déclencher le 401 il faut un compte EXISTANT + mauvais mot de passe.
  // 770000001 existe (créé plus haut dans ce run avec « mauvaismdp »).
  await page.fill("[data-testid='login-phone']", "770000001");
  await page.fill("[data-testid='login-password']", "ceci-nest-pas-le-mdp");
  await page.click("[data-testid='login-submit']");
  try {
    await page.waitForSelector("[data-testid='login-error']", { timeout: 8000 });
    check("erreur affichée sur mauvais mot de passe", true);
  } catch {
    check("erreur affichée sur mauvais mot de passe", false);
  }

  await browser.close();
  console.log(failures === 0 ? "\n🎉 TOUS LES CHECKS OK" : `\n💥 ${failures} échec(s)`);
  process.exit(failures === 0 ? 0 : 1);
})();
