import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rate-limit";
import { getUserSubscription } from "@/lib/subscription";
import { PLANS, QR_PACKS, formatFCFA, formatNombre } from "@/lib/fabricant-types";

/**
 * POST /api/abonnement/commande
 *
 * Auth-required (FABRICANT) — enregistre une DEMANDE d'achat / de changement
 * d'abonnement. VerifScan n'a pas (encore) de passerelle de paiement
 * automatisée : le parcours réel est
 *
 *   1. Le fabricant clique « Upgrade » / « Acheter » dans Mon Abonnement
 *   2. Cette route crée un TICKET « Facturation » (visible par le SuperAdmin
 *      dans Support) + une NOTIFICATION de confirmation pour le fabricant
 *      + une entrée AuditLog
 *   3. L'équipe VerifScan encaisse le paiement (Orange Money / Wave / Carte /
 *      Virement) puis change le plan depuis SuperAdmin → Abonnements
 *
 * Le MONTANT est toujours recalculé côté serveur à partir des catalogues
 * officiels (PLANS / QR_PACKS de fabricant-types) — jamais lu depuis le
 * corps de la requête (anti-falsification de prix).
 *
 * ── Body ────────────────────────────────────────────────────────
 *   type      — "plan" | "pack" | "offre" | "resiliation"
 *   planId?   — "starter" | "pro" | "business"   (type=plan)
 *   cycle?    — "mensuel" | "annuel"             (type=plan, défaut mensuel)
 *   packId?   — "pk1" | "pk2" | "pk3"            (type=pack, si pas quantite)
 *   quantite? — 50..100 000                       (type=pack personnalisé)
 *   motif?    — raison textuelle                 (type=resiliation)
 *
 * ── Réponse ─────────────────────────────────────────────────────
 *   { ok, reference, ticketId, libelle, montant }
 */

const CommandeSchema = z.object({
  type: z.enum(["plan", "pack", "offre", "resiliation"]),
  planId: z.enum(["starter", "pro", "business"]).optional(),
  cycle: z.enum(["mensuel", "annuel"]).optional(),
  packId: z.enum(["pk1", "pk2", "pk3"]).optional(),
  quantite: z.number().int().min(50).max(100_000).optional(),
  motif: z.string().max(500).optional(),
});

/** Tarif unitaire d'un QR code acheté hors quota (aligné sur l'UI : 10 FCFA). */
const PRIX_UNITAIRE_QR = 10;

function generateReference(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = String(Date.now()).slice(-4);
  return `TKT-${y}-${m}${d}-${suffix}`;
}

const PLAN_IDS = ["starter", "pro", "business"] as const;
type PlanId = (typeof PLAN_IDS)[number];

