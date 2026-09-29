/**
 * Test unitaire — résolution ROBUSTE de l'origine publique du site
 * (src/lib/site-origin.ts).
 *
 * CORRECTIF VISÉ : derrière le proxy Coolify, request.nextUrl.origin
 * renvoie l'adresse interne du conteneur (« https://0.0.0.0:80 ») au lieu
 * du nom de domaine consulté. Les QR imprimés encodaient
 * « https://0.0.0.0:80/a/ART-… » et le message WhatsApp
 * « https://0.0.0.0:80/artisan/login » — liens morts depuis un téléphone.
 *
 * Cas couverts (computeSiteOrigin est PUR — pas de serveur requis) :
 *   1. PROD : x-forwarded-host public gagne (scénario Coolify réparé)
 *   2. PROD : forwarded 0.0.0.0 + raw 0.0.0.0:80 + env domaine → env
 *      (proxy qui ment + NEXT_PUBLIC_APP_URL configuré)
 *   3. PROD : raw public sans forwarded → raw (accès direct)
 *   4. PROD : liste x-forwarded-host « a.com, b.com » → premier hôte
 *   5. PROD : x-forwarded-proto http respecté
 *   6. PROD : rien de public → dernier recours + warning
 *   7. DEV : forwarded public (aperçu sandbox) → il gagne (QR scannables)
 *   8. DEV : raw localhost:3000 → conservé (l'env ne détourne PAS le dev)
 *   9. DEV : raw 0.0.0.0:3000 → réécrit localhost:3000
 *  10. isPublicHost / isPublicOrigin / localhostify (cas unitaires)
 *
 * + Vérification d'intégration : les 3 points d'attache serveur
 *   (print-batch, sell-pack, gs1-resolver) importent bien resolveSiteOrigin
 *   et n'utilisent plus request.nextUrl.origin directement.
 *
 * Run : bun scripts/test-site-origin.ts
 */

import fs from "node:fs";
import {
  computeSiteOrigin,
  isPublicHost,
  isPublicOrigin,
  localhostify,
} from "../src/lib/site-origin";

