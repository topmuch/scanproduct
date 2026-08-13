"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  Pencil,
  Pause,
  Wallet,
  Smartphone,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Heart,
  Settings2,
} from "lucide-react";
import { PageContainer, Card, Badge, SectionTitle, Button } from "@/components/admin/ui";
import {
  MAKERS_TABLE,
  GLOBAL_KPI,
  formatFCFA,
  formatDate,
  type Maker,
  type Plan,
} from "@/lib/admin-data";
import { useAdminNav } from "@/lib/admin-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabKey = "Tous" | "Actifs" | "Essai" | "Suspendus" | "Annules";

const TABS: { key: TabKey; label: string; count: number }[] = [
  { key: "Tous", label: "Tous", count: 258 },
  { key: "Actifs", label: "Actifs", count: 245 },
  { key: "Essai", label: "En essai", count: 13 },
  { key: "Suspendus", label: "Suspendus", count: 8 },
  { key: "Annules", label: "Annulés", count: 5 },
];

const PLAN_BADGE_COLOR: Record<Plan, "blue" | "green" | "orange" | "gray"> = {
  Starter: "blue",
  Pro: "green",
  Enterprise: "orange",
  Essai: "gray",
};

type PlanFilter = "Starter" | "Pro" | "Enterprise";
type PaymentFilter = "À jour" | "En retard" | "Échoué";
type DateFilter = "Ce mois" | "Ce trimestre" | "Cette année";

function paymentIcon(method: string) {
  const m = method.toLowerCase();
  if (m.includes("wave")) return <Wallet className="h-3.5 w-3.5" />;
  if (m.includes("orange")) return <Smartphone className="h-3.5 w-3.5" />;
  return <CreditCard className="h-3.5 w-3.5" />;
}

function derivedStatus(maker: Maker): { label: string; color: "green" | "red" | "yellow" | "gray" } {
  if (maker.status === "Actif") return { label: "Actif", color: "green" };
  if (maker.status === "Suspendu") return { label: "Suspendu", color: "red" };
  if (maker.plan === "Essai") return { label: "Essai", color: "yellow" };
  return { label: "Annulé", color: "gray" };
}

function derivedPayment(maker: Maker): "À jour" | "En retard" | "Échoué" {
  if (maker.status === "Suspendu") return "Échoué";
  if (maker.status === "Inactif") return "En retard";
  return "À jour";
}

function matchesTab(maker: Maker, tab: TabKey): boolean {
  switch (tab) {
    case "Tous":
      return true;
    case "Actifs":
      return maker.status === "Actif";
    case "Essai":
      return maker.plan === "Essai";
    case "Suspendus":
      return maker.status === "Suspendu";
    case "Annules":
      return maker.status === "Inactif" && maker.plan !== "Essai";
    default:
      return true;
  }
}

const REFERENCE_DATE = new Date("2026-08-13");

function matchesDate(maker: Maker, filter: DateFilter | "Tous"): boolean {
  if (filter === "Tous") return true;
  const date = new Date(maker.nextBilling);
  if (Number.isNaN(date.getTime())) return false;
  if (filter === "Cette année") {
    return date.getFullYear() === REFERENCE_DATE.getFullYear();
  }
  if (filter === "Ce mois") {
    return (
      date.getFullYear() === REFERENCE_DATE.getFullYear() &&
      date.getMonth() === REFERENCE_DATE.getMonth()
    );
  }
  if (filter === "Ce trimestre") {
    return (
      date.getFullYear() === REFERENCE_DATE.getFullYear() &&
      Math.floor(date.getMonth() / 3) === Math.floor(REFERENCE_DATE.getMonth() / 3)
    );
  }
  return true;
}

