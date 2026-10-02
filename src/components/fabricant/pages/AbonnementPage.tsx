"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  Check,
  CreditCard,
  AlertTriangle,
  Smartphone,
  Wallet,
  Building2,
  X,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  PillFilter,
  GradientButton,
  OutlineButton,
  ProgressBar,
} from "@/components/fabricant/ui";
import {
  PLANS,
  QR_PACKS,
  formatFCFA,
  formatNombre,
} from "@/lib/fabricant-types";
import { useFabricantData } from "../FabricantDataProvider";
import { toast } from "sonner";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
type BillingCycle = "mensuel" | "annuel";
type PaymentFilter = "tous" | "reussis" | "echoues";
type PeriodFilter = "30j" | "90j" | "12m" | "perso";
type CancelReason =
  | ""
  | "trop-cher"
  | "fonctions"
  | "plus-utilise"
  | "concurrent"
  | "autre";

// Demande d'achat / changement affichée dans le modal de confirmation.
// Le MONTANT est recalculé côté serveur (catalogues officiels) — les montants
// ici ne servent qu'à l'aperçu.
type CmdPayload =
  | { type: "plan"; planId: string; cycle: BillingCycle }
  | { type: "pack"; packId?: string; quantite?: number }
  | { type: "offre" };

type CmdDemande = {
  titre: string;
  lignes: string[];
  montant: number; // affiché tel quel (pack / offre)
  prixMensuel?: number; // type=plan → prix selon le cycle choisi
  prixAnnuel?: number;
  cycle: BillingCycle;
  payload: CmdPayload;
};

// Rang hiérarchique des plans — compare le plan courant au plan cliqué.
const RANG_PLAN: Record<string, number> = { starter: 0, pro: 1, business: 2 };

// Payment methods shown as icons in the "Méthode de paiement" subsection
const PAYMENT_METHODS = [
  { id: "orange", nom: "Orange Money", icon: Smartphone, color: "#F59E0B" },
  { id: "wave", nom: "Wave", icon: Wallet, color: "#0EA5E9" },
  { id: "carte", nom: "Carte bancaire", icon: CreditCard, color: "#022150" },
  { id: "virement", nom: "Virement", icon: Building2, color: "#10B981" },
];

// ----------------------------------------------------------------------------
// Small helper: render a green check row
// ----------------------------------------------------------------------------
function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start gap-2 text-[13px] text-[#374151]">
      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
      <span>
        <span className="font-medium text-[#111827]">{label} :</span> {value}
      </span>
    </li>
  );
}

