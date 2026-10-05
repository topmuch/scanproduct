"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Bell, ChevronRight, Menu, X, User, Settings as SettingsIcon, LogOut, Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";
import { useAdminNav, type AdminPage } from "@/lib/admin-store";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<AdminPage, { breadcrumb: string; title: string }> = {
  dashboard: { breadcrumb: "Dashboard", title: "Tableau de bord" },
  users: { breadcrumb: "Utilisateurs", title: "Gestion des Fabricants" },
  "user-detail": { breadcrumb: "Utilisateurs / Détail", title: "Détail Fabricant" },
  subscriptions: { breadcrumb: "Abonnements", title: "Gestion des Abonnements" },
  plans: { breadcrumb: "Abonnements / Plans", title: "Configuration des Plans" },
  categories: { breadcrumb: "Catégories", title: "Gestion des Catégories" },
  blog: { breadcrumb: "Blog", title: "Blog & Articles" },
  batches: { breadcrumb: "QR Artisans", title: "Production QR Artisans" },
  stats: { breadcrumb: "Statistiques", title: "Statistiques Globales" },
  support: { breadcrumb: "Support", title: "Support & Tickets" },
  "ticket-detail": { breadcrumb: "Support / Ticket", title: "Détail Ticket" },
  messages: { breadcrumb: "Messages", title: "Messages de contact" },
  settings: { breadcrumb: "Paramètres", title: "Paramètres" },
};

/** Severity → badge colors for the notification bell dropdown. */
const SEVERITY_BADGE: Record<string, string> = {
  success: "bg-[#D1FAE5] text-[#059669]",
  info: "bg-[#DCE7F2] text-[#0A2B5F]",
  warning: "bg-[#FEF3C7] text-[#92400E]",
  critical: "bg-[#FEE2E2] text-[#991B1B]",
};

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  readAt: string | null;
  createdAt: string;
  emailedAt: string | null;
}

function formatNotifDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AdminHeader() {
  const { page, setPage, goBack } = useAdminNav();
  // Note: real notifications come from /api/notifications (below) — the
  // audit-log feed (useAdminData) is used by the dashboard pages, not here.
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const meta = PAGE_TITLES[page];
  const { theme, toggle, mounted } = useTheme();
  void goBack;

  // ── Real notifications (Notification table via /api/notifications) ──────
  // The bell used to display audit logs with a hardcoded unread dot — new
  // signups never showed up. It now lists the authenticated superadmin's
  // actual notifications with a real unread counter.
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: AdminNotification[];
        unreadCount: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      /* silent — bell keeps previous content */
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      await loadNotifications();
    } catch {
      /* silent */
    } finally {
      setMarkingAll(false);
    }
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#E5E7EB] bg-white px-4 lg:px-8 dark:border-white/10 dark:bg-[#0F172A]">
      {/* Left: breadcrumb + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#374151] hover:bg-[#F3F4F6] lg:hidden dark:text-white/70 dark:hover:bg-white/10"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] dark:text-white/60">
            <span>Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#111827] dark:text-white">{meta.breadcrumb}</span>
          </div>
          <h1 className="font-display text-[20px] font-semibold leading-tight text-[#111827] dark:text-white">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Right: search + notif + avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global search */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF] dark:text-white/40" />
          <input
            type="text"
            placeholder="Rechercher utilisateur, produit, lot..."
            className="h-10 w-[280px] rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-14 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#022150] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#022150]/20 lg:w-[320px] dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40 dark:focus:bg-white/15"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#9CA3AF] dark:border-white/10 dark:bg-white/10 dark:text-white/50">
            ⌘K
          </kbd>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#374151] transition-colors hover:bg-[#F3F4F6] dark:text-white/70 dark:hover:bg-white/10"
          aria-label={theme === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
          title={theme === "light" ? "Mode sombre" : "Mode clair"}
        >
          {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              if (!notifOpen) loadNotifications();
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[#374151] transition-colors hover:bg-[#F3F4F6] dark:text-white/70 dark:hover:bg-white/10"
            aria-label="Notifications"
            data-testid="notif-bell"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#0F172A]"
                data-testid="notif-badge-count"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
                <p className="text-sm font-semibold text-[#111827]">Notifications</p>
                <span
                  className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#EF4444]"
                  data-testid="notif-unread-pill"
                >
                  {unreadCount} non lues
                </span>
              </div>
              <ul className="max-h-80 overflow-y-auto scrollbar-thin" data-testid="notif-list">
                {notifLoading && notifications.length === 0 && (
                  <li className="px-4 py-6 text-center text-[13px] text-[#9CA3AF]">
                    Chargement…
                  </li>
                )}
                {!notifLoading && notifications.length === 0 && (
                  <li className="px-4 py-6 text-center text-[13px] text-[#9CA3AF]">
                    Aucune notification pour le moment.
                  </li>
                )}
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "flex gap-3 border-b border-[#F9FAFB] px-4 py-3 hover:bg-[#F9FAFB]",
                      !n.readAt && "bg-[#F0F4F9]/60",
                    )}
                    data-testid="notif-item"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        SEVERITY_BADGE[n.severity] ?? SEVERITY_BADGE.info,
                      )}
                    >
                      {n.severity === "success" ? "✓" : n.severity === "critical" ? "!" : n.severity === "warning" ? "⚠" : "i"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#111827]">{n.title}</p>
                      <p className="line-clamp-2 text-[12px] text-[#6B7280]">{n.message}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <span>{formatNotifDate(n.createdAt)}</span>
                        {n.emailedAt && (
                          <span className="rounded bg-[#ECFDF5] px-1 py-0.5 text-[10px] font-medium text-[#059669]">
                            email envoyé
                          </span>
                        )}
                        {!n.readAt && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#022150]" />
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll || unreadCount === 0}
                className="w-full bg-[#F9FAFB] py-2.5 text-center text-[13px] font-medium text-[#022150] hover:bg-[#F0F4F9] disabled:opacity-50"
                data-testid="notif-mark-all-read"
              >
                {markingAll ? "Marquage…" : "Tout marquer comme lu"}
              </button>
            </div>
          )}
        </div>

        {/* Avatar dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => setAvatarOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#022150] to-[#10B981] text-white ring-2 ring-white transition hover:ring-[#DCE7F2] dark:ring-[#0F172A] dark:hover:ring-white/30"
            aria-label="Menu profil"
          >
            <User className="h-5 w-5" />
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
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
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#EF4444] hover:bg-[#FEE2E2]"
                  >
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
              <span className="font-display text-lg font-bold text-[#111827]">Verif<span className="text-[#022150]">Scan</span></span>
              <button onClick={() => setMobileNavOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[#F3F4F6]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-3">
              {(["dashboard", "users", "subscriptions", "categories", "blog", "stats", "support", "settings"] as AdminPage[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPage(p); setMobileNavOpen(false); }}
                  className={cn(
                    "block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium",
                    page === p ? "bg-[#DCE7F2] text-[#022150]" : "text-[#374151] hover:bg-[#F9FAFB]"
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
