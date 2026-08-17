import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";

export const dynamic = "force-static";

/**
 * Page offline — affichée par le service worker quand une navigation échoue
 * (pas de réseau ET pas en cache).
 *
 * Force-static pour qu'elle soit pré-rendue à la build et disponible
 * immédiatement depuis le cache du SW, même sans réseau.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#F9FAFB] to-[#EFF6FF] px-6 py-12 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
          <WifiOff className="h-10 w-10 text-[#2563EB]" />
        </div>

        <h1 className="mt-6 font-display text-[26px] font-bold text-[#111827] sm:text-[30px]">
          Vous êtes hors ligne
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-[#4B5563]">
          VerifScan ne peut pas atteindre internet pour le moment. Vous pouvez
          continuer à consulter les produits déjà visités, ou réessayer dès
          que votre connexion revient.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#1D4ED8] hover:-translate-y-0.5"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Link>
          <Link
            href="/produits"
            className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-[15px] font-semibold text-[#374151] shadow-sm transition-colors hover:bg-[#F9FAFB]"
          >
            Voir le catalogue
          </Link>
        </div>

        <p className="mt-8 text-[12px] text-[#9CA3AF]">
          💡 Astuce : si vous avez déjà installé VerifScan sur votre écran
          d&apos;accueil, les produits scannés récemment restent accessibles
          sans connexion.
        </p>
      </div>
    </main>
  );
}
