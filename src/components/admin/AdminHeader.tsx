"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronRight, Menu, X, User, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAdminNav, type AdminPage } from "@/lib/admin-store";
import { ACTIVITY_LOGS } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<AdminPage, { breadcrumb: string; title: string }> = {
  dashboard: { breadcrumb: "Dashboard", title: "Tableau de bord" },
  users: { breadcrumb: "Utilisateurs", title: "Gestion des Fabricants" },
  "user-detail": { breadcrumb: "Utilisateurs / Détail", title: "Détail Fabricant" },
  subscriptions: { breadcrumb: "Abonnements", title: "Gestion des Abonnements" },
  plans: { breadcrumb: "Abonnements / Plans", title: "Configuration des Plans" },
  categories: { breadcrumb: "Catégories", title: "Gestion des Catégories" },
  stats: { breadcrumb: "Statistiques", title: "Statistiques Globales" },
  support: { breadcrumb: "Support", title: "Support & Tickets" },
  "ticket-detail": { breadcrumb: "Support / Ticket", title: "Détail Ticket" },
  settings: { breadcrumb: "Paramètres", title: "Paramètres" },
};

const TYPE_BADGE: Record<string, string> = {
  Inscription: "bg-[#D1FAE5] text-[#065F46]",
  Paiement: "bg-[#DBEAFE] text-[#1E40AF]",
  Support: "bg-[#FEF3C7] text-[#92400E]",
  Alerte: "bg-[#FEE2E2] text-[#991B1B]",
  Système: "bg-[#F3F4F6] text-[#374151]",
};

export function AdminHeader() {
  const { page, setPage, goBack } = useAdminNav();
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const meta = PAGE_TITLES[page];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#E5E7EB] bg-white px-4 lg:px-8">
      {/* Left: breadcrumb + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#374151] hover:bg-[#F3F4F6] lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
            <span>Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#111827]">{meta.breadcrumb}</span>
          </div>
          <h1 className="font-display text-[20px] font-semibold leading-tight text-[#111827]">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Right: search + notif + avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global search */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Rechercher utilisateur, produit, lot..."
            className="h-10 w-[280px] rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-14 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 lg:w-[320px]"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#9CA3AF]">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[#374151] transition-colors hover:bg-[#F3F4F6]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
                <p className="text-sm font-semibold text-[#111827]">Notifications</p>
                <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#EF4444]">
                  {ACTIVITY_LOGS.length} non lues
                </span>
              </div>
              <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                {ACTIVITY_LOGS.slice(0, 6).map((log) => (
                  <li key={log.id} className="flex gap-3 border-b border-[#F9FAFB] px-4 py-3 hover:bg-[#F9FAFB]">
                    <span className={cn("mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold", TYPE_BADGE[log.type])}>
                      {log.type[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#111827]">{log.description}</p>
                      <p className="truncate text-[12px] text-[#6B7280]">{log.user} · {log.timestamp}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="w-full bg-[#F9FAFB] py-2.5 text-center text-[13px] font-medium text-[#2563EB] hover:bg-[#EFF6FF]">
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>

        {/* Avatar dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => setAvatarOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] font-display text-sm font-bold text-white ring-2 ring-white transition hover:ring-[#DBEAFE]"
            aria-label="Menu profil"
          >
            AV
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
              <div className="border-b border-[#F3F4F6] px-4 py-3">
                <p className="text-sm font-semibold text-[#111827]">Admin VerifScan</p>
                <p className="truncate text-[12px] text-[#6B7280]">admin@verifscan.sn</p>
              </div>
              <ul className="py-1">
                <li>
                  <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
                    <User className="h-4 w-4" /> Mon profil
                  </button>
                </li>
                <li>
                  <button onClick={() => { setAvatarOpen(false); setPage("settings"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#F9FAFB]">
                    <SettingsIcon className="h-4 w-4" /> Paramètres
                  </button>
                </li>
                <li className="border-t border-[#F3F4F6]">
                  <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#EF4444] hover:bg-[#FEE2E2]">
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-2xl">
            <div className="flex h-[70px] items-center justify-between border-b border-[#F3F4F6] px-6">
              <span className="font-display text-lg font-bold text-[#111827]">Verif<span className="text-[#2563EB]">Scan</span></span>
              <button onClick={() => setMobileNavOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[#F3F4F6]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-3">
              {(["dashboard", "users", "subscriptions", "categories", "stats", "support", "settings"] as AdminPage[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPage(p); setMobileNavOpen(false); }}
                  className={cn(
                    "block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium",
                    page === p ? "bg-[#DBEAFE] text-[#2563EB]" : "text-[#374151] hover:bg-[#F9FAFB]"
                  )}
                >
                  {PAGE_TITLES[p].title}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
