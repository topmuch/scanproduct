import { ShieldCheck } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";

/**
 * VerificationGlow — spectacular verification footer.
 *
 * Renders a full-width dark gradient card (slate-900 → blue-900 →
 * purple-900) with decorative blurred circles, a large glassmorphism
 * shield/check icon with pulse glow, blockchain hash, reference number
 * and three trust badges.
 *
 * Server component.
 */

type Props = {
  lot: LotWithDetails;
};

const TRUST_BADGES = [
  { emoji: "🔒", label: "Blockchain" },
  { emoji: "✓", label: "Authentique" },
  { emoji: "📊", label: "Traçable" },
];

export function VerificationGlow({ lot }: Props) {
  const hash = lot.blockchainHash ?? null;
  const reference = lot.reference ?? lot.lotNumber ?? null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 wow-shadow-elevated">
      {/* Decorative blurred circles */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-24 w-24 -translate-x-1/2 rounded-full bg-blue-400/10 blur-2xl" />

      <div className="relative flex flex-col items-center gap-4 px-5 py-7 text-center sm:px-6 sm:py-8">
        {/* Large shield/check icon in glassmorphism circle */}
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
          <div className="wow-glass wow-animate-pulse-glow relative flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20">
            <ShieldCheck className="h-8 w-8 text-emerald-400 drop-shadow-lg sm:h-10 sm:w-10" />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-xl font-bold text-white drop-shadow-sm sm:text-2xl">
          Vérifié par VerifScan
        </h2>

        {/* Blockchain hash */}
        {hash && (
          <div className="max-w-full overflow-hidden px-2">
            <div className="text-[10px] uppercase tracking-wider text-white/50">
              Hash blockchain
            </div>
            <div className="mt-0.5 truncate font-mono text-xs text-white/60" title={hash}>
              {hash}
            </div>
          </div>
        )}

        {/* Reference number */}
        {reference && (
          <div className="wow-glass rounded-full px-4 py-1.5">
            <span className="text-xs font-semibold text-white/90">
              Réf: <span className="font-mono">{reference}</span>
            </span>
          </div>
        )}

        {/* Trust badges row */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TRUST_BADGES.map((badge) => (
            <div
              key={badge.label}
              className="wow-glass flex items-center gap-1.5 rounded-full px-3 py-1.5"
            >
              <span className="text-sm" aria-hidden>
                {badge.emoji}
              </span>
              <span className="text-xs font-semibold text-white/90">
                {badge.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer line */}
        <div className="mt-1 border-t border-white/10 pt-3 text-[10px] text-white/50">
          © 2026 VerifScan — La vérité au bout du scan
        </div>
      </div>
    </div>
  );
}
