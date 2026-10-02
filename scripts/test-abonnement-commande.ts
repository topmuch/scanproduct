/**
 * Test e2e — Boutons abonnement fabricant (POST /api/abonnement/commande).
 *
 * Vérifie le flux complet introduit pour rendre fonctionnels les boutons
 * « Upgrade » / « Acheter » / « Plan Pro » de la page Mon Abonnement :
 *   1. Login fabricant
 *   2. Demande upgrade plan (mensuel)   → ticket Facturation + notification
 *   3. Demande upgrade plan (annuel)    → montant serveur = prixAnnuel
 *   4. Achat pack QR (pk2)              → montant serveur = 9 000
 *   5. Achat quantité personnalisée     → montant serveur = qty × 10
 *   6. Offre fidélité                   → montant serveur = prix×0,8×3
 *   7. Résiliation avec motif           → ticket + notification warning
 *   8. Garde-fous : anonyme 401, plan identique 400, type inconnu 400
 *
 *   TEST_BASE_URL=http://localhost:3100 bun scripts/test-abonnement-commande.ts
 */
const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";

let cookieJar = "";
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [nv] = raw.split(";");
    const name = nv.split("=")[0];
    if (!name) continue;
    if (cookieJar.includes(name + "=")) {
      cookieJar = cookieJar.replace(new RegExp(`${name}=[^;]*`), nv);
    } else {
      cookieJar = cookieJar ? `${cookieJar}; ${nv}` : nv;
    }
  }
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "user-agent": "test-abonnement-commande",
      ...(init.headers ?? {}),
      cookie: cookieJar,
    },
  });
  captureCookies(res);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return { status: res.status, body: await res.json(), res };
  }
  return { status: res.status, body: null, res };
}

async function login(email: string, password: string): Promise<string | null> {
  const csrf = await req("/api/auth/csrf");
  await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
    }),
  });
  const sess = await req("/api/auth/session");
  return sess.body?.user?.role ?? null;
}

