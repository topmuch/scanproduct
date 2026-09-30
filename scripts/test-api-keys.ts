/**
 * Test E2E — Clés API + Webhooks (Paramètres SuperAdmin → API & Intégrations)
 *
 * Demande utilisateur : « la génération des clés API ne marche pas » —
 * cause racine : la section API était un mock 100% (bouton Régénérer =
 * simple toast, aucune DB, aucune route). Cette feature la rend réelle :
 *   - ApiKey : génération (SHA-256 en DB, clé complète affichée 1 fois),
 *     auth Bearer/X-API-Key sur /api/v1/verify/[code], révocation
 *   - Webhook : CRUD + envoi signé HMAC-SHA256 + bouton Tester
 *   - Événements branchés : user.registered, report.created,
 *     scan.verified, plan.activated
 *
 * Scénario :
 *   1. Faux récepteur webhook (127.0.0.1:2599) qui capture les POST bruts
 *   2. Sécurité anonyme : 6 endpoints admin → 401 ; /api/v1 sans clé → 401 ;
 *      mauvaise clé → 401
 *   3. Login superadmin → GET clés (vide) → POST génération → 201 clé
 *      sk_live_… ; GET = masquée ; DB = SHA-256 (pas de clé en clair)
 *   4. Fixtures DB (batch/pack/lots) → /api/v1/verify : actif → valid:true
 *      + lastUsedAt ; X-API-Key OK ; code inconnu → 404 ; inactif → false
 *   5. 2e clé OK ; révocation clé 1 → 403 sur v1 ; clé 2 toujours OK
 *   6. Zod : nom trop court, URL invalide, événements vides → 400
 *   7. Webhook : création (secret whsec_ une fois) → /test → POST reçu avec
 *      signature HMAC valide
 *   8. register → webhook user.registered reçu + signature valide
 *   9. PATCH active:false → plus aucune livraison ; PATCH active:true +
 *      regenerateSecret → nouveau secret ; /test OK avec le NOUVEAU secret
 *  10. DELETE webhook → /test → 404
 *  11. UI Playwright : section API (génération via UI, panneau une-seule-
 *      fois, révocation en 2 temps, webhook + test livraison)
 *  12. Nettoyage : clés, webhooks, users, lots/packs/batchs, notifications
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-api-keys.ts
 */
import { chromium } from "playwright";
import http from "http";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const WEBHOOK_PORT = 2599;
const WEBHOOK_HOST = "127.0.0.1";
const STAMP = Date.now();
const DB_URL = "file:/home/z/my-project/db/custom.db";

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

// ── Faux récepteur webhook (capture POST bruts) ────────────────────────────
interface CapturedPost {
  path: string;
  event: string | null;
  signature: string | null;
  raw: string;
  at: number;
}
const received: CapturedPost[] = [];
let webhookServer: http.Server | null = null;

function startFakeWebhookReceiver(): Promise<void> {
  return new Promise((resolve) => {
    webhookServer = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk.toString("utf8")));
      req.on("end", () => {
        received.push({
          path: req.url ?? "/",
          event: (req.headers["x-verifscan-event"] as string) ?? null,
          signature: (req.headers["x-verifscan-signature"] as string) ?? null,
          raw,
          at: Date.now(),
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ received: true }));
      });
    });
    webhookServer.listen(WEBHOOK_PORT, WEBHOOK_HOST, () => resolve());
  });
}

