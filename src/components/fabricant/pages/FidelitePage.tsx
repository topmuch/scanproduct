"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Gift,
  Trophy,
  Star,
  Award,
  Medal,
  Sparkles,
  Crown,
  Users,
  Coins,
  ScanLine,
  Loader2,
  RefreshCw,
  Info,
  Ticket,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  KpiCard,
  GradientButton,
  OutlineButton,
  StatusBadge,
} from "@/components/fabricant/ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types — mirror the API contract
// ============================================================================

type RewardItem = {
  type: string;
  label: string;
  pointsCost: number;
  icon: string;
  description: string;
};

type BadgeTier = {
  id: string;
  label: string;
  minPoints: number;
  icon: string;
  color: string;
};

type TopConsumer = {
  id: string;
  label: string;
  points: number;
  scansCount: number;
  badges: string[];
};

type RecentRedemption = {
  id: string;
  rewardLabel: string;
  rewardType: string;
  pointsCost: number;
  status: string;
  code: string | null;
  createdAt: string;
  consumerLabel: string;
};

type FabricantLoyaltyStats = {
  totalConsumers: number;
  totalPointsDistributed: number;
  totalScans: number;
  topBadges: Array<{
    badgeId: string;
    label: string;
    icon: string;
    color: string;
    count: number;
  }>;
  recentRedemptions: RecentRedemption[];
  topConsumers: TopConsumer[];
  totalRedemptions: number;
};

type StatsResponse = {
  stats: FabricantLoyaltyStats;
  rewards: RewardItem[];
  badges: BadgeTier[];
};

// ============================================================================
// Constants
// ============================================================================

const RANK_COLORS = ["#F59E0B", "#9CA3AF", "#B45309", "#6B7280", "#4B5563"];

const REDEMPTION_STATUS_META: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "#FEF3C7", text: "#92400E", label: "En attente" },
  fulfilled: { bg: "#D1FAE5", text: "#065F46", label: "Honorée" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Annulée" },
};

const REWARD_TYPE_ICON: Record<string, string> = {
  discount_5: "🏷️",
  discount_10: "💸",
  free_product: "🎁",
  factory_visit: "🏭",
};

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

// ============================================================================
// Badge distribution card — single tier tile
// ============================================================================

function BadgeTierCard({
  tier,
  count,
  totalConsumers,
}: {
  tier: { id: string; label: string; icon: string; color: string; minPoints: number };
  count: number;
  totalConsumers: number;
}) {
  const pct = totalConsumers > 0 ? Math.round((count / totalConsumers) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-5"
    >
      {/* Decorative gradient blob */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: tier.color }}
      />
      <div className="flex items-center justify-between">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-[24px]"
          style={{ backgroundColor: `${tier.color}20` }}
        >
          {tier.icon}
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-bold"
          style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
        >
          {tier.minPoints}+ pts
        </span>
      </div>
      <h4 className="mt-3 font-display text-[18px] font-bold" style={{ color: tier.color }}>
        {tier.label}
      </h4>
      <p className="mt-1 text-[12px] text-[#6B7280]">
        Consommateurs ayant atteint ce rang
      </p>
      <p className="mt-2 font-display text-[32px] font-bold leading-none text-[#111827]">
        {count}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: tier.color }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
        {pct}% de vos consommateurs fidèles
      </p>
    </motion.div>
  );
}

// ============================================================================
// Top consumer row
// ============================================================================

