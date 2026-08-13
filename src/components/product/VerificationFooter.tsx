import { Lock, ShieldCheck, Facebook, Twitter } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { LotWithDetails } from "@/lib/public-data";

type Props = {
  lot: LotWithDetails;
};

/**
 * VerificationFooter — dark card at the bottom showing blockchain verification
 * hash and share buttons.
 * Server component (links open new tabs — no client interactivity needed).
 */
export function VerificationFooter({ lot }: Props) {
  const hash = lot.blockchainHash ?? null;
  const shortHash = hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : null;
  const publicUrl = `https://verifscan.roomscan.pro/1/${lot.id}`;
  const shareText = encodeURIComponent(
    `Découvrez le passeport numérique VerifScan de ce produit : ${publicUrl}`
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-slate-900 p-5 text-white shadow-lg sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/20 ring-1 ring-green-400/30">
            <ShieldCheck className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              🔒 Vérifié par VerifScan
            </h2>
            {shortHash && (
              <p className="mt-1 font-mono text-[11px] text-gray-400">
                Hash : <span className="text-green-300">{shortHash}</span>
              </p>
            )}
            {lot.verifiedAt && (
              <p className="mt-0.5 text-[11px] text-gray-400">
                Vérifié le {formatDate(lot.verifiedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Partager :
          </span>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/20 text-green-300 ring-1 ring-green-400/30 transition-colors hover:bg-green-500/40"
            aria-label="Partager sur WhatsApp"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.42 11.13c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.64.58.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
            </svg>
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30 transition-colors hover:bg-blue-500/40"
            aria-label="Partager sur Facebook"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30 transition-colors hover:bg-sky-500/40"
            aria-label="Partager sur Twitter / X"
          >
            <Twitter className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-gray-400">
        <Lock className="h-3.5 w-3.5 text-green-400" />
        <span>
          Ce passeport numérique est sécurisé et infalsifiable. Toute modification
          est détectée par la blockchain VerifScan.
        </span>
      </div>
    </section>
  );
}
