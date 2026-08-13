"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, Menu, ChevronDown, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { useFabricantNav, type FabricantPage } from "@/lib/fabricant-store";
import { MARQUE, NOTIFICATIONS } from "@/lib/fabricant-data";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<FabricantPage, { title: string; breadcrumb: string }> = {
  accueil: { title: "Accueil", breadcrumb: "Dashboard" },
  produits: { title: "Mes Produits", breadcrumb: "Dashboard / Produits" },
  "produit-detail": { title: "Détail Produit", breadcrumb: "Dashboard / Produits / Détail" },
  lots: { title: "Gestion des Lots", breadcrumb: "Dashboard / Lots" },
  "lot-detail": { title: "Détail Lot", breadcrumb: "Dashboard / Lots / Détail" },
  "qr-codes": { title: "Mes QR Codes", breadcrumb: "Dashboard / QR Codes" },
  statistiques: { title: "Statistiques", breadcrumb: "Dashboard / Statistiques" },
  score: { title: "Score de Transparence", breadcrumb: "Dashboard / Score Transparence" },
  abonnement: { title: "Mon Abonnement", breadcrumb: "Dashboard / Abonnement" },
  parametres: { title: "Paramètres", breadcrumb: "Dashboard / Paramètres" },
};

export function FabricantHeader() {
  const { page, setMobileSidebarOpen } = useFabricantNav();
  const info = PAGE_TITLES[page];
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const unreadCount = NOTIFICATIONS.filter((n) => !n.lu).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: mobile menu + breadcrumb/title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[13px] text-[#6B7280] sm:block">{info.breadcrumb}</p>
          <h2 className="font-display text-[18px] font-semibold leading-tight text-[#111827] sm:text-[20px]">
            {info.title}
          </h2>
        </div>
      </div>

      {/* Right: search + notifications + avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Rechercher un produit, lot..."
            className="w-[260px] rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-9 pr-3 text-[13px] text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:bg-white lg:w-[300px]"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF] lg:block">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#2563EB]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-50 w-[340px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
                <p className="font-display text-[14px] font-semibold text-[#111827]">Notifications</p>
                <span className="text-[12px] text-[#2563EB]">{unreadCount} non lues</span>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 border-b border-[#F9FAFB] px-4 py-3 transition-colors hover:bg-[#F9FAFB]",
                      !n.lu && "bg-[#EFF6FF]/40"
                    )}
                  >
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[16px]"
                      style={{ backgroundColor: `${n.color}20` }}
                    >
                      {n.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#111827]">{n.titre}</p>
                      <p className="mt-0.5 text-[12px] text-[#6B7280]">{n.texte}</p>
                      <p className="mt-1 text-[11px] text-[#9CA3AF]">{n.time}</p>
                    </div>
                    {!n.lu && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#2563EB]" />}
                  </div>
                ))}
              </div>
              <button className="w-full border-t border-[#F3F4F6] py-2.5 text-[13px] font-medium text-[#2563EB] hover:bg-[#F9FAFB]">
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => setAvatarOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] py-1.5 pl-1.5 pr-2 transition-colors hover:bg-[#F9FAFB]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] font-display text-[13px] font-bold text-white">
              {MARQUE.logo}
            </span>
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-12 z-50 w-[240px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
              <div className="border-b border-[#F3F4F6] px-4 py-3">
                <p className="font-display text-[14px] font-semibold text-[#111827]">{MARQUE.nom}</p>
                <p className="text-[12px] text-[#6B7280]">Plan {MARQUE.plan} · 2FA actif</p>
              </div>
              <div className="py-1">
                <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
                  <User className="h-4 w-4 text-[#6B7280]" />
                  Profil entreprise
                </button>
                <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
                  <Settings className="h-4 w-4 text-[#6B7280]" />
                  Paramètres
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#9CA3AF]" />
                </button>
                <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#EF4444] hover:bg-[#FEE2E2]">
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
