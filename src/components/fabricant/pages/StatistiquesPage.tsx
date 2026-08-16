"use client";

import { useState, useRef, useEffect } from "react";
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
import { formatNombre } from "@/lib/fabricant-types";
import { useFabricantData } from "../FabricantDataProvider";
import {
  FileDown,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  Download,
  Loader2,
  FileSpreadsheet,
  Package,
  Tag,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";

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

// Product photos — we now use the real product.photo from the stats context.
// Kept as an empty map for type compat with the render loop below.
const PRODUCT_PHOTOS: Record<string, string> = {};

// Trend column — we don't have week-over-week scan deltas yet, so we render
// a neutral "—" indicator instead of fake percentages.
const PRODUCT_TRENDS: { up: boolean; pct: string }[] = [
  { up: true, pct: "—" },
  { up: true, pct: "—" },
  { up: true, pct: "—" },
  { up: true, pct: "—" },
  { up: true, pct: "—" },
  { up: true, pct: "—" },
  { up: true, pct: "—" },
];

// Durée consultation — no time-tracking in the schema yet, so we render a
// "Bientôt disponible" note instead of fake data (see InsightBox below).
const DUREE_CONSULTATION = [
  { duree: "0-10s", nombre: 0 },
  { duree: "10-30s", nombre: 0 },
  { duree: "30-60s", nombre: 0 },
  { duree: "1-2min", nombre: 0 },
  { duree: "2min+", nombre: 0 },
];

// Actions produit — no event tracking in the schema yet.
const ACTIONS_PRODUIT = [
  { action: "Consultation des ingrédients", nombre: 0, pourcentage: 0 },
  { action: "Vérification des dates", nombre: 0, pourcentage: 0 },
  { action: "Clic sur \"Contacter le fabricant\"", nombre: 0, pourcentage: 0 },
  { action: "Partage sur réseaux sociaux", nombre: 0, pourcentage: 0 },
];

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
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload: { nom: string; scans: number; couleur: string } }>;
  total?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  const pct = total && total > 0 ? ((p.scans / total) * 100).toFixed(1) : null;
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
        {formatNombre(p.scans)} scans{pct !== null ? ` · ${pct}%` : ""}
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
// Sénégal — stylized geographic visualization.
// Each bubble is positioned roughly according to its geographic location
// (peninsula Dakar NW, Saint-Louis N, Touba center, Ziguinchor SW Casamance…).
// Real scan counts are joined from `stats.topVilles` at render time.
// ============================================================================
type SenegalBubble = {
  ville: string;
  scans: number;
  left: string;
  top: string;
};

const SENEGAL_BUBBLE_POSITIONS: Record<string, { left: string; top: string }> = {
  "Saint-Louis": { left: "26%", top: "12%" },
  "Dakar": { left: "14%", top: "42%" },
  "Rufisque": { left: "23%", top: "48%" },
  "Thiès": { left: "32%", top: "40%" },
  "Mbour": { left: "30%", top: "65%" },
  "Touba": { left: "46%", top: "33%" },
  "Kaolack": { left: "44%", top: "60%" },
  "Ziguinchor": { left: "16%", top: "82%" },
};

function bubbleColor(scans: number): string {
  if (scans > 2000) return "#EF4444"; // rouge — élevé
  if (scans > 500) return "#F59E0B"; // orange — moyen
  return "#10B981"; // vert — faible
}

function bubbleSize(scans: number, min: number, max: number): number {
  if (max <= min) return 64;
  return Math.round(44 + ((scans - min) / (max - min)) * 52);
}

