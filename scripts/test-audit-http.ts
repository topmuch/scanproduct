/**
 * AUDIT fonctionnel du site — crawl des pages publiques + garde des APIs.
 * Vérifie : codes HTTP attendus, contenu clé, absence d'erreur "Application error".
 */
const BASE = "http://localhost:3000";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

const PUBLIC_PAGES: Array<[string, string[]]> = [
  ["/", ["VerifScan"]],
  ["/produits", ["VerifScan"]],
  ["/produits/local", ["VerifScan"]],
  ["/contact", ["Contact"]],
  ["/a-propos", []],
  ["/blog", []],
  ["/carrieres", []],
  ["/cgu", []],
  ["/mentions-legales", []],
  ["/politique-confidentialite", []],
  ["/login", []],
  ["/register", []],
  ["/login/admin", []],
  ["/artisan/login", []],
  ["/sitemap.xml", ["verifscan.com"]],
  ["/robots.txt", ["Sitemap"]],
];

const ANON_API_EXPECT_401: string[] = [
  "/api/admin/stats",
  "/api/admin/users",
  "/api/admin/batches",
  "/api/admin/packs",
  "/api/admin/settings",
  "/api/admin/api-keys",
  "/api/admin/webhooks",
  "/api/admin/audit-logs",
  "/api/admin/tickets",
  "/api/notifications",
  "/api/admin/db-health",
];

const PUBLIC_API_EXPECT_200: string[] = [
  "/api/health",
  "/api/products",
];

const AUTH_API_EXPECT_401: string[] = [
  "/api/notifications/preferences",
];

const PAGE_404: string[] = ["/page-inexistante-audit", "/a/CODE-QUI-NEXISTE-PAS"];

async function main() {
  console.log("── Pages publiques (200 + contenu) ──");
  for (const [path, mustContain] of PUBLIC_PAGES) {
    try {
      const res = await fetch(`${BASE}${path}`, { cache: "no-store" } as RequestInit);
      const html = await res.text();
      const appError = html.includes("Application error") || html.includes("application-error");
      let ok = res.status === 200 && !appError;
      for (const needle of mustContain) {
        if (!html.includes(needle)) {
          ok = false;
          console.log(`    (contenu manquant: "${needle}")`);
        }
      }
      check(`${path} → 200${appError ? " + APPLICATION ERROR DÉTECTÉ" : ""}`, ok);
    } catch (e) {
      check(`${path} → exception (${String(e).slice(0, 60)})`, false);
    }
  }

  console.log("── Pages attendues 404 ──");
  for (const path of PAGE_404) {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" } as RequestInit);
    check(`${path} → 404 (status ${res.status})`, res.status === 404);
  }

  console.log("── APIs admin sans session → 401/403/405 (aucune donnée exposée) ──");
  for (const path of ANON_API_EXPECT_401) {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" } as RequestInit);
    check(
      `${path} → ${res.status}`,
      res.status === 401 || res.status === 403 || res.status === 405,
    );
  }

  console.log("── APIs authentifiées sans session → 401 (comportement attendu) ──");
  for (const path of AUTH_API_EXPECT_401) {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" } as RequestInit);
    check(`${path} → ${res.status}`, res.status === 401);
  }

  console.log("── APIs publiques → 200 ──");
  for (const path of PUBLIC_API_EXPECT_200) {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" } as RequestInit);
    check(`${path} → ${res.status}`, res.status === 200);
  }

  console.log("── API v1 protégée ──");
  const v1 = await fetch(`${BASE}/api/v1/verify/TEST`, { cache: "no-store" } as RequestInit);
  check("/api/v1/verify sans clé → 401", v1.status === 401);

  console.log(failures === 0 ? "\n✅ AUDIT HTTP : TOUT EST FONCTIONNEL" : `\n✗ ${failures} anomalie(s) HTTP`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Audit crashé:", e);
  process.exit(1);
});
