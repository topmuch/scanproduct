/**
 * Test E2E — Correctif SMTP « wrong version number » (incompatibilité SSL/STARTTLS).
 *
 * Demande utilisateur : « l'email ne fonctionne pas
 *   4892028DD97F0000:error:0A00010B:SSL routines:ssl3_get_record:wrong
 *   version number:...ssl3_record.c:350: »
 *
 * Cause racine :
 *   - l'UI forçait secure=true par défaut (toggleOn retourne true quand le
 *     réglage n'a jamais été enregistré) → TLS implicite envoyé sur un port
 *     587/STARTTLS → OpenSSL « wrong version number » ;
 *   - aucun fallback : le mauvais mode échouait sans tentative opposée.
 *
 * Correctifs testés :
 *   1. verifySmtpConnection : retry automatique avec le mode opposé +
 *      `secureUsed` renvoyé à l'UI (auto-correction du commutateur) ;
 *   2. sendEmail : même fallback (mémoire du mode qui marche) ;
 *   3. friendlySmtpError : erreurs OpenSSL/SMTP traduites en messages
 *      actionnables en français ;
 *   4. UI : secureOn() auto-détecte selon le port (465 = SSL, 587 = STARTTLS),
 *      le champ Port ajuste le commutateur, le test applique le mode détecté.
 *
 * Scénario :
 *   1. Faux SMTP EN CLAIR sur 127.0.0.1:2587 (capture DATA) — un TLS client
 *      qui s'y connecte produit le VRAI « wrong version number » OpenSSL
 *   2. Faux SMTP TLS IMPLICITE (self-signed) sur 127.0.0.1:2465
 *   3. Sécurité : test-smtp sans session → refusé
 *   4. Test ad hoc secure=TRUE sur port EN CLAIR → succès + secureUsed=FALSE
 *   5. Test ad hoc secure=FALSE sur port TLS implicite → succès + secureUsed=TRUE
 *   6. Config effective enregistrée avec le MAUVAIS mode (smtpSecure=true,
 *      port 2587) → POST test-smtp Mode B → sendEmail bascule → EmailLog "sent"
 *   7. Erreurs traduites : port mort → « Connexion refusée » ; mauvais mot de
 *      passe (535) → « Authentification refusée »
 *   8. UI Playwright : taper 465 → commutateur ON ; taper 587 → OFF ;
 *      commutateur forcé ON + test sur port clair → succès + commutateur
 *      auto-corrigé OFF + mention « corrigé automatiquement »
 *   9. Nettoyage : settings vidés, EmailLog de test supprimés
 *
 * Sorties : shots/smtp-tls-*.png + exit 1 si un check échoue.
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-smtp-tls-fix.ts
 */
import { chromium } from "playwright";
import net from "net";
import tls from "tls";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const PLAIN_PORT = 2587; // SMTP en clair (comme 587 sans STARTTLS)
const TLS_PORT = 2465; // SMTP TLS implicite (comme 465)
const DEAD_PORT = 2599; // rien n'écoute
const RECIPIENT = "smtp-fix-test@verifscan.com";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

// ── Faux serveurs SMTP (EN CLAIR + TLS implicite) ────────────────────────────
interface CapturedMail {
  from: string;
  to: string;
  data: string;
  viaTls: boolean;
}
const captured: CapturedMail[] = [];
let plainServer: net.Server | null = null;
let tlsServer: tls.Server | null = null;

