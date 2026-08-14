"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Save, Star, Check } from "lucide-react";
import { PageContainer, Card, CardHeader, SectionTitle, Button, Badge } from "@/components/admin/ui";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import { useAdminNav } from "@/lib/admin-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PlanKey = "Starter" | "Pro" | "Enterprise";
type StatsLevel = "Basiques" | "Avancées" | "BI";
type FeatureKey =
  | "createProducts"
  | "qrGeneration"
  | "publicPage"
  | "advancedStats"
  | "marketplace"
  | "api"
  | "whiteLabel"
  | "sso"
  | "sla";

type PlanState = {
  badge: string;
  monthly: number;
  yearly: number;
  active: boolean;
  limits: {
    products: number;
    qrCodes: number;
    users: number;
    stats: StatsLevel;
  };
  features: Record<FeatureKey, boolean>;
};

type GlobalState = {
  trialDays: number;
  cardRequired: boolean;
  reminderDays: number;
  suspensionDays: number;
};

const PLAN_ORDER: PlanKey[] = ["Starter", "Pro", "Enterprise"];

const FEATURE_DEFS: { key: FeatureKey; label: string }[] = [
  { key: "createProducts", label: "Création produits" },
  { key: "qrGeneration", label: "Génération QR codes" },
  { key: "publicPage", label: "Page publique" },
  { key: "advancedStats", label: "Statistiques avancées" },
  { key: "marketplace", label: "Marketplace B2B" },
  { key: "api", label: "API access" },
];

const ENTERPRISE_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "whiteLabel", label: "White label" },
  { key: "sso", label: "SSO" },
  { key: "sla", label: "SLA 99.9%" },
];

const STATS_OPTIONS: StatsLevel[] = ["Basiques", "Avancées", "BI"];

function buildInitialPlans(adminPlans: {
  Starter: { badge: string; monthly: number; yearly: number; limits: { products: number; qrCodes: number; users: number; stats: string }; features: { createProducts: boolean; qrGeneration: boolean; publicPage: boolean; advancedStats: boolean; marketplace: boolean; api: boolean } };
  Pro: { badge: string; monthly: number; yearly: number; limits: { products: number; qrCodes: number; users: number; stats: string }; features: { createProducts: boolean; qrGeneration: boolean; publicPage: boolean; advancedStats: boolean; marketplace: boolean; api: boolean } };
  Enterprise: { badge: string; monthly: number; yearly: number; limits: { products: number; qrCodes: number; users: number; stats: string }; features: { createProducts: boolean; qrGeneration: boolean; publicPage: boolean; advancedStats: boolean; marketplace: boolean; api: boolean } };
}): Record<PlanKey, PlanState> {
  const cfg = adminPlans;
  const fromConfig = (key: PlanKey, ent: boolean): PlanState => {
    const c = cfg[key];
    return {
      badge: c.badge,
      monthly: c.monthly,
      yearly: c.yearly,
      active: true,
      limits: { ...c.limits, stats: c.limits.stats as StatsLevel },
      features: {
        createProducts: c.features.createProducts,
        qrGeneration: c.features.qrGeneration,
        publicPage: c.features.publicPage,
        advancedStats: c.features.advancedStats,
        marketplace: c.features.marketplace,
        api: c.features.api,
        whiteLabel: ent,
        sso: ent,
        sla: ent,
      },
    };
  };
  return {
    Starter: fromConfig("Starter", false),
    Pro: fromConfig("Pro", false),
    Enterprise: fromConfig("Enterprise", true),
  };
}

const INITIAL_GLOBAL: GlobalState = {
  trialDays: 14,
  cardRequired: false,
  reminderDays: 3,
  suspensionDays: 7,
};

