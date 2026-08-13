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
import {
  KPIS,
  SCANS_30J,
  ACTIVITES,
  TOP_PRODUITS,
  SCORE_TRANSPARENCE,
  BADGES,
  MARQUE,
  formatNombre,
} from "@/lib/fabricant-data";
import { useFabricantNav } from "@/lib/fabricant-store";

type PeriodKey = "7j" | "30j" | "90j" | "12m";

// Rank colors for the Top 5 Produits list
const RANK_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

// 4 mini transparency chips as specified (hard-coded per design spec)
const TRANSPARENCY_CHIPS = [
  { icon: "✅", label: "Identité", score: "15/15", color: "#10B981" },
  { icon: "✅", label: "Origine", score: "15/15", color: "#10B981" },
  { icon: "✅", label: "Composition", score: "20/20", color: "#10B981" },
  { icon: "⚠️", label: "Certifications", score: "10/15", color: "#F59E0B" },
];

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

  // Period selector — we only have SCANS_30J (30 days) of mock data,
  // so for 7j we slice the last 7 days, for other periods we keep the full set.
  const chartData =
    period === "7j"
      ? SCANS_30J.slice(-7)
      : period === "90j"
        ? SCANS_30J
        : period === "12m"
          ? SCANS_30J
          : SCANS_30J;

  const maxScans = Math.max(...TOP_PRODUITS.map((p) => p.scans));

  return (
    <div className="space-y-6">
      {/* ====================================================================
          1. Welcome bar
          ==================================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 rounded-xl border border-[#E5E7EB] p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)" }}
      >
        <div>
          <h1 className="font-display text-[24px] font-bold leading-tight text-[#111827]">
            Bonjour, {MARQUE.nom} 👋
          </h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Voici un aperçu de votre activité aujourd&apos;hui
          </p>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">Dimanche 26 juillet 2026</p>
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
        className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex-1">
          <p className="mb-2 text-[13px] font-medium text-[#374151]">
            Complétez votre profil à 75%
          </p>
          <ProgressBar value={75} gradient="from-[#2563EB] to-[#10B981]" height="h-2" />
        </div>
        <button
          type="button"
          onClick={() => setPage("parametres")}
          className="self-start text-[13px] font-semibold text-[#2563EB] hover:underline sm:self-auto"
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
          value={KPIS.produits.total}
          tendance="↑ +3 ce mois"
          subText={`${KPIS.produits.actifs} actifs · ${KPIS.produits.brouillons} brouillons`}
          onClick={() => setPage("produits")}
        />
        <KpiCard
          icon="🏷️"
          iconBg="#F0FDF4"
          label="Total Lots"
          value={KPIS.lots.total}
          tendance="↑ +15 ce mois"
          subText={`${KPIS.lots.actifs} actifs · ${KPIS.lots.rappelles} rappelés`}
          onClick={() => setPage("lots")}
        />
        <KpiCard
          icon="📱"
          iconBg="#FFFBEB"
          label="QR Codes Générés"
          value={KPIS.qrCodes.total}
          tendance="↑ +180 ce mois"
          subText="Quota : 2 340 / 5 000"
          onClick={() => setPage("qr-codes")}
        />
        <KpiCard
          icon="📈"
          iconBg="#F3E8FF"
          label="Total Scans"
          value={KPIS.scans.total}
          tendance="↑ +12% cette semaine"
          subText={`Moyenne : ${KPIS.scans.moyenneJour} scans/jour`}
          onClick={() => setPage("statistiques")}
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* ---- Left: Dernières actions (3/5) ---- */}
        <SectionCard
          title="Dernières actions"
          className="lg:col-span-3"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#F3F4F6]">
            {ACTIVITES.map((act) => (
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
            ))}
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

        {/* ---- Right: Top 5 produits scannés (2/5) ---- */}
        <SectionCard
          title="Top 5 produits scannés"
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#F3F4F6]">
            {TOP_PRODUITS.map((prod, idx) => (
              <li key={prod.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ backgroundColor: RANK_COLORS[idx] }}
                  >
                    {idx + 1}
                  </div>
                  <img
                    src={prod.photo}
                    alt={prod.nom}
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
            ))}
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
        className="rounded-xl border border-[#E5E7EB] p-6"
        style={{ background: "linear-gradient(135deg, #F3E8FF 0%, #EFF6FF 100%)" }}
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
            Top {SCORE_TRANSPARENCE.topPourcent}% des fabricants
          </span>
        </div>

        {/* Content: big score + progress bar */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <div>
            <p className="font-display text-[48px] font-bold leading-none text-[#8B5CF6]">
              {SCORE_TRANSPARENCE.global}
              <span className="text-[24px] font-semibold text-[#9CA3AF]">/100</span>
            </p>
            <p className="mt-1 text-[16px] font-medium text-[#374151]">
              {SCORE_TRANSPARENCE.niveau}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <ProgressBar
              value={SCORE_TRANSPARENCE.global}
              gradient="from-[#8B5CF6] to-[#2563EB]"
              height="h-3"
            />
            {/* 4 mini detail chips */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TRANSPARENCY_CHIPS.map((chip) => (
                <div
                  key={chip.label}
                  className="flex flex-col items-start rounded-lg border border-[#E5E7EB] bg-white/70 px-3 py-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px]">{chip.icon}</span>
                    <span className="text-[12px] font-medium text-[#374151]">{chip.label}</span>
                  </div>
                  <span
                    className="mt-0.5 text-[13px] font-semibold"
                    style={{ color: chip.color }}
                  >
                    {chip.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendation callout */}
        <div className="mt-5">
          <InsightBox color="#8B5CF6">
            Ajoutez la certification Halal pour atteindre 100%
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
          {BADGES.map((badge, idx) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * idx }}
              className={[
                "flex flex-col items-center rounded-xl border border-[#E5E7EB] bg-white p-5 text-center",
                badge.debloque ? "shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_24px_-12px_rgba(139,92,246,0.35)]" : "opacity-60",
              ].join(" ")}
            >
              <div
                className={[
                  "mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#F9FAFB] text-[48px] leading-none",
                  !badge.debloque ? "grayscale" : "",
                ].join(" ")}
              >
                {badge.icon}
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
