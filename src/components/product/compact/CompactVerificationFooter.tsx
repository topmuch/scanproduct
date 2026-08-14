import { ShieldCheck, Lock } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";
import { getScanOrigin } from "@/lib/qr-url";
import { formatDate } from "@/lib/utils";

/**
 * CompactVerificationFooter — compact dark footer showing "Vérifié par
 * VerifScan" + blockchain hash + share buttons.
 *
 * Lighter than the full VerificationFooter: single row, smaller share buttons.
 *
 * Server component.
 */

type Props = {
  lot: LotWithDetails;
};

export function CompactVerificationFooter({ lot }: Props) {
  const hash = lot.blockchainHash ?? null;
  const shortHash = hash
    ? `${hash.slice(0, 10)}…${hash.slice(-6)}`
    : null;
  const publicUrl = `${getScanOrigin().replace(/\/$/, "")}/p/${lot.id}`;
  const shareText = encodeURIComponent(
    `Découvrez le passeport numérique VerifScan de ce produit : ${publicUrl}`,
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-slate-900 p-4 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/20 ring-1 ring-green-400/30">
          <ShieldCheck className="h-5 w-5 text-green-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Vérifié par VerifScan
          </h2>
          {shortHash ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
              {shortHash}
            </p>
          ) : lot.verifiedAt ? (
            <p className="mt-0.5 text-[10px] text-gray-400">
              Vérifié le {formatDate(lot.verifiedAt)}
            </p>
          ) : null}
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-1.5">
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 text-green-300 ring-1 ring-green-400/30 transition-colors hover:bg-green-500/40"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30 transition-colors hover:bg-blue-500/40"
            aria-label="Partager sur Facebook"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07z" />
            </svg>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30 transition-colors hover:bg-sky-500/40"
            aria-label="Partager sur Twitter / X"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-[10px] text-gray-400">
        <Lock className="h-3 w-3 text-green-400" />
        <span>
          Passeport numérique sécurisé et infalsifiable par la blockchain
          VerifScan.
        </span>
      </div>
    </div>
  );
}