export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const limited = applyRateLimit(request, {
    windowMs: 60_000,
    max: 10,
    namespace: "abonnement:commande",
    key: token.sub,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = CommandeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  try {
    const userId = token.sub;

    // ── Plan actuel (Subscription ACTIVE, repli Setting `plan:<id>`) ────
    let currentPlanId: PlanId = "starter";
    try {
      const sub = await getUserSubscription(userId);
      if (sub && (PLAN_IDS as readonly string[]).includes(sub.plan)) {
        currentPlanId = sub.plan as PlanId;
      } else {
        const setting = await db.setting.findUnique({
          where: { key: `plan:${userId}` },
        });
        const v = setting?.value?.trim();
        if (v && (PLAN_IDS as readonly string[]).includes(v)) {
          currentPlanId = v as PlanId;
        }
      }
    } catch {
      // repli déjà initialisé à "starter"
    }

    // ── Fabricant (pour le ticket) ──────────────────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, companyName: true },
    });

    // ── Construction de la demande — montant TOUJOURS calculé serveur ──
    let libelle = "";
    let montant = 0;
    let sujet = "";
    let priorite: "Normale" | "Haute" = "Normale";
    let tag = "abonnement";
    let notifTitre = "";
    let notifMessage = "";
    let notifSeverite: "info" | "success" | "warning" = "success";
    const details: string[] = [];

    if (input.type === "plan") {
      if (!input.planId) {
        return NextResponse.json(
          { error: "planId requis pour une demande de plan" },
          { status: 400 }
        );
      }
      if (input.planId === currentPlanId) {
        return NextResponse.json(
          { error: `Vous êtes déjà sur le plan ${input.planId}` },
          { status: 400 }
        );
      }
      const plan = PLANS.find((p) => p.id === input.planId);
      if (!plan) {
        return NextResponse.json({ error: "Plan inconnu" }, { status: 400 });
      }
      const cycle = input.cycle === "annuel" ? "annuel" : "mensuel";
      montant = cycle === "annuel" ? plan.prixAnnuel : plan.prixMensuel;
      libelle = `Plan ${plan.nom} — ${cycle}`;
      sujet = `Demande d'abonnement — ${libelle} (${formatFCFA(montant)})`;
      priorite = "Haute";
      details.push(
        `Plan actuel : ${currentPlanId}`,
        `Plan demandé : ${plan.nom} (${cycle})`,
        `Montant à encaisser : ${formatFCFA(montant)}`
      );
      notifTitre = `Demande envoyée — ${libelle}`;
      notifMessage =
        `Votre demande (${sujet}) a été transmise à l'équipe VerifScan. ` +
        `Vous serez contacté sous 24 h pour finaliser le paiement ` +
        `(${formatFCFA(montant)}) et activer votre nouveau plan.`;
    } else if (input.type === "pack") {
      if (input.packId) {
        const pack = QR_PACKS.find((p) => p.id === input.packId);
        if (!pack) {
          return NextResponse.json({ error: "Pack inconnu" }, { status: 400 });
        }
        montant = pack.prix;
        libelle = `Pack ${formatNombre(pack.quantite)} QR codes`;
        details.push(
          `Pack : ${formatNombre(pack.quantite)} QR codes`,
          `Prix unitaire : ${pack.prixUnitaire} FCFA/QR`,
          `Montant à encaisser : ${formatFCFA(montant)}`
        );
      } else if (input.quantite) {
        montant = input.quantite * PRIX_UNITAIRE_QR;
        libelle = `Pack personnalisé — ${formatNombre(input.quantite)} QR codes`;
        details.push(
          `Quantité : ${formatNombre(input.quantite)} QR codes`,
          `Tarif : ${PRIX_UNITAIRE_QR} FCFA/QR`,
          `Montant à encaisser : ${formatFCFA(montant)}`
        );
      } else {
        return NextResponse.json(
          { error: "packId ou quantite requis" },
          { status: 400 }
        );
      }
      sujet = `Achat de QR codes — ${libelle} (${formatFCFA(montant)})`;
      tag = "pack-qr";
      details.push(`Plan actuel : ${currentPlanId}`);
      notifTitre = `Demande envoyée — ${libelle}`;
      notifMessage =
        `Votre commande (${sujet}) a été transmise à l'équipe VerifScan. ` +
        `Vous serez contacté sous 24 h pour finaliser le paiement ` +
        `(${formatFCFA(montant)}). Vos QR codes seront crédités juste après.`;
    } else if (input.type === "offre") {
      const planActuel = PLANS.find((p) => p.id === currentPlanId);
      const prixMensuelReduit = Math.round(
        (planActuel?.prixMensuel ?? 0) * 0.8
      );
      montant = prixMensuelReduit * 3;
      libelle = `Offre fidélité — 20 % pendant 3 mois (plan ${planActuel?.nom ?? currentPlanId})`;
      sujet = `Acceptation offre fidélité — ${libelle} (${formatFCFA(montant)})`;
      priorite = "Haute";
      tag = "offre-fidelite";
      details.push(
        `Plan actuel : ${currentPlanId}`,
        `Prix réduit : ${formatFCFA(prixMensuelReduit)}/mois pendant 3 mois`,
        `Montant à encaisser : ${formatFCFA(montant)}`
      );
      notifTitre = `Offre acceptée — ${libelle}`;
      notifMessage =
        `Merci pour votre fidélité ! Votre acceptation (${sujet}) a été ` +
        `transmise à l'équipe VerifScan qui vous contactera sous 24 h pour ` +
        `le paiement (${formatFCFA(montant)}).`;
    } else {
      // resiliation
      const motif =
        typeof input.motif === "string" && input.motif.trim()
          ? input.motif.trim()
          : "";
      libelle = "Demande de résiliation d'abonnement";
      sujet = motif
        ? `Demande de résiliation d'abonnement — ${motif}`
        : "Demande de résiliation d'abonnement";
      tag = "resiliation";
      notifSeverite = "warning";
      details.push(
        `Plan actuel : ${currentPlanId}`,
        motif ? `Raison : ${motif}` : "Raison : non précisée"
      );
      notifTitre = "Demande de résiliation enregistrée";
      notifMessage =
        "Votre demande a été transmise à l'équipe VerifScan. Votre " +
        "abonnement reste actif jusqu'à la fin de la période déjà payée — " +
        "nous vous contacterons pour confirmer.";
    }

    // ── Création du ticket (visible par le SuperAdmin dans Support) ─────
    let reference = generateReference();
    for (let i = 0; i < 5; i++) {
      const existing = await db.ticket.findUnique({ where: { reference } });
      if (!existing) break;
      reference = generateReference();
    }

    const description = [
      `Demandeur : ${user?.name ?? "—"} (${user?.email ?? "—"})`,
      `Entreprise : ${user?.companyName ?? "—"}`,
      ...details,
      "",
      "Paiement à encaisser via Orange Money / Wave / Carte bancaire / Virement.",
      "Après encaissement : changer le plan depuis SuperAdmin → Abonnements.",
    ].join("\n");

    const ticket = await db.ticket.create({
      data: {
        reference,
        subject: sujet,
        description,
        priority: priorite,
        category: "Facturation",
        status: "Ouvert",
        userId,
        requesterName: user?.name ?? null,
        requesterCompany: user?.companyName ?? null,
        assignedTo: "Admin VerifScan",
        tags: JSON.stringify([tag]),
        messages: JSON.stringify([
          {
            from: "client",
            author: user?.name ?? user?.email ?? "Fabricant",
            content: description,
            timestamp: "À l'instant",
          },
        ]),
        internalNotes: JSON.stringify([]),
      },
    });

    // ── Notification fabricant (cloche du dashboard) ────────────────────
    await db.notification.create({
      data: {
        userId,
        type: "subscription",
        title: notifTitre,
        message: notifMessage,
        severity: notifSeverite,
        data: JSON.stringify({
          ticketReference: reference,
          demande: libelle,
          montant,
        }),
      },
    });

    // ── Piste d'audit ───────────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        userId,
        action: "DEMANDE_ABONNEMENT",
        entity: "Ticket",
        entityId: ticket.id,
        metadata: JSON.stringify({
          reference,
          type: input.type,
          libelle,
          montant,
          currentPlanId,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      reference,
      ticketId: ticket.id,
      libelle,
      montant,
    });
  } catch (error) {
    console.error("[POST /api/abonnement/commande] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'enregistrement de la demande" },
      { status: 500 }
    );
  }
}