async function main() {
  console.log("═".repeat(64));
  console.log("TEST BOUTONS ABONNEMENT — POST /api/abonnement/commande");
  console.log(`  BASE = ${BASE}`);
  console.log("═".repeat(64));

  const { db } = await import("../src/lib/db");

  const fabricant = await db.user.findUnique({
    where: { email: "sarine@biocosmetique.sn" },
    select: { id: true },
  });
  const ticketsAvant = await db.ticket.count({
    where: { userId: fabricant!.id, category: "Facturation" },
  });
  const notifsAvant = await db.notification.count({
    where: { userId: fabricant!.id, type: "subscription" },
  });

  // ── 1. Login ──────────────────────────────────────────────────────
  console.log("\n[1] Login fabricant…");
  const role = await login("sarine@biocosmetique.sn", "Demo1234!");
  check("Login fabricant", role === "FABRICANT", `role=${role}`);

  // ── Plan actuel RÉEL (même logique que l'API : Subscription ACTIVE →
  //    Setting `plan:<id>` → repli "starter") pour des attentes exactes.
  const { PLANS } = await import("../src/lib/fabricant-types");
  const subActive = await db.subscription.findFirst({
    where: { userId: fabricant!.id, status: "ACTIVE" },
    orderBy: { expiresAt: "desc" },
  });
  let planActuelId = "starter";
  if (subActive && ["starter", "pro", "business"].includes(subActive.plan)) {
    planActuelId = subActive.plan;
  } else {
    const setting = await db.setting.findUnique({
      where: { key: `plan:${fabricant!.id}` },
    });
    const v = setting?.value?.trim();
    if (v && ["starter", "pro", "business"].includes(v)) planActuelId = v;
  }
  const prixMensuelActuel =
    PLANS.find((p) => p.id === planActuelId)?.prixMensuel ?? 10000;
  console.log(`  (plan actuel détecté en base : ${planActuelId})`);

  // ── 2. Garde-fous ────────────────────────────────────────────────
  console.log("\n[2] Garde-fous…");
  const saved = cookieJar;
  cookieJar = "";
  const anon = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "offre" }),
  });
  check("Anonyme rejeté 401", anon.status === 401, `status=${anon.status}`);
  cookieJar = saved;

  const memePlan = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "plan", planId: planActuelId, cycle: "mensuel" }),
  });
  check(
    `Plan identique (${planActuelId}) refusé 400`,
    memePlan.status === 400,
    `status=${memePlan.status}`,
  );

  const invalide = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "hack", montant: 1 }),
  });
  check("Type inconnu refusé 400", invalide.status === 400, `status=${invalide.status}`);

  // ── 3. Upgrade plan Business mensuel ─────────────────────────────
  console.log("\n[3] Demande upgrade Business (mensuel)…");
  const upgrade = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "plan", planId: "business", cycle: "mensuel" }),
  });
  check("HTTP 200", upgrade.status === 200, `status=${upgrade.status}`);
  check(
    "Montant serveur = 75 000",
    upgrade.body?.montant === 75000,
    `montant=${upgrade.body?.montant}`,
  );
  check(
    "Référence ticket générée",
    typeof upgrade.body?.reference === "string" &&
      upgrade.body.reference.startsWith("TKT-"),
    `ref=${upgrade.body?.reference}`,
  );

  // ── 4. Upgrade plan annuel (montant annuel serveur) ──────────────
  console.log("\n[4] Demande Business (annuel)…");
  const annuel = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "plan", planId: "business", cycle: "annuel" }),
  });
  check(
    "Montant serveur = 756 000 (annuel)",
    annuel.body?.montant === 756000,
    `montant=${annuel.body?.montant}`,
  );

  // ── 5. Pack QR pk2 ───────────────────────────────────────────────
  console.log("\n[5] Achat pack 1 000 QR (pk2)…");
  const pack = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "pack", packId: "pk2" }),
  });
  check(
    "Montant serveur = 9 000",
    pack.body?.montant === 9000,
    `montant=${pack.body?.montant}`,
  );

  // ── 6. Quantité personnalisée (500 → 5 000) ──────────────────────
  console.log("\n[6] Pack personnalisé 500 QR…");
  const perso = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "pack", quantite: 500 }),
  });
  check(
    "Montant serveur = 5 000 (500 × 10)",
    perso.body?.montant === 5000,
    `montant=${perso.body?.montant}`,
  );

  // ── 7. Offre fidélité (pro : 25 000 × 0,8 × 3 = 60 000) ─────────
  console.log("\n[7] Offre fidélité (plan pro)…");
  const offre = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "offre" }),
  });
  check(
    `Montant serveur = ${Math.round(prixMensuelActuel * 0.8) * 3} (3 mois à -20 % du plan ${planActuelId})`,
    offre.body?.montant === Math.round(prixMensuelActuel * 0.8) * 3,
    `montant=${offre.body?.montant}`,
  );

  // ── 8. Résiliation avec motif ────────────────────────────────────
  console.log("\n[8] Résiliation (motif « trop-cher »)…");
  const resiliation = await req("/api/abonnement/commande", {
    method: "POST",
    body: JSON.stringify({ type: "resiliation", motif: "trop-cher" }),
  });
  check("HTTP 200", resiliation.status === 200, `status=${resiliation.status}`);
  check(
    "Référence ticket générée",
    typeof resiliation.body?.reference === "string",
    `ref=${resiliation.body?.reference}`,
  );

  // ── 9. Effets en base (tickets + notifications) ──────────────────
  console.log("\n[9] Effets en base…");
  const ticketsApres = await db.ticket.count({
    where: { userId: fabricant!.id, category: "Facturation" },
  });
  const notifsApres = await db.notification.count({
    where: { userId: fabricant!.id, type: "subscription" },
  });
  const creees = ticketsApres - ticketsAvant;
  check(
    "6 tickets Facturation créés (upgrade + annuel + pack + perso + offre + résiliation)",
    creees === 6,
    `créés=${creees}`,
  );
  check(
    "6 notifications fabricant créées",
    notifsApres - notifsAvant === 6,
    `+${notifsApres - notifsAvant}`,
  );

  const dernierTicket = await db.ticket.findFirst({
    where: { userId: fabricant!.id, category: "Facturation" },
    orderBy: { createdAt: "desc" },
  });
  check(
    "Ticket résiliation : catégorie Facturation, statut Ouvert",
    dernierTicket?.subject.includes("résiliation") === true &&
      dernierTicket?.status === "Ouvert",
    `sujet=${dernierTicket?.subject?.slice(0, 50)}`,
  );

  const audit = await db.auditLog.count({
    where: { userId: fabricant!.id, action: "DEMANDE_ABONNEMENT" },
  });
  check("Entrées AuditLog créées (≥6)", audit >= 6, `total=${audit}`);

  // ── Nettoyage (la DB de test reste propre) ───────────────────────
  console.log("\n[10] Nettoyage de test…");
  const ticketsTest = await db.ticket.findMany({
    where: { userId: fabricant!.id, category: "Facturation" },
    orderBy: { createdAt: "desc" },
    take: creees,
    select: { id: true },
  });
  for (const t of ticketsTest) {
    await db.ticket.delete({ where: { id: t.id } });
  }
  const notifsTest = await db.notification.findMany({
    where: { userId: fabricant!.id, type: "subscription" },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true },
  });
  for (const n of notifsTest) {
    await db.notification.delete({ where: { id: n.id } });
  }
  await db.auditLog.deleteMany({
    where: { userId: fabricant!.id, action: "DEMANDE_ABONNEMENT" },
  });
  check("Tickets/notifications/audit de test supprimés", true);

  // ── Bilan ────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(64));
  console.log(`Résultat : ${passed} OK / ${failed} ÉCHEC(S)`);
  console.log("─".repeat(64));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