// ============================================================================
// Main component
// ============================================================================
export function StatistiquesPage() {
  const [period, setPeriod] = useState<PeriodKey>("30j");
  const { data } = useFabricantData();
  const { stats, products } = data;

  // ── Export state ──────────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Stats may be null if the server-side stats computation failed.
  // (placed AFTER all hooks to respect rules-of-hooks)
  if (!stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div className="max-w-md">
          <p className="text-sm text-[#6B7280]">
            Les statistiques ne sont pas disponibles pour le moment.
          </p>
        </div>
      </div>
    );
  }

  // Map the UI period to the API period format.
  const periodToApi = (p: PeriodKey): string => {
    switch (p) {
      case "7j": return "7d";
      case "30j": return "30d";
      case "90j": return "90d";
      case "12m": return "12m";
      default: return "30d";
    }
  };

  const triggerDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExport = async (type: "scans" | "products" | "lots") => {
    setExporting(type);
    setExportOpen(false);
    try {
      let url: string;
      if (type === "scans") {
        url = `/api/export/scans?period=${periodToApi(period)}`;
      } else if (type === "products") {
        url = "/api/export/products";
      } else {
        url = "/api/export/lots";
      }
      // Fetch to check for errors, then trigger download.
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Échec de l'export");
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      triggerDownload(blobUrl);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Export ${type} téléchargé`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'export");
    } finally {
      setExporting(null);
    }
  };

  // Build the 6 KPI cards from the real stats context.
  const totalProducts = stats.totalProducts;
  const actifsProducts = stats.kpis.produits.actifs;
  const STATS_KPIS = [
    { id: "k1", label: "Total scans", valeur: stats.totalScans, tendance: stats.kpis.scans.tendance, positif: true, suffixe: "" },
    { id: "k2", label: "Scans aujourd'hui", valeur: stats.scansByDay[stats.scansByDay.length - 1]?.scans ?? 0, tendance: "—", positif: true, suffixe: "" },
    { id: "k3", label: "Moyenne/jour", valeur: stats.moyenneJour, tendance: "—", positif: true, suffixe: "" },
    { id: "k4", label: "Produits scannés", valeur: actifsProducts, tendance: `${totalProducts > 0 ? Math.round((actifsProducts / totalProducts) * 100) : 0}%`, positif: true, suffixe: `/${totalProducts}` },
    { id: "k5", label: "Lots actifs", valeur: stats.kpis.lots.actifs, tendance: "—", positif: true, suffixe: "" },
    { id: "k6", label: "QR codes", valeur: stats.totalQRCodes, tendance: "—", positif: true, suffixe: "" },
  ];

  const SCANS_30J = stats.scansByDay;
  const SCANS_SEMAINE = stats.scansSemaine;
  const SCANS_HEURE = stats.scansHeure;
  const REPARTITION_PRODUITS = stats.repartitionProduits;
  const TOP_VILLES = stats.topVilles;
  const TYPE_APPAREIL = stats.typeAppareil;
  const TOTAL_SCANS = REPARTITION_PRODUITS.reduce((s, p) => s + p.scans, 0);

  // Build the Senegal bubbles from real topVilles + known positions.
  const allScans = TOP_VILLES.map((v) => v.scans);
  const minScans = allScans.length > 0 ? Math.min(...allScans) : 0;
  const maxScans = allScans.length > 0 ? Math.max(...allScans) : 1;
  const SENEGAL_BUBBLES: SenegalBubble[] = TOP_VILLES
    .map((v) => {
      const pos = SENEGAL_BUBBLE_POSITIONS[v.ville];
      if (!pos) return null;
      return { ville: v.ville, scans: v.scans, left: pos.left, top: pos.top };
    })
    .filter((b): b is SenegalBubble => b !== null);

  // Donut chart center label overlay
  const totalScansDisplay = formatNombre(TOTAL_SCANS);

  // Real product photo lookup (by product name) for the Top produits table.
  // We join repartitionProduits (scans by product name) with the user's
  // products list to get the actual imageUrl stored in the DB.
  const productPhotoByName = new Map<string, string>();
  for (const p of products) {
    if (p.photo) productPhotoByName.set(p.nom, p.photo);
  }

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* Header                                                        */}
      {/* ============================================================ */}
      <PageHeader title="Statistiques" subtitle="Analysez les performances de vos produits">
        <PillFilter options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <div className="relative" ref={exportRef}>
          <OutlineButton onClick={() => setExportOpen((v) => !v)}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Exporter
            <ChevronDown className="h-3 w-3" />
          </OutlineButton>
          {exportOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
              <button
                type="button"
                onClick={() => handleExport("scans")}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-4 w-4 text-[#2563EB]" />
                <div className="text-left">
                  <p className="font-medium">Scans (CSV)</p>
                  <p className="text-[10px] text-gray-400">Historique des scans</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleExport("products")}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Package className="h-4 w-4 text-[#10B981]" />
                <div className="text-left">
                  <p className="font-medium">Produits (CSV)</p>
                  <p className="text-[10px] text-gray-400">Liste des produits</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleExport("lots")}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Tag className="h-4 w-4 text-[#F59E0B]" />
                <div className="text-left">
                  <p className="font-medium">Lots (CSV)</p>
                  <p className="text-[10px] text-gray-400">Historique des lots</p>
                </div>
              </button>
            </div>
          )}
        </div>
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
                <Tooltip content={<RepartitionTooltip total={TOTAL_SCANS} />} />
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
                  const photo = productPhotoByName.get(p.nom) ?? PRODUCT_PHOTOS[p.nom];
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
              const size = bubbleSize(b.scans, minScans, maxScans);
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