function smtpHandler(socket: net.Socket | tls.TLSSocket, viaTls: boolean) {
  let inData = false;
  let current: Partial<CapturedMail> = {};
  let buffer = "";

  socket.write("220 test.local ESMTP VerifScanTlsTest\r\n");

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let idx: number;
    while ((idx = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      if (inData) {
        if (line === ".") {
          inData = false;
          captured.push({
            from: current.from ?? "",
            to: current.to ?? "",
            data: current.data ?? "",
            viaTls,
          });
          current = {};
          socket.write("250 OK: queued\r\n");
        } else {
          current.data = (current.data ?? "") + line + "\n";
        }
        continue;
      }

      const cmd = line.toUpperCase();
      if (cmd.startsWith("EHLO")) {
        // AUTH PLAIN annoncé → nodemailer enverra AUTH (test 535 possible).
        // PIÈGE SMTP : toutes les lignes sauf la DERNIÈRE doivent utiliser
        // « 250- » (tiret) — une ligne « 250 » (espace) au milieu termine la
        // réponse et désynchronise tout l'échange (Message failed: 354).
        socket.write(
          "250-test.local\r\n250-SIZE 35882577\r\n250 AUTH PLAIN\r\n",
        );
      } else if (cmd.startsWith("AUTH PLAIN")) {
        const b64 = line.slice(10).trim();
        let decoded = "";
        try {
          decoded = Buffer.from(b64, "base64").toString("utf8");
        } catch {
          decoded = "";
        }
        if (decoded.includes("rejectme")) {
          socket.write("535 5.7.8 Authentication credentials invalid\r\n");
        } else {
          socket.write("235 2.7.0 Authentication successful\r\n");
        }
      } else if (cmd.startsWith("AUTH")) {
        socket.write("535 5.7.8 Authentication credentials invalid\r\n");
      } else if (cmd.startsWith("HELO")) {
        socket.write("250 test.local\r\n");
      } else if (cmd.startsWith("MAIL FROM:")) {
        current.from = line.slice(10).trim();
        socket.write("250 OK\r\n");
      } else if (cmd.startsWith("RCPT TO:")) {
        current.to = line.slice(8).trim();
        socket.write("250 OK\r\n");
      } else if (cmd.startsWith("DATA")) {
        inData = true;
        current.data = "";
        socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
      } else if (cmd.startsWith("QUIT")) {
        socket.write("221 BYE\r\n");
        socket.end();
      } else {
        socket.write("250 OK\r\n");
      }
    }
  });

  socket.on("error", () => {
    /* client parti — ignorer */
  });
}

function startPlainSmtp(): Promise<void> {
  return new Promise((resolve) => {
    plainServer = net.createServer((socket) => smtpHandler(socket, false));
    plainServer.listen(PLAIN_PORT, "127.0.0.1", () => resolve());
  });
}

const TLS_DIR = "/home/z/my-project/scripts/.tls-test";

