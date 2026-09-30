/**
 * Test E2E — Notifications SuperAdmin + Email de validation (demande
 * utilisateur : « j'ai créé un compte et je me suis connecté, en sachant que
 * les notifications nouvel inscrit sont activées et je n'ai pas reçu de
 * notification, ni la validation de l'email de l'inscrit — pourquoi toutes
 * les notifications dans paramètres superadmin ne marchent pas »).
 *
 * Cause racine corrigée par cette feature :
 *   - /api/register n'envoyait NI notification admin, NI email de validation
 *   - la section Email & Notifications était un mock (jamais sauvegardée)
 *   - sendEmail ne lisait que les env vars (SMTP vide en dev → tout skipped)
 *
 * Scénario :
 *   1. Faux serveur SMTP local (127.0.0.1:2525) qui CAPTURE les messages
 *   2. Sécurité : PUT settings (clés email) sans session → 401
 *   3. Login superadmin → PUT SMTP + toggles + destinataire → vérif DB
 *   4. Zod : port 99999 → 400, destinataire invalide → 400
 *   5. POST /api/register → 201 → poll : Notification new_user pour le
 *      superadmin + EmailLog + le faux SMTP a reçu l'email notif admin
 *      ET l'email de bienvenue/validation de l'inscrit
 *   6. Lien de validation extrait du message capturé →
 *      GET /verification-email?token= → emailVerified en DB → rejeu idempotent
 *      + token invalide → page erreur
 *   7. POST /api/admin/test-smtp ad hoc (valeurs du formulaire) → succès réel
 *   8. Toggle notifSignup=false → register → PAS d'email notif admin
 *      (bienvenue toujours envoyée) → toggle réactivé
 *   9. UI Playwright : cloche admin (badge réel, item « Nouvelle
 *      inscription », tout marquer lu) + Paramètres → Email (champs
 *      pré-remplis, test connexion réel, enregistrer, persistance reload)
 *  10. Nettoyage : settings SMTP vidés, utilisateurs de test supprimés,
 *      notifications de test nettoyées
 *
 * Sorties : shots/notif-*.png + exit 1 si un check échoue.
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-notifications-email.ts
 */
import { chromium } from "playwright";
import net from "net";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const SMTP_PORT = 2525;
const ADMIN_RECIPIENT = "admin-notif-test@verifscan.com";
const STAMP = Date.now();

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

// ── Faux serveur SMTP (capture DATA) ───────────────────────────────────────
interface CapturedMail {
  from: string;
  to: string;
  data: string;
}
const captured: CapturedMail[] = [];
let smtpServer: net.Server | null = null;

function startFakeSmtp(): Promise<void> {
  return new Promise((resolve) => {
    smtpServer = net.createServer((socket) => {
      let inData = false;
      let current: Partial<CapturedMail> = {};
      let buffer = "";

      socket.write("220 test.local ESMTP VerifScanTest\r\n");

      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        let idx: number;
        // Traitement ligne par ligne (terminées par \r\n)
        while ((idx = buffer.indexOf("\r\n")) !== -1) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          if (inData) {
            if (line === ".") {
              // fin du DATA
              inData = false;
              captured.push({
                from: current.from ?? "",
                to: current.to ?? "",
                data: current.data ?? "",
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
            // Pas de STARTTLS/PIPELINING/AUTH → échange en clair simple
            socket.write("250-test.local\r\n250 SIZE 35882577\r\n");
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
          } else if (cmd.startsWith("RSET") || cmd.startsWith("NOOP")) {
            socket.write("250 OK\r\n");
          } else {
            socket.write("250 OK\r\n");
          }
        }
      });

      socket.on("error", () => {
        /* client gone — ignore */
      });
    });
    smtpServer.listen(SMTP_PORT, "127.0.0.1", () => resolve());
  });
}

