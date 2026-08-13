"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  PageHeader,
  SectionCard,
  KpiCard,
  PillFilter,
  OutlineButton,
  InsightBox,
} from "@/components/fabricant/ui";
import {
  STATS_KPIS,
  SCANS_30J,
  SCANS_SEMAINE,
  SCANS_HEURE,
  REPARTITION_PRODUITS,
  TOP_VILLES,
  DUREE_CONSULTATION,
  TYPE_APPAREIL,
  ACTIONS_PRODUIT,
  formatNombre,
} from "@/lib/fabricant-data";
import { FileDown, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

// ============================================================================
// Types & constants
// ============================================================================
type PeriodKey = "7j" | "30j" | "90j" | "12m" | "perso";

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "7j", label: "7j" },
  { value: "30j", label: "30j" },
  { value: "90j", label: "90j" },
  { value: "12m", label: "12m" },
  { value: "perso", label: "Personnalisé" },
];

// Visual config for each KPI card (icon + colored background per design spec)
const KPI_VISUALS: { icon: string; iconBg: string }[] = [
  { icon: "📊", iconBg: "#EFF6FF" },
  { icon: "📱", iconBg: "#F0FDF4" },
  { icon: "📈", iconBg: "#FFFBEB" },
  { icon: "📦", iconBg: "#F3E8FF" },
  { icon: "🔄", iconBg: "#FEE2E2" },
  { icon: "⏱️", iconBg: "#F0FDF4" },
];

// Product photos (mapped by REPARTITION_PRODUITS name) — using Unsplash CDN
const PRODUCT_PHOTOS: Record<string, string> = {
  "Jus de Bissap":
    "https://images.unsplash.com/photo-1622597467836-f3e6707e1191?w=200&q=80",
  "Épices Mix":
    "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&q=80",
  "Chocolat Local":
    "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=200&q=80",
  "Confiture Mangue":
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80",
  "Pain Tradition":
    "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=200&q=80",
  "Miel Casamance":
    "https://images.unsplash.com/photo-1612203985729-70726954388c?w=200&q=80",
  "Jus de Bouye":
    "https://images.unsplash.com/photo-1622597467836-f3e6707e1191?w=200&q=80",
};

// Mock trend values for the top produits table (7 rows, excluding "Autres")
const PRODUCT_TRENDS: { up: boolean; pct: string }[] = [
  { up: true, pct: "+18%" },
  { up: true, pct: "+45%" },
  { up: false, pct: "-3%" },
  { up: true, pct: "+12%" },
  { up: false, pct: "-8%" },
  { up: true, pct: "+22%" },
  { up: true, pct: "+5%" },
];

// Total scans used as the headline number on the donut chart (matches STATS_KPIS[0].valeur)
const TOTAL_SCANS = STATS_KPIS[0].valeur; // 12 458

// ============================================================================
// Custom tooltip — consistent styling across all charts
// ============================================================================
function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
  unit = "",
  color = "#2563EB",
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: Record<string, unknown> }>;
  label?: string | number;
  suffix?: string;
  unit?: string;
  color?: string;
  labelFormatter?: (l: string | number | undefined) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  const displayLabel = labelFormatter
    ? labelFormatter(label)
    : label !== undefined
    ? String(label)
    : "";
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 shadow-md">
      {displayLabel && (
        <p className="text-[12px] font-medium text-[#6B7280]">{displayLabel}</p>
      )}
      <p className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-[#111827]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {formatNombre(value)}
        {suffix}
        {unit && <span className="ml-0.5 text-[12px] font-normal text-[#6B7280]">{unit}</span>}
      </p>
    </div>
  );
}

// ============================================================================
// Pie chart tooltips (named components — avoids Recharts ContentType overload
// issues when passing inline functions to <Tooltip content={...} />)
// ============================================================================
function RepartitionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { nom: string; scans: number; couleur: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 shadow-md">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: p.couleur }}
        />
        {p.nom}
      </p>
      <p className="mt-0.5 text-[12px] text-[#6B7280]">
        {formatNombre(p.scans)} scans · {((p.scans / TOTAL_SCANS) * 100).toFixed(1)}%
      </p>
    </div>
  );
}

function AppareilTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { nom: string; valeur: number; couleur: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 shadow-md">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: p.couleur }}
        />
        {p.nom}
      </p>
      <p className="mt-0.5 text-[12px] text-[#6B7280]">{p.valeur}%</p>
    </div>
  );
}

// ============================================================================
// Sénégal — stylized geographic visualization
// Each bubble is positioned roughly according to its geographic location
// (peninsula Dakar NW, Saint-Louis N, Touba center, Ziguinchor SW Casamance, etc.)
// ============================================================================
type SenegalBubble = {
  ville: string;
  scans: number;
  left: string;
  top: string;
};

