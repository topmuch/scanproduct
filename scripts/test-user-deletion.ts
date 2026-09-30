/**
 * Test E2E — Suppression DÉFINITIVE d'un fabricant (demande utilisateur :
 * « dans superadmin onglet fabricant et onglet abonnement impossible de
 * supprimer un fabricant »).
 *
 * Avant : le bouton « Supprimer » de l'onglet Fabricants désélectionnait la
 * ligne (aucun appel API) et l'onglet Abonnements n'avait AUCUN bouton.
 *
 * Scénario :
 *   1. Création Prisma de 2 fabricants de test avec données liées complètes
 *      (produit, lot, QR, scans, avis, certification, inquiry, abonnement,
 *      notifications, prefs, conv IA + message, ticket, emailLog, auditLog)
 *   2. Login superadmin
 *   3. Sécurité API : DELETE sans session → 403 ; sans body → 400 ;
 *      mauvaise confirmation → 400 ; auto-suppression → 400
 *   4. DELETE bon email (F1) → 200 ; DB vérifiée : user/produit/lot/QR/scan/
 *      avis/certification/inquiry/abonnement/notif/prefs/IA supprimés ;
 *      ticket/emailLog/auditLog CONSERVÉS avec userId null
 *   5. re-DELETE F1 → 404
 *   6. UI Playwright : onglet Fabricants → recherche F2 → menu ⋮ →
 *      « Supprimer » → dialog → taper l'email → bouton rouge débloqué →
 *      toast succès → ligne disparue. Onglet Abonnements : bouton corbeille
 *      présent sur la ligne d'un fabricant.
 *   7. Nettoyage des restes éventuels
 *
 * Run : bun scripts/test-user-deletion.ts   (serveur dev sur :3000 requis)
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
      "content-type": "application/json",
      "user-agent": "test-user-deletion",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

const STAMP = Date.now();
const EMAIL_F1 = `delete-me-${STAMP}@test.verifscan`;
const EMAIL_F2 = `delete-ui-${STAMP}@test.verifscan`;

async function createFabricantWithGraph(email: string, company: string) {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Testeur Suppression",
      password: "$2a$10$abcdefghijklmnopqrstuv", // hash factice (login jamais testé)
      role: "FABRICANT",
      companyName: company,
      status: "ACTIVE",
      isVerified: true,
    },
  });
  const product = await prisma.product.create({
    data: {
      name: `Produit ${company}`,
      fabricantId: user.id,
      category: "Test",
      isPublic: true,
    },
  });
  const lot = await prisma.lot.create({
    data: {
      reference: `LOT-DEL-${STAMP}-${email.slice(0, 10)}`,
      productId: product.id,
      fabricantId: user.id,
      quantity: 12,
      status: "ACTIVE",
    },
  });
  const qr = await prisma.qRCode.create({
    data: { code: `DEL-${STAMP}-${email.slice(0, 10)}`, lotId: lot.id, fabricantId: user.id },
  });
  const scan = await prisma.scan.create({
    data: { qrCodeId: qr.id, lotId: lot.id, userId: user.id, scannedAt: new Date() },
  });
  const review = await prisma.review.create({
    data: { productId: product.id, lotId: lot.id, fabricantId: user.id, rating: 5, comment: "ok" },
  });
  const cert = await prisma.certification.create({
    data: { fabricantId: user.id, name: "Bio Test" },
  });
  const inquiry = await prisma.marketplaceInquiry.create({
    data: {
      productId: product.id,
      fabricantId: user.id,
      requesterName: "Distributeur Test",
      requesterEmail: "dist@test.com",
      message: "Bonjour",
    },
  });
  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: "starter",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 30 * 864e5),
    },
  });
  const notif = await prisma.notification.create({
    data: { userId: user.id, type: "system", title: "Test", message: "Test notif" },
  });
  const pref = await prisma.notificationPreference.create({ data: { userId: user.id } });
  const conv = await prisma.aiConversation.create({
    data: { userId: user.id, title: "Conv test" },
  });
  const aiMsg = await prisma.aiMessage.create({
    data: { conversationId: conv.id, role: "user", content: "Bonjour IA" },
  });
  const ticket = await prisma.ticket.create({
    data: {
      reference: `TKT-DEL-${STAMP}-${email.slice(0, 10)}`,
      subject: "Ticket de test",
      userId: user.id,
      requesterName: "Testeur Suppression",
      requesterCompany: company,
    },
  });
  const emailLog = await prisma.emailLog.create({
    data: { to: email, subject: "Test", status: "sent", userId: user.id, sentAt: new Date() },
  });
  const audit = await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
  });
  return { user, product, lot, qr, scan, review, cert, inquiry, subscription, notif, pref, conv, aiMsg, ticket, emailLog, audit };
}

async function purgeTestUser(userId: string) {
  const products = await prisma.product.findMany({ where: { fabricantId: userId }, select: { id: true } });
  const lotIds = (await prisma.lot.findMany({ where: { fabricantId: userId }, select: { id: true } })).map((l) => l.id);
  await prisma.scan.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { userId }] } });
  await prisma.review.deleteMany({ where: { OR: [{ lotId: { in: lotIds } }, { fabricantId: userId }] } });
  await prisma.qRCode.deleteMany({ where: { lotId: { in: lotIds } } });
  await prisma.lotHistory.deleteMany({ where: { lotId: { in: lotIds } } });
  await prisma.lotCertification.deleteMany({ where: { lotId: { in: lotIds } } });
  await prisma.lot.deleteMany({ where: { fabricantId: userId } });
  await prisma.marketplaceInquiry.deleteMany({ where: { fabricantId: userId } });
  await prisma.product.deleteMany({ where: { id: { in: products.map((p) => p.id) } } });
  await prisma.certification.deleteMany({ where: { fabricantId: userId } });
  const convIds = (await prisma.aiConversation.findMany({ where: { userId }, select: { id: true } })).map((c) => c.id);
  await prisma.aiMessage.deleteMany({ where: { conversationId: { in: convIds } } });
  await prisma.aiConversation.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.notificationPreference.deleteMany({ where: { userId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.ticket.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.emailLog.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.auditLog.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  console.log("0. Purge des runs antérieurs (comptes @test.verifscan)");
  const stale = await prisma.user.findMany({ where: { email: { endsWith: "@test.verifscan" } }, select: { id: true } });
  for (const u of stale) await purgeTestUser(u.id);
  console.log(`  ${stale.length} compte(s) de test purgé(s)`);

  console.log("1. Création des fabricants de test (+ données liées)");
  const f1 = await createFabricantWithGraph(EMAIL_F1, "Suppression API SARL");
  const f2 = await createFabricantWithGraph(EMAIL_F2, "Suppression UI SARL");
  check("fabricant F1 + graphe créé", !!f1.user.id && !!f1.lot.id && !!f1.qr.id);
  check("fabricant F2 + graphe créé", !!f2.user.id && !!f2.lot.id && !!f2.qr.id);

  console.log("2. Login superadmin");
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
  const sessJson = (await sess.json()) as { user?: { role?: string; id?: string } };
  if (sessJson.user?.role !== "SUPERADMIN") {
    console.error("Login superadmin impossible");
    process.exit(1);
  }
  check("session SUPERADMIN active", true);
  const adminId = sessJson.user?.id ?? "";

  console.log("3. Sécurité API");
  const noSession = await fetch(`${BASE}/api/admin/users/${f1.user.id}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: EMAIL_F1 }),
  });
  check("DELETE sans session → 403", noSession.status === 403);

  const noBody = await req(`/api/admin/users/${f1.user.id}`, { method: "DELETE" });
  check("DELETE sans body → 400", noBody.status === 400);

  const badConfirm = await req(`/api/admin/users/${f1.user.id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "mauvais@email.com" }),
  });
  check("mauvaise confirmation → 400", badConfirm.status === 400);
  check("F1 toujours présent après refus", !!(await prisma.user.findUnique({ where: { id: f1.user.id } })));

  const selfDelete = await req(`/api/admin/users/${adminId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmation: EMAIL_F1 }),
  });
  check("auto-suppression → 400", selfDelete.status === 400);

  console.log("4. DELETE avec confirmation valide (F1)");
  const okDel = await req(`/api/admin/users/${f1.user.id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmation: EMAIL_F1 }),
  });
  check("DELETE F1 → 200", okDel.status === 200);
  const delJson = (await okDel.json().catch(() => ({}))) as {
    ok?: boolean;
    deleted?: { products?: number; lots?: number };
  };
  check("réponse ok:true", delJson.ok === true);
  check("résumé produits=1 lots=1", delJson.deleted?.products === 1 && delJson.deleted?.lots === 1);

  const gone = async () => ({
    user: await prisma.user.findUnique({ where: { id: f1.user.id } }),
    product: await prisma.product.findUnique({ where: { id: f1.product.id } }),
    lot: await prisma.lot.findUnique({ where: { id: f1.lot.id } }),
    qr: await prisma.qRCode.findUnique({ where: { id: f1.qr.id } }),
    scan: await prisma.scan.findUnique({ where: { id: f1.scan.id } }),
    review: await prisma.review.findUnique({ where: { id: f1.review.id } }),
    cert: await prisma.certification.findUnique({ where: { id: f1.cert.id } }),
    inquiry: await prisma.marketplaceInquiry.findUnique({ where: { id: f1.inquiry.id } }),
    subscription: await prisma.subscription.findUnique({ where: { id: f1.subscription.id } }),
    notif: await prisma.notification.findUnique({ where: { id: f1.notif.id } }),
    pref: await prisma.notificationPreference.findUnique({ where: { id: f1.pref.id } }),
    conv: await prisma.aiConversation.findUnique({ where: { id: f1.conv.id } }),
    aiMsg: await prisma.aiMessage.findUnique({ where: { id: f1.aiMsg.id } }),
  });
  const after = await gone();
  check("user supprimé", !after.user);
  check("produit supprimé", !after.product);
  check("lot supprimé", !after.lot);
  check("QR supprimé", !after.qr);
  check("scan supprimé", !after.scan);
  check("avis supprimé", !after.review);
  check("certification supprimée", !after.cert);
  check("demande marketplace supprimée", !after.inquiry);
  check("abonnement supprimé", !after.subscription);
  check("notification supprimée", !after.notif);
  check("préférences notif supprimées", !after.pref);
  check("conversation IA supprimée", !after.conv);
  check("message IA supprimé", !after.aiMsg);

  const detachedTicket = await prisma.ticket.findUnique({ where: { id: f1.ticket.id } });
  const detachedEmail = await prisma.emailLog.findUnique({ where: { id: f1.emailLog.id } });
  const detachedAudit = await prisma.auditLog.findUnique({ where: { id: f1.audit.id } });
  check("ticket conservé avec userId=null", !!detachedTicket && detachedTicket.userId === null);
  check("emailLog conservé avec userId=null", !!detachedEmail && detachedEmail.userId === null);
  check("auditLog conservé avec userId=null", !!detachedAudit && detachedAudit.userId === null);

  const deleteUserAudit = await prisma.auditLog.findFirst({
    where: { action: "DELETE_USER", entityId: f1.user.id },
  });
  check("auditLog DELETE_USER créé", !!deleteUserAudit);

  console.log("5. re-DELETE F1 → 404");
  const reDel = await req(`/api/admin/users/${f1.user.id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmation: EMAIL_F1 }),
  });
  check("re-DELETE → 404", reDel.status === 404);

  console.log("6. UI Playwright — suppression via les deux onglets");
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

  // Onglet Fabricants : cliquer « Utilisateurs » dans la sidebar (page "users")
  const navUsers = page.getByRole("button", { name: "Utilisateurs" }).first();
  await navUsers.waitFor({ state: "visible", timeout: 30_000 });
  await navUsers.click();
  await page.waitForSelector("text=Gestion des Fabricants", { timeout: 20_000 });

  // Chercher F2 pour l'afficher
  const searchInput = page.getByPlaceholder(/Rechercher par nom, email, entreprise/).first();
  await searchInput.fill(EMAIL_F2);
  await page.waitForTimeout(600);

  // Ouvrir le menu ⋮ de la ligne F2
  const rowF2 = page.locator("tr", { hasText: EMAIL_F2 }).first();
  await rowF2.waitFor({ state: "visible", timeout: 10_000 });
  await rowF2.getByLabel("Actions").click();
  await page.waitForTimeout(300);

  // Cliquer « Supprimer » dans le menu
  await page.locator("div[role='none'], div.absolute").getByText("Supprimer", { exact: true }).first().click();
  await page.waitForTimeout(400);

  // Le dialog exige l'email exact
  const dialogInput = page.locator("#delete-user-confirmation");
  const dialogVisible = await dialogInput.isVisible().catch(() => false);
  check("dialog de confirmation ouvert", dialogVisible);
  if (dialogVisible) {
    const confirmBtn = page.getByRole("button", { name: /Supprimer définitivement/ }).first();
    check("bouton rouge désactivé avant confirmation", !(await confirmBtn.isEnabled()));
    await dialogInput.fill(EMAIL_F2);
    check("bouton rouge activé après email exact", await confirmBtn.isEnabled());
    await confirmBtn.click();
    await page.waitForTimeout(1500);
    const stillThere = await page.locator("tr", { hasText: EMAIL_F2 }).count();
    check("ligne F2 disparue de la liste", stillThere === 0);
    const toastOk = await page.getByText(/supprimé définitivement/).first().isVisible().catch(() => false);
    check("toast succès affiché", toastOk);
  }
  const f2Db = await prisma.user.findUnique({ where: { id: f2.user.id } });
  check("F2 supprimé en DB via l'UI", !f2Db);

  // Onglet Abonnements : vérifier la présence du bouton corbeille
  const navSubs = page.locator("text=Abonnements").first();
  await navSubs.click();
  await page.waitForSelector("text=Gestion des Abonnements", { timeout: 20_000 });
  await page.waitForTimeout(800);
  const trashButtons = await page.getByTitle("Supprimer définitivement le compte").count();
  check("onglet Abonnements : boutons corbeille présents", trashButtons > 0);
  await page.screenshot({ path: "shots/user-deletion-subs-tab.png" });

  await browser.close();

  console.log("7. Nettoyage");
  const leftovers = await prisma.user.findMany({ where: { email: { in: [EMAIL_F1, EMAIL_F2] } }, select: { id: true } });
  for (const u of leftovers) await purgeTestUser(u.id);
  check("nettoyage des restes de test effectué", true);

  console.log(failures === 0 ? "\n✅ TOUS LES CHECKS PASSENT" : `\n❌ ${failures} CHECK(S) ÉCHOUÉ(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