function waitFor<T>(
  poll: () => Promise<T | null>,
  timeoutMs = 15_000,
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

/**
 * Décode les mots encodés RFC 2047 (=?UTF-8?Q?…?= / =?UTF-8?B?…?=) — nodemailer
 * encode les sujets non-ASCII (ex. « VerifScan — Nouvelle inscription »).
 */
function decodeRfc2047(input: string): string {
  return input.replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi, (_m, enc: string, val: string) => {
    if (enc.toUpperCase() === "B") {
      return Buffer.from(val, "base64").toString("utf8");
    }
    // Q-encoding : « _ » = espace, =XX = octet hex (multi-octets UTF-8)
    const q = val.replace(/_/g, " ");
    const bytes: number[] = [];
    for (let i = 0; i < q.length; i++) {
      if (q[i] === "=" && i + 2 < q.length + 1 && /^[0-9A-F]{2}$/i.test(q.substr(i + 1, 2))) {
        bytes.push(parseInt(q.substr(i + 1, 2), 16));
        i += 2;
      } else {
        bytes.push(q.charCodeAt(i));
      }
    }
    return Buffer.from(bytes).toString("utf8");
  });
}

/**
 * Reconstitue le corps d'un message quoted-printable : les soft line breaks
 * « =\r\n » coupent les longues lignes (URLs comprises) et doivent être
 * retirés avant d'extraire le lien de validation.
 */
function unwrapQuotedPrintable(data: string): string {
  return data.replace(/=\r?\n/g, "");
}

/** Sujet décodé (RFC 2047, gère le repliage multi-lignes des sujets longs). */
function extractSubject(data: string): string {
  const lines = data.split(/\r?\n/);
  let collecting = false;
  let raw = "";
  for (const line of lines) {
    if (/^Subject: /i.test(line)) {
      collecting = true;
      raw = line.slice(9);
      continue;
    }
    if (collecting) {
      if (/^[ \t]/.test(line) && line.trim() !== "") {
        raw += " " + line.trim();
        continue;
      }
      break; // fin du header Subject
    }
  }
  // RFC 2047 : l'espace entre deux encoded-words adjacents est ignoré
  // (« valide » + « z votre email » → « validez votre email »).
  return collecting
    ? decodeRfc2047(raw.trim().replace(/(\?=)[ \t]+(=\?)/g, "$1$2"))
    : "";
}