const SENEGAL_BUBBLES: SenegalBubble[] = [
  { ville: "Saint-Louis", scans: 1121, left: "26%", top: "12%" },
  { ville: "Dakar", scans: 7475, left: "14%", top: "42%" },
  { ville: "Rufisque", scans: 249, left: "23%", top: "48%" },
  { ville: "Thiès", scans: 1869, left: "32%", top: "40%" },
  { ville: "Mbour", scans: 124, left: "30%", top: "65%" },
  { ville: "Touba", scans: 748, left: "46%", top: "33%" },
  { ville: "Kaolack", scans: 499, left: "44%", top: "60%" },
  { ville: "Ziguinchor", scans: 374, left: "16%", top: "82%" },
];

function bubbleColor(scans: number): string {
  if (scans > 2000) return "#EF4444"; // rouge — élevé
  if (scans > 500) return "#F59E0B"; // orange — moyen
  return "#10B981"; // vert — faible
}

function bubbleSize(scans: number): number {
  // Map 124..7475 → 44..96 px
  const min = 124;
  const max = 7475;
  return Math.round(44 + ((scans - min) / (max - min)) * 52);
}

// ============================================================================
// Main component
// ============================================================================
export function StatistiquesPage() {
  const [period, setPeriod] = useState<PeriodKey>("30j");

  // Donut chart center label overlay
  const totalScansDisplay = formatNombre(TOTAL_SCANS);

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* Header                                                        */}
      {/* ============================================================ */}
      <PageHeader title="Statistiques" subtitle="Analysez les performances de vos produits">
        <PillFilter options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <OutlineButton onClick={() => undefined}>
          <FileDown className="h-4 w-4" />
          Exporter rapport PDF
        </OutlineButton>
      </PageHeader>

      {/* ============================================================ */}
      {/* Section 1 — Vue d'ensemble (6 KPI cards)                     */}
      {/* ============================================================ */}
      <div>
        <h2 className="mb-3 font-display text-[18px] font-semibold text-[#111827]">
          Vue d&apos;ensemble
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STATS_KPIS.map((kpi, i) => {
            const visual = KPI_VISUALS[i] ?? { icon: "📊", iconBg: "#EFF6FF" };
            // For KPI #4 ("Produits scannés", tendance "75%") no arrow — it's a coverage ratio
            const isRatio = i === 3;
            const tendanceDisplay = isRatio
              ? kpi.tendance
              : `↑ ${kpi.tendance}`;
            return (
              <KpiCard
                key={kpi.id}
                icon={visual.icon}
                iconBg={visual.iconBg}
                label={kpi.label}
                value={kpi.valeur}
                valueSuffix={kpi.suffixe}
                tendance={tendanceDisplay}
                tendancePositif={kpi.positif}
              />
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 2 — Évolution des scans (3 charts)                   */}
      {/* ============================================================ */}
      <div className="space-y-4">
        {/* Chart 1 — full width AreaChart */}
        <SectionCard title="Évolution des scans" subtitle="30 derniers jours">
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SCANS_30J} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="scansGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="jour"
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  content={<ChartTooltip suffix=" scans" color="#2563EB" labelFormatter={(l) => `Date : ${l}`} />}
                  cursor={{ stroke: "#2563EB", strokeWidth: 1, strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fill="url(#scansGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Charts 2 & 3 — side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Chart 2 — Scans par jour de la semaine */}
          <SectionCard title="Scans par jour de la semaine">
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SCANS_SEMAINE} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="jour"
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={<ChartTooltip suffix=" scans" color="#10B981" labelFormatter={(l) => `Jour : ${l}`} />}
                    cursor={{ fill: "#10B98110" }}
                  />
                  <Bar dataKey="scans" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3">
              <InsightBox color="#10B981">Votre pic d&apos;activité est le samedi</InsightBox>
            </div>
          </SectionCard>

          {/* Chart 3 — Scans par heure (horizontal bars) */}
          <SectionCard title="Scans par heure de la journée">
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={SCANS_HEURE}
                  margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="heure"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    interval={0}
                  />
                  <Tooltip
                    content={<ChartTooltip suffix=" scans" color="#F59E0B" labelFormatter={(l) => `Heure : ${l}`} />}
                    cursor={{ fill: "#F59E0B10" }}
                  />
                  <Bar dataKey="scans" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3">
              <InsightBox color="#F59E0B">Les scans peak entre 10h et 14h</InsightBox>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 3 — Performance par produit (donut + table)          */}
      {/* ============================================================ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Donut chart */}
        <SectionCard title="Répartition des scans par produit" className="lg:col-span-2">
          <div className="relative" style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={REPARTITION_PRODUITS}
                  dataKey="scans"
                  nameKey="nom"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {REPARTITION_PRODUITS.map((entry) => (
                    <Cell key={entry.nom} fill={entry.couleur} />
                  ))}
                </Pie>
                <Tooltip content={<RepartitionTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label overlay */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                Total scans
              </span>
              <span className="font-display text-[22px] font-bold text-[#111827]">
                {totalScansDisplay}
              </span>
            </div>
          </div>

          {/* Legend */}
          <ul className="mt-4 space-y-1.5">
            {REPARTITION_PRODUITS.map((p) => {
              const pct = ((p.scans / TOTAL_SCANS) * 100).toFixed(1);
              return (
                <li key={p.nom} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-[#374151]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: p.couleur }}
                    />
                    {p.nom}
                  </span>
                  <span className="flex items-center gap-2 text-[#6B7280]">
                    <span className="font-medium text-[#111827]">{pct}%</span>
                    <span className="text-[12px]">{formatNombre(p.scans)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Top produits table */}
        <SectionCard
          title="Top produits"
          subtitle="Classement par nombre de scans"
          className="lg:col-span-3"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F3F4F6] text-[12px] uppercase tracking-wide text-[#9CA3AF]">
                  <th className="py-2.5 pr-2 font-semibold">Rang</th>
                  <th className="py-2.5 pr-2 font-semibold">Produit</th>
                  <th className="py-2.5 pr-2 text-right font-semibold">Scans totaux</th>
                  <th className="py-2.5 pr-2 text-right font-semibold">Part</th>
                  <th className="py-2.5 pr-2 text-right font-semibold">Tendance</th>
                  <th className="py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {REPARTITION_PRODUITS.filter((p) => p.nom !== "Autres").map((p, i) => {
                  const trend = PRODUCT_TRENDS[i] ?? { up: true, pct: "+0%" };
                  const pct = ((p.scans / TOTAL_SCANS) * 100).toFixed(1);
                  const photo = PRODUCT_PHOTOS[p.nom];
                  return (
                    <tr key={p.nom} className="group hover:bg-[#F9FAFB]">
                      <td className="py-3 pr-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold"
                          style={{
                            backgroundColor: `${p.couleur}20`,
                            color: p.couleur,
                          }}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2.5">
                          {photo ? (
                             
                            <img
                              src={photo}
                              alt={p.nom}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-[18px]"
                              style={{ backgroundColor: `${p.couleur}20` }}
                            >
                              📦
                            </div>
                          )}
                          <span className="font-medium text-[#111827]">{p.nom}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right font-semibold text-[#111827]">
                        {formatNombre(p.scans)}
                      </td>
                      <td className="py-3 pr-2 text-right text-[#6B7280]">{pct}%</td>
                      <td className="py-3 pr-2 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${
                            trend.up ? "text-[#065F46]" : "text-[#991B1B]"
                          }`}
                        >
                          {trend.up ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {trend.pct}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#2563EB] hover:underline"
                        >
                          Voir détails
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-2">
            <InsightBox color="#F59E0B">
              🏆 Votre produit le plus populaire est Jus de Bissap avec 2 345 scans
            </InsightBox>
            <InsightBox color="#10B981">
              📈 Les scans de Épices Mix ont augmenté de 45% ce mois
            </InsightBox>
          </div>
        </SectionCard>
      </div>

      {/* ============================================================ */}
      {/* Section 4 — Analyse géographique                             */}
      {/* ============================================================ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Stylized geographic visualization */}
        <SectionCard title="Carte des scans" subtitle="Répartition géographique au Sénégal" className="lg:col-span-3">
          <div
            className="relative overflow-hidden rounded-lg border border-[#E5E7EB]"
            style={{
              height: 360,
              background: "linear-gradient(135deg, #F0FDF4 0%, #EFF6FF 100%)",
            }}
          >
            {/* Decorative country silhouette hint (subtle) */}
            <div
              className="absolute inset-x-8 inset-y-4 rounded-2xl border-2 border-dashed border-[#10B981]/20"
              aria-hidden
            />
            <span className="absolute left-3 top-2 text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              Sénégal
            </span>

            {/* Bubbles */}
            {SENEGAL_BUBBLES.map((b) => {
              const size = bubbleSize(b.scans);
              const color = bubbleColor(b.scans);
              return (
                <div
                  key={b.ville}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: b.left,
                    top: b.top,
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-white shadow-md ring-2 ring-white"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                      fontSize: size > 56 ? "11px" : "9px",
                      fontWeight: 600,
                    }}
                    title={`${b.ville} — ${formatNombre(b.scans)} scans`}
                  >
                    {b.ville}
                  </div>
                  <span className="mt-1 rounded bg-white/80 px-1.5 text-[10px] font-semibold text-[#374151] backdrop-blur-sm">
                    {formatNombre(b.scans)}
                  </span>
                </div>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 rounded-lg border border-[#E5E7EB] bg-white/95 px-3 py-2 backdrop-blur-sm">
              <p className="mb-1.5 text-[11px] font-medium text-[#6B7280]">
                Intensité des scans
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[#10B981]">Faible</span>
                <div
                  className="h-2 w-24 rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, #10B981, #F59E0B, #EF4444)",
                  }}
                />
                <span className="text-[10px] font-medium text-[#EF4444]">Élevé</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Top villes table */}
        <SectionCard title="Top villes" subtitle="8 villes les plus actives" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F3F4F6] text-[12px] uppercase tracking-wide text-[#9CA3AF]">
                  <th className="py-2.5 pr-2 font-semibold">#</th>
                  <th className="py-2.5 pr-2 font-semibold">Ville</th>
                  <th className="py-2.5 pr-2 font-semibold">Région</th>
                  <th className="py-2.5 pr-2 text-right font-semibold">Scans</th>
                  <th className="py-2.5 pr-2 text-right font-semibold">%</th>
                  <th className="py-2.5 text-right font-semibold">Évol.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {TOP_VILLES.map((v, i) => (
                  <tr key={v.ville} className="hover:bg-[#F9FAFB]">
                    <td className="py-2.5 pr-2 font-semibold text-[#9CA3AF]">{i + 1}</td>
                    <td className="py-2.5 pr-2 font-medium text-[#111827]">{v.ville}</td>
                    <td className="py-2.5 pr-2 text-[#6B7280]">{v.region}</td>
                    <td className="py-2.5 pr-2 text-right font-semibold text-[#111827]">
                      {formatNombre(v.scans)}
                    </td>
                    <td className="py-2.5 pr-2 text-right text-[#6B7280]">{v.pourcentage}%</td>
                    <td className="py-2.5 text-right">
                      {v.tendance === "up" && (
                        <span className="inline-flex items-center text-[#065F46]">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {v.tendance === "down" && (
                        <span className="inline-flex items-center text-[#991B1B]">
                          <TrendingDown className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {v.tendance === "stable" && (
                        <span className="inline-flex items-center text-[#9CA3AF]">→</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <InsightBox color="#2563EB">60% de vos scans viennent de Dakar</InsightBox>
          </div>
        </SectionCard>
      </div>

      {/* ============================================================ */}
      {/* Section 5 — Comportement des consommateurs (3 charts)        */}
      {/* ============================================================ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart 1 — Durée de consultation */}
        <SectionCard title="Durée de consultation">
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DUREE_CONSULTATION} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="duree"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  content={<ChartTooltip suffix=" consultations" color="#8B5CF6" labelFormatter={(l) => `Durée : ${l}`} />}
                  cursor={{ fill: "#8B5CF610" }}
                />
                <Bar dataKey="nombre" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3">
            <InsightBox color="#8B5CF6">
              70% des consommateurs passent moins de 30 secondes
            </InsightBox>
          </div>
        </SectionCard>

        {/* Chart 2 — Type d'appareil */}
        <SectionCard title="Type d'appareil utilisé">
          <div className="relative" style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={TYPE_APPAREIL}
                  dataKey="valeur"
                  nameKey="nom"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {TYPE_APPAREIL.map((entry) => (
                    <Cell key={entry.nom} fill={entry.couleur} />
                  ))}
                </Pie>
                <Tooltip content={<AppareilTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[20px] font-bold text-[#111827]">85%</span>
              <span className="text-[11px] font-medium text-[#6B7280]">Mobile</span>
            </div>
          </div>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[12px]">
            {TYPE_APPAREIL.map((t) => (
              <li key={t.nom} className="flex items-center gap-1.5 text-[#374151]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: t.couleur }}
                />
                <span className="font-medium">{t.nom}</span>
                <span className="text-[#6B7280]">{t.valeur}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <InsightBox color="#2563EB">85% des scans viennent de mobile</InsightBox>
          </div>
        </SectionCard>

        {/* Chart 3 — Actions sur page produit */}
        <SectionCard title="Actions sur la page produit">
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={ACTIONS_PRODUIT}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="action"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                  interval={0}
                />
                <Tooltip
                  content={<ChartTooltip suffix=" actions" color="#F59E0B" labelFormatter={(l) => String(l)} />}
                  cursor={{ fill: "#F59E0B10" }}
                />
                <Bar dataKey="nombre" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3">
            <InsightBox color="#F59E0B">
              45% des consommateurs vérifient les ingrédients
            </InsightBox>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
