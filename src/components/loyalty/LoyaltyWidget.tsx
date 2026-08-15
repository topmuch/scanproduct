"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Trophy,
  Star,
  Sparkles,
  Loader2,
  X,
  Ticket,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

type ConsumerProfile = {
  id: string;
  anonymousId: string;
  points: number;
  totalScans: number;
  badges: string[];
  nextBadge: {
    label: string;
    minPoints: number;
    pointsRemaining: number;
  } | null;
  recentScans: Array<{
    lotId: string;
    productName: string;
    scannedAt: string;
  }>;
  redemptions: Array<{
    id: string;
    rewardLabel: string;
    pointsCost: number;
    status: string;
    createdAt: string;
    code: string | null;
  }>;
};

type ProfileResponse = {
  profile: ConsumerProfile | null;
  rewards: RewardItem[];
  badges: BadgeTier[];
};

type ScanResponse = {
  pointsAwarded: number;
  newTotal: number;
  newBadges: string[];
  alreadyScanned: boolean;
  profile: ConsumerProfile | null;
};

type RedeemResponse = {
  redemption: {
    id: string;
    rewardType: string;
    rewardLabel: string;
    pointsCost: number;
    code: string;
    status: string;
    createdAt: string;
  };
  profile: ConsumerProfile | null;
};

// ============================================================================
// Constants
// ============================================================================

const STORAGE_ANON_ID = "verifscan_consumer_id";
const STORAGE_SCANNED_LOTS = "verifscan_scanned_lots";

// ============================================================================
// localStorage helpers (defensive — never throw)
// ============================================================================