let failures = 0;
let total = 0;
function check(label: string, ok: boolean) {
  total++;
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

console.log("\n═══ PRODUCTION — scénarios Coolify / proxy ═══");

// 1. Le domaine consulté (x-forwarded-host) gagne — même si le serveur voit 0.0.0.0
check(
  "prod: x-forwarded-host public gagne sur raw 0.0.0.0:80",
  computeSiteOrigin({
    forwardedHost: "mon-domaine.com",
    forwardedProto: "https",
    rawOrigin: "https://0.0.0.0:80",
    isProd: true,
  }) === "https://mon-domaine.com"
);

// 2. Le proxy ment (forwarded = 0.0.0.0) + env configurée → env
check(
  "prod: forwarded 0.0.0.0 + raw 0.0.0.0:80 + env → NEXT_PUBLIC_APP_URL",
  computeSiteOrigin({
    forwardedHost: "0.0.0.0",
    forwardedProto: "https",
    rawOrigin: "https://0.0.0.0:80",
    envUrl: "https://verifscan.sn",
    isProd: true,
  }) === "https://verifscan.sn"
);

// 3. Accès direct sans proxy : origine brute publique
check(
  "prod: raw public sans forwarded → raw",
  computeSiteOrigin({
    rawOrigin: "https://boutique.fr",
    isProd: true,
  }) === "https://boutique.fr"
);

// 4. Plusieurs proxys en chaîne → premier hôte de la liste
check(
  "prod: liste x-forwarded-host → premier hôte",
  computeSiteOrigin({
    forwardedHost: "mon-domaine.com, proxy-interne.local",
    forwardedProto: "https",
    rawOrigin: "https://0.0.0.0:80",
    isProd: true,
  }) === "https://mon-domaine.com"
);

// 5. Proto forwardé http respecté (staging sans TLS)
check(
  "prod: x-forwarded-proto http respecté",
  computeSiteOrigin({
    forwardedHost: "staging.mon-domaine.com",
    forwardedProto: "http",
    rawOrigin: "https://0.0.0.0:80",
    isProd: true,
  }) === "http://staging.mon-domaine.com"
);

// 6. Rien de public → dernier recours défini (raw), avec warning console
const fallback = computeSiteOrigin({
  forwardedHost: "0.0.0.0",
  rawOrigin: "http://0.0.0.0:80",
  isProd: true,
});
check(
  "prod: rien de public → fallback déterministe (localhostify)",
  fallback === "http://localhost" // port 80 implicite en http
);

// 6b. localhost en forwarded ne doit JAMAIS gagner en prod si autre chose existe
check(
  "prod: forwarded localhost + raw public → raw",
  computeSiteOrigin({
    forwardedHost: "localhost:3000",
    rawOrigin: "https://mon-domaine.com",
    isProd: true,
  }) === "https://mon-domaine.com"
);

console.log("\n═══ DÉVELOPPEMENT — sandbox / localhost ═══");

// 7. Aperçu public (sandbox/tunnel) : le domaine consulté gagne → QR scannables
check(
  "dev: forwarded public (aperçu sandbox) gagne",
  computeSiteOrigin({
    forwardedHost: "preview-abc.space-z.ai",
    forwardedProto: "https",
    rawOrigin: "http://localhost:3000",
    envUrl: "https://verifscan.sn",
    isProd: false,
  }) === "https://preview-abc.space-z.ai"
);

// 8. Dev local : l'origine brute (localhost) est conservée — l'env NE
//    détourne PAS (le batch de test n'existe pas sur le domaine de prod)
check(
  "dev: raw localhost conservé (env ne détourne pas)",
  computeSiteOrigin({
    rawOrigin: "http://localhost:3000",
    envUrl: "https://verifscan.sn",
    isProd: false,
  }) === "http://localhost:3000"
);

// 9. Dev : 0.0.0.0 (adresse d'écoute) réécrit en localhost
check(
  "dev: raw 0.0.0.0:3000 → localhost:3000",
  computeSiteOrigin({
    rawOrigin: "http://0.0.0.0:3000",
    isProd: false,
  }) === "http://localhost:3000"
);

// 10. Dev : trailing slash normalisé
check(
  "dev: trailing slash supprimé",
  computeSiteOrigin({
    rawOrigin: "http://localhost:3000/",
    isProd: false,
  }) === "http://localhost:3000"
);

console.log("\n═══ Helpers unitaires ═══");

check("isPublicHost('mon-domaine.com') → true", isPublicHost("mon-domaine.com") === true);
check("isPublicHost('0.0.0.0') → false", isPublicHost("0.0.0.0") === false);
check("isPublicHost('localhost') → false", isPublicHost("localhost") === false);
check("isPublicHost('127.0.0.1') → false", isPublicHost("127.0.0.1") === false);
check("isPublicHost('::1') → false", isPublicHost("::1") === false);
check("isPublicHost('host.docker.internal') → false", isPublicHost("host.docker.internal") === false);
check("isPublicHost('atelier.local') → false", isPublicHost("atelier.local") === false);
check("isPublicOrigin('https://0.0.0.0:80/a/x') → false", isPublicOrigin("https://0.0.0.0:80/a/x") === false);
check("isPublicOrigin('https://verifscan.sn/a/x') → true", isPublicOrigin("https://verifscan.sn/a/x") === true);
check("localhostify('http://0.0.0.0:3000') → http://localhost:3000", localhostify("http://0.0.0.0:3000") === "http://localhost:3000");
check("localhostify('https://mon-domaine.com') → inchangé", localhostify("https://mon-domaine.com") === "https://mon-domaine.com");

console.log("\n═══ Intégration — points d'attache serveur ═══");

const FIXTURES: Array<[string, string]> = [
  ["src/app/api/admin/print-batch/[batchId]/route.ts", "PDF d'impression (QR ART-/MASTER-)"],
  ["src/app/api/admin/sell-pack/route.ts", "message WhatsApp (lien /artisan/login)"],
  ["src/lib/gs1-resolver.ts", "redirections 302 du resolver GS1"],
];
for (const [file, role] of FIXTURES) {
  const content = fs.readFileSync(file, "utf8");
  check(
    `${role} — importe resolveSiteOrigin`,
    content.includes('from "@/lib/site-origin"')
  );
  // On ignore les lignes de commentaires (la doc explique POURQUOI
  // nextUrl.origin a été remplacé) pour ne détecter que le CODE.
  const code = content
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
  check(
    `${role} — n'utilise plus request.nextUrl.origin en direct`,
    !code.includes(".nextUrl.origin")
  );
}

// Le QR affiché à l'écran passe par getScanOrigin (client) — durci aussi
const qrUrl = fs.readFileSync("src/lib/qr-url.ts", "utf8");
check("qr-url.ts — getScanOrigin durcie par localhostify", qrUrl.includes("localhostify(window.location.origin)"));

console.log(`\n═══ ${total - failures}/${total} checks OK ═══`);
if (failures > 0) {
  console.error(`✗ ${failures} échec(s)`);
  process.exit(1);
}
console.log("✅ Origine du site : le domaine consulté gagne TOUJOURS (jamais 0.0.0.0)\n");