function computeSavings(monthly: number, yearly: number): number {
  if (!monthly || monthly <= 0) return 0;
  const ratio = yearly / (monthly * 12);
  if (ratio >= 1) return 0;
  return Math.round((1 - ratio) * 100);
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-[#374151]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#6B7280]">{hint}</p>}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] font-medium text-[#111827] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]";

function LimitField({
  label,
  value,
  onChange,
  allowUnlimited,
  limitedDefault,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  allowUnlimited: boolean;
  limitedDefault: number;
}) {
  const isUnlimited = value === -1;
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min={0}
            value={isUnlimited ? "" : value}
            disabled={isUnlimited}
            placeholder={isUnlimited ? "Illimité" : undefined}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(Number.isFinite(n) && n >= 0 ? n : 0);
            }}
            className={inputCls}
          />
          {isUnlimited && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#6B7280]">
              ∞
            </span>
          )}
        </div>
        {allowUnlimited && (
          <div className="flex shrink-0 overflow-hidden rounded-lg border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => onChange(-1)}
              className={cn(
                "px-3 py-2 text-[12px] font-semibold transition-colors",
                isUnlimited ? "bg-[#2563EB] text-white" : "bg-white text-[#374151] hover:bg-[#F9FAFB]"
              )}
            >
              Illimité
            </button>
            <button
              type="button"
              onClick={() => {
                if (isUnlimited) onChange(limitedDefault);
              }}
              className={cn(
                "border-l border-[#E5E7EB] px-3 py-2 text-[12px] font-semibold transition-colors",
                !isUnlimited ? "bg-[#2563EB] text-white" : "bg-white text-[#374151] hover:bg-[#F9FAFB]"
              )}
            >
              Limité
            </button>
          </div>
        )}
      </div>
    </Field>
  );
}

