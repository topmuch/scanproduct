"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/landing/Logo";
import {
  ShieldCheck,
  LogIn,
  Menu,
  X,
  Home,
  LayoutGrid,
  Sparkles,
  Mail,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Catalogue", href: "/produits", icon: LayoutGrid },
  { label: "Fonctionnalités", href: "/#fonctionnalites", icon: Sparkles },
  { label: "Blog", href: "/blog", icon: Newspaper },
  { label: "Contact", href: "/contact", icon: Mail },
];

/**
 * PublicHeader — navigation bar for public pages (/p/[lotId], /produits).
 * Client component: carries the mobile hamburger drawer (same pattern as the
 * landing header). The drawer is rendered OUTSIDE the <header> element
 * because backdrop-blur on the header would become the containing block for
 * position:fixed children and clip the drawer to the bar height.
 */
export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#F3F4F6] bg-white/90 backdrop-blur-xl">
        {/* h-20 harmonisé avec le header de la landing page */}
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="VerifScan accueil">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation publique">
            <Link
              href="/"
              className={cn(
                "rounded-md px-3 py-2 text-[15px] font-medium transition-colors hover:text-[#022150]",
                pathname === "/" ? "text-[#022150]" : "text-[#374151]"
              )}
            >
              Accueil
            </Link>
            <Link
              href="/produits"
              className={cn(
                "rounded-md px-3 py-2 text-[15px] font-semibold transition-colors",
                pathname === "/produits"
                  ? "text-[#022150]"
                  : "text-[#374151] hover:text-[#022150]"
              )}
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
              href="/blog"
              className={cn(
                "rounded-md px-3 py-2 text-[15px] font-medium transition-colors",
                pathname.startsWith("/blog")
                  ? "text-[#022150] font-semibold"
                  : "text-[#374151] hover:text-[#022150]"
              )}
            >
              Blog
            </a>
            <a
              href="/contact"
              className="rounded-md px-3 py-2 text-[15px] font-medium text-[#374151] transition-colors hover:text-[#022150]"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
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
            {/* Hamburger mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#111827] transition-colors hover:bg-[#F3F4F6] md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer (hors header — backdrop-blur casserait le fixed) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[84%] max-w-sm flex-col bg-white shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-4">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#111827] transition-colors hover:bg-[#F3F4F6]"
                  aria-label="Fermer le menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex flex-col gap-1 px-5 py-6" aria-label="Navigation mobile publique">
                {NAV_LINKS.map((link) => {
                  const active =
                    link.href === pathname ||
                    (link.href !== "/" && pathname.startsWith(link.href));
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors",
                        active
                          ? "bg-[#F0F4F9] text-[#022150]"
                          : "text-[#374151] hover:bg-[#F9FAFB]"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto flex flex-col gap-3 border-t border-[#F3F4F6] px-5 py-6">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#022150] px-5 py-3 text-[15px] font-semibold text-[#022150] transition-colors hover:bg-[#F0F4F9]"
                >
                  <LogIn className="h-4 w-4" />
                  Connexion
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#022150] to-[#10B981] px-5 py-3 text-[15px] font-semibold text-white shadow-md"
                >
                  Devenir partenaire
                  <ShieldCheck className="h-4 w-4" />
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
