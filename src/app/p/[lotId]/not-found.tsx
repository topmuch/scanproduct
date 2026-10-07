import Link from "next/link";

import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

/**
 * Page 404 « Produit introuvable » du segment /p/[lotId].
 *
 * Rendue quand la page passeport appelle notFound() (lot inexistant,
 * retiré, ou URL malformée). Elle remplace l'ancien fallback « page
 * amicale en statut 200 » : le design reste accueillant pour un visiteur
 * ayant scanné un QR code non enregistré, mais le statut HTTP est un VRAI
 * 404 — Search Console cesse de les traiter comme du contenu indexable
 * (motif « Introuvable (404) » propre) et les soft-404 disparaissent.
 */
export default function ProduitNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF3C7] text-[40px]">
          🔍
        </div>
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Erreur 404
        </p>
        <h1 className="font-display text-[28px] font-bold text-[#111827] sm:text-[32px]">
          Produit introuvable
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#6B7280]">
          Ce QR code ne correspond à aucun lot enregistré pour le moment. Le
          produit n&apos;a peut-être pas encore été publié, ou le lot a été
          retiré. Vous pouvez consulter l&apos;ensemble de nos produits
          vérifiés dans le catalogue public.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/produits"
            className="inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#059669]"
          >
            Voir le catalogue public
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-5 py-3 text-[14px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