function PlanCard({
  planKey,
  state,
  subscriberCount,
  onChange,
  onSave,
}: {
  planKey: PlanKey;
  state: PlanState;
  subscriberCount: number;
  onChange: (updater: (p: PlanState) => PlanState) => void;
  onSave: () => void;
}) {
  const isPro = planKey === "Pro";
  const isEnterprise = planKey === "Enterprise";
  const savings = computeSavings(state.monthly, state.yearly);
  const featureList = isEnterprise ? [...FEATURE_DEFS, ...ENTERPRISE_FEATURES] : FEATURE_DEFS;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-5 shadow-sm",
        isPro
          ? "border-2 border-[#2563EB] bg-gradient-to-br from-[#EFF6FF] to-[#F0FDF4]"
          : "border border-[#E5E7EB] bg-white"
      )}
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-[#111827]">{planKey}</h3>
          <div className="mt-2 flex items-center gap-2">
            {isPro ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] px-3 py-1 text-[12px] font-semibold text-white shadow-sm">
                <Star className="h-3.5 w-3.5 fill-white" />
                Le plus populaire
              </span>
            ) : (
              <Badge color="gray">{state.badge}</Badge>
            )}
            <Badge color="blue">{subscriberCount} abonnés</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[12px] font-semibold",
              state.active ? "text-[#059669]" : "text-[#6B7280]"
            )}
          >
            {state.active ? "Actif" : "Inactif"}
          </span>
          <Switch checked={state.active} onCheckedChange={(v) => onChange((p) => ({ ...p, active: !!v }))} />
        </div>
      </div>

      {/* Price section */}
      <div className="mb-5">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Tarification</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mensuel">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={state.monthly}
                onChange={(e) => onChange((p) => ({ ...p, monthly: Number(e.target.value) || 0 }))}
                className={inputCls}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#6B7280]">
                FCFA
              </span>
            </div>
          </Field>
          <Field label="Annuel">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={state.yearly}
                onChange={(e) => onChange((p) => ({ ...p, yearly: Number(e.target.value) || 0 }))}
                className={inputCls}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#6B7280]">
                FCFA
              </span>
            </div>
          </Field>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-[12px] font-semibold text-[#065F46]">
            <Check className="h-3 w-3" />
            Économie annuelle : {savings}%
          </span>
        </div>
      </div>

      {/* Limits */}
      <div className="mb-5">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Limites</p>
        <div className="space-y-3">
          <LimitField
            label="Produits"
            value={state.limits.products}
            onChange={(v) => onChange((p) => ({ ...p, limits: { ...p.limits, products: v } }))}
            allowUnlimited={isPro || isEnterprise}
            limitedDefault={5}
          />
          <LimitField
            label="QR codes / mois"
            value={state.limits.qrCodes}
            onChange={(v) => onChange((p) => ({ ...p, limits: { ...p.limits, qrCodes: v } }))}
            allowUnlimited={isPro || isEnterprise}
            limitedDefault={500}
          />
          <LimitField
            label="Utilisateurs"
            value={state.limits.users}
            onChange={(v) => onChange((p) => ({ ...p, limits: { ...p.limits, users: v } }))}
            allowUnlimited={isPro || isEnterprise}
            limitedDefault={1}
          />
          <Field label="Statistiques">
            <Select
              value={state.limits.stats}
              onValueChange={(v) =>
                onChange((p) => ({ ...p, limits: { ...p.limits, stats: v as StatsLevel } }))
              }
            >
              <SelectTrigger className="h-10 w-full bg-white text-[14px] font-medium text-[#111827]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* Features */}
      <div className="mb-5 flex-1">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Fonctionnalités</p>
        <div className="space-y-2.5">
          {featureList.map((feat) => (
            <label
              key={feat.key}
              className="flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-white/60"
            >
              <Checkbox
                checked={state.features[feat.key]}
                onCheckedChange={(v) =>
                  onChange((p) => ({ ...p, features: { ...p.features, [feat.key]: !!v } }))
                }
              />
              <span className="text-[14px] text-[#374151]">{feat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Button variant="primary" className="w-full" onClick={onSave}>
        <Save className="h-4 w-4" />
        Enregistrer
      </Button>
    </div>
  );
}

export function PlansConfigPage() {
  const { setPage } = useAdminNav();
  const { plans: adminPlans } = useAdminData();
  const [plans, setPlans] = useState<Record<PlanKey, PlanState>>(() => buildInitialPlans(adminPlans));
  const [global, setGlobal] = useState<GlobalState>(INITIAL_GLOBAL);

  const updatePlan = (key: PlanKey, updater: (p: PlanState) => PlanState) => {
    setPlans((prev) => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const handleSavePlan = (key: PlanKey) => {
    toast.success(`Plan ${key} enregistré`);
  };

  const handleSaveGlobal = () => {
    toast.success("Paramètres globaux enregistrés");
  };

  const totalActive = useMemo(() => PLAN_ORDER.filter((k) => plans[k].active).length, [plans]);

  return (
    <PageContainer>
      <button
        type="button"
        onClick={() => setPage("subscriptions")}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
      >
        <ArrowLeft className="h-4 w-4" />
        Abonnements
      </button>

      <SectionTitle
        title="Configuration des Plans"
        subtitle="Définissez les prix, limites et fonctionnalités de chaque formule"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray">Starter : {adminPlans.Starter.subscribers}</Badge>
            <Badge color="blue">Pro : {adminPlans.Pro.subscribers}</Badge>
            <Badge color="orange">Enterprise : {adminPlans.Enterprise.subscribers}</Badge>
            <Badge color="green">
              {totalActive}/{PLAN_ORDER.length} plans actifs
            </Badge>
          </div>
        }
      />

      {/* Three editable plan cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((key) => (
          <PlanCard
            key={key}
            planKey={key}
            state={plans[key]}
            subscriberCount={adminPlans[key].subscribers}
            onChange={(updater) => updatePlan(key, updater)}
            onSave={() => handleSavePlan(key)}
          />
        ))}
      </div>

      {/* Global options */}
      <Card className="mt-6">
        <CardHeader title="Options globales" subtitle="Paramètres appliqués à tous les plans" />
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <Field label="Essai gratuit" hint="Durée de la période d'essai pour les nouveaux fabricants">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={global.trialDays}
                onChange={(e) => setGlobal((g) => ({ ...g, trialDays: Number(e.target.value) || 0 }))}
                className={inputCls}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#6B7280]">
                jours
              </span>
            </div>
          </Field>

          <Field label="Carte bancaire requise" hint="Demande un moyen de paiement à l'inscription">
            <div className="flex h-10 items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3">
              <span className="text-[14px] font-medium text-[#374151]">
                {global.cardRequired ? "Oui" : "Non"}
              </span>
              <Switch
                checked={global.cardRequired}
                onCheckedChange={(v) => setGlobal((g) => ({ ...g, cardRequired: !!v }))}
              />
            </div>
          </Field>

          <Field label="Relance automatique" hint="Notification envoyée avant l'échéance">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={global.reminderDays}
                onChange={(e) => setGlobal((g) => ({ ...g, reminderDays: Number(e.target.value) || 0 }))}
                className={inputCls}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-semibold text-[#6B7280]">
                jours avant échéance
              </span>
            </div>
          </Field>

          <Field label="Suspension automatique" hint="Suspension du compte après échec de paiement">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={global.suspensionDays}
                onChange={(e) => setGlobal((g) => ({ ...g, suspensionDays: Number(e.target.value) || 0 }))}
                className={inputCls}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-semibold text-[#6B7280]">
                jours après échec
              </span>
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[#F3F4F6] px-5 py-4">
          <Button variant="outline" onClick={() => setGlobal(INITIAL_GLOBAL)}>
            Réinitialiser
          </Button>
          <Button variant="primary" onClick={handleSaveGlobal}>
            <Save className="h-4 w-4" />
            Enregistrer les paramètres globaux
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
