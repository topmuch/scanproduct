"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Lock } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  KpiCard,
  PillFilter,
  GradientButton,
  OutlineButton,
  ProgressBar,
  InsightBox,
} from "@/components/fabricant/ui";
import { formatNombre } from "@/lib/fabricant-types";
import { useFabricantNav } from "@/lib/fabricant-store";
import { useFabricantData } from "../FabricantDataProvider";
import { ProductImage } from "@/components/fabricant/ProductImage";

type PeriodKey = "7j" | "30j" | "90j" | "12m";

// Rank colors for the Top 5 Produits list
const RANK_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

// ----------------------------------------------------------------------------
// Custom tooltip for the scans AreaChart
// ----------------------------------------------------------------------------
function ScanTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { jour: string; scans: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 shadow-md">
      <p className="text-[12px] font-medium text-[#6B7280]">{item.jour}</p>
      <p className="mt-0.5 text-[14px] font-semibold text-[#111827]">
        {formatNombre(item.scans)} scans
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// AccueilPage — full dashboard for the Fabricant space
// ----------------------------------------------------------------------------
export function AccueilPage() {
  const setPage = useFabricantNav((s) => s.setPage);
  const [period, setPeriod] = useState<PeriodKey>("30j");
  const { data } = useFabricantData();
  const { profile, stats, score, badges } = data;

  // Stats may be null if the server-side stats computation failed
  // (getFabricantData uses Promise.allSettled). Show a fallback instead of
  // crashing the entire dashboard.
  if (!stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div className="max-w-md">
          <h2 className="font-display text-lg font-semibold text-[#111827]">
            Bonjour, {profile.nom} 👋
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Les statistiques sont temporairement indisponibles. Vos produits,
            lots et QR codes restent accessibles via le menu de gauche.
          </p>
        </div>
      </div>
    );
  }

  // Period selector — we only have 30 days of real scan data, so 7j slices
  // the last 7 entries and other periods keep the full set.
  const chartData =
    period === "7j"
      ? stats.scansByDay.slice(-7)
      : stats.scansByDay;

  const maxScans = stats.topProducts.length > 0
    ? Math.max(...stats.topProducts.map((p) => p.scans), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* ====================================================================
          1. Welcome bar
          ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 rounded-xl border border-[#E5E7EB] bg-gradient-to-br from-[#EFF6FF] to-[#F0FDF4] p-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:from-[#1E293B] dark:to-[#1E3A8A]"
      >
        <div>
          <h1 className="font-display text-[24px] font-bold leading-tight text-[#111827]">
            Bonjour, {profile.companyName} 👋
          </h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Voici un aperçu de votre activité aujourd&apos;hui
          </p>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GradientButton onClick={() => setPage("lots")}>+ Créer un nouveau lot</GradientButton>
          <OutlineButton onClick={() => setPage("statistiques")}>Voir mes statistiques</OutlineButton>
        </div>
      </motion.div>

      {/* ====================================================================
          2. Profile progress bar
          ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#1E293B]"
      >
        <div className="flex-1">
          <p className="mb-2 text-[13px] font-medium text-[#374151] dark:text-[#E5E7EB]">
            Complétez votre profil à 75%
          </p>
          <ProgressBar value={75} gradient="from-[#2563EB] to-[#10B981]" height="h-2" />
        </div>
        <button
          type="button"
          onClick={() => setPage("parametres")}
          className="self-start text-[13px] font-semibold text-[#2563EB] hover:underline sm:self-auto dark:text-[#60A5FA]"
        >
          Voir les détails
        </button>
      </motion.div>

      {/* ====================================================================
          3. KPI cards (4)
          ==================================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon="📦"
          iconBg="#EFF6FF"
          label="Total Produits"
          value={stats.kpis.produits.total}
          tendance={stats.kpis.produits.tendance}
          subText={`${stats.kpis.produits.actifs} actifs · ${stats.kpis.produits.brouillons} brouillons`}
          onClick={() => setPage("produits")}
          gradient="from-[#2563EB] to-[#3B82F6]"
        />
        <KpiCard
          icon="🏷️"
          iconBg="#F0FDF4"
          label="Total Lots"
          value={stats.kpis.lots.total}
          tendance={stats.kpis.lots.tendance}
          subText={`${stats.kpis.lots.actifs} actifs · ${stats.kpis.lots.rappelles} rappelés`}
          onClick={() => setPage("lots")}
          gradient="from-[#10B981] to-[#34D399]"
        />
        <KpiCard
          icon="📱"
          iconBg="#FFFBEB"
          label="QR Codes Générés"
          value={stats.kpis.qrCodes.total}
          tendance={stats.kpis.qrCodes.tendance}
          subText={`Quota : ${formatNombre(stats.kpis.qrCodes.total)} / ${formatNombre(stats.kpis.qrCodes.quota)}`}
          onClick={() => setPage("qr-codes")}
          gradient="from-[#F59E0B] to-[#FBBF24]"
        />
        <KpiCard
          icon="📈"
          iconBg="#F3E8FF"
          label="Total Scans"
          value={stats.kpis.scans.total}
          tendance={stats.kpis.scans.tendance}
          subText={`Moyenne : ${stats.kpis.scans.moyenneJour} scans/jour`}
          onClick={() => setPage("statistiques")}
          gradient="from-[#8B5CF6] to-[#A78BFA]"
        />
      </div>

      {/* ====================================================================
          4. Main chart — Évolution des scans
          ==================================================================== */}
      <SectionCard
        title="Évolution des scans"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <PillFilter<PeriodKey>
              value={period}
              onChange={setPeriod}
              options={[
                { value: "7j", label: "7j" },
                { value: "30j", label: "30j" },
                { value: "90j", label: "90j" },
                { value: "12m", label: "12m" },
              ]}
            />
            <button
              type="button"
              onClick={() => setPage("statistiques")}
              className="text-[14px] font-semibold text-[#2563EB] hover:underline"
            >
              Voir les détails
            </button>
          </div>
        }
      >
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="jour"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ScanTooltip />} />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="#2563EB"
                strokeWidth={3}
                fill="url(#scanGradient)"
                dot={false}
                activeDot={{ r: 5, fill: "#2563EB", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* ====================================================================
          5. Activity feed + Top products (2-column)
          ==================================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---- Left: Dernières actions (2/3) ---- */}
        <SectionCard
          title="Dernières actions"
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#F3F4F6]">
            {stats.recentActivity.length === 0 ? (
              <li className="px-5 py-6 text-center text-[13px] text-[#6B7280]">
                Aucune activité récente à afficher.
              </li>
            ) : (
              stats.recentActivity.map((act) => (
                <li
                  key={act.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#F9FAFB]"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px]"
                    style={{ backgroundColor: `${act.color}1A` }}
                  >
                    <span>{act.icon}</span>
                  </div>
                  <p className="flex-1 text-[14px] text-[#374151]">{act.text}</p>
                  <span className="text-[12px] text-[#6B7280]">{act.time}</span>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-[#F3F4F6] px-5 py-3">
            <button
              type="button"
              onClick={() => setPage("statistiques")}
              className="text-[14px] font-semibold text-[#2563EB] hover:underline"
            >
              Voir tout l&apos;historique
            </button>
          </div>
        </SectionCard>

        {/* ---- Right: Top 5 produits scannés (1/3) ---- */}
        <SectionCard
          title="Top 5 produits scannés"
          className="lg:col-span-1"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#F3F4F6]">
            {stats.topProducts.length === 0 ? (
              <li className="px-5 py-6 text-center text-[13px] text-[#6B7280]">
                Aucun scan pour le moment.
              </li>
            ) : (
              stats.topProducts.map((prod, idx) => (
                <li key={prod.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                      style={{ backgroundColor: RANK_COLORS[idx] }}
                    >
                      {idx + 1}
                    </div>
                    <ProductImage
                      src={prod.photo}
                      alt={prod.nom}
                      icon={prod.categorieIcon}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[#111827]">{prod.nom}</p>
                      <p className="text-[13px] text-[#6B7280]">{formatNombre(prod.scans)} scans</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F3F4F6] pl-7">
                    <div
                      className="h-full rounded-full bg-[#2563EB]"
                      style={{ width: `${(prod.scans / maxScans) * 100}%` }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-[#F3F4F6] px-5 py-3">
            <button
              type="button"
              onClick={() => setPage("produits")}
              className="text-[14px] font-semibold text-[#2563EB] hover:underline"
            >
              Voir tous les produits
            </button>
          </div>
        </SectionCard>
      </div>

      {/* ====================================================================
          6. Transparency Score
          ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-[#E5E7EB] bg-gradient-to-br from-[#F3E8FF] to-[#EFF6FF] p-6 dark:border-white/10 dark:from-[#1E1B4B] dark:to-[#1E3A8A]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-[18px] font-semibold text-[#111827]">
            💎 Votre Score de Transparence
          </h3>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: "#F3E8FF", color: "#8B5CF6" }}
          >
            Top {score.topPourcent}% des fabricants
          </span>
        </div>

        {/* Content: big score + progress bar */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <div>
            <p className="font-display text-[48px] font-bold leading-none text-[#8B5CF6]">
              {score.global}
              <span className="text-[24px] font-semibold text-[#9CA3AF]">/100</span>
            </p>
            <p className="mt-1 text-[16px] font-medium text-[#374151]">
              {score.niveau}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <ProgressBar
              value={score.global}
              gradient="from-[#8B5CF6] to-[#2563EB]"
              height="h-3"
            />
            {/* 4 mini detail chips */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {score.details.slice(0, 4).map((d) => {
                const isFull = d.score === d.max;
                return (
                  <div
                    key={d.id}
                    className="flex flex-col items-start rounded-lg border border-[#E5E7EB] bg-white/70 px-3 py-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px]">{isFull ? "✅" : "⚠️"}</span>
                      <span className="text-[12px] font-medium text-[#374151]">{d.titre}</span>
                    </div>
                    <span
                      className="mt-0.5 text-[13px] font-semibold"
                      style={{ color: isFull ? "#10B981" : "#F59E0B" }}
                    >
                      {d.score}/{d.max}
                    </span>
                  </div>
                );
              })}
              {score.details.length === 0 && (
                <p className="col-span-4 px-3 py-2 text-[12px] text-[#9CA3AF]">
                  Détail non disponible — créez un lot pour calculer votre score.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendation callout */}
        <div className="mt-5">
          <InsightBox color="#8B5CF6">
            {score.recommandations[0]?.titre ?? "Complétez vos informations produit pour améliorer votre score"}
          </InsightBox>
        </div>

        {/* Buttons */}
        <div className="mt-5 flex flex-wrap gap-3">
          <OutlineButton onClick={() => setPage("score")}>Voir les détails</OutlineButton>
          <button
            type="button"
            onClick={() => setPage("score")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#7C3AED]"
          >
            Améliorer mon score
          </button>
        </div>
      </motion.div>

      {/* ====================================================================
          7. Badges / Gamification
          ==================================================================== */}
      <section>
        <div className="mb-4">
          <h3 className="font-display text-[18px] font-semibold text-[#111827]">
            Vos réussites 🏆
          </h3>
          <p className="mt-0.5 text-[13px] text-[#6B7280]">
            Débloquez des badges en atteignant des objectifs
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {badges.map((badge, idx) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * idx }}
              className={[
                "flex flex-col items-center rounded-xl border bg-white p-5 text-center",
                badge.debloque
                  ? "border-[#E5E7EB] shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_24px_-12px_rgba(139,92,246,0.35)]"
                  : "border-dashed border-[#D1D5DB] opacity-50",
              ].join(" ")}
            >
              <div
                className={[
                  "mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#F9FAFB] text-[48px] leading-none",
                  !badge.debloque ? "relative" : "",
                ].join(" ")}
              >
                {badge.icon}
                {!badge.debloque && (
                  <span
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#D1D5DB] text-[#374151]"
                    aria-label="Verrouillé"
                  >
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </div>

              <p className="text-[14px] font-semibold text-[#111827]">{badge.nom}</p>

              {badge.debloque ? (
                <>
                  <p className="mt-1 text-[12px] font-semibold text-[#10B981]">✅ Débloqué</p>
                  {badge.date && (
                    <p className="mt-0.5 text-[11px] text-[#6B7280]">{badge.date}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-1 text-[12px] font-semibold text-[#9CA3AF]">🔒 Verrouillé</p>
                  <div className="mt-2 w-full">
                    <ProgressBar
                      value={badge.progression ?? 0}
                      gradient="from-[#2563EB] to-[#10B981]"
                      height="h-1.5"
                    />
                    <p className="mt-1 text-[12px] font-medium text-[#6B7280]">
                      {badge.progression ?? 0}%
                    </p>
                  </div>
                </>
              )}

              <p className="mt-2 text-[12px] text-[#9CA3AF]">{badge.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