function TopConsumerRow({
  consumer,
  rank,
  badges,
}: {
  consumer: TopConsumer;
  rank: number;
  badges: BadgeTier[];
}) {
  const rankColor = RANK_COLORS[rank] ?? RANK_COLORS[RANK_COLORS.length - 1];
  const consumerBadges = badges.filter((b) => consumer.badges.includes(b.id));

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors hover:bg-[#F9FAFB]",
        rank === 0
          ? "border-[#F59E0B]/30 bg-[#FFFBEB]/50"
          : "border-[#F3F4F6] bg-white",
      )}
    >
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ backgroundColor: rankColor }}
      >
        {rank + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[#111827]">
          {consumer.label}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[#6B7280]">
          <span className="inline-flex items-center gap-1">
            <ScanLine className="h-3 w-3" />
            {consumer.scansCount} scans
          </span>
          {consumerBadges.length > 0 && (
            <div className="flex items-center gap-1">
              {consumerBadges.map((b) => (
                <span
                  key={b.id}
                  title={b.label}
                  className="text-[12px]"
                  style={{ color: b.color }}
                >
                  {b.icon}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-display text-[16px] font-bold text-[#F59E0B]">
          {consumer.points}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">pts</p>
      </div>
    </div>
  );
}

// ============================================================================
// Redemption row
// ============================================================================

function RedemptionRow({ redemption }: { redemption: RecentRedemption }) {
  const meta = REDEMPTION_STATUS_META[redemption.status] ?? REDEMPTION_STATUS_META.pending;
  const icon = REWARD_TYPE_ICON[redemption.rewardType] ?? "🎁";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#F3F4F6] bg-white px-3 py-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F9FAFB] text-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#111827]">
          {redemption.rewardLabel}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">
          <span>{redemption.consumerLabel}</span>
          <span aria-hidden>•</span>
          <span>{formatRelativeDate(redemption.createdAt)}</span>
          {redemption.code && (
            <>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1 font-mono text-[#8B5CF6]">
                <Ticket className="h-3 w-3" />
                {redemption.code}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className="text-[12px] font-bold text-[#F59E0B]">
          -{redemption.pointsCost} pts
        </span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: meta.bg, color: meta.text }}
        >
          {meta.label}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton loaders
// ============================================================================

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[140px] animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[180px] animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]"
          />
        ))}
      </div>
      <div className="h-[300px] animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]" />
    </div>
  );
}

// ============================================================================
// Empty state — no scans yet
// ============================================================================

function NoConsumersState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-gradient-to-br from-[#F9FAFB] to-[#FFFBEB] py-20 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F59E0B]/20 to-[#8B5CF6]/20">
        <Gift className="h-10 w-10 text-[#F59E0B]" />
      </div>
      <h3 className="font-display text-[20px] font-bold text-[#111827]">
        Programme de fidélité prêt à démarrer
      </h3>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#6B7280]">
        Aucun consommateur n&apos;a encore scanné vos produits. Partagez vos QR codes
        pour commencer à fidéliser vos clients et récompenser leur engagement !
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
          1 scan = 10 pts
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] shadow-sm">
          <Trophy className="h-3.5 w-3.5 text-[#10B981]" />
          3 badges à débloquer
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] shadow-sm">
          <Gift className="h-3.5 w-3.5 text-[#8B5CF6]" />
          4 récompenses
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export function FidelitePage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (showRefreshLoader: boolean = false) => {
    if (showRefreshLoader) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/loyalty/stats", { cache: "no-store" });
      if (res.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        return;
      }
      if (!res.ok) {
        toast.error("Impossible de charger les statistiques fidélité");
        return;
      }
      const json = (await res.json()) as StatsResponse;
      setData(json);
    } catch {
      toast.error("Erreur réseau lors du chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  if (loading || !data) {
    return (
      <div>
        <PageHeader
          title="Programme de Fidélité"
          subtitle="Récompensez vos consommateurs fidèles et suivez leur engagement"
        />
        <StatsSkeleton />
      </div>
    );
  }

  const { stats, badges } = data;
  const hasData = stats.totalConsumers > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Programme de Fidélité"
        subtitle="Récompensez vos consommateurs fidèles et suivez leur engagement"
      >
        <OutlineButton onClick={() => fetchStats(true)} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualiser
        </OutlineButton>
      </PageHeader>

      {/* "Comment ça marche" info banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-[#F59E0B]/20 bg-gradient-to-br from-[#FFFBEB] via-[#F9FAFB] to-[#F3E8FF] p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <Info className="h-5 w-5 text-[#F59E0B]" />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-[16px] font-bold text-[#111827]">
              Comment ça marche ?
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#4B5563]">
              Vos clients scannent le QR code de vos produits et accumulent
              automatiquement des points fidélité. Chaque scan rapporte{" "}
              <strong className="text-[#F59E0B]">10 points</strong>. Plus ils
              scannent, plus ils grimpent en grade et débloquent des récompenses
              exclusives.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {badges.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-[12px] font-medium"
                  style={{ borderColor: `${b.color}40`, color: b.color }}
                >
                  <span>{b.icon}</span>
                  {b.label}
                  <span className="text-[10px] opacity-70">({b.minPoints} pts)</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {!hasData ? (
        <NoConsumersState />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon="👥"
              iconBg="#EFF6FF"
              label="Consommateurs uniques"
              value={stats.totalConsumers}
              subText="Clients ayant scanné vos produits"
            />
            <KpiCard
              icon="💰"
              iconBg="#FFFBEB"
              label="Points distribués"
              value={stats.totalPointsDistributed}
              subText="Total cumulé par vos clients"
              gradient="from-[#F59E0B] to-[#FBBF24]"
            />
            <KpiCard
              icon="📱"
              iconBg="#F0FDF4"
              label="Scans totaux"
              value={stats.totalScans}
              subText="Scans de vos QR codes"
            />
            <KpiCard
              icon="🎁"
              iconBg="#F3E8FF"
              label="Récompenses demandées"
              value={stats.totalRedemptions}
              subText="Points échangés par vos clients"
            />
          </div>

          {/* Badge distribution */}
          <SectionCard
            title="Répartition des badges"
            subtitle="Combien de vos consommateurs ont atteint chaque rang"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.topBadges.map((tier) => {
                const tierMeta = badges.find((b) => b.id === tier.badgeId);
                return (
                  <BadgeTierCard
                    key={tier.badgeId}
                    tier={{
                      id: tier.badgeId,
                      label: tier.label,
                      icon: tier.icon,
                      color: tier.color,
                      minPoints: tierMeta?.minPoints ?? 0,
                    }}
                    count={tier.count}
                    totalConsumers={stats.totalConsumers}
                  />
                );
              })}
            </div>
          </SectionCard>

          {/* Top consumers + Recent redemptions */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Top consumers */}
            <SectionCard
              title="Top consommateurs"
              subtitle="Vos 5 clients les plus fidèles"
              className="lg:col-span-3"
              bodyClassName="p-0"
              action={
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2.5 py-1 text-[11px] font-semibold text-[#92400E]">
                  <Crown className="h-3 w-3" />
                  Classement
                </span>
              }
            >
              <div className="max-h-96 overflow-y-auto p-4">
                {stats.topConsumers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-10 w-10 text-[#D1D5DB]" />
                    <p className="mt-3 text-[13px] text-[#6B7280]">
                      Aucun consommateur classé pour le moment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats.topConsumers.map((c, i) => (
                      <TopConsumerRow
                        key={c.id}
                        consumer={c}
                        rank={i}
                        badges={badges}
                      />
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Recent redemptions */}
            <SectionCard
              title="Récompenses récentes"
              subtitle="Dernières demandes d'échange"
              className="lg:col-span-2"
              bodyClassName="p-0"
              action={
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E8FF] px-2.5 py-1 text-[11px] font-semibold text-[#8B5CF6]">
                  <Gift className="h-3 w-3" />
                  {stats.totalRedemptions}
                </span>
              }
            >
              <div className="max-h-96 overflow-y-auto p-4">
                {stats.recentRedemptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Ticket className="h-10 w-10 text-[#D1D5DB]" />
                    <p className="mt-3 text-[13px] text-[#6B7280]">
                      Aucune récompense demandée
                    </p>
                    <p className="mt-1 text-[11px] text-[#9CA3AF]">
                      Vos clients échangeront leurs points ici
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats.recentRedemptions.map((r) => (
                      <RedemptionRow key={r.id} redemption={r} />
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Rewards catalog preview */}
          <SectionCard
            title="Catalogue des récompenses"
            subtitle="Les récompenses que vos clients peuvent échanger avec leurs points"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.rewards.map((reward) => (
                <div
                  key={reward.type}
                  className="rounded-lg border border-[#F3F4F6] bg-gradient-to-br from-white to-[#F9FAFB] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFBEB] text-[20px]">
                      {reward.icon}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[11px] font-bold text-[#F59E0B]">
                      <Star className="h-3 w-3 fill-[#F59E0B]" />
                      {reward.pointsCost} pts
                    </span>
                  </div>
                  <p className="mt-3 text-[13px] font-semibold text-[#111827]">
                    {reward.label}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280]">
                    {reward.description}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
