/**
 * Test E2E — Actions SuperAdmin sur les fabricants + mot de passe oublié
 * (demande utilisateur : « dans superadmin utilisateur impossible de modifier
 * ni supprimer le compte ni annuler l'abonnement ni changer de plan ; les
 * boutons Contacter/Email/Ticket/Note/Annuler ne fonctionnent pas ;
 * mettre réinitialiser le mot de passe ; mettre mot de passe oublié dans les
 * pages de connexion »).
 *
 * Scénario :
 *   1. Purge + création d'un fabricant de test (bcrypt RÉEL) + abonnement
 *   2. Login superadmin
 *   3. API Notes        : POST → 200 + AuditLog NOTE_ADDED + détail.notes[]
 *   4. API Reset admin  : auto (tempPassword retourné + bcrypt vérifié) puis
 *                          manuel (newPassword posé)
 *   5. API Abonnement   : cancelSubscription → CANCELLED ; plan pro → ACTIVE pro
 *   6. API Ticket       : POST /api/admin/tickets → ticket rattaché au fabricant
 *   7. Sécurité         : 403 sans session (notes + reset-password)
 *   8. Mot de passe oublié : forgot → devLink (SMTP off en dev) → reset →
 *      bcrypt vérifié ; anti-énumération (email inconnu → ok sans devLink) ;
 *      token bidon → 400
 *   9. UI Playwright :
 *      - /login : lien « Mot de passe oublié ? » → demande → écran succès
 *      - reset via URL token → écran succès → bcrypt vérifié
 *      - détail SuperAdmin : WhatsApp/mailto en <a>, Changer de plan (dialog
 *        → badge Pro), Annuler l'abonnement (ANNULER → badge Essai),
 *        note ajoutée via UI, Réinitialiser le mot de passe (dialog + code),
 *        menu ⋮ Modifier → modal édition (email verrouillé) → company patchée
 *  10. Nettoyage
 *
 * Run : bun scripts/test-admin-user-actions.ts   (serveur dev :3000 requis)
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BASE = "http://localhost:3000";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

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
      "user-agent": "test-admin-user-actions",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

const STAMP = Date.now();
const EMAIL_F = `actions-${STAMP}@test.verifscan`;
const OLD_PASSWORD = "OldPass123!";

async function purgeTestUser(userId: string) {
  await prisma.qRCode.deleteMany({ where: { lot: { fabricantId: userId } } });
  await prisma.scan.deleteMany({ where: { userId } });
  await prisma.review.deleteMany({ where: { fabricantId: userId } });
  await prisma.lot.deleteMany({ where: { fabricantId: userId } });
  await prisma.marketplaceInquiry.deleteMany({ where: { fabricantId: userId } });
  await prisma.product.deleteMany({ where: { fabricantId: userId } });
  await prisma.certification.deleteMany({ where: { fabricantId: userId } });
  await prisma.aiMessage.deleteMany({ where: { conversation: { userId } } });
  await prisma.aiConversation.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.notificationPreference.deleteMany({ where: { userId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.ticket.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.emailLog.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  console.log("0. Purge des runs antérieurs");
  const stale = await prisma.user.findMany({
    where: { email: { endsWith: "@test.verifscan" }, role: "FABRICANT" },
    select: { id: true },
  });
  for (const u of stale) await purgeTestUser(u.id);
  console.log(`  ${stale.length} compte(s) de test purgé(s)`);

  console.log("1. Création du fabricant de test (bcrypt réel + abonnement)");
  const realHash = await bcrypt.hash(OLD_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: EMAIL_F,
      name: "Awa Actions",
      password: realHash,
      role: "FABRICANT",
      companyName: "Actions Test SARL",
      phone: "+221 77 123 45 67",
      whatsapp: "+221 77 123 45 67",
      status: "ACTIVE",
      isVerified: true,
    },
  });
  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: "starter",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });
  check("fabricant + abonnement ACTIVE créés", !!user.id && !!subscription.id);

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

  console.log("3. API Notes internes");
  const noteNoSession = await fetch(`${BASE}/api/admin/users/${user.id}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "hack" }),
  });
  check("POST note sans session → 403", noteNoSession.status === 403);

  const noteRes = await req(`/api/admin/users/${user.id}/notes`, {
    method: "POST",
    body: JSON.stringify({ content: "Cliente sérieuse, paiement à jour." }),
  });
  check("POST note → 200", noteRes.status === 200);
  const noteJson = (await noteRes.json()) as { note?: { content?: string } };
  check("note retournée avec contenu", noteJson.note?.content === "Cliente sérieuse, paiement à jour.");
  const noteLog = await prisma.auditLog.findFirst({
    where: { userId: user.id, action: "NOTE_ADDED" },
  });
  check("AuditLog NOTE_ADDED créé", !!noteLog);
  const detailRes = await req(`/api/admin/users/${user.id}`);
  const detailJson = (await detailRes.json()) as { notes?: { content: string }[] };
  check(
    "GET détail expose la note",
    (detailJson.notes ?? []).some((n) => n.content.includes("Cliente sérieuse")),
  );

  console.log("4. API Réinitialisation mot de passe (SuperAdmin)");
  const resetNoSession = await fetch(`${BASE}/api/admin/users/${user.id}/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  check("POST reset sans session → 403", resetNoSession.status === 403);

  const resetAuto = await req(`/api/admin/users/${user.id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  check("reset AUTO → 200", resetAuto.status === 200);
  const resetAutoJson = (await resetAuto.json()) as {
    tempPassword?: string;
    generated?: boolean;
    emailed?: boolean;
  };
  check(
    "tempPassword généré (format Verif-XXXX-XXXX)",
    resetAutoJson.generated === true && /^Verif-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(resetAutoJson.tempPassword ?? ""),
  );
  const dbUser1 = await prisma.user.findUnique({ where: { id: user.id } });
  check(
    "bcrypt : tempPassword actif en DB, ancien rejeté",
    !!(await bcrypt.compare(resetAutoJson.tempPassword ?? "", dbUser1!.password!)) &&
      !(await bcrypt.compare(OLD_PASSWORD, dbUser1!.password!)),
  );

  const resetManual = await req(`/api/admin/users/${user.id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword: "Manual123!" }),
  });
  const resetManualJson = (await resetManual.json()) as { tempPassword?: string };
  check("reset MANUEL → 200 sans tempPassword renvoyé", resetManual.status === 200 && !resetManualJson.tempPassword);
  const dbUser2 = await prisma.user.findUnique({ where: { id: user.id } });
  check("bcrypt : mot de passe manuel actif", !!(await bcrypt.compare("Manual123!", dbUser2!.password!)));
  const resetAudit = await prisma.auditLog.findFirst({
    where: { userId: user.id, action: "PASSWORD_RESET_BY_ADMIN" },
  });
  check("AuditLog PASSWORD_RESET_BY_ADMIN créé", !!resetAudit);

  console.log("5. API Abonnement (annulation + changement de plan)");
  const cancelRes = await req(`/api/admin/users/${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({ cancelSubscription: true }),
  });
  check("PATCH cancelSubscription → 200", cancelRes.status === 200);
  const cancelledSub = await prisma.subscription.findUnique({ where: { id: subscription.id } });
  check("abonnement clôturé (status CANCELLED)", cancelledSub?.status === "CANCELLED");

  const planRes = await req(`/api/admin/users/${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({ plan: "pro" }),
  });
  check("PATCH plan pro → 200", planRes.status === 200);
  const activeSubs = await prisma.subscription.findMany({
    where: { userId: user.id, status: "ACTIVE" },
  });
  check(
    "nouvel abonnement ACTIVE plan pro (et un seul actif)",
    activeSubs.length === 1 && activeSubs[0].plan === "pro",
  );

  console.log("6. API Créer ticket support");
  const ticketRes = await req("/api/admin/tickets", {
    method: "POST",
    body: JSON.stringify({
      subject: "Problème de scan sur un lot",
      description: "Le QR du lot TEST-01 renvoie 404.",
      priority: "Haute",
      category: "Technique",
      userId: user.id,
      requesterName: "Awa Actions",
      requesterCompany: "Actions Test SARL",
    }),
  });
  check("POST ticket → 201", ticketRes.status === 201);
  // La route renvoie le ticket directement (pas de wrapper { ticket }).
  const ticketJson = (await ticketRes.json()) as {
    id?: string;
    reference?: string;
    error?: string;
  };
  console.log("    [debug] POST ticket →", JSON.stringify(ticketJson).slice(0, 200));
  // La route renvoie id = référence humaine (TKT-...) → lookup par référence.
  const dbTicket = ticketJson.id
    ? await prisma.ticket.findUnique({ where: { reference: ticketJson.id } })
    : null;
  check("ticket en DB rattaché au fabricant", dbTicket?.userId === user.id && !!dbTicket?.reference);

  console.log("7. Mot de passe oublié (public)");
  const forgot = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL_F }),
  });
  const forgotJson = (await forgot.json()) as { ok?: boolean; devLink?: string };
  check("forgot-password → { ok: true }", forgot.status === 200 && forgotJson.ok === true);
  check(
    "SMTP non configuré en dev → devLink fourni",
    typeof forgotJson.devLink === "string" && forgotJson.devLink.includes("token="),
  );
  const resetToken = new URL(forgotJson.devLink ?? "").searchParams.get("token") ?? "";
  check("token présent dans le lien", resetToken.length > 20);

  const forgotUnknown = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `inconnu-${STAMP}@example.com` }),
  });
  const forgotUnknownJson = (await forgotUnknown.json()) as { ok?: boolean; devLink?: string };
  check(
    "anti-énumération : email inconnu → ok SANS devLink",
    forgotUnknownJson.ok === true && !forgotUnknownJson.devLink,
  );

  const bogusReset = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "abc.def.ghi", password: "NewPass456!" }),
  });
  check("reset avec token bidon → 400", bogusReset.status === 400);

  const publicReset = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: resetToken, password: "NewPass456!" }),
  });
  check("reset public avec token valide → 200", publicReset.status === 200);
  const dbUser3 = await prisma.user.findUnique({ where: { id: user.id } });
  check("bcrypt : NewPass456! actif", !!(await bcrypt.compare("NewPass456!", dbUser3!.password!)));

  const reusedReset = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: resetToken, password: "Hacked789!" }),
  });
  const dbUser4 = await prisma.user.findUnique({ where: { id: user.id } });
  check(
    "rejeu du token consommé refusé (mot de passe inchangé)",
    reusedReset.status === 400 && !(await bcrypt.compare("Hacked789!", dbUser4!.password!)),
  );

  console.log("8. UI Playwright — mot de passe oublié depuis /login");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const forgotLink = page.getByRole("link", { name: "Mot de passe oublié ?" }).first();
  check("lien « Mot de passe oublié ? » visible sur /login", await forgotLink.isVisible());
  await forgotLink.click();
  await page.waitForSelector("text=Mot de passe oublié ?", { timeout: 15_000 });
  await page.fill("#forgot-email", EMAIL_F);
  await page.getByRole("button", { name: /Recevoir le lien/ }).click();
  await page.waitForSelector("text=Vérifiez votre boîte email", { timeout: 15_000 });
  check("écran « Vérifiez votre boîte email » affiché", true);

  // Récupère le token via l'API directement (le devLink n'est rendu que si SMTP off)
  const freshForgot = await req("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL_F }),
  });
  const freshJson = (await freshForgot.json()) as { devLink?: string };
  const uiToken = new URL(freshJson.devLink ?? "").searchParams.get("token") ?? "";
  await page.goto(`${BASE}/mot-de-passe-oublie?token=${uiToken}`, { waitUntil: "networkidle" });
  await page.fill("#new-password", "UiReset789!");
  await page.fill("#confirm-password", "UiReset789!");
  await page.getByRole("button", { name: /Enregistrer le nouveau mot de passe/ }).click();
  await page.waitForSelector("text=Mot de passe modifié !", { timeout: 15_000 });
  check("UI : reset complet jusqu'à l'écran succès", true);
  const dbUser5 = await prisma.user.findUnique({ where: { id: user.id } });
  check("UI : bcrypt UiReset789! actif", !!(await bcrypt.compare("UiReset789!", dbUser5!.password!)));

  console.log("9. UI Playwright — détail fabricant (tous les boutons)");
  await ctx.addCookies(
    jar
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=");
        return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
      }),
  );
  await page.goto(`${BASE}/superadmin`, { waitUntil: "networkidle" });
  const navUsers = page.getByRole("button", { name: "Utilisateurs" }).first();
  await navUsers.waitFor({ state: "visible", timeout: 30_000 });
  await navUsers.click();
  await page.waitForSelector("text=Gestion des Fabricants", { timeout: 20_000 });

  const searchInput = page.getByPlaceholder(/Rechercher par nom, email, entreprise/).first();
  await searchInput.fill(EMAIL_F);
  await page.waitForTimeout(600);

  // Menu ⋮ → Voir détails (dispatchEvent : les dropdowns peuvent être
  // recouverts par le header sticky selon la position de la ligne)
  const row = page.locator("tr", { hasText: EMAIL_F }).first();
  await row.getByRole("button", { name: "Actions" }).click();
  await row.getByRole("button", { name: "Voir détails" }).dispatchEvent("click");
  await page.waitForSelector("text=Actions Test SARL", { timeout: 15_000 });

  // WhatsApp + Email en vrais liens
  const waLink = page.locator('a[href^="https://wa.me/"]').first();
  check("bouton Contacter (WhatsApp) = lien wa.me", await waLink.isVisible());
  const mailLink = page.locator('a[href^="mailto:"]').first();
  check("bouton Envoyer email = lien mailto", await mailLink.isVisible());

  // Changer de plan via le détail. ATTENTION : hasText "Pro" en string est
  // insensible à la casse et matchait « produits » de l'option Starter !
  await page.getByRole("button", { name: /Changer de plan/ }).first().click();
  await page.waitForSelector("text=Appliquer le plan", { timeout: 10_000 });
  await page
    .locator("button")
    .filter({ has: page.locator('span:text-is("Pro")') })
    .first()
    .click();
  await page.getByRole("button", { name: "Appliquer le plan" }).click();
  try {
    await page.waitForSelector("text=changé en Pro", { timeout: 12_000 });
    check("UI : plan changé en Pro (toast succès)", true);
  } catch {
    await page.screenshot({ path: "/tmp/plan-fail.png", fullPage: true });
    const subsNow = await prisma.subscription.findMany({
      where: { userId: user.id, status: "ACTIVE" },
    });
    console.log(
      "    [debug] subs après clic:",
      JSON.stringify(subsNow.map((s) => ({ plan: s.plan, status: s.status }))),
    );
    check("UI : plan changé en Pro (toast succès)", false);
  }
  await page.waitForTimeout(800);

  // Note via UI
  await page.getByPlaceholder("Ajouter une note...").fill("Note ajoutée via UI e2e");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForSelector("text=Note ajoutée via UI e2e", { timeout: 10_000 });
  check("UI : note enregistrée et affichée", true);

  // Réinitialiser le mot de passe via UI
  await page.getByRole("button", { name: /Réinitialiser le mot de passe/ }).click();
  await page.waitForSelector("text=Générer automatiquement", { timeout: 10_000 });
  await page.getByRole("button", { name: "Réinitialiser", exact: true }).click();
  await page
    .locator("code")
    .filter({ hasText: /Verif-[A-Z2-9]{4}-[A-Z2-9]{4}/ })
    .first()
    .waitFor({ timeout: 10_000 });
  check("UI : mot de passe temporaire affiché dans le dialog", true);
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.waitForTimeout(400);

  // Annuler l'abonnement via UI
  await page.getByRole("button", { name: /Annuler l'abonnement/ }).first().click();
  await page.waitForSelector("text=Tapez", { timeout: 10_000 });
  await page.fill('input[placeholder="ANNULER"]', "ANNULER");
  await page.getByRole("button", { name: "Annuler l'abonnement" }).last().click();
  await page.waitForSelector("text=annulé", { timeout: 10_000 });
  check("UI : abonnement annulé (toast succès)", true);
  await page.waitForTimeout(800);

  // Retour liste (sidebar) → menu ⋮ → Modifier (modal édition, email verrouillé)
  await navUsers.click();
  await page.waitForSelector("text=Gestion des Fabricants", { timeout: 15_000 });
  await page.waitForTimeout(600);
  const row2 = page.locator("tr", { hasText: EMAIL_F }).first();
  await row2.getByRole("button", { name: "Actions" }).click();
  await row2.getByRole("button", { name: "Modifier" }).dispatchEvent("click");
  await page
    .getByText(/Modifier « /)
    .first()
    .waitFor({ timeout: 10_000 });
  const emailDisabled = await page.locator('input[type="email"]').first().isDisabled();
  check("UI : modal édition ouvert + email verrouillé", emailDisabled);
  await page.locator('input[placeholder="Ex : Sarine Bio"]').fill("Actions Test Modifiée");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await page.waitForSelector("text=Actions Test Modifiée", { timeout: 10_000 });
  check("UI : company modifiée visible dans la liste", true);

  await browser.close();

  console.log("10. Nettoyage");
  await purgeTestUser(user.id);
  check("nettoyage effectué", !(await prisma.user.findUnique({ where: { id: user.id } })));

  console.log(
    failures === 0
      ? "\n✅ TOUS LES CHECKS PASSENT"
      : `\n❌ ${failures} CHECK(S) EN ÉCHEC`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