function verifySignature(secret: string, raw: string, signature: string | null): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const given = signature.slice(7);
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function waitForPost(
  event: string,
  timeoutMs = 10_000
): Promise<CapturedPost | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = received.find((r) => r.event === event);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
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
      ...(init.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      "user-agent": "test-api-keys",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

async function loginSuperadmin() {
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
  return sessJson.user?.role === "SUPERADMIN";
}

async function registerAccount(email: string, name: string, company: string) {
  return fetch(`${BASE}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      companyName: company,
      email,
      phone: "+221770000000",
      city: "Dakar",
      password: "TestPassword123",
    }),
  });
}

// ── Fixtures DB : batch + pack + lots ──────────────────────────────────────
async function createLotFixtures() {
  const suffix = STAMP.toString().slice(-8);
  const masterCode = `MASTER-TST${suffix}-P01`;
  const activeCode = `ART-TST${suffix}-0001`;
  const inactiveCode = `ART-TST${suffix}-0002`;

  const batch = await prisma.batch.create({
    data: { totalQuantity: 3, packSize: 3, numberOfPacks: 1, status: "printed" },
  });
  const pack = await prisma.pack.create({
    data: {
      batchId: batch.id,
      packNumber: 1,
      quantity: 3,
      price: 5000,
      masterQrCode: masterCode,
      soldTo: "Client test API",
      status: "activated",
    },
  });
  await prisma.preActivatedLot.createMany({
    data: [
      {
        packId: pack.id,
        qrCode: masterCode,
        isMaster: true,
        status: "active",
        productName: `Karité test API ${suffix}`,
        artisanName: "Artisan API",
        activatedAt: new Date(),
      },
      {
        packId: pack.id,
        qrCode: activeCode,
        isMaster: false,
        status: "active",
        productName: `Miel test API ${suffix}`,
        artisanName: "Artisan API",
        activatedAt: new Date(),
      },
      {
        packId: pack.id,
        qrCode: inactiveCode,
        isMaster: false,
        status: "inactive",
      },
    ],
  });
  return { batchId: batch.id, packId: pack.id, masterCode, activeCode, inactiveCode };
}

async function main() {
  console.log("── 1. Faux récepteur webhook (127.0.0.1:2599) ──");
  await startFakeWebhookReceiver();
  check("récepteur webhook écoute", webhookServer !== null);

  console.log("── 2. Sécurité anonyme ──");
  const anonChecks: Array<[string, Response]> = [];
  anonChecks.push(["GET api-keys", await fetch(`${BASE}/api/admin/api-keys`)]);
  anonChecks.push([
    "POST api-keys",
    await fetch(`${BASE}/api/admin/api-keys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Anon" }),
    }),
  ]);
  anonChecks.push(["DELETE api-key", await fetch(`${BASE}/api/admin/api-keys/whatever`, { method: "DELETE" })]);
  anonChecks.push(["GET webhooks", await fetch(`${BASE}/api/admin/webhooks`)]);
  anonChecks.push([
    "POST webhooks",
    await fetch(`${BASE}/api/admin/webhooks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "http://x.test/", events: ["*"] }),
    }),
  ]);
  anonChecks.push([
    "POST webhook test",
    await fetch(`${BASE}/api/admin/webhooks/whatever/test`, { method: "POST" }),
  ]);
  for (const [label, res] of anonChecks) {
    check(`${label} → 401 (anonyme)`, res.status === 401);
  }

  const v1NoKey = await fetch(`${BASE}/api/v1/verify/SOME-CODE`);
  check("/api/v1 sans clé → 401", v1NoKey.status === 401);
  const v1BadKey = await fetch(`${BASE}/api/v1/verify/SOME-CODE`, {
    headers: { authorization: "Bearer sk_live_totementfausse" },
  });
  check("/api/v1 mauvaise clé → 401", v1BadKey.status === 401);

  console.log("── 3. Login + génération de clé ──");
  check("login superadmin OK", await loginSuperadmin());

  // Nettoyage préalable (DB de test uniquement)
  await prisma.apiKey.deleteMany({});
  await prisma.webhook.deleteMany({});

  const getKeys = await req("/api/admin/api-keys");
  check("GET api-keys → 200", getKeys.status === 200);
  const emptyList = (await getKeys.json()) as { keys: unknown[] };
  check("liste initiale vide", Array.isArray(emptyList.keys) && emptyList.keys.length === 0);

  const createRes = await req("/api/admin/api-keys", {
    method: "POST",
    body: JSON.stringify({ name: "Intégration e-commerce" }),
  });
  check("POST api-keys → 201", createRes.status === 201);
  const created = (await createRes.json()) as {
    key: { id: string; key: string; masked: string; active: boolean; name: string };
  };
  const fullKey1 = created.key.key;
  check(
    "clé complète sk_live_… (≥ 50 chars)",
    fullKey1.startsWith("sk_live_") && fullKey1.length >= 50
  );
  check("réponse : active=true + nom", created.key.active && created.key.name === "Intégration e-commerce");

  const listRes = await req("/api/admin/api-keys");
  const list1 = (await listRes.json()) as { keys: Array<{ id: string; masked: string; active: boolean }> };
  check("GET liste : 1 clé", list1.keys.length === 1);
  check(
    "GET liste : masquée (jamais la clé complète)",
    list1.keys[0].masked.includes("•") && !JSON.stringify(list1).includes(fullKey1)
  );

  const dbKey = await prisma.apiKey.findUnique({ where: { id: created.key.id } });
  const expectedHash = crypto.createHash("sha256").update(fullKey1).digest("hex");
  check("DB : keyHash = SHA-256 de la clé", dbKey?.keyHash === expectedHash);
  check("DB : clé complète JAMAIS stockée en clair", dbKey !== null && !dbKey.keyHash.includes(fullKey1.slice(20)));
  check("DB : prefix conservé (20 chars)", dbKey?.prefix === fullKey1.slice(0, 20));

  console.log("── 4. /api/v1/verify (fixtures lots) ──");
  const fx = await createLotFixtures();

  const v1Active = await fetch(`${BASE}/api/v1/verify/${fx.activeCode}`, {
    headers: { authorization: `Bearer ${fullKey1}` },
  });
  check("verify lot actif → 200", v1Active.status === 200);
  const v1ActiveJson = (await v1Active.json()) as {
    valid: boolean;
    status: string;
    checkedBy: string;
    product: { name: string; artisanName: string | null };
    stats: { scans: number };
  };
  check("valid:true + status active", v1ActiveJson.valid === true && v1ActiveJson.status === "active");
  check("checkedBy = nom de la clé", v1ActiveJson.checkedBy === "Intégration e-commerce");
  check("produit renseigné (nom + artisan)", v1ActiveJson.product.name.includes("Miel test API") && v1ActiveJson.product.artisanName === "Artisan API");

  const dbKeyAfter = await prisma.apiKey.findUnique({ where: { id: created.key.id } });
  check("lastUsedAt mis à jour en DB", dbKeyAfter?.lastUsedAt !== null && dbKeyAfter?.lastUsedAt !== undefined);

  const v1Header = await fetch(`${BASE}/api/v1/verify/${fx.activeCode}`, {
    headers: { "x-api-key": fullKey1 },
  });
  check("X-API-Key fonctionne aussi → 200", v1Header.status === 200);

  const v1Unknown = await fetch(`${BASE}/api/v1/verify/ART-INCONNU-404`, {
    headers: { authorization: `Bearer ${fullKey1}` },
  });
  check("code inconnu → 404 unknown_code", v1Unknown.status === 404);
  const unknownJson = (await v1Unknown.json()) as { valid: boolean; status: string };
  check("corps : valid:false + status unknown_code", unknownJson.valid === false && unknownJson.status === "unknown_code");

  const v1Inactive = await fetch(`${BASE}/api/v1/verify/${fx.inactiveCode}`, {
    headers: { authorization: `Bearer ${fullKey1}` },
  });
  check("lot inactif → 200 valid:false inactive", v1Inactive.status === 200);
  const inactiveJson = (await v1Inactive.json()) as { valid: boolean; status: string };
  check("corps inactif correct", inactiveJson.valid === false && inactiveJson.status === "inactive");

  console.log("── 5. 2e clé + révocation ──");
  const create2 = await req("/api/admin/api-keys", {
    method: "POST",
    body: JSON.stringify({ name: "App partenaire" }),
  });
  check("2e clé → 201", create2.status === 201);
  const created2 = (await create2.json()) as { key: { id: string; key: string } };
  const fullKey2 = created2.key.key;

  const list2 = (await (await req("/api/admin/api-keys")).json()) as { keys: unknown[] };
  check("GET liste : 2 clés", list2.keys.length === 2);

  const revoke1 = await req(`/api/admin/api-keys/${created.key.id}`, { method: "DELETE" });
  check("DELETE clé 1 → 200", revoke1.status === 200);
  const revokedInDb = await prisma.apiKey.findUnique({ where: { id: created.key.id } });
  check("DB : active=false + revokedAt", revokedInDb?.active === false && revokedInDb?.revokedAt !== null);

  const v1Revoked = await fetch(`${BASE}/api/v1/verify/${fx.activeCode}`, {
    headers: { authorization: `Bearer ${fullKey1}` },
  });
  check("clé révoquée → 403 sur /api/v1", v1Revoked.status === 403);
  const v1Key2 = await fetch(`${BASE}/api/v1/verify/${fx.activeCode}`, {
    headers: { authorization: `Bearer ${fullKey2}` },
  });
  check("clé 2 (non révoquée) → 200", v1Key2.status === 200);

  const delUnknown = await req("/api/admin/api-keys/inexistant", { method: "DELETE" });
  check("DELETE clé inconnue → 404", delUnknown.status === 404);

  console.log("── 6. Validation zod ──");
  const zodName = await req("/api/admin/api-keys", {
    method: "POST",
    body: JSON.stringify({ name: "x" }),
  });
  check("nom 1 char → 400", zodName.status === 400);
  const zodUrl = await req("/api/admin/webhooks", {
    method: "POST",
    body: JSON.stringify({ url: "pas-une-url", events: ["scan.verified"] }),
  });
  check("URL invalide → 400", zodUrl.status === 400);
  const zodEvents = await req("/api/admin/webhooks", {
    method: "POST",
    body: JSON.stringify({ url: "http://127.0.0.1:2599/zod", events: [] }),
  });
  check("événements vides → 400", zodEvents.status === 400);
  const zodBadEvent = await req("/api/admin/webhooks", {
    method: "POST",
    body: JSON.stringify({ url: "http://127.0.0.1:2599/zod", events: ["event.fake"] }),
  });
  check("événement inconnu → 400", zodBadEvent.status === 400);

  console.log("── 7. Webhook : création + test signé ──");
  const whCreate = await req("/api/admin/webhooks", {
    method: "POST",
    body: JSON.stringify({
      url: `http://${WEBHOOK_HOST}:${WEBHOOK_PORT}/hook`,
      events: ["scan.verified", "user.registered"],
    }),
  });
  check("POST webhooks → 201", whCreate.status === 201);
  const whJson = (await whCreate.json()) as {
    webhook: { id: string; url: string; events: string[]; secretMasked: string; active: boolean };
    secret: string;
  };
  const whId = whJson.webhook.id;
  const whSecret = whJson.secret;
  check("secret whsec_… retourné une fois", whSecret.startsWith("whsec_") && whSecret.length >= 30);
  check("GET suivant : secret masqué", whJson.webhook.secretMasked.includes("•"));
  check("événements stockés (CSV)", whJson.webhook.events.includes("scan.verified") && whJson.webhook.events.includes("user.registered"));

  const whTest = await req(`/api/admin/webhooks/${whId}/test`, { method: "POST" });
  check("POST /test → 200 ok:true", whTest.status === 200);
  const whTestJson = (await whTest.json()) as { ok: boolean; status: number | null };
  check("livraison réelle au récepteur", whTestJson.ok === true && whTestJson.status === 200);

  const ping = received.find((r) => r.event === "ping");
  check("POST ping capturé", ping !== undefined);
  check("signature ping = HMAC(secret, corps)", ping !== undefined && verifySignature(whSecret, ping.raw, ping.signature));

  console.log("── 8. register → webhook user.registered ──");
  const emailA = `apitest-a-${STAMP}@verifscan.com`;
  const regA = await registerAccount(emailA, "Test API A", "Société A");
  check("register A → 201", regA.status === 201);

  const regPost = await waitForPost("user.registered", 12_000);
  check("webhook user.registered reçu", regPost !== null);
  if (regPost) {
    const parsed = JSON.parse(regPost.raw) as { data: { email: string } };
    check("payload contient l'email de l'inscrit", parsed.data.email === emailA);
    check("signature user.registered valide", verifySignature(whSecret, regPost.raw, regPost.signature));
  }

  console.log("── 9. Désactivation + régénération du secret ──");
  const whOff = await req(`/api/admin/webhooks/${whId}`, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
  });
  check("PATCH active:false → 200", whOff.status === 200);
  const countBefore = received.filter((r) => r.event === "user.registered").length;

  const emailB = `apitest-b-${STAMP}@verifscan.com`;
  const regB = await registerAccount(emailB, "Test API B", "Société B");
  check("register B → 201 (webhook désactivé)", regB.status === 201);
  await new Promise((r) => setTimeout(r, 4000));
  const countAfter = received.filter((r) => r.event === "user.registered").length;
  check("AUCUNE livraison pendant la désactivation", countAfter === countBefore);

  const whOn = await req(`/api/admin/webhooks/${whId}`, {
    method: "PATCH",
    body: JSON.stringify({ active: true, regenerateSecret: true }),
  });
  check("PATCH active:true + regenerateSecret → 200", whOn.status === 200);
  const whOnJson = (await whOn.json()) as { secret?: string };
  check("NOUVEAU secret retourné (≠ ancien)", typeof whOnJson.secret === "string" && whOnJson.secret !== whSecret);

  const whTest2 = await req(`/api/admin/webhooks/${whId}/test`, { method: "POST" });
  const whTest2Json = (await whTest2.json()) as { ok: boolean };
  check("test après rotation : livraison OK", whTest2Json.ok === true);
  const lastPing = [...received].reverse().find((r) => r.event === "ping");
  check(
    "signature valide avec le NOUVEAU secret",
    lastPing !== undefined && typeof whOnJson.secret === "string" && verifySignature(whOnJson.secret, lastPing.raw, lastPing.signature)
  );

  console.log("── 10. Suppression du webhook ──");
  const whDel = await req(`/api/admin/webhooks/${whId}`, { method: "DELETE" });
  check("DELETE webhook → 200", whDel.status === 200);
  const whTest3 = await req(`/api/admin/webhooks/${whId}/test`, { method: "POST" });
  check("test sur webhook supprimé → 404", whTest3.status === 404);
  const whDel2 = await req(`/api/admin/webhooks/${whId}`, { method: "DELETE" });
  check("re-DELETE webhook → 404", whDel2.status === 404);

  console.log("── 11. UI Playwright — section API & Intégrations ──");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(
    jar
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=");
        return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
      })
  );
  const page = await ctx.newPage();
  await page.goto(`${BASE}/superadmin`, { waitUntil: "networkidle" });

  const navParams = page.locator("text=Paramètres").first();
  await navParams.waitFor({ state: "visible", timeout: 20_000 });
  await navParams.click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 20_000 });
  check("Paramètres ouverts (section Général)", true);

  const navApi = page.locator("button", { hasText: "API & Intégrations" }).first();
  await navApi.click();
  await page.waitForSelector('[data-testid="api-keys-table"]', { timeout: 15_000 });
  check("section API affichée (table clés)", true);

  // Génération d'une clé via l'UI
  await page.fill('[data-testid="api-key-name"]', "Clé UI Playwright");
  await page.click('[data-testid="api-generate"]');
  await page.waitForSelector('[data-testid="api-key-result"]', { timeout: 10_000 });
  const uiKeyValue = await page.textContent('[data-testid="api-key-value"]');
  check(
    "panneau une-seule-fois avec clé sk_live_…",
    uiKeyValue !== null && uiKeyValue.includes("sk_live_") && uiKeyValue.length >= 50
  );
  await page.click('[data-testid="api-key-result-close"]');
  const resultGone = (await page.$('[data-testid="api-key-result"]')) === null;
  check("panneau masqué après « J'ai copié »", resultGone);

  // La clé UI existe côté API
  const uiList = (await (await req("/api/admin/api-keys")).json()) as {
    keys: Array<{ id: string; name: string; active: boolean; masked: string }>;
  };
  const uiKey = uiList.keys.find((k) => k.name === "Clé UI Playwright");
  check("clé UI persistée en DB (liste)", uiKey !== undefined && uiKey.active);
  check("clé UI masquée dans la liste", uiKey !== undefined && uiKey.masked.includes("•"));

  // Révocation en 2 temps (armée puis confirmation)
  if (uiKey) {
    await page.click(`[data-testid="api-revoke-${uiKey.id}"]`);
    await page.click(`[data-testid="api-revoke-${uiKey.id}"]`);
    await page.waitForTimeout(800);
    const uiList2 = (await (await req("/api/admin/api-keys")).json()) as {
      keys: Array<{ id: string; active: boolean }>;
    };
    check("révocation via UI effective", uiList2.keys.find((k) => k.id === uiKey.id)?.active === false);
  }

  // Webhook via l'UI : formulaire, création, secret une-seule-fois, test
  await page.click('[data-testid="webhook-toggle-form"]');
  await page.fill('[data-testid="webhook-url"]', `http://${WEBHOOK_HOST}:${WEBHOOK_PORT}/ui-hook`);
  const evBox = page.locator('[data-testid="webhook-event-scan.verified"]');
  const alreadyChecked = await evBox.getAttribute("data-state");
  if (alreadyChecked !== "checked") await evBox.click();
  await page.click('[data-testid="webhook-create"]');
  await page.waitForSelector('[data-testid="webhook-secret-result"]', { timeout: 10_000 });
  const secretShown = await page.textContent('[data-testid="webhook-secret-value"]');
  check(
    "secret webhook affiché une seule fois via l'UI",
    secretShown !== null && secretShown.includes("whsec_")
  );

  const whListUi = (await (await req("/api/admin/webhooks")).json()) as {
    webhooks: Array<{ id: string; url: string; active: boolean }>;
  };
  const uiWebhook = whListUi.webhooks.find((w) => w.url.includes("/ui-hook"));
  check("webhook UI persisté", uiWebhook !== undefined && uiWebhook.active);

  if (uiWebhook) {
    const closeBtn = page.locator("button", { hasText: "J'ai copié — masquer" }).last();
    await closeBtn.click().catch(() => {});
    await page.click(`[data-testid="webhook-test-${uiWebhook.id}"]`);
    // Le résultat passe d'abord par « envoi… » → attendre l'état final
    await page.waitForFunction(
      (id) => {
        const el = document.querySelector(`[data-testid="webhook-test-result-${id}"]`);
        return el !== null && !el.textContent?.includes("envoi");
      },
      uiWebhook.id,
      { timeout: 10_000 }
    );
    const testTxt = await page.textContent(`[data-testid="webhook-test-result-${uiWebhook.id}"]`);
    check("bouton Tester → « livré » affiché", testTxt !== null && testTxt.includes("livré"));
  }

  await page.screenshot({ path: "shots/api-keys-section.png", fullPage: false });
  await browser.close();
  check("capture shots/api-keys-section.png", true);

  console.log("── 12. Nettoyage ──");
  await prisma.apiKey.deleteMany({});
  await prisma.webhook.deleteMany({});
  const testEmails = [`apitest-a-${STAMP}@verifscan.com`, `apitest-b-${STAMP}@verifscan.com`];
  const testUsers = await prisma.user.findMany({ where: { email: { in: testEmails } } });
  for (const u of testUsers) {
    await prisma.notification.deleteMany({ where: { data: { contains: u.id } } });
    await prisma.emailLog.deleteMany({ where: { to: u.email } });
    await prisma.user.delete({ where: { id: u.id } });
  }
  await prisma.preActivatedLot.deleteMany({ where: { packId: fx.packId } });
  await prisma.pack.deleteMany({ where: { id: fx.packId } });
  await prisma.batch.deleteMany({ where: { id: fx.batchId } });
  await prisma.auditLog.deleteMany({ where: { action: { in: ["CREATE_API_KEY", "REVOKE_API_KEY", "CREATE_WEBHOOK", "UPDATE_WEBHOOK", "DELETE_WEBHOOK"] } } });
  check("DB nettoyée (clés, webhooks, users test, fixtures)", true);

  console.log(failures === 0 ? "\n✅ TOUS LES TESTS PASSENT" : `\n✗ ${failures} test(s) en échec`);
  await prisma.$disconnect();
  webhookServer?.close();
  process.exit(failures > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error("Test crashé :", error);
  await prisma.$disconnect().catch(() => undefined);
  webhookServer?.close();
  process.exit(1);
});
