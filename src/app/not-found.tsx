import Link from "next/link";

import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

/**
 * Page 404 globale (filet de sécurité — src/app/not-found.tsx).
 *
 * La plupart des chemins inconnus sont déjà interceptés par le resolver
 * GS1 racine (catch-all [..gs1] — page 404 « produit introuvable /
 * potentiellement contrefait » conforme GS1). Cette page branding couvre
 * les 404 émis par le reste de l'application (notFound() d'une page, etc.)
 * : statut 404 correct + navigation de rattrapage vers le catalogue et
 * l'accueil.
 */
export default function GlobalNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="mb-3 font-display text-[72px] font-extrabold leading-none text-[#10B981]">
          404
        </p>
        <h1 className="font-display text-[26px] font-bold text-[#111827] sm:text-[30px]">
          Page introuvable
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#6B7280]">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
          Explorez le catalogue des produits vérifiés VerifScan ou revenez à
          l&apos;accueil.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#059669]"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/produits"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-5 py-3 text-[14px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
          >
            Voir le catalogue public
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
