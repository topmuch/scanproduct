"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  ArrowUp,
  ArrowRight,
  Minus,
  Star,
  Check,
  X,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  OutlineButton,
  ProgressBar,
  CountUpNumber,
} from "@/components/fabricant/ui";
import { SCORE_TRANSPARENCE, CLASSEMENT_FABRICANTS } from "@/lib/fabricant-data";

// ----------------------------------------------------------------------------
// Helpers — niveau badge (Platine / Or / Argent)
// ----------------------------------------------------------------------------
const NIVEAU_STYLES: Record<string, { bg: string; text: string }> = {
  Platine: { bg: "#F3E8FF", text: "#8B5CF6" },
  Or: { bg: "#FEF3C7", text: "#92400E" },
  Argent: { bg: "#F3F4F6", text: "#4B5563" },
};

function NiveauBadge({ niveau }: { niveau: string }) {
  const s = NIVEAU_STYLES[niveau] || NIVEAU_STYLES.Argent;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {niveau}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Tendance arrow cell
// ----------------------------------------------------------------------------
function TendanceCell({
  tendance,
  delta,
}: {
  tendance: string;
  delta: number;
}) {
  if (tendance === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#10B981]">
        <ArrowUp className="h-3.5 w-3.5" /> {delta}
      </span>
    );
  }
  if (tendance === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#EF4444]">
        <ArrowRight className="h-3.5 w-3.5 rotate-90" /> {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#9CA3AF]">
      <Minus className="h-3.5 w-3.5" /> 0
    </span>
  );
}

// ----------------------------------------------------------------------------
// Star rating for recommendation difficulty
// ----------------------------------------------------------------------------
function StarRating({ filled }: { filled: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < filled
              ? "h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]"
              : "h-3.5 w-3.5 text-[#D1D5DB]"
          }
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Detail card for a single transparency criterion
// ----------------------------------------------------------------------------
function DetailCard({
  detail,
  index,
}: {
  detail: (typeof SCORE_TRANSPARENCE.details)[number];
  index: number;
}) {
  const isFull = detail.score === detail.max;
  const accent = isFull ? "#10B981" : "#F59E0B";
  const gradient = isFull
    ? "from-[#10B981] to-[#34D399]"
    : "from-[#F59E0B] to-[#FBBF24]";

  const statutBadge = isFull
    ? { bg: "#D1FAE5", text: "#065F46", label: "Complet" }
    : { bg: "#FEF3C7", text: "#92400E", label: "Partiel" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="rounded-xl border border-[#E5E7EB] bg-white p-5"
    >
      {/* Top row: icon + title + status badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[24px] leading-none">{detail.icon}</span>
          <h4 className="text-[16px] font-semibold leading-tight text-[#111827]">
            {detail.titre}
          </h4>
        </div>
        <span
          className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
          style={{ backgroundColor: statutBadge.bg, color: statutBadge.text }}
        >
          {statutBadge.label}
        </span>
      </div>

      {/* Score */}
      <p
        className="mt-3 font-display text-[24px] font-bold leading-none"
        style={{ color: accent }}
      >
        {detail.score}/{detail.max} pts
      </p>

      {/* Progress bar */}
      <div className="mt-3">
        <ProgressBar
          value={detail.score}
          max={detail.max}
          gradient={gradient}
          height="h-2"
        />
      </div>

      {/* Sub-items list */}
      {detail.items.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {detail.items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-[13px] text-[#6B7280]"
            >
              <span className="flex items-center gap-1.5">
                {it.ok ? (
                  <Check className="h-3.5 w-3.5 text-[#10B981]" />
                ) : (
                  <X className="h-3.5 w-3.5 text-[#EF4444]" />
                )}
                <span className={it.ok ? "text-[#374151]" : "text-[#9CA3AF]"}>
                  {it.nom}
                </span>
              </span>
              <span className="font-medium tabular-nums">
                {it.pts}/{it.max} pts
              </span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

// ----------------------------------------------------------------------------
// Recommendation card
// ----------------------------------------------------------------------------
function RecoCard({
  reco,
  index,
}: {
  reco: (typeof SCORE_TRANSPARENCE.recommandations)[number];
  index: number;
}) {
  const isLast = index === SCORE_TRANSPARENCE.recommandations.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="flex flex-col rounded-xl border border-[#E5E7EB] bg-white p-5"
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3E8FF] text-[24px]">
        {reco.icon}
      </div>

      {/* Title + gain */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <h4 className="text-[16px] font-semibold leading-tight text-[#111827]">
          {reco.titre}
        </h4>
        <span className="inline-flex shrink-0 items-center rounded-full bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-bold text-[#065F46]">
          {reco.gain}
        </span>
      </div>

      {/* Description */}
      <p className="mt-2 text-[13px] leading-relaxed text-[#6B7280]">
        {reco.description}
      </p>

      {/* Difficulty */}
      <div className="mt-3 flex items-center gap-2">
        <StarRating filled={reco.etoiles} />
        <span className="text-[13px] text-[#6B7280]">{reco.difficulte}</span>
      </div>

      {/* Action button */}
      <div className="mt-4 pt-1">
        {isLast ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#7C3AED]"
          >
            Ajouter maintenant
          </button>
        ) : (
          <OutlineButton className="w-full">En savoir plus</OutlineButton>
        )}
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------------
// ScorePage — full implementation
// ----------------------------------------------------------------------------
export function ScorePage() {
  const s = SCORE_TRANSPARENCE;
  const scorePct = (s.global / 100) * 100;

  return (
    <div>
      {/* ============================================================ */}
      {/* Header                                                       */}
      {/* ============================================================ */}
      <PageHeader
        title="Score de Transparence"
        subtitle="Mesurez et améliorez la transparence de vos produits"
      >
        <span
          className="inline-flex items-center rounded-full px-4 py-2 text-[14px] font-semibold text-white shadow-sm"
          style={{
            background: "linear-gradient(to right, #8B5CF6, #2563EB)",
          }}
        >
          💎 {s.global}/100 — Transparence exemplaire
        </span>
      </PageHeader>

      {/* ============================================================ */}
      {/* Section 1 — Hero card (score global)                         */}
      {/* ============================================================ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-8"
        style={{
          background: "linear-gradient(135deg, #F3E8FF 0%, #EFF6FF 100%)",
        }}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left side */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-1">
              <CountUpNumber
                end={s.global}
                suffix="/100"
                className="font-display text-[64px] font-bold leading-none text-[#8B5CF6]"
              />
            </div>
            <p className="text-[20px] font-semibold text-[#111827]">
              💎 {s.niveau}
            </p>
            <p className="text-[14px] text-[#6B7280]">
              Vous êtes dans le top {s.topPourcent}% des fabricants VerifScan
            </p>
          </div>

          {/* Right side — progress + comparison */}
          <div className="w-full max-w-md">
            <ProgressBar
              value={s.global}
              max={100}
              gradient="from-[#8B5CF6] to-[#2563EB]"
              height="h-4"
            />
            <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[13px] text-[#6B7280]">
                Moyenne des fabricants :{" "}
                <span className="font-semibold text-[#374151]">
                  {s.moyenneFabricants}/100
                </span>
              </span>
              <span className="text-[13px] text-[#6B7280]">
                Votre position :{" "}
                <span className="font-semibold text-[#374151]">
                  #{s.rang} sur {s.totalFabricants}
                </span>
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ============================================================ */}
      {/* Section 2 — Détail par critère                               */}
      {/* ============================================================ */}
      <section className="mt-8">
        <h2 className="mb-4 text-[18px] font-semibold text-[#111827]">
          Détail par critère
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {s.details.map((d, i) => (
            <DetailCard key={d.id} detail={d} index={i} />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 3 — Recommandations d'amélioration                   */}
      {/* ============================================================ */}
      <section className="mt-8">
        <h2 className="mb-4 text-[18px] font-semibold text-[#111827]">
          💡 Comment atteindre 100% ?
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {s.recommandations.map((r, i) => (
            <RecoCard key={r.id} reco={r} index={i} />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 4 — Classement des fabricants                        */}
      {/* ============================================================ */}
      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-[18px] font-semibold text-[#111827]">
            🏆 Classement des fabricants transparents
          </h2>
          <p className="text-[14px] text-[#6B7280]">
            Votre position : #{s.rang} sur {s.totalFabricants} fabricants
          </p>
        </div>

        <SectionCard bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Rang
                  </th>
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Fabricant
                  </th>
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Score
                  </th>
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Niveau
                  </th>
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Tendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {CLASSEMENT_FABRICANTS.map((row) => {
                  const isVous = row.vous;
                  return (
                    <tr
                      key={`${row.rang}-${row.nom}`}
                      className="border-b border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]"
                      style={
                        isVous
                          ? { backgroundColor: "#F3E8FF" }
                          : undefined
                      }
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[14px] font-bold ${
                            isVous ? "text-[#8B5CF6]" : "text-[#111827]"
                          }`}
                        >
                          #{row.rang}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[14px] ${
                              isVous
                                ? "font-bold text-[#111827]"
                                : "font-medium text-[#374151]"
                            }`}
                          >
                            {row.nom}
                          </span>
                          {isVous && <span className="text-[14px]">👈</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-display text-[16px] font-bold ${
                            isVous ? "text-[#8B5CF6]" : "text-[#111827]"
                          }`}
                        >
                          {row.score}
                          <span className="text-[12px] font-medium text-[#9CA3AF]">
                            /100
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <NiveauBadge niveau={row.niveau} />
                      </td>
                      <td className="px-5 py-3.5">
                        <TendanceCell
                          tendance={row.tendance}
                          delta={row.delta}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-center border-t border-[#F3F4F6] px-5 py-4">
            <OutlineButton>
              <Trophy className="h-4 w-4 text-[#8B5CF6]" />
              Voir le classement complet
            </OutlineButton>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