/** Extrait l'URL de validation (dernier href contenant verification-email). */
function extractVerifyUrl(data: string): string | null {
  // Soft breaks retirés + « = » ré-encodé =3D remis à l'identique dans l'URL
  const unwrapped = unwrapQuotedPrintable(data).replace(/=3D/gi, "=");
  const matches = unwrapped.match(/https?:\/\/[^\s"'<>]+verification-email\?token=[^\s"'<>]+/g);
  return matches && matches.length > 0 ? matches[matches.length - 1] : null;
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
      "user-agent": "test-notifications-email",
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
  const res = await fetch(`${BASE}/api/register`, {
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
  return res;
}

async function main() {
  console.log("── 1. Faux serveur SMTP local (127.0.0.1:2525) ──");
  await startFakeSmtp();
  check(`SMTP fake écoute sur :${SMTP_PORT}`, smtpServer !== null);

  console.log("── 2. Sécurité : PUT settings sans session → 401 ──");
  const anonPut = await fetch(`${BASE}/api/admin/settings`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ smtpHost: "evil.local" }),
  });
  check("PUT settings (clé smtp) sans session → 401", anonPut.status === 401);

  console.log("── 3. Login superadmin + configuration SMTP/toggles réelle ──");
  check("login superadmin OK", await loginSuperadmin());

  const putRes = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      smtpHost: "127.0.0.1",
      smtpPort: String(SMTP_PORT),
      smtpUser: "verifscan@test.local",
      smtpPass: "test-secret-123",
      smtpSecure: "false",
      smtpFrom: "VerifScan Test <no-reply@test.local>",
      notifSignup: "true",
      notifPayment: "true",
      notifTicket: "true",
      notifSecurity: "true",
      notifQuota: "true",
      notifEmailRecipient: ADMIN_RECIPIENT,
    }),
  });
  check("PUT settings SMTP+toggles → 200", putRes.status === 200);
  const putJson = (await putRes.json().catch(() => ({}))) as {
    settings?: Record<string, string>;
    updatedKeys?: string[];
  };
  check(
    "updatedKeys inclut les clés email",
    (putJson.updatedKeys ?? []).some((k) => k.startsWith("smtp")) &&
      (putJson.updatedKeys ?? []).includes("notifSignup"),
  );
  const dbSmtpHost = await prisma.setting.findUnique({ where: { key: "smtpHost" } });
  const dbRecipient = await prisma.setting.findUnique({
    where: { key: "notifEmailRecipient" },
  });
  check(
    "Settings persistés en DB (smtpHost + destinataire)",
    dbSmtpHost?.value === "127.0.0.1" && dbRecipient?.value === ADMIN_RECIPIENT,
  );

  const getRes = await req("/api/admin/settings");
  const getJson = (await getRes.json()) as { settings: Record<string, string> };
  const emailKeys = [
    "smtpHost",
    "smtpPort",
    "smtpUser",
    "smtpPass",
    "smtpSecure",
    "smtpFrom",
    "notifSignup",
    "notifPayment",
    "notifTicket",
    "notifSecurity",
    "notifQuota",
    "notifEmailRecipient",
  ];
  check(
    "GET renvoie les 12 clés email/notif",
    emailKeys.every((k) => k in getJson.settings),
  );

  console.log("── 4. Validation zod des nouvelles clés ──");
  const badPort = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ smtpPort: "99999" }),
  });
  check("smtpPort 99999 → 400", badPort.status === 400);
  const badRecipient = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ notifEmailRecipient: "pas-un-email" }),
  });
  check("notifEmailRecipient invalide → 400", badRecipient.status === 400);

  console.log("── 5. Inscription → notification admin + email de validation ──");
  const email1 = `inscrit-${STAMP}@test-verifscan.local`;
  const regRes = await registerAccount(email1, "Awa Ndiaye", "Karité Bio SARL");
  check("POST /api/register → 201", regRes.status === 201);
  const regJson = (await regRes.json().catch(() => ({}))) as { success?: boolean };
  check("register success=true", regJson.success === true);

  const newUser = await waitFor(async () => {
    const u = await prisma.user.findUnique({ where: { email: email1 } });
    return u ?? null;
  });
  check("utilisateur créé en DB", !!newUser);

  // Notification new_user pour le superadmin
  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@verifscan.sn" },
  });
  const adminNotif = (await waitFor(async () => {
    if (!adminUser) return null;
    const n = await prisma.notification.findFirst({
      where: { userId: adminUser.id, type: "new_user", message: { contains: email1 } },
      orderBy: { createdAt: "desc" },
    });
    return n ?? null;
  })) as { id: string; title: string; severity: string; readAt: null } | null;
  check(
    "Notification new_user créée pour le superadmin",
    !!adminNotif && adminNotif.title === "Nouvelle inscription" && adminNotif.readAt === null,
  );

  // EmailLog : 2 lignes (notif admin + bienvenue inscrit)
  const emailLogs = (await waitFor(async () => {
    const logs = await prisma.emailLog.findMany({
      where: { OR: [{ to: ADMIN_RECIPIENT }, { to: email1 }] },
      orderBy: { createdAt: "asc" },
    });
    return logs.length >= 2 ? logs : null;
  })) as { to: string; subject: string; status: string }[] | null;
  check(
    "EmailLog : notif admin + bienvenue enregistrés",
    !!emailLogs && emailLogs.some((l) => l.to === ADMIN_RECIPIENT) && emailLogs.some((l) => l.to === email1),
  );

  // Le faux SMTP a reçu les 2 messages réels
  const gotBoth = await waitFor(async () => {
    const tos = captured.map((m) => m.to);
    return tos.some((t) => t.includes(ADMIN_RECIPIENT)) && tos.some((t) => t.includes(email1))
      ? captured
      : null;
  });
  check("SMTP réel : 2 messages reçus (admin + inscrit)", !!gotBoth);

  const adminMail = captured.find((m) => m.to.includes(ADMIN_RECIPIENT));
  check(
    "Message admin = « VerifScan — Nouvelle inscription »",
    !!adminMail && extractSubject(adminMail.data).includes("Nouvelle inscription"),
  );
  const welcomeMail = captured.find((m) => m.to.includes(email1));
  const welcomeSubjectOk =
    !!welcomeMail && extractSubject(welcomeMail.data).includes("validez votre email");
  if (!welcomeSubjectOk && welcomeMail) {
    console.log(
      "    [debug] RAW welcome subject lines:",
      welcomeMail.data
        .split(/\r?\n/)
        .filter((l) => /^Subject:/i.test(l) || /^[ \t]/.test(l))
        .slice(0, 4),
    );
    console.log("    [debug] decoded:", extractSubject(welcomeMail.data));
  }
  check(
    "Message inscrit = bienvenue + lien validation",
    welcomeSubjectOk,
  );

  console.log("── 6. Validation du lien email (page /verification-email) ──");
  const verifyUrl = welcomeMail ? extractVerifyUrl(welcomeMail.data) : null;
  check("Lien /verification-email?token= présent dans l'email", !!verifyUrl);

  const token = verifyUrl ? new URL(verifyUrl).searchParams.get("token") : null;
  check("Token non vide", !!token);

  const verifyRes = await fetch(`${BASE}/verification-email?token=${token}`, {
    redirect: "manual",
  });
  const verifyBody = await verifyRes.text();
  check("GET /verification-email?token → 200", verifyRes.status === 200);
  check(
    "Page affiche le succès",
    verifyBody.includes("Email valid") && verifyBody.includes("verify-success"),
  );

  const verifiedUser = await prisma.user.findUnique({
    where: { email: email1 },
    select: { emailVerified: true },
  });
  check("user.emailVerified renseigné en DB", !!verifiedUser?.emailVerified);

  // Rejeu idempotent du même lien
  const replayRes = await fetch(`${BASE}/verification-email?token=${token}`, {
    redirect: "manual",
  });
  const replayBody = await replayRes.text();
  check(
    "Rejeu du même lien → « déjà validé »",
    replayRes.status === 200 && replayBody.includes("verify-already"),
  );

  // Token invalide
  const badTokenRes = await fetch(`${BASE}/verification-email?token=DEAD.BEEF.CAFE`, {
    redirect: "manual",
  });
  const badTokenBody = await badTokenRes.text();
  check(
    "Token invalide → page erreur",
    badTokenRes.status === 200 && badTokenBody.includes("verify-error"),
  );

  console.log("── 7. Test SMTP réel depuis l'API (valeurs ad hoc) ──");
  const before = captured.length;
  const testSmtp = await req("/api/admin/test-smtp", {
    method: "POST",
    body: JSON.stringify({
      host: "127.0.0.1",
      port: SMTP_PORT,
      user: "verifscan@test.local",
      pass: "test-secret-123",
      secure: false,
      to: ADMIN_RECIPIENT,
    }),
  });
  const testSmtpJson = (await testSmtp.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    error?: string;
  };
  check("POST test-smtp ad hoc → success=true", testSmtp.status === 200 && testSmtpJson.success === true);
  const gotTest = await waitFor(async () =>
    captured.length > before ? captured[captured.length - 1] : null,
  );
  const testSubjectOk =
    !!gotTest && extractSubject(gotTest.data).includes("Test SMTP réussi");
  if (!testSubjectOk) {
    console.log(
      "    [debug] captured count:", captured.length,
      "before:", before,
      "last to:", gotTest?.to,
      "decoded subject:", gotTest ? extractSubject(gotTest.data) : "(aucun message)",
    );
  }
  check(
    "SMTP a reçu l'email de test",
    testSubjectOk,
  );

  // Test SMTP sans config ad hoc → config effective (settings) → succès
  const testSmtp2 = await req("/api/admin/test-smtp", { method: "POST", body: "{}" });
  const testSmtp2Json = (await testSmtp2.json().catch(() => ({}))) as { success?: boolean };
  check("POST test-smtp (config effective) → success=true", testSmtp2.status === 200 && testSmtp2Json.success === true);

  console.log("── 8. Toggle notifSignup=false → l'email admin ne part plus ──");
  const toggleOff = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ notifSignup: "false" }),
  });
  check("PUT notifSignup=false → 200", toggleOff.status === 200);

  const before2 = captured.length;
  const email2 = `inscrit2-${STAMP}@test-verifscan.local`;
  const reg2 = await registerAccount(email2, "Moussa Diop", "Miel d'Or");
  check("2e inscription → 201", reg2.status === 201);

  await waitFor(async () => {
    const u = await prisma.user.findUnique({ where: { email: email2 } });
    return u ?? null;
  });
  // Laisse le temps aux fire-and-forget de finir (bienvenue seulement)
  await new Promise((s) => setTimeout(s, 3000));

  const adminNotif2 = adminUser
    ? await prisma.notification.findFirst({
        where: { userId: adminUser.id, type: "new_user", message: { contains: email2 } },
      })
    : null;
  check(
    "Notification in-app créée même quand le toggle est off",
    !!adminNotif2,
  );
  const adminEmail2 = captured
    .slice(before2)
    .find((m) => m.to.includes(ADMIN_RECIPIENT));
  check("AUCUN email admin après toggle off", !adminEmail2);
  const welcome2 = captured
    .slice(before2)
    .find((m) => m.to.includes(email2));
  check("Email de bienvenue TOUJOURS envoyé à l'inscrit", !!welcome2);

  const toggleOn = await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ notifSignup: "true" }),
  });
  check("toggle réactivé → 200", toggleOn.status === 200);

  await runUiTests();

  console.log("── 10. Nettoyage ──");
  // Settings SMTP → vides (l'utilisateur configure les siens en prod)
  await req("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpPass: "",
      smtpFrom: "",
      notifEmailRecipient: "",
    }),
  });
  check("Settings SMTP réinitialisés (vides)", true);

  // Utilisateurs + traces de test supprimés
  for (const email of [email1, email2]) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (u) {
      await prisma.emailLog.deleteMany({ where: { OR: [{ to: email }, { userId: u.id }] } });
      await prisma.notification.deleteMany({ where: { userId: u.id } });
      await prisma.notificationPreference.deleteMany({ where: { userId: u.id } });
      await prisma.auditLog.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }
  }
  await prisma.emailLog.deleteMany({ where: { to: ADMIN_RECIPIENT } });
  if (adminUser) {
    await prisma.notification.deleteMany({
      where: { userId: adminUser.id, type: "new_user" },
    });
  }
  check("Utilisateurs + logs de test supprimés", true);

  smtpServer?.close();
  await prisma.$disconnect();

  console.log(
    failures === 0
      ? "\n✅ TOUS LES CHECKS SONT PASSÉS"
      : `\n❌ ${failures} CHECK(S) EN ÉCHEC`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

// ── UI Playwright (partie 9) ───────────────────────────────────────────────
async function runUiTests() {
  console.log("── 9. UI Playwright — cloche admin + Paramètres Email ──");
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

  // ── Cloche : badge réel + item Nouvelle inscription ──
  const badge = page.getByTestId("notif-badge-count");
  await badge.waitFor({ state: "visible", timeout: 15_000 });
  const badgeText = await badge.textContent();
  check(
    `Cloche : badge non-lues réel visible (« ${badgeText?.trim()} »)`,
    !!badgeText && Number(badgeText.trim()) > 0,
  );

  await page.getByTestId("notif-bell").click();
  const items = page.getByTestId("notif-item");
  await items.first().waitFor({ state: "visible", timeout: 10_000 });
  const firstItem = await items.first().textContent();
  check(
    "Dropdown : item « Nouvelle inscription » visible",
    !!firstItem && firstItem.includes("Nouvelle inscription"),
  );
  await page.screenshot({ path: "shots/notif-bell-dropdown.png" });

  // Tout marquer comme lu → badge disparaît
  await page.getByTestId("notif-mark-all-read").click();
  await badge.waitFor({ state: "detached", timeout: 10_000 });
  check("« Tout marquer comme lu » → badge disparu", true);

  // ── Paramètres → Email & Notifications ──
  const navParams = page.locator("text=Paramètres").first();
  await navParams.waitFor({ state: "visible", timeout: 20_000 });
  await navParams.click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 20_000 });

  const emailTab = page.locator("text=Email & Notifications").first();
  await emailTab.click();
  await page.waitForSelector("text=Configuration SMTP", { timeout: 20_000 });

  // Champs pré-remplis depuis la DB
  const hostVal = await page.getByTestId("email-smtp-host").inputValue();
  const userVal = await page.getByTestId("email-smtp-user").inputValue();
  const recipVal = await page.getByTestId("notif-recipient").inputValue();
  check(
    "Champs SMTP chargés depuis la DB",
    hostVal === "127.0.0.1" &&
      userVal === "verifscan@test.local" &&
      recipVal === ADMIN_RECIPIENT,
  );
  const passVal = await page.getByTestId("email-smtp-pass").inputValue();
  check("Champ mot de passe pré-rempli (valeur réelle stockée)", passVal === "test-secret-123");

  await page.screenshot({ path: "shots/notif-settings-email.png" });

  // Test de connexion RÉEL (le faux SMTP tourne toujours)
  await page.getByTestId("email-test").click();
  await page
    .getByTestId("smtp-test-ok")
    .waitFor({ state: "visible", timeout: 20_000 });
  check("Test connexion réel → « smtp-test-ok » affiché", true);
  await page.screenshot({ path: "shots/notif-smtp-test-ok.png" });

  // Modifier + Enregistrer → toast + persistance après reload
  await page.getByTestId("email-smtp-host").fill("127.0.0.1");
  await page.getByTestId("notif-toggle-ticket").click(); // off
  await page.getByTestId("notif-save").click();
  const toast = page.locator("text=Configuration email enregistrée").first();
  await toast.waitFor({ state: "visible", timeout: 10_000 });
  check("Enregistrer → toast succès", true);

  // PIÈGE connu : le store de navigation n'est pas persisté dans l'URL →
  // après reload, re-cliquer « Paramètres » avant d'attendre la section.
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "networkidle" });
  const navParams2 = page.locator("text=Paramètres").first();
  await navParams2.waitFor({ state: "visible", timeout: 20_000 });
  await navParams2.click();
  await page.waitForSelector("text=Paramètres généraux", { timeout: 20_000 });
  const emailTab2 = page.locator("text=Email & Notifications").first();
  await emailTab2.click();
  await page.waitForSelector("text=Configuration SMTP", { timeout: 20_000 });

  // Attendre que le GET /api/admin/settings ait rempli les champs contrôlés
  // (la valeur arrive après le rendu initial vide — race condition).
  await page.waitForFunction(
    () =>
      (document.querySelector('[data-testid="email-smtp-host"]') as HTMLInputElement)
        ?.value === "127.0.0.1",
    { timeout: 15_000 },
  );
  const persistedHost = await page.getByTestId("email-smtp-host").inputValue();
  check("Persistance après reload (smtpHost)", persistedHost === "127.0.0.1");
  const ticketChecked = await page
    .getByTestId("notif-toggle-ticket")
    .getAttribute("data-state");
  check("Toggle Ticket persisté (data-state=unchecked)", ticketChecked === "unchecked");

  // Remettre le toggle Ticket sur ON pour le nettoyage
  await page.getByTestId("notif-toggle-ticket").click();
  await page.getByTestId("notif-save").click();
  await page.waitForTimeout(600);

  await browser.close();
}

main().catch(async (err) => {
  console.error("Test crashé :", err);
  smtpServer?.close();
  await prisma.$disconnect();
  process.exit(1);
});
