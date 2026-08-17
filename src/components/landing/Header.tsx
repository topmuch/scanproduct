"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

// Anchor links use "/#anchor" so they work from any page (homepage and
// /produits). When on "/", Next.js Link scrolls to the anchor without a
// full reload. When on another page, it navigates to "/" then scrolls.
const NAV_LINKS = [
  { label: "Accueil", href: "/#accueil", match: "/" },
  { label: "Fonctionnalités", href: "/#fonctionnalites" },
  { label: "Le concept", href: "/#concept" },
  { label: "Catalogue", href: "/produits", match: "/produits" },
  { label: "Métiers", href: "/#metiers" },
  { label: "Témoignages", href: "/#temoignages" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Determine which nav link is active based on the current pathname.
  const isActive = (link: (typeof NAV_LINKS)[number]) => {
    if (link.match) return pathname === link.match;
    // On the homepage, the first link ("Accueil") is active.
    if (pathname === "/" && link.href === "/#accueil") return true;
    return false;
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border-b border-[#F3F4F6]"
          : "bg-white/0"
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group" aria-label="VerifScan accueil">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => {
            const active = isActive(link);
            const className = cn(
              "group relative rounded-md px-3 py-2 text-[15px] font-medium transition-colors",
              active ? "text-[#2563EB]" : "text-[#374151] hover:text-[#2563EB]"
            );
            const content = (
              <>
                {link.label}
                <span
                  className={cn(
                    "absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-[#2563EB] transition-all duration-300",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                />
              </>
            );
            return (
              <Link key={link.href} href={link.href} className={className}>
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-[15px] font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF]"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#10B981] px-5 py-2.5 text-[15px] font-semibold text-white shadow-md shadow-[#2563EB]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2563EB]/40"
          >
            Devenir partenaire
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#111827] transition-colors hover:bg-[#F3F4F6] lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[84%] max-w-sm flex-col bg-white shadow-2xl lg:hidden"
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

              <nav className="flex flex-col gap-1 px-5 py-6" aria-label="Navigation mobile">
                {NAV_LINKS.map((link) => {
                  const active = isActive(link);
                  const className = cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    active
                      ? "bg-[#EFF6FF] text-[#2563EB]"
                      : "text-[#374151] hover:bg-[#F9FAFB]"
                  );
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={className}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto flex flex-col gap-3 border-t border-[#F3F4F6] px-5 py-6">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-[#2563EB] px-5 py-3 text-[15px] font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF]"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#10B981] px-5 py-3 text-[15px] font-semibold text-white shadow-md"
                >
                  Devenir partenaire
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
