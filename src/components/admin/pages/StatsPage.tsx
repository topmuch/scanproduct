"use client";

import { useState } from "react";
import {
  Users,
  UserCheck,
  Package,
  Layers,
  QrCode,
  ScanLine,
  FileDown,
  MapPin,
  Activity,
  Zap,
  AlertTriangle,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardHeader, Button, Badge, SectionTitle, PageContainer } from "@/components/admin/ui";
import { AreaTrend, LineTrend, BarV } from "@/components/admin/charts";
import { CountUp } from "@/components/landing/CountUp";
import {
  GLOBAL_KPI,
  SIGNUPS_DATA,
  REVENUE_DATA,
  SCANS_DAILY,
  SCANS_BY_HOUR,
  SCANS_BY_WEEKDAY,
  RETENTION_DATA,
  CHURN_DATA,
  TOP_CITIES,
  TOP_MAKERS,
  PERF_DATA,
} from "@/lib/admin-data";

const PERIODS = ["7j", "30j", "90j", "12m", "Personnalisé"] as const;
type Period = (typeof PERIODS)[number];

type KpiCard = {
  label: string;
  value: number;
  Icon: typeof Users;
  color: string;
  bg: string;
};

const KPI_CARDS: KpiCard[] = [
  { label: "Total fabricants", value: GLOBAL_KPI.totalMakers, Icon: Users, color: "#2563EB", bg: "#DBEAFE" },
  { label: "Fabricants actifs", value: GLOBAL_KPI.activeMakers, Icon: UserCheck, color: "#10B981", bg: "#D1FAE5" },
  { label: "Total produits", value: GLOBAL_KPI.totalProducts, Icon: Package, color: "#F59E0B", bg: "#FFEDD5" },
  { label: "Total lots", value: GLOBAL_KPI.totalLots, Icon: Layers, color: "#8B5CF6", bg: "#EDE9FE" },
  { label: "Total QR codes", value: GLOBAL_KPI.totalQrCodes, Icon: QrCode, color: "#2563EB", bg: "#DBEAFE" },
  { label: "Total scans", value: GLOBAL_KPI.totalScans, Icon: ScanLine, color: "#10B981", bg: "#D1FAE5" },
];

// Top 5 cities rendered as dots on the stylized Senegal map.
const CITY_DOTS = [
  { city: "Dakar", scans: 456_789, x: "20%", y: "32%", size: 32, color: "#2563EB" },
  { city: "Thiès", scans: 123_456, x: "30%", y: "40%", size: 22, color: "#10B981" },
  { city: "Saint-Louis", scans: 89_012, x: "34%", y: "12%", size: 18, color: "#F59E0B" },
  { city: "Mbour", scans: 76_340, x: "17%", y: "56%", size: 16, color: "#8B5CF6" },
  { city: "Touba", scans: 68_920, x: "42%", y: "32%", size: 16, color: "#EF4444" },
];

const RANK_COLORS = [
  "#F59E0B", // gold
  "#9CA3AF", // silver
  "#B45309", // bronze
  "#2563EB",
  "#2563EB",
  "#10B981",
  "#10B981",
  "#8B5CF6",
  "#8B5CF6",
  "#6B7280",
];

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 mt-8">
      <h3 className="font-display text-[18px] font-bold text-[#111827]">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[13px] text-[#6B7280]">{subtitle}</p>}
    </div>
  );
}