function FilterPills<T extends string>({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: readonly T[];
  active: T | "Tous";
  onChange: (v: T | "Tous") => void;
}) {
  const all: (T | "Tous")[] = ["Tous", ...options];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">{label}</span>
      {all.map((opt) => {
        const isActive = active === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              isActive
                ? "bg-[#2563EB] text-white shadow-sm"
                : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const SUMMARY_CARDS = [
  {
    label: "Total MRR",
    value: `${formatFCFA(GLOBAL_KPI.mrr)} FCFA`,
    trend: "↑ +8.5%",
    trendClass: "text-[#059669]",
    icon: CreditCard,
    iconBg: "bg-[#D1FAE5]",
    iconColor: "text-[#059669]",
  },
  {
    label: "ARR projeté",
    value: `${formatFCFA(GLOBAL_KPI.arr)} FCFA`,
    trend: "Sur 12 mois",
    trendClass: "text-[#2563EB]",
    icon: TrendingUp,
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-[#2563EB]",
  },
  {
    label: "Taux de rétention",
    value: `${GLOBAL_KPI.retentionRate}%`,
    trend: "Objectif 90%",
    trendClass: "text-[#9A3412]",
    icon: Heart,
    iconBg: "bg-[#FFEDD5]",
    iconColor: "text-[#9A3412]",
  },
  {
    label: "Churn rate",
    value: `${GLOBAL_KPI.churnRate}%`,
    trend: "↓ -0.5pts",
    trendClass: "text-[#991B1B]",
    icon: TrendingDown,
    iconBg: "bg-[#FEE2E2]",
    iconColor: "text-[#991B1B]",
  },
];

export function SubscriptionsPage() {
  const { openDetail, setPage } = useAdminNav();
  const [activeTab, setActiveTab] = useState<TabKey>("Tous");
  const [planFilter, setPlanFilter] = useState<PlanFilter | "Tous">("Tous");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter | "Tous">("Tous");
  const [dateFilter, setDateFilter] = useState<DateFilter | "Tous">("Tous");

  const filtered = useMemo(() => {
    return MAKERS_TABLE.filter((m) => {
      if (!matchesTab(m, activeTab)) return false;
      if (planFilter !== "Tous" && m.plan !== planFilter) return false;
      if (paymentFilter !== "Tous" && derivedPayment(m) !== paymentFilter) return false;
      if (!matchesDate(m, dateFilter)) return false;
      return true;
    });
  }, [activeTab, planFilter, paymentFilter, dateFilter]);

  function handleExport() {
    toast.success("Rapport des abonnements généré (CSV).");
  }

  return (
    <PageContainer>
      <SectionTitle
        title="Gestion des Abonnements"
        subtitle={`Revenus MRR : ${formatFCFA(GLOBAL_KPI.mrr)} FCFA`}
        action={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exporter rapports
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
                isActive
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <FilterPills
          label="Plan"
          options={["Starter", "Pro", "Enterprise"] as const}
          active={planFilter}
          onChange={setPlanFilter}
        />
        <FilterPills
          label="Statut paiement"
          options={["À jour", "En retard", "Échoué"] as const}
          active={paymentFilter}
          onChange={setPaymentFilter}
        />
        <FilterPills
          label="Date"
          options={["Ce mois", "Ce trimestre", "Cette année"] as const}
          active={dateFilter}
          onChange={setDateFilter}
        />
      </div>

      {/* Subscriptions table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                <th className="px-5 py-3">Entreprise</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Prix mensuel</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Début abonnement</th>
                <th className="px-4 py-3">Prochaine facturation</th>
                <th className="px-4 py-3">Méthode paiement</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-[14px] text-[#6B7280]">
                    Aucun abonnement ne correspond à ces filtres.
                  </td>
                </tr>
              ) : (
                filtered.map((maker) => {
                  const status = derivedStatus(maker);
                  return (
                    <tr
                      key={maker.id}
                      className="h-16 border-b border-[#F3F4F6] text-[14px] text-[#111827] transition-colors hover:bg-[#F9FAFB]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
                            style={{ backgroundColor: maker.logoColor }}
                          >
                            {maker.company.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#111827]">{maker.company}</div>
                            <div className="truncate text-[12px] text-[#6B7280]">{maker.contactName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={PLAN_BADGE_COLOR[maker.plan]}>{maker.plan}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-[#111827]">
                        {maker.plan === "Essai" || maker.mrr === 0 ? "—" : `${formatFCFA(maker.mrr)} FCFA`}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={status.color}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#374151]">{formatDate(maker.registeredAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#374151]">
                        {maker.plan === "Essai" ? "—" : formatDate(maker.nextBilling)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-[12px] font-semibold text-[#374151]">
                          {paymentIcon(maker.paymentMethod)}
                          {maker.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetail("user-detail", maker.id)}
                            title="Voir le détail"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toast.info(`Modifier l'abonnement de ${maker.company}`)}
                            title="Modifier"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#FFFBEB] hover:text-[#9A3412]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toast.warning(
                                maker.status === "Suspendu"
                                  ? `${maker.company} est déjà suspendu.`
                                  : `Suspension de l'abonnement ${maker.company} demandée.`
                              )
                            }
                            title="Suspendre"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#F3F4F6] px-5 py-3 text-[12px] text-[#6B7280]">
          <span>
            Affichage {filtered.length === 0 ? 0 : 1}-{filtered.length} sur {MAKERS_TABLE.length} abonnements
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled>
              Suivant
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">{card.label}</p>
                  <p className="mt-2 font-display text-[22px] font-bold text-[#111827]">{card.value}</p>
                  <p className={cn("mt-1 text-[12px] font-semibold", card.trendClass)}>{card.trend}</p>
                </div>
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", card.iconBg)}>
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Configure plans CTA */}
      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={() => setPage("plans")}>
          <Settings2 className="h-4 w-4" />
          Configuration des plans
        </Button>
      </div>
    </PageContainer>
  );
}
