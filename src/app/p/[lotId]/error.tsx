"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

/**
 * error.tsx — Next.js error boundary for the /p/[lotId] route.
 *
 * This catches any runtime error thrown by the server component (e.g.
 * database errors, Prisma connection failures, JSON parsing issues) and
 * shows a friendly French error page instead of the default
 * "Application error: a server-side exception has occurred".
 *
 * The error is logged to the console for debugging.
 */
export default function ProductPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/p/[lotId] error boundary]:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-[40px] ring-4 ring-red-100">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="font-display text-[28px] font-bold text-[#111827] sm:text-[32px]">
          Une erreur est survenue
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#6B7280]">
          Nous n&apos;avons pas pu charger ce passeport numérique. Cela peut
          être dû à un problème temporaire de connexion ou à un lot
          introuvable. Vous pouvez réessayer ou consulter le catalogue public.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-[#9CA3AF]">
            Référence: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          <Link
            href="/produits"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-5 py-3 text-[14px] font-semibold text-[#374151] shadow-sm transition-colors hover:bg-[#F9FAFB]"
          >
            <Home className="h-4 w-4" />
            Voir le catalogue
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
