import Link from "next/link";
import { Logo } from "@/components/landing/Logo";
import { ShieldCheck, Search, LogIn } from "lucide-react";

/**
 * PublicHeader — minimal navigation bar for public pages (/p/[lotId], /produits).
 * Server component (no "use client") so it works inside server-rendered pages.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#F3F4F6] bg-white/90 backdrop-blur-xl">
      {/* h-20 harmonisé avec le header de la landing page */}
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="VerifScan accueil">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation publique">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-[15px] font-medium text-[#374151] transition-colors hover:text-[#022150]"
          >
            Accueil
          </Link>
          <Link
            href="/produits"
            className="rounded-md px-3 py-2 text-[15px] font-semibold text-[#022150]"
          >
            Catalogue
          </Link>
          <a
            href="/#fonctionnalites"
            className="rounded-md px-3 py-2 text-[15px] font-medium text-[#374151] transition-colors hover:text-[#022150]"
          >
            Fonctionnalités
          </a>
          <a
            href="/#contact"
            className="rounded-md px-3 py-2 text-[15px] font-medium text-[#374151] transition-colors hover:text-[#022150]"
          >
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/produits"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#022150] md:hidden"
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-[#374151] transition-colors hover:bg-[#F3F4F6]"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Connexion</span>
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#022150] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#011D46]"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Devenir partenaire</span>
            <span className="sm:hidden">Partenaire</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
