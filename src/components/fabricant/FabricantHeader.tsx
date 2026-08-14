"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, Menu, ChevronDown, User, Settings, LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";
import { useFabricantNav, type FabricantPage } from "@/lib/fabricant-store";
import { useFabricantData } from "./FabricantDataProvider";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

// Static notifications — no Notification model in the schema yet.
// Marked as a placeholder so the UI shows real data when the model lands.
const NOTIFICATIONS = [
  { id: "n1", icon: "👋", titre: "Bienvenue sur votre tableau de bord", texte: "Vos données sont désormais synchronisées avec la base VerifScan.", time: "à l'instant", lu: false, color: "#2563EB" },
] as const;

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
  const { data } = useFabricantData();
  const profile = data.profile;
  const { theme, toggle, mounted } = useTheme();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#0F172A]">
      {/* Left: mobile menu + breadcrumb/title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] lg:hidden dark:border-white/10 dark:text-white/70"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[13px] text-[#6B7280] sm:block dark:text-white/60">{info.breadcrumb}</p>
          <h2 className="font-display text-[18px] font-semibold leading-tight text-[#111827] sm:text-[20px] dark:text-white">
            {info.title}
          </h2>
        </div>
      </div>

      {/* Right: search + notifications + avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF] dark:text-white/40" />
          <input
            type="text"
            placeholder="Rechercher un produit, lot..."
            className="w-[260px] rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-9 pr-3 text-[13px] text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:bg-white lg:w-[300px] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40 dark:focus:bg-white/15"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF] lg:block dark:border-white/10 dark:bg-white/10 dark:text-white/50">
            ⌘K
          </kbd>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#2563EB] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={theme === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
          title={theme === "light" ? "Mode sombre" : "Mode clair"}
        >
          {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] transition-colors hover:bg-[#F9FAFB] hover:text-[#2563EB] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
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
            className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] py-1.5 pl-1.5 pr-2 transition-colors hover:bg-[#F9FAFB] dark:border-white/10 dark:hover:bg-white/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] font-display text-[13px] font-bold text-white">
              {profile.logo}
            </span>
            <ChevronDown className="h-4 w-4 text-[#6B7280] dark:text-white/60" />
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-12 z-50 w-[240px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
              <div className="border-b border-[#F3F4F6] px-4 py-3">
                <p className="font-display text-[14px] font-semibold text-[#111827]">{profile.companyName}</p>
                <p className="text-[12px] text-[#6B7280]">Plan {profile.plan} · {profile.email}</p>
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
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#EF4444] hover:bg-[#FEE2E2]"
                >
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