function ensureSelfSignedCert(): { key: Buffer; cert: Buffer } {
  fs.mkdirSync(TLS_DIR, { recursive: true });
  const keyPath = path.join(TLS_DIR, "key.pem");
  const certPath = path.join(TLS_DIR, "cert.pem");
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -keyout ${keyPath} -out ${certPath} -subj "/CN=localhost" -days 2`,
      { stdio: "ignore" },
    );
  }
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

function startTlsSmtp(): Promise<void> {
  return new Promise((resolve) => {
    const { key, cert } = ensureSelfSignedCert();
    tlsServer = tls.createServer({ key, cert }, (socket) =>
      smtpHandler(socket, true),
    );
    // CRITIQUE : un client en clair qui se connecte fait échouer le handshake
    // TLS côté serveur → sinon le process peut planter sur l'erreur.
    tlsServer.on("tlsClientError", () => {
      /* client non-TLS — attendu dans les tests de bascule */
    });
    tlsServer.listen(TLS_PORT, "127.0.0.1", () => resolve());
  });
}

// ── Helpers HTTP (cookie jar + login) ────────────────────────────────────────
let jar = "";
function captureCookies(res: Response) {
  const setCookies = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [];
  for (const c of setCookies) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    jar = jar
      .split("; ")
      .filter((p) => p && !p.startsWith(`${name}=`))
      .concat(`${name}=${value}`)
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
      "user-agent": "test-smtp-tls-fix",
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

function waitFor<T>(
  poll: () => Promise<T | null>,
  timeoutMs = 20_000,
  stepMs = 400,
): Promise<T | null> {
  return new Promise(async (resolve) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const r = await poll();
        if (r !== null && r !== undefined) return resolve(r);
      } catch {
        /* retry */
      }
      await new Promise((s) => setTimeout(s, stepMs));
    }
    resolve(null);
  });
}

async function postTestSmtp(body: Record<string, unknown>) {
  const res = await req("/api/admin/test-smtp", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

// ── Test principal ───────────────────────────────────────────────────────────
async function main() {
  console.log("── 1. Faux SMTP EN CLAIR (2587) + TLS implicite (2465) ──");
  await startPlainSmtp();
  await startTlsSmtp();
  check(`SMTP clair écoute sur :${PLAIN_PORT}`, plainServer !== null);
  check(`SMTP TLS implicite écoute sur :${TLS_PORT}`, tlsServer !== null);

  console.log("── 2. Sécurité : POST test-smtp sans session ──");
  const anon = await fetch(`${BASE}/api/admin/test-smtp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ host: "127.0.0.1", port: 2587 }),
  });
  check("POST test-smtp anonyme → refusé (401/403)", anon.status === 401 || anon.status === 403);

  console.log("── 3. Login superadmin ──");
  check("login superadmin OK", await loginSuperadmin());

  console.log("── 4. Ad hoc secure=TRUE sur port EN CLAIR (scénario utilisateur) ──");
  const t0 = Date.now();
  const resA = await postTestSmtp({
    host: "127.0.0.1",
    port: PLAIN_PORT,
    user: "u1@test.local",
    pass: "secret-a",
    secure: true,
    from: "VerifScan Test <u1@test.local>",
    to: RECIPIENT,
  });
  check("Test A → success:true malgré le mauvais mode", resA.success === true);
  check(
    "Test A → secureUsed:false (bascule SSL→STARTTLS)",
    resA.secureUsed === false,
  );
  const msgA = String(resA.message ?? "");
  check(
    "Test A → message mentionne la correction automatique",
    msgA.includes("corrigé automatiquement") && msgA.includes("STARTTLS"),
  );
  console.log(`     (${((Date.now() - t0) / 1000).toFixed(1)}s — retry OpenSSL réel « wrong version number »)`);

  console.log("── 5. Ad hoc secure=FALSE sur port TLS IMPLICITE (symétrique) ──");
  const t1 = Date.now();
  const resB = await postTestSmtp({
    host: "127.0.0.1",
    port: TLS_PORT,
    user: "u2@test.local",
    pass: "secret-b",
    secure: false,
    from: "VerifScan Test <u2@test.local>",
    to: RECIPIENT,
  });
  check("Test B → success:true malgré le mauvais mode", resB.success === true);
  check(
    "Test B → secureUsed:true (bascule STARTTLS→SSL)",
    resB.secureUsed === true,
  );
  console.log(`     (${((Date.now() - t1) / 1000).toFixed(1)}s — greeting timeout puis TLS implicite)`);

  console.log("── 6. Config effective avec le MAUVAIS mode → sendEmail bascule ──");
  const putRes = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      smtpHost: "127.0.0.1",
      smtpPort: String(PLAIN_PORT),
      smtpUser: "verifscan@test.local",
      smtpPass: "test-secret-123",
      smtpSecure: "true", // FAUX volontairement — doit être corrigé
      smtpFrom: "VerifScan Test <no-reply@test.local>",
      notifEmailRecipient: RECIPIENT,
    }),
  });
  check("PUT settings (smtpSecure=true, port 2587) → 200", putRes.status === 200);
  const beforeC = captured.length;

  const resC = await postTestSmtp({});
  check("Mode B (config effective) → success:true", resC.success === true);
  check("Mode B → status:sent", resC.status === "sent");

  const sentLog = await waitFor(async () => {
    const log = await prisma.emailLog.findFirst({
      where: { to: RECIPIENT, status: "sent" },
      orderBy: { createdAt: "desc" },
    });
    return log ?? null;
  });
  check("EmailLog status=sent en DB", sentLog !== null);

  // NB : le sujet est encodé RFC 2047 par nodemailer → on ne cherche PAS
  // « Test SMTP » dans le DATA brut ; on identifie le message par destinataire
  // d'enveloppe (brut) + serveur (clair) parmi les messages reçus APRÈS le PUT.
  const received = await waitFor(async () => {
    const m = captured
      .slice(beforeC)
      .find((x) => x.to.includes(RECIPIENT) && !x.viaTls);
    return m ?? null;
  });
  check("Le faux SMTP en clair a reçu le message (après bascule)", received !== null);

  console.log("── 7. Erreurs traduites en français actionnable ──");
  const resDead = await postTestSmtp({
    host: "127.0.0.1",
    port: DEAD_PORT,
    user: "u3@test.local",
    pass: "x",
    secure: false,
  });
  check("Port mort → success:false", resDead.success === false);
  const errDead = String(resDead.error ?? "");
  check(
    "Port mort → « Connexion refusée » (message traduit)",
    errDead.includes("Connexion refusée") && !errDead.includes("ECONNREFUSED ("),
    );
  console.log(`     → ${errDead.slice(0, 100)}…`);

  const resAuth = await postTestSmtp({
    host: "127.0.0.1",
    port: PLAIN_PORT,
    user: "rejectme@test.local",
    pass: "wrong",
    secure: false,
  });
  check("Mauvais identifiants → success:false", resAuth.success === false);
  const errAuth = String(resAuth.error ?? "");
  check(
    "535 → « Authentification refusée » (message traduit)",
    errAuth.includes("Authentification refusée"),
  );
  console.log(`     → ${errAuth.slice(0, 100)}…`);

  await runUiTests();

  console.log("── 9. Nettoyage ──");
  const cleanPut = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPass: "",
      smtpSecure: "false",
      smtpFrom: "",
      notifEmailRecipient: "",
    }),
  });
  check("Settings SMTP réinitialisés (vides)", cleanPut.status === 200);

  await prisma.emailLog.deleteMany({ where: { to: RECIPIENT } });
  check("EmailLog de test supprimés", true);

  plainServer?.close();
  tlsServer?.close();
  await prisma.$disconnect();

  console.log(
    failures === 0
      ? "\n✅ TOUS LES CHECKS SONT PASSÉS"
      : `\n❌ ${failures} CHECK(S) EN ÉCHEC`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

// ── UI Playwright (partie 8) ─────────────────────────────────────────────────
async function runUiTests() {
  console.log("── 8. UI Playwright — commutateur auto-ajusté + test corrigé ──");
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

  const navParams = page.locator("text=Paramètres").first();
  await navParams.waitFor({ state: "visible", timeout: 20_000 });
  await navParams.click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 20_000 });

  const emailTab = page.locator("text=Email & Notifications").first();
  await emailTab.click();
  await page.waitForSelector("text=Configuration SMTP", { timeout: 20_000 });

  // Attendre que le GET ait rempli les champs contrôlés (race connue)
  await page.waitForFunction(
    () =>
      (document.querySelector('[data-testid="email-smtp-host"]') as HTMLInputElement)
        ?.value === "127.0.0.1",
    { timeout: 15_000 },
  );

  const switchLoc = page.locator('[aria-label="Chiffrement SSL direct"]');
  const switchState = () => switchLoc.getAttribute("data-state");

  // Taper 465 → commutateur auto-ON (SSL direct)
  await page.getByTestId("email-smtp-port").fill("465");
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Chiffrement SSL direct"]')
        ?.getAttribute("data-state") === "checked",
    { timeout: 5_000 },
  );
  check("Port 465 → commutateur SSL auto-activé", (await switchState()) === "checked");

  // Taper 587 → commutateur auto-OFF (STARTTLS)
  await page.getByTestId("email-smtp-port").fill("587");
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Chiffrement SSL direct"]')
        ?.getAttribute("data-state") === "unchecked",
    { timeout: 5_000 },
  );
  check("Port 587 → commutateur SSL auto-désactivé", (await switchState()) === "unchecked");

  await page.screenshot({ path: "shots/smtp-tls-autoswitch.png" });

  // Scénario utilisateur : commutateur forcé ON + port en clair → le test
  // doit réussir ET corriger le commutateur automatiquement
  await page.getByTestId("email-smtp-port").fill(String(PLAIN_PORT));
  await switchLoc.click(); // force ON (mauvais mode)
  check("Commutateur forcé ON (état cassé de l'utilisateur)", (await switchState()) === "checked");

  await page.getByTestId("email-test").click();
  const okMsg = page.getByTestId("smtp-test-ok");
  await okMsg.waitFor({ state: "visible", timeout: 30_000 });
  const okText = (await okMsg.textContent()) ?? "";
  check(
    "Test UI → succès malgré le mauvais mode",
    okText.includes("envoyé") || okText.includes("validée"),
  );
  check(
    "Test UI → mention « corrigé automatiquement : STARTTLS »",
    okText.includes("corrigé automatiquement") && okText.includes("STARTTLS"),
  );
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Chiffrement SSL direct"]')
        ?.getAttribute("data-state") === "unchecked",
    { timeout: 5_000 },
  );
  check("Test UI → commutateur auto-corrigé OFF dans le formulaire", (await switchState()) === "unchecked");
  await page.screenshot({ path: "shots/smtp-tls-test-ok.png" });

  await browser.close();
}

main().catch(async (err) => {
  console.error("Test crashé :", err);
  plainServer?.close();
  tlsServer?.close();
  await prisma.$disconnect();
  process.exit(1);
});