// ----------------------------------------------------------------------------
// Main page
// ----------------------------------------------------------------------------
export function AbonnementPage() {
  const { data, refresh } = useFabricantData();
  const ABONNEMENT = data.abonnement;

  // No Payment model in the schema yet — show an empty state instead of
  // fake payment history.
  const PAIEMENTS: import("@/lib/fabricant-types").Payment[] = [];

  const [billing, setBilling] = useState<BillingCycle>("mensuel");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("tous");
  const [period, setPeriod] = useState<PeriodFilter>("30j");
  const [cancelReason, setCancelReason] = useState<CancelReason>("");
  const [customQrQty, setCustomQrQty] = useState<number>(100);
  const [cmdBusy, setCmdBusy] = useState(false);
  const [resiliationBusy, setResiliationBusy] = useState(false);
  const [cmd, setCmd] = useState<CmdDemande | null>(null);

  // Filter payments by status
  const filteredPayments = useMemo(() => {
    if (paymentFilter === "reussis") {
      return PAIEMENTS.filter((p) => p.status === "reussi" || p.status === "rembourse");
    }
    if (paymentFilter === "echoues") {
      return PAIEMENTS.filter((p) => p.status === "echoue" || p.status === "en_attente");
    }
    return PAIEMENTS;
  }, [paymentFilter]);

  const total12Mois = useMemo(
    () =>
      PAIEMENTS.filter((p) => p.status === "reussi").reduce(
        (sum, p) => sum + p.montant,
        0,
      ),
    [],
  );

  const customQrPrice = Math.max(0, customQrQty) * 10;

  // ── Plan actuel dérivé des VRAIES données serveur ──────────────────
  // ABONNEMENT.plan est un nom affichable (« Pro ») → retrouve l'id du plan
  // et remplace le flag `actuel` codé en dur dans PLANS.
  const currentPlanId = useMemo(() => {
    const p = PLANS.find(
      (pl) => pl.nom.toLowerCase() === (ABONNEMENT?.plan ?? "").toLowerCase(),
    );
    return p?.id ?? "pro";
  }, [ABONNEMENT]);

  // ── Envoi d'une demande (POST /api/abonnement/commande) ────────────
  // Le serveur crée un ticket Facturation (Support SuperAdmin) + une
  // notification de confirmation + une entrée d'audit.
  const envoyerDemande = async (payload: CmdPayload) => {
    if (cmdBusy) return;
    setCmdBusy(true);
    try {
      const res = await fetch("/api/abonnement/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Échec de l'envoi de la demande");
      }
      toast.success(`Demande envoyée — réf. ${json.reference}`, {
        description:
          "L'équipe VerifScan vous contactera sous 24 h pour finaliser le paiement.",
      });
      setCmd(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setCmdBusy(false);
    }
  };

  const ouvrirCmdPlan = (planId: string) => {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan || !ABONNEMENT) return;
    setCmd({
      titre: RANG_PLAN[planId] > RANG_PLAN[currentPlanId]
        ? `Upgrade vers ${plan.nom}`
        : `Changer de plan — ${plan.nom}`,
      lignes: [
        `Plan actuel : ${ABONNEMENT.plan}`,
        `Nouveau plan : ${plan.nom}`,
        "Paiement : Orange Money · Wave · Carte bancaire · Virement",
      ],
      montant: plan.prixMensuel,
      prixMensuel: plan.prixMensuel,
      prixAnnuel: plan.prixAnnuel,
      cycle: billing,
      payload: { type: "plan", planId: plan.id, cycle: billing },
    });
  };

  const ouvrirCmdPack = (pack: (typeof QR_PACKS)[number]) => {
    setCmd({
      titre: "Acheter des QR codes",
      lignes: [
        `Pack : ${formatNombre(pack.quantite)} QR codes`,
        `Prix unitaire : ${pack.prixUnitaire} FCFA/QR`,
        ...(pack.economie > 0
          ? [`Économie : ${formatFCFA(pack.quantite * 10 - pack.prix)}`]
          : []),
        "Paiement : Orange Money · Wave · Carte bancaire · Virement",
      ],
      montant: pack.prix,
      cycle: "mensuel",
      payload: { type: "pack", packId: pack.id },
    });
  };

  const ouvrirCmdPerso = () => {
    if (customQrQty <= 0) return;
    setCmd({
      titre: "Quantité personnalisée",
      lignes: [
        `Quantité : ${formatNombre(customQrQty)} QR codes`,
        "Tarif : 10 FCFA/QR",
        "Paiement : Orange Money · Wave · Carte bancaire · Virement",
      ],
      montant: customQrPrice,
      cycle: "mensuel",
      payload: { type: "pack", quantite: customQrQty },
    });
  };

  const ouvrirCmdOffre = () => {
    const planActuel = PLANS.find((p) => p.id === currentPlanId);
    const prixReduit = Math.round((planActuel?.prixMensuel ?? 0) * 0.8);
    setCmd({
      titre: "Accepter l'offre fidélité",
      lignes: [
        `Plan : ${ABONNEMENT?.plan ?? "—"}`,
        `Prix réduit : ${formatFCFA(prixReduit)}/mois pendant 3 mois`,
        "Paiement : Orange Money · Wave · Carte bancaire · Virement",
      ],
      montant: prixReduit * 3,
      cycle: "mensuel",
      payload: { type: "offre" },
    });
  };

  const confirmerResiliation = async () => {
    if (resiliationBusy) return;
    if (!cancelReason) {
      toast.error("Sélectionnez d'abord une raison d'annulation");
      return;
    }
    setResiliationBusy(true);
    try {
      const res = await fetch("/api/abonnement/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "resiliation", motif: cancelReason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Échec de l'envoi de la demande");
      }
      toast.success(`Demande enregistrée — réf. ${json.reference}`, {
        description:
          "Votre abonnement reste actif jusqu'à la fin de la période payée. L'équipe vous contactera pour confirmer.",
      });
      setCancelReason("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setResiliationBusy(false);
    }
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Abonnement data may be null if its server-side fetch failed.
  // (placed AFTER all hooks to respect rules-of-hooks)
  if (!ABONNEMENT) {
    return (
      <div className="flex items-center justify-center py-20 text-center">
        <div>
          <p className="text-sm text-[#6B7280]">
            Les informations d&apos;abonnement ne sont pas disponibles pour le moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =================================================================
          HEADER
          ================================================================= */}
      <PageHeader
        title="Mon Abonnement"
        subtitle="Gérez votre plan et votre facturation"
      >
        <span
          className="inline-flex items-center rounded-full bg-gradient-to-r from-[#022150] to-[#10B981] px-4 py-2 text-[14px] font-bold text-white shadow-sm"
        >
          ⭐ Plan {ABONNEMENT.plan}
        </span>
      </PageHeader>

      {/* =================================================================
          SECTION 1 — Plan actuel (hero card)
          ================================================================= */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border-2 border-[#022150] p-8"
        style={{
          background: "linear-gradient(135deg, #F0F4F9 0%, #F0FDF4 100%)",
        }}
      >
        {/* Top: plan name + status badge */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-[32px] font-bold leading-none text-[#111827]">
              {ABONNEMENT.plan}
            </h2>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-semibold text-[#065F46]"
            >
              ✅ {ABONNEMENT.status}
            </span>
          </div>
          <p className="font-display text-[24px] font-bold text-[#111827]">
            {formatFCFA(ABONNEMENT.prix)}
            <span className="text-[14px] font-medium text-[#6B7280]">/mois</span>
          </p>
        </div>

        {/* Info row */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#6B7280]">
          <span>
            Date début :{" "}
            <span className="font-medium text-[#374151]">
              {ABONNEMENT.dateDebut}
            </span>
          </span>
          <span>
            Prochaine facturation :{" "}
            <span className="font-medium text-[#374151]">
              {ABONNEMENT.prochaineFacturation}
            </span>
          </span>
          <span>
            Paiement :{" "}
            <span className="font-medium text-[#374151]">
              {ABONNEMENT.methodePaiement}
            </span>
          </span>
        </div>

        {/* Quota usage */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Produits */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-[13px] font-medium text-[#6B7280]">Produits</p>
            <p className="mt-1 font-display text-[20px] font-bold text-[#111827]">
              {ABONNEMENT.quota.produits.utilise} / ∞
            </p>
            <div className="mt-2">
              <ProgressBar value={100} gradient="from-[#10B981] to-[#10B981]" />
            </div>
            <p className="mt-2 text-[12px] font-semibold text-[#10B981]">
              Illimité
            </p>
          </div>

          {/* QR codes */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-[13px] font-medium text-[#6B7280]">QR codes</p>
            <p className="mt-1 font-display text-[20px] font-bold text-[#111827]">
              {formatNombre(ABONNEMENT.quota.qrCodes.utilise)} /{" "}
              {formatNombre(ABONNEMENT.quota.qrCodes.limite)}
            </p>
            <div className="mt-2">
              <ProgressBar
                value={ABONNEMENT.quota.qrCodes.utilise}
                max={ABONNEMENT.quota.qrCodes.limite}
                gradient="from-[#F59E0B] to-[#F59E0B]"
              />
            </div>
            <p className="mt-2 text-[12px] font-semibold text-[#F59E0B]">
              {ABONNEMENT.quota.qrCodes.label}
            </p>
            <p className="text-[11px] text-[#6B7280]">
              Quota suffisant pour ~3 mois
            </p>
          </div>

          {/* Statistiques */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-[13px] font-medium text-[#6B7280]">Statistiques</p>
            <p className="mt-1 font-display text-[20px] font-bold text-[#111827]">
              ∞ / ∞
            </p>
            <div className="mt-2">
              <ProgressBar value={100} gradient="from-[#10B981] to-[#10B981]" />
            </div>
            <p className="mt-2 text-[12px] font-semibold text-[#10B981]">
              Illimité
            </p>
          </div>
        </div>

        {/* Buttons — toutes fonctionnelles (demande envoyée au SuperAdmin) */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {currentPlanId !== "business" && (
            <GradientButton onClick={() => ouvrirCmdPlan("business")}>
              Upgrade vers Business
            </GradientButton>
          )}
          <OutlineButton onClick={() => scrollTo("plans")}>
            Voir les autres plans
          </OutlineButton>
          <button
            type="button"
            onClick={() => scrollTo("paiements")}
            className="text-[14px] font-medium text-[#022150] underline-offset-4 hover:underline"
          >
            Gérer la facturation
          </button>
        </div>

        {/* Avantages */}
        <div className="mt-6 border-t border-[#DCE7F2] pt-6">
          <p className="mb-3 text-[14px] font-semibold text-[#111827]">
            Avantages inclus
          </p>
          <ul className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
            {ABONNEMENT.avantages.map((av, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[13px] text-[#374151]"
              >
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                <span>{av}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* =================================================================
          SECTION 2 — Historique des paiements
          ================================================================= */}
      <div id="paiements">
      <SectionCard
        title="Historique des paiements"
        bodyClassName="p-0"
      >
        {/* Filters row */}
        <div className="flex flex-col gap-3 border-b border-[#F3F4F6] p-5 sm:flex-row sm:items-center sm:justify-between">
          <PillFilter<PaymentFilter>
            value={paymentFilter}
            onChange={setPaymentFilter}
            options={[
              { value: "tous", label: "Tous" },
              { value: "reussis", label: "Réussis" },
              { value: "echoues", label: "Échoués" },
            ]}
          />
          <label className="flex items-center gap-2 text-[13px] text-[#6B7280]">
            <span>Période :</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] focus:border-[#022150] focus:outline-none focus:ring-2 focus:ring-[#022150]/20"
            >
              <option value="30j">30 derniers jours</option>
              <option value="90j">90 derniers jours</option>
              <option value="12m">12 derniers mois</option>
              <option value="perso">Personnalisé</option>
            </select>
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                {["Date", "Montant", "Statut", "Méthode", "Référence", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]"
                >
                  <td className="px-5 py-3 text-[14px] text-[#374151]">{p.date}</td>
                  <td className="px-5 py-3 text-[14px] font-semibold text-[#111827]">
                    {formatFCFA(p.montant)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3 text-[14px] text-[#374151]">
                    {p.methode}
                  </td>
                  <td className="px-5 py-3">
                    <code className="font-mono text-[12px] text-[#6B7280]">
                      {p.reference}
                    </code>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Télécharger la facture"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:border-[#022150] hover:text-[#022150]"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Voir les détails"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:border-[#022150] hover:text-[#022150]"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[13px] text-[#6B7280]"
                  >
                    Historique des paiements bientôt disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="flex flex-col gap-4 border-t border-[#F3F4F6] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[16px] font-bold text-[#111827]">
              Total payé (12 mois) : {formatFCFA(total12Mois)}
            </p>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              Prochain paiement : {formatFCFA(ABONNEMENT.prix)} le{" "}
              {ABONNEMENT.prochaineFacturation}
            </p>
          </div>
          <OutlineButton
            onClick={() =>
              toast.info("Aucune facture disponible pour le moment", {
                description:
                  "Votre historique de paiements et vos factures apparaîtront ici après votre premier paiement.",
              })
            }
          >
            <Download className="h-4 w-4" />
            Télécharger toutes les factures (ZIP)
          </OutlineButton>
        </div>

        {/* Méthode de paiement subsection */}
        <div className="border-t border-[#F3F4F6] p-5">
          <p className="mb-3 text-[14px] font-semibold text-[#111827]">
            Méthode de paiement
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">
                {ABONNEMENT.methodePaiement}
              </p>
              <p className="text-[13px] text-[#6B7280]">
                {ABONNEMENT.numeroPaiement}
              </p>
            </div>
            <OutlineButton
              className="px-3 py-1.5 text-[13px]"
              onClick={() =>
                toast.info("Méthode de paiement", {
                  description:
                    "Le paiement se finalise avec l'équipe VerifScan : Orange Money, Wave, carte bancaire ou virement — à votre convenance.",
                })
              }
            >
              Modifier
            </OutlineButton>
          </div>

          {/* Payment methods icons */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const isActive = m.nom === ABONNEMENT.methodePaiement;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    isActive
                      ? "border-[#022150] bg-[#F0F4F9]"
                      : "border-[#E5E7EB] bg-white"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${m.color}15`, color: m.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[12px] font-medium text-[#374151]">
                    {m.nom}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
      </div>

      {/* =================================================================
          SECTION 3 — Changer de plan (comparison)
          ================================================================= */}
      <section className="space-y-4" id="plans">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-[18px] font-semibold text-[#111827]">
              Comparer les plans
            </h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              Choisissez l'offre qui correspond à votre activité
            </p>
          </div>
          <PillFilter<BillingCycle>
            value={billing}
            onChange={setBilling}
            options={[
              { value: "mensuel", label: "Mensuel" },
              { value: "annuel", label: "Annuel -30%" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative flex flex-col rounded-xl border border-[#E5E7EB] bg-white p-6"
                style={
                  isCurrent
                    ? {
                        border: "2px solid #022150",
                        background:
                          "linear-gradient(135deg, #F0F4F9 0%, #F0FDF4 100%)",
                      }
                    : undefined
                }
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-gradient-to-r from-[#022150] to-[#10B981] px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                    ⭐ Plan actuel
                  </span>
                )}

                <h3 className="font-display text-[18px] font-semibold text-[#111827]">
                  {plan.nom}
                </h3>

                <div className="mt-2">
                  {billing === "mensuel" ? (
                    <p className="font-display text-[24px] font-bold text-[#111827]">
                      {formatFCFA(plan.prixMensuel)}
                      <span className="text-[13px] font-medium text-[#6B7280]">
                        /mois
                      </span>
                    </p>
                  ) : (
                    <div>
                      <p className="font-display text-[24px] font-bold text-[#111827]">
                        {formatFCFA(plan.prixAnnuel)}
                        <span className="text-[13px] font-medium text-[#6B7280]">
                          /an
                        </span>
                      </p>
                      <p className="text-[13px] text-[#9CA3AF] line-through">
                        {formatFCFA(plan.prixMensuel * 12)} /an
                      </p>
                    </div>
                  )}
                </div>

                <ul className="mt-4 space-y-2">
                  <FeatureRow label="Produits" value={plan.produits} />
                  <FeatureRow label="QR codes" value={plan.qrCodes} />
                  <FeatureRow label="Statistiques" value={plan.statistiques} />
                  <FeatureRow label="Support" value={plan.support} />
                  {plan.fonctionnalites.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[13px] text-[#374151]"
                    >
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-2">
                  {plan.id === currentPlanId ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#F3F4F6] px-4 py-2.5 text-[14px] font-semibold text-[#9CA3AF] cursor-not-allowed"
                    >
                      Plan actuel
                    </button>
                  ) : RANG_PLAN[plan.id] > RANG_PLAN[currentPlanId] ? (
                    <GradientButton
                      className="w-full"
                      onClick={() => ouvrirCmdPlan(plan.id)}
                    >
                      Upgrade vers {plan.nom}
                    </GradientButton>
                  ) : (
                    <OutlineButton
                      className="w-full"
                      onClick={() => ouvrirCmdPlan(plan.id)}
                    >
                      Passer à {plan.nom}
                    </OutlineButton>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[12px] text-[#6B7280]">
          Le changement est immédiat et proratisé.
        </p>
      </section>

      {/* =================================================================
          SECTION 4 — Acheter des QR codes supplémentaires
          ================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-[18px] font-semibold text-[#111827]">
            Besoin de plus de QR codes ?
          </h2>
          <p className="mt-0.5 text-[14px] text-[#6B7280]">
            Achetez des packs supplémentaires à utiliser en dehors de votre quota
            mensuel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {QR_PACKS.map((pack) => {
            const isRecommended = pack.id === "pk2";
            return (
              <div
                key={pack.id}
                className="relative flex flex-col rounded-xl border bg-white p-6"
                style={{
                  border: isRecommended
                    ? "2px solid #F59E0B"
                    : "1px solid #E5E7EB",
                }}
              >
                {pack.badge && (
                  <span
                    className="absolute -top-3 left-6 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-sm"
                    style={{
                      backgroundColor: isRecommended ? "#F59E0B" : "#10B981",
                    }}
                  >
                    {pack.badge}
                  </span>
                )}

                <p className="text-[16px] font-semibold text-[#111827]">
                  {formatNombre(pack.quantite)} QR codes
                </p>
                <p className="mt-2 font-display text-[24px] font-bold text-[#111827]">
                  {formatFCFA(pack.prix)}
                </p>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  {pack.prixUnitaire} FCFA/QR
                </p>

                {pack.economie > 0 && (
                  <p className="mt-2 text-[12px] font-medium text-[#10B981]">
                    Économie : {formatFCFA(pack.quantite * 10 - pack.prix)}
                  </p>
                )}

                <div className="mt-6 flex-1" />
                {isRecommended ? (
                  <GradientButton
                    className="w-full"
                    onClick={() => ouvrirCmdPack(pack)}
                  >
                    Acheter
                  </GradientButton>
                ) : (
                  <OutlineButton
                    className="w-full"
                    onClick={() => ouvrirCmdPack(pack)}
                  >
                    Acheter
                  </OutlineButton>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom quantity */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <p className="text-[14px] font-semibold text-[#111827]">
            Quantité personnalisée
          </p>
          <p className="mt-0.5 text-[12px] text-[#6B7280]">
            Tarif : 10 FCFA / QR code
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-[12px] font-medium text-[#6B7280]">
                Quantité
              </span>
              <input
                type="number"
                min={0}
                step={50}
                value={customQrQty}
                onChange={(e) =>
                  setCustomQrQty(
                    Math.max(0, parseInt(e.target.value || "0", 10) || 0),
                  )
                }
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] font-medium text-[#111827] focus:border-[#022150] focus:outline-none focus:ring-2 focus:ring-[#022150]/20"
              />
            </label>
            <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2">
              <p className="text-[12px] text-[#6B7280]">Prix total</p>
              <p className="text-[16px] font-bold text-[#111827]">
                {formatFCFA(customQrPrice)}
              </p>
            </div>
            <GradientButton
              disabled={customQrQty <= 0 || cmdBusy}
              onClick={ouvrirCmdPerso}
            >
              <CreditCard className="h-4 w-4" />
              Acheter
            </GradientButton>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 5 — Annuler l'abonnement
          ================================================================= */}
      <section
        className="rounded-xl border p-6"
        style={{ backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#92400E]" />
          <div>
            <h2 className="font-display text-[18px] font-semibold text-[#92400E]">
              Annuler mon abonnement
            </h2>
            <p className="mt-1 text-[14px] text-[#92400E]">
              Êtes-vous sûr de vouloir annuler ?
            </p>
          </div>
        </div>

        {/* Consequences */}
        <ul className="mt-4 space-y-1.5">
          {[
            `Votre abonnement restera actif jusqu'au ${ABONNEMENT.prochaineFacturation}`,
            "Vous perdrez l'accès aux fonctionnalités Pro après cette date",
            "Vos produits et QR codes resteront actifs",
            "Vous pourrez réactiver votre abonnement à tout moment",
          ].map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[13px] text-[#78350F]"
            >
              <span className="mt-0.5">⚠️</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>

        {/* Reason dropdown */}
        <div className="mt-5">
          <label className="mb-1 block text-[13px] font-semibold text-[#92400E]">
            Raison de l'annulation
          </label>
          <select
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value as CancelReason)}
            className="w-full max-w-md rounded-lg border border-[#F59E0B] bg-white px-3 py-2 text-[14px] text-[#374151] focus:border-[#92400E] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
          >
            <option value="">— Sélectionnez une raison —</option>
            <option value="trop-cher">Trop cher</option>
            <option value="fonctions">Fonctionnalités insuffisantes</option>
            <option value="plus-utilise">Je n'utilise plus</option>
            <option value="concurrent">Concurrent</option>
            <option value="autre">Autre</option>
          </select>
          {cancelReason === "autre" && (
            <textarea
              rows={2}
              placeholder="Précisez votre raison…"
              className="mt-2 w-full max-w-md rounded-lg border border-[#F59E0B] bg-white px-3 py-2 text-[14px] text-[#374151] focus:border-[#92400E] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
            />
          )}
        </div>

        {/* Feedback textarea */}
        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-semibold text-[#92400E]">
            Dites-nous comment nous pouvons nous améliorer{" "}
            <span className="font-normal text-[#92400E]/70">(optionnel)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Vos suggestions…"
            className="w-full max-w-2xl rounded-lg border border-[#F59E0B] bg-white px-3 py-2 text-[14px] text-[#374151] focus:border-[#92400E] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
          />
        </div>

        {/* Retention offer */}
        <div className="mt-5 rounded-lg border border-[#10B981]/30 bg-white p-4">
          <p className="text-[14px] font-semibold text-[#111827]">
            💡 Offre spéciale : 20% de réduction pendant 3 mois
          </p>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            Votre nouveau prix :{" "}
            {formatFCFA(
              Math.round(
                (PLANS.find((p) => p.id === currentPlanId)?.prixMensuel ?? 0) *
                  0.8,
              ),
            )}
            /mois
          </p>
          <div className="mt-3">
            <GradientButton
              className="px-3 py-1.5 text-[13px]"
              onClick={ouvrirCmdOffre}
            >
              Accepter l'offre
            </GradientButton>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => {
              toast.success("Excellente décision ! Votre abonnement reste actif.");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#10B981] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:shadow-md"
          >
            Garder mon abonnement
          </button>
          <button
            type="button"
            onClick={confirmerResiliation}
            disabled={resiliationBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#EF4444] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#DC2626] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" />
            {resiliationBusy ? "Envoi en cours…" : "Confirmer l'annulation"}
          </button>
        </div>
      </section>

      {/* =================================================================
          MODAL — Confirmation de demande (plan / pack QR / offre fidélité)
          ================================================================= */}
      {cmd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => !cmdBusy && setCmd(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
              <h3 className="text-[15px] font-bold text-[#022150]">
                {cmd.titre}
              </h3>
              <button
                type="button"
                onClick={() => setCmd(null)}
                disabled={cmdBusy}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <ul className="space-y-1.5">
                {cmd.lignes.map((l, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[13px] text-[#374151]"
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>

              {/* Cycle de facturation (demandes de plan uniquement) */}
              {cmd.prixMensuel != null && (
                <div className="mt-4">
                  <PillFilter<BillingCycle>
                    value={cmd.cycle}
                    onChange={(v) =>
                      setCmd((prev) =>
                        prev
                          ? {
                              ...prev,
                              cycle: v,
                              payload:
                                prev.payload.type === "plan"
                                  ? { ...prev.payload, cycle: v }
                                  : prev.payload,
                            }
                          : prev,
                      )
                    }
                    options={[
                      { value: "mensuel", label: "Mensuel" },
                      { value: "annuel", label: "Annuel -30%" },
                    ]}
                  />
                </div>
              )}

              <div className="mt-4 rounded-lg bg-[#F9FAFB] p-4 text-center">
                <p className="text-[12px] font-medium text-[#6B7280]">Montant</p>
                <p className="font-display text-[24px] font-bold text-[#111827]">
                  {formatFCFA(
                    cmd.prixMensuel != null
                      ? cmd.cycle === "mensuel"
                        ? cmd.prixMensuel
                        : cmd.prixAnnuel ?? cmd.montant
                      : cmd.montant,
                  )}
                  {cmd.prixMensuel != null && (
                    <span className="text-[13px] font-medium text-[#6B7280]">
                      {cmd.cycle === "mensuel" ? " /mois" : " /an"}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[#9CA3AF]">
                  Demande envoyée à l&apos;équipe VerifScan — le paiement
                  (Orange Money, Wave, carte ou virement) se finalise avec
                  notre équipe sous 24 h, activation immédiate après
                  encaissement.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] px-6 py-4">
              <OutlineButton onClick={() => setCmd(null)} disabled={cmdBusy}>
                Annuler
              </OutlineButton>
              <GradientButton
                onClick={() => envoyerDemande(cmd.payload)}
                disabled={cmdBusy}
              >
                {cmdBusy ? "Envoi en cours…" : "Envoyer la demande"}
              </GradientButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