function getOrCreateAnonymousId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_ANON_ID);
    if (existing && existing.trim()) return existing.trim();
    // Use crypto.randomUUID when available, otherwise fall back to a
    // timestamp+random composite.
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_ANON_ID, newId);
    return newId;
  } catch {
    // localStorage unavailable (private mode, server-side…) — generate an
    // ephemeral ID for this session.
    return `eph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getScannedLots(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_SCANNED_LOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    /* ignore */
  }
  return [];
}

function markLotAsScanned(lotId: string): void {
  try {
    const lots = new Set(getScannedLots());
    lots.add(lotId);
    localStorage.setItem(STORAGE_SCANNED_LOTS, JSON.stringify(Array.from(lots)));
  } catch {
    /* ignore */
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Animated "+10 points !" badge that pops up after a successful scan.
 * Uses framer-motion's AnimatePresence to enter/exit smoothly.
 */
function PointsAwardedToast({ points }: { points: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.9 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
      className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2"
    >
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-3 py-1.5 shadow-lg">
        <Sparkles className="h-3.5 w-3.5 text-white" />
        <span className="text-[13px] font-bold text-white">
          +{points} points !
        </span>
      </div>
    </motion.div>
  );
}

/**
 * New badge unlock celebration toast — appears below the points toast when
 * the consumer crosses a badge threshold.
 */
function BadgeUnlockToast({
  badge,
}: {
  badge: { label: string; icon: string; color: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
      className="pointer-events-none absolute -bottom-3 left-1/2 z-20 -translate-x-1/2"
    >
      <div
        className="flex items-center gap-2 rounded-full border-2 bg-white px-3 py-1.5 shadow-lg"
        style={{ borderColor: badge.color }}
      >
        <span className="text-[16px]">{badge.icon}</span>
        <div className="leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Nouveau badge
          </p>
          <p
            className="text-[12px] font-bold"
            style={{ color: badge.color }}
          >
            {badge.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact status card showing the consumer's current points + badge.
 * Displayed inside the widget when there's no active animation.
 */
function StatusCard({
  profile,
  badges,
}: {
  profile: ConsumerProfile | null;
  badges: BadgeTier[];
}) {
  if (!profile) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F9FAFB] text-[18px]">
          🌟
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-[#111827]">0 pts</p>
          <p className="text-[11px] text-[#6B7280]">Scannez pour gagner</p>
        </div>
      </div>
    );
  }

  // Find the highest badge earned (by minPoints).
  const earnedBadges = badges.filter((b) => profile.badges.includes(b.id));
  const topBadge = earnedBadges.sort((a, b) => b.minPoints - a.minPoints)[0];

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full text-[20px]"
        style={{
          backgroundColor: topBadge ? `${topBadge.color}20` : "#FFFBEB",
        }}
      >
        {topBadge ? topBadge.icon : "🌟"}
      </span>
      <div className="leading-tight">
        <p className="font-display text-[16px] font-bold text-[#111827]">
          {profile.points}{" "}
          <span className="text-[12px] font-medium text-[#9CA3AF]">pts</span>
        </p>
        <p
          className="text-[11px] font-medium"
          style={{ color: topBadge?.color ?? "#6B7280" }}
        >
          {topBadge ? topBadge.label : "Explorateur à venir"}
        </p>
      </div>
    </div>
  );
}

/**
 * Reward catalog row inside the dialog.
 */
function RewardRow({
  reward,
  points,
  onRedeem,
  disabled,
}: {
  reward: RewardItem;
  points: number;
  onRedeem: (reward: RewardItem) => void;
  disabled: boolean;
}) {
  const affordable = points >= reward.pointsCost;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        affordable
          ? "border-[#F59E0B]/30 bg-[#FFFBEB]/40 hover:bg-[#FFFBEB]"
          : "border-[#F3F4F6] bg-[#F9FAFB]",
      )}
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-[20px] shadow-sm">
        {reward.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#111827]">
          {reward.label}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-[#6B7280]">
          {reward.description}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
            affordable
              ? "bg-[#F59E0B]/10 text-[#F59E0B]"
              : "bg-[#F3F4F6] text-[#9CA3AF]",
          )}
        >
          <Star className={cn("h-3 w-3", affordable && "fill-[#F59E0B]")} />
          {reward.pointsCost} pts
        </span>
        <button
          type="button"
          onClick={() => onRedeem(reward)}
          disabled={disabled || !affordable}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed",
            affordable
              ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-white hover:opacity-90"
              : "bg-[#F3F4F6] text-[#9CA3AF]",
          )}
        >
          {affordable ? (
            <>
              <Gift className="h-3 w-3" />
              Échanger
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" />
              Verrouillé
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main widget
// ============================================================================

export function LoyaltyWidget({
  lotId,
  productName,
}: {
  lotId: string;
  productName: string;
}) {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ConsumerProfile | null>(null);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [badges, setBadges] = useState<BadgeTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<{
    code: string;
    label: string;
  } | null>(null);

  // Animation state — what to show in the floating toast.
  const [pointsAnimation, setPointsAnimation] = useState<number | null>(null);
  const [badgeAnimation, setBadgeAnimation] = useState<{
    label: string;
    icon: string;
    color: string;
  } | null>(null);

  const mountedRef = useRef(false);

  // ---------------------------------------------------------------------
  // Initialize anonymous ID (localStorage)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const id = getOrCreateAnonymousId();
    setAnonymousId(id);
  }, []);

  // ---------------------------------------------------------------------
  // Fetch profile + award points (if first scan for this lot)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!anonymousId) return;
    let cancelled = false;

    async function init() {
      setLoading(true);

      // 1. Fetch current profile (so we have points + catalog even if this
      //    lot was already scanned).
      let fetchedBadges: BadgeTier[] = [];
      try {
        const profileRes = await fetch(
          `/api/loyalty/profile?anonymousId=${encodeURIComponent(anonymousId)}`,
          { cache: "no-store" },
        );
        if (!cancelled && profileRes.ok) {
          const data = (await profileRes.json()) as ProfileResponse;
          setProfile(data.profile);
          setRewards(data.rewards);
          setBadges(data.badges);
          fetchedBadges = data.badges;
        }
      } catch {
        /* silent — network errors just show the default state */
      }

      // 2. Check if this lot was already scanned (localStorage).
      const alreadyScanned = getScannedLots().includes(lotId);

      if (!alreadyScanned) {
        // First scan on this device — call POST /api/loyalty/scan to award
        // 10 points. We delay slightly so the user sees the page first.
        setScanning(true);
        try {
          const scanRes = await fetch("/api/loyalty/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anonymousId, lotId }),
          });
          if (!cancelled && scanRes.ok) {
            const scanData = (await scanRes.json()) as ScanResponse;
            setProfile(scanData.profile);
            if (scanData.pointsAwarded > 0) {
              // Animate the +10 points toast.
              setPointsAnimation(scanData.pointsAwarded);
              setTimeout(() => setPointsAnimation(null), 2500);

              // If new badges were earned, find the highest and animate it.
              if (scanData.newBadges.length > 0 && scanData.profile) {
                const newBadge = fetchedBadges
                  .filter((b) => scanData.newBadges.includes(b.id))
                  .sort((a, b) => b.minPoints - a.minPoints)[0];
                if (newBadge) {
                  setTimeout(() => {
                    setBadgeAnimation({
                      label: newBadge.label,
                      icon: newBadge.icon,
                      color: newBadge.color,
                    });
                    setTimeout(() => setBadgeAnimation(null), 3500);
                  }, 600);
                }
              }
            }
            // Mark this lot as scanned locally so we don't re-award on
            // page reloads.
            markLotAsScanned(lotId);
          }
        } catch {
          /* silent — fail gracefully, the widget just shows the status */
        } finally {
          if (!cancelled) setScanning(false);
        }
      }

      if (!cancelled) setLoading(false);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [anonymousId, lotId]);

  // ---------------------------------------------------------------------
  // Redeem a reward
  // ---------------------------------------------------------------------
  const handleRedeem = useCallback(
    async (reward: RewardItem) => {
      if (!anonymousId) return;
      setRedeeming(reward.type);
      try {
        const res = await fetch("/api/loyalty/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anonymousId,
            rewardType: reward.type,
          }),
        });
        if (res.status === 402) {
          const data = await res.json().catch(() => ({}));
          toast.error(
            data?.error ??
              "Points insuffisants pour cette récompense.",
          );
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error ?? "Échec de l'échange.");
          return;
        }
        const data = (await res.json()) as RedeemResponse;
        setProfile(data.profile);
        setRedeemedCode({
          code: data.redemption.code,
          label: reward.label,
        });
        toast.success("Récompense échangée avec succès ! 🎉");
      } catch {
        toast.error("Connexion impossible. Vérifiez votre réseau.");
      } finally {
        setRedeeming(null);
      }
    },
    [anonymousId],
  );

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  const currentPoints = profile?.points ?? 0;
  const earnedBadges = badges.filter((b) =>
    profile?.badges.includes(b.id),
  );
  const nextBadge = profile?.nextBadge ?? null;

  return (
    <div className="relative">
      {/* Animation toasts — rendered above the card */}
      <AnimatePresence>
        {pointsAnimation !== null && (
          <PointsAwardedToast points={pointsAnimation} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {badgeAnimation && <BadgeUnlockToast badge={badgeAnimation} />}
      </AnimatePresence>

      {/* Main widget card — compact, gold/purple gradient accents */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border border-[#F59E0B]/20 bg-gradient-to-br from-white via-[#FFFBEB]/40 to-[#F3E8FF]/30 p-4 shadow-sm"
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F59E0B]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-[#8B5CF6]/10 blur-2xl" />

        {/* Header */}
        <div className="relative mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-[12px] font-bold uppercase tracking-wide text-[#92400E]">
              Fidélité VerifScan
            </span>
          </div>
          {scanning && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
          )}
        </div>

        {/* Status row */}
        <div className="relative flex items-center justify-between gap-3">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[#F3F4F6]" />
              <div className="space-y-1.5">
                <div className="h-4 w-16 animate-pulse rounded bg-[#F3F4F6]" />
                <div className="h-3 w-24 animate-pulse rounded bg-[#F9FAFB]" />
              </div>
            </div>
          ) : (
            <StatusCard profile={profile} badges={badges} />
          )}

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            <Gift className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mes récompenses</span>
            <span className="sm:hidden">Récompenses</span>
          </button>
        </div>

        {/* Next badge progress bar (if there's a next badge to earn) */}
        {!loading && nextBadge && nextBadge.pointsRemaining > 0 && (
          <div className="relative mt-3 border-t border-[#F59E0B]/10 pt-3">
            <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>
                Prochain badge :{" "}
                <span className="font-semibold text-[#111827]">
                  {nextBadge.label}
                </span>
              </span>
              <span className="font-semibold text-[#F59E0B]">
                +{nextBadge.pointsRemaining} pts
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    100,
                    (currentPoints / nextBadge.minPoints) * 100,
                  )}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Rewards dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0 sm:max-w-lg">
          {/* Dialog header with gradient */}
          <div className="bg-gradient-to-br from-[#F59E0B] to-[#8B5CF6] p-5 text-white">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-[18px] font-bold text-white">
                <Gift className="h-5 w-5" />
                Mes récompenses
              </DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-[13px] text-white/90">
              Échangez vos points fidélité contre des récompenses exclusives.
            </p>

            {/* Current points + badges summary */}
            <div className="mt-4 flex items-center gap-4 rounded-lg bg-white/15 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-white text-white" />
                <div>
                  <p className="font-display text-[24px] font-bold leading-none">
                    {currentPoints}
                  </p>
                  <p className="text-[11px] text-white/80">points</p>
                </div>
              </div>
              <div className="h-10 w-px bg-white/30" />
              <div className="flex flex-wrap gap-1.5">
                {earnedBadges.length > 0 ? (
                  earnedBadges
                    .sort((a, b) => b.minPoints - a.minPoints)
                    .map((b) => (
                      <span
                        key={b.id}
                        title={b.label}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[16px]"
                      >
                        {b.icon}
                      </span>
                    ))
                ) : (
                  <p className="text-[12px] text-white/80">
                    Scannez pour débloquer votre premier badge 🌟
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dialog body */}
          <div className="max-h-[60vh] overflow-y-auto p-5">
            {/* Redeemed code success state */}
            {redeemedCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 rounded-xl border-2 border-[#10B981]/30 bg-[#D1FAE5]/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-[#065F46]">
                      Récompense échangée !
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#047857]">
                      {redeemedCode.label}
                    </p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-white p-2">
                      <Ticket className="h-4 w-4 flex-shrink-0 text-[#8B5CF6]" />
                      <span className="font-mono text-[13px] font-bold text-[#8B5CF6]">
                        {redeemedCode.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(redeemedCode.code)
                            .then(() =>
                              toast.success("Code copié dans le presse-papier"),
                            )
                            .catch(() => toast.error("Impossible de copier"));
                        }}
                        className="ml-auto rounded-md px-2 py-1 text-[11px] font-semibold text-[#8B5CF6] hover:bg-[#F3E8FF]"
                      >
                        Copier
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-[#6B7280]">
                      Présentez ce code en caisse ou au fabricant pour
                      récupérer votre récompense.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemedCode(null)}
                    className="flex-shrink-0 rounded-md p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Recent redemptions (if any) */}
            {profile && profile.redemptions.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Mes échanges récents
                </p>
                <div className="space-y-1.5">
                  {profile.redemptions.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-md border border-[#F3F4F6] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-[#111827]">
                          {r.rewardLabel}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                          {r.code && ` • ${r.code}`}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-[#F59E0B]">
                        -{r.pointsCost} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards catalog */}
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Catalogue des récompenses
            </p>
            <div className="space-y-2">
              {rewards.map((reward) => (
                <RewardRow
                  key={reward.type}
                  reward={reward}
                  points={currentPoints}
                  onRedeem={handleRedeem}
                  disabled={redeeming !== null}
                />
              ))}
            </div>

            {/* Footer info */}
            <div className="mt-4 rounded-lg bg-[#F9FAFB] p-3 text-[11px] text-[#6B7280]">
              <p className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                1 scan = 10 points · Cumulez et débloquez des badges exclusifs
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