export function StatsPage() {
  const [period, setPeriod] = useState<Period>("30j");

  const handleExport = () => {
    toast.success("Rapport PDF en cours de génération", {
      description: `Période sélectionnée : ${period}`,
    });
  };

  const periodSelector = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "h-9 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200",
              period === p
                ? "bg-[#2563EB] text-white shadow-sm"
                : "border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#2563EB] hover:bg-[#F9FAFB] hover:text-[#2563EB]"
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <Button variant="outline" size="md" onClick={handleExport}>
        <FileDown className="h-4 w-4" />
        Exporter rapport PDF
      </Button>
    </div>
  );

  const maxScans = TOP_MAKERS[0]?.scans ?? 1;

  return (
    <PageContainer>
      <SectionTitle
        title="Statistiques Globales"
        subtitle="Vue d'ensemble de l'activité de la plateforme VerifScan"
        action={periodSelector}
      />

      {/* ── Section 1 — Vue d'ensemble ─────────────────────────────────── */}
      <section>
        <SectionHeading title="Vue d'ensemble" subtitle="Indicateurs clés de la plateforme" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {KPI_CARDS.map(({ label, value, Icon, color, bg }) => (
            <Card key={label} className="p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: bg, color }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
              <p className="mt-1 text-2xl font-bold text-[#111827]">
                <CountUp end={value} duration={1.6} />
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Section 2 — Croissance ─────────────────────────────────────── */}
      <section>
        <SectionHeading title="Croissance" subtitle="Inscriptions, revenus, rétention et churn" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Inscriptions par mois" subtitle="Nouveaux fabricants inscrits" />
            <div className="p-4">
              <BarV
                data={SIGNUPS_DATA.map((d) => ({ label: d.month, value: d.value }))}
                color="#2563EB"
                height={260}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Revenus MRR" subtitle="Revenu mensuel récurrent (FCFA)" />
            <div className="p-4">
              <AreaTrend
                data={REVENUE_DATA.map((d) => ({ label: d.month, value: d.value }))}
                color="#10B981"
                height={260}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Taux de rétention" subtitle="Fabricants conservés mois après mois (%)" />
            <div className="p-4">
              <LineTrend
                data={RETENTION_DATA.map((d) => ({ label: d.month, value: d.value }))}
                color="#8B5CF6"
                height={260}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Churn rate" subtitle="Taux d'attrition mensuel (%)" />
            <div className="p-4">
              <LineTrend
                data={CHURN_DATA.map((d) => ({ label: d.month, value: d.value }))}
                color="#EF4444"
                height={260}
              />
            </div>
          </Card>
        </div>
      </section>

      {/* ── Section 3 — Activité ───────────────────────────────────────── */}
      <section>
        <SectionHeading title="Activité" subtitle="Scans et produits les plus scannés" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Scans par jour" subtitle="30 derniers jours" />
            <div className="p-4">
              <AreaTrend
                data={SCANS_DAILY.map((d) => ({ label: d.day, value: d.value }))}
                color="#2563EB"
                height={260}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Scans par heure" subtitle="Distribution sur 24h" />
            <div className="p-4">
              <BarV
                data={SCANS_BY_HOUR.map((d) => ({ label: d.hour, value: d.value }))}
                color="#F59E0B"
                height={260}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Scans par jour de la semaine" subtitle="Moyenne par jour de la semaine" />
            <div className="p-4">
              <BarV
                data={SCANS_BY_WEEKDAY.map((d) => ({ label: d.day, value: d.value }))}
                color="#10B981"
                height={260}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Top produits scannés" subtitle="Top 10 des fabricants par scans" />
            <div className="space-y-2 p-4">
              {TOP_MAKERS.map((m, i) => {
                const pct = Math.round((m.scans / maxScans) * 100);
                return (
                  <div
                    key={m.name}
                    className="flex items-center gap-3 rounded-lg bg-[#F9FAFB] p-3 transition-colors hover:bg-[#F3F4F6]"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: RANK_COLORS[i] ?? "#6B7280" }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#111827]">{m.name}</p>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(to right, #10B981, #2563EB)",
                          }}
                        />
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-[#6B7280]">
                      {m.scans.toLocaleString("fr-FR")}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>

      {/* ── Section 4 — Géographie ─────────────────────────────────────── */}
      <section>
        <SectionHeading title="Géographie" subtitle="Répartition géographique des scans au Sénégal" />
        <Card>
          <CardHeader title="Géographie" subtitle="Répartition des scans par ville" />
          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
            {/* Stylized Senegal map placeholder */}
            <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#E5E7EB] bg-gradient-to-br from-[#F9FAFB] via-white to-[#EFF6FF]">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">
                <span className="text-[200px] leading-none">🗺️</span>
              </div>
              <div className="relative z-10 mb-4 text-center">
                <p className="font-display text-[22px] font-bold text-[#111827]">
                  Sénégal <span className="text-[26px]">🇸🇳</span>
                </p>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  Survolez les points pour voir le détail
                </p>
              </div>

              {CITY_DOTS.map((dot) => (
                <div
                  key={dot.city}
                  className="group absolute z-20"
                  style={{ top: dot.y, left: dot.x, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className="rounded-full shadow-md ring-2 ring-white transition-transform duration-200 group-hover:scale-125"
                    style={{
                      width: dot.size,
                      height: dot.size,
                      backgroundColor: dot.color,
                    }}
                  />
                  {/* Pulse */}
                  <span
                    className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 animate-pulse"
                    style={{
                      width: dot.size * 2,
                      height: dot.size * 2,
                      backgroundColor: dot.color,
                    }}
                  />
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111827] opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                    <span className="font-semibold">{dot.city}</span>
                    <span className="mx-1 text-[#D1D5DB]">·</span>
                    <span className="text-[#6B7280]">{dot.scans.toLocaleString("fr-FR")} scans</span>
                  </div>
                  {/* City label (always visible) */}
                  <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#6B7280]">
                    {dot.city}
                  </span>
                </div>
              ))}

              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-[#6B7280] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                Taille = volume de scans
              </div>
            </div>

            {/* Top cities table */}
            <div className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-display text-[15px] font-semibold text-[#111827]">
                  Top 10 villes par scans
                </h4>
                <Badge color="blue">{TOP_CITIES.length} villes</Badge>
              </div>
              <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wide text-[#6B7280]">
                      <th className="px-4 py-2.5 font-semibold">Rang</th>
                      <th className="px-4 py-2.5 font-semibold">Ville</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Scans</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Part (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_CITIES.map((c, i) => (
                      <tr
                        key={c.city}
                        className="border-b border-[#F3F4F6] transition-colors last:border-b-0 hover:bg-[#F9FAFB]"
                      >
                        <td className="px-4 py-2.5 text-sm font-semibold text-[#6B7280]">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                            <span className="text-sm font-medium text-[#111827]">{c.city}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-[#E5E7EB]">
                            <div
                              className="h-full rounded-full bg-[#2563EB]/70"
                              style={{ width: `${Math.min(c.pct * 2.5, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-semibold text-[#111827]">
                          {c.scans.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-[#6B7280]">{c.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Section 5 — Performance technique ─────────────────────────── */}
      <section>
        <SectionHeading title="Performance technique" subtitle="Latence, erreurs et disponibilité API" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader
              title="Temps de chargement moyen"
              subtitle="Latence API (ms) · 30 jours"
              action={
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
                  <Zap className="h-4 w-4" />
                </span>
              }
            />
            <div className="p-4">
              <LineTrend
                data={PERF_DATA.latency.map((d) => ({ label: d.day, value: d.value }))}
                color="#2563EB"
                height={220}
              />
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#F9FAFB] px-4 py-3">
                <span className="text-sm text-[#6B7280]">Latence moyenne</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111827]">245 ms</span>
                  <Badge color="green">
                    <Activity className="h-3 w-3" />
                    Optimal
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Taux d'erreur API"
              subtitle="Erreurs 5xx (%) · 30 jours"
              action={
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE2E2] text-[#EF4444]">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              }
            />
            <div className="p-4">
              <LineTrend
                data={PERF_DATA.errorRate.map((d) => ({ label: d.day, value: d.value }))}
                color="#EF4444"
                height={220}
              />
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#F9FAFB] px-4 py-3">
                <span className="text-sm text-[#6B7280]">Taux d'erreur</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111827]">0.12 %</span>
                  <Badge color="green">
                    <Activity className="h-3 w-3" />
                    Optimal
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Uptime"
              subtitle="Disponibilité du service (%) · 30 jours"
              action={
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D1FAE5] text-[#10B981]">
                  <Server className="h-4 w-4" />
                </span>
              }
            />
            <div className="p-4">
              <BarV
                data={PERF_DATA.uptime.map((d) => ({ label: d.day, value: d.value }))}
                color="#10B981"
                height={220}
              />
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#F9FAFB] px-4 py-3">
                <span className="text-sm text-[#6B7280]">
                  Uptime · Objectif{" "}
                  <span className="font-medium text-[#374151]">99.9 %</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111827]">99.98 %</span>
                  <Badge color="green">
                    <Activity className="h-3 w-3" />
                    Conforme
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </PageContainer>
  );
}

export default StatsPage;
