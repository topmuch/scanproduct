"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, RefreshCw, LogOut } from "lucide-react";

/**
 * Inline error UI shown when the FABRICANT dashboard's server-side data load
 * fails AFTER the user has been verified to exist.
 *
 * This is intentionally NOT a redirect to /login: the session is valid, the
 * account exists — only the data layer hiccuped (transient Prisma error,
 * malformed JSON column, etc.). Forcing a logout here would hide the real
 * error and frustrate a legitimate user.
 *
 * The user can either retry (re-fetches the page server-side) or sign out
 * manually if they prefer.
 */
export function DashboardLoadError() {
  const [retrying, setRetrying] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function handleRetry() {
    setRetrying(true);
    // CRITICAL: do NOT use window.location.reload() here.
    // Next.js caches the RSC (React Server Component) flight payload for
    // visited routes. If the dashboard failed once (transient error), that
    // error payload stays cached — reload() re-serves the SAME cached error
    // instead of asking the server for fresh data.
    //
    // Fix: navigate to a *different* URL (unique query param) so the router
    // cache misses and a brand-new server request is made. The query param
    // is stripped by history.replaceState after load so the URL stays clean.
    const cacheBuster = `_r=${Date.now()}`;
    window.location.href = `/dashboard?${cacheBuster}`;
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_8px_32px_rgba(37,99,235,0.06)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF3C7]">
            <AlertTriangle className="h-7 w-7 text-[#D97706]" />
          </div>

          <h1 className="font-display text-xl font-bold text-[#111827]">
            Impossible de charger votre tableau de bord
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
            Votre session est valide, mais une erreur est survenue lors du
            chargement des données (produits, lots, statistiques). Ce problème
            est souvent temporaire.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#10B981] px-5 text-sm font-semibold text-white shadow-md shadow-[#2563EB]/25 transition-all hover:shadow-lg hover:shadow-[#2563EB]/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Rechargement…" : "Réessayer"}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#374151] transition-colors hover:border-[#D1D5DB] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>

          <p className="mt-6 border-t border-[#F3F4F6] pt-4 text-xs text-[#9CA3AF]">
            Si le problème persiste, contactez le support VerifScan en
            mentionnant le code <span className="font-mono font-semibold">DASHBOARD_LOAD_FAILED</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
