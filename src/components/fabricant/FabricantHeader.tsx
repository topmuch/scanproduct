"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  AlertTriangle,
  AlertCircle,
  ScanLine,
  BarChart3,
  Info,
  MessageSquare,
  CreditCard,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { useFabricantNav, type FabricantPage } from "@/lib/fabricant-store";
import { useFabricantData } from "./FabricantDataProvider";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — kept in sync with /api/notifications response shape
// ---------------------------------------------------------------------------

type NotificationType =
  | "lot_recall"
  | "quota_warning"
  | "quota_exceeded"
  | "new_scan"
  | "weekly_report"
  | "system"
  | "ticket_update"
  | "subscription";

type NotificationSeverity = "info" | "success" | "warning" | "critical";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  data: Record<string, unknown>;
  channels: string[];
  readAt: string | null;
  createdAt: string;
  emailedAt: string | null;
};

// ---------------------------------------------------------------------------
// Icon map — colored by type, matches the NotificationsPage map.
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<
  NotificationType,
  { Icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  lot_recall: { Icon: AlertTriangle, color: "#EF4444", bg: "#FEE2E2" },
  quota_warning: { Icon: AlertCircle, color: "#F59E0B", bg: "#FEF3C7" },
  quota_exceeded: { Icon: AlertCircle, color: "#EF4444", bg: "#FEE2E2" },
  new_scan: { Icon: ScanLine, color: "#2563EB", bg: "#EFF6FF" },
  weekly_report: { Icon: BarChart3, color: "#10B981", bg: "#D1FAE5" },
  system: { Icon: Info, color: "#2563EB", bg: "#EFF6FF" },
  ticket_update: { Icon: MessageSquare, color: "#8B5CF6", bg: "#EDE9FE" },
  subscription: { Icon: CreditCard, color: "#2563EB", bg: "#EFF6FF" },
};

// ---------------------------------------------------------------------------
// Relative time formatter — French, short style.
//   "il y a 5 min", "il y a 2 h", "hier", "il y a 3 j"
// ---------------------------------------------------------------------------

function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  const years = Math.floor(months / 12);
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

// ---------------------------------------------------------------------------
// Page titles for the breadcrumb / header
// ---------------------------------------------------------------------------

const PAGE_TITLES: Record<FabricantPage, { title: string; breadcrumb: string }> = {
  accueil: { title: "Accueil", breadcrumb: "Dashboard" },
  produits: { title: "Mes Produits", breadcrumb: "Dashboard / Produits" },
  "produit-detail": { title: "Détail Produit", breadcrumb: "Dashboard / Produits / Détail" },
  lots: { title: "Gestion des Lots", breadcrumb: "Dashboard / Lots" },
  "lot-detail": { title: "Détail Lot", breadcrumb: "Dashboard / Lots / Détail" },
  "qr-codes": { title: "Mes QR Codes", breadcrumb: "Dashboard / QR Codes" },
  "qr-masse": { title: "Génération en masse", breadcrumb: "Dashboard / QR Codes / Génération en masse" },
  statistiques: { title: "Statistiques", breadcrumb: "Dashboard / Statistiques" },
  notifications: { title: "Notifications", breadcrumb: "Dashboard / Notifications" },
  "ai-assistant": { title: "Assistant IA", breadcrumb: "Dashboard / Assistant IA" },
  marketplace: { title: "Marketplace B2B", breadcrumb: "Dashboard / Marketplace B2B" },
  fidelite: { title: "Fidélité Consommateur", breadcrumb: "Dashboard / Fidélité" },
  score: { title: "Score de Transparence", breadcrumb: "Dashboard / Score Transparence" },
  abonnement: { title: "Mon Abonnement", breadcrumb: "Dashboard / Abonnement" },
  parametres: { title: "Paramètres", breadcrumb: "Dashboard / Paramètres" },
};

export function FabricantHeader() {
  const { page, setMobileSidebarOpen, setPage } = useFabricantNav();
  const info = PAGE_TITLES[page];
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Notification state — populated from /api/notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const { data } = useFabricantData();
  const profile = data.profile;
  const { theme, toggle, mounted } = useTheme();

  // -----------------------------------------------------------------------
  // Fetch helpers
  // -----------------------------------------------------------------------

  const fetchNotifications = useCallback(async () => {
    try {
      // The header bell never displays the total count — skip it to save
      // one COUNT(*) query per poll (and there are many polls).
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(Array.isArray(json.notifications) ? json.notifications : []);
      setUnreadCount(typeof json.unreadCount === "number" ? json.unreadCount : 0);
    } catch {
      // Silent fail — the bell just stays empty.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 60s polling interval. Pause when the tab is hidden
  // (no point burning DB queries when the user is not looking at the page).
  // Re-fetch immediately when the tab becomes visible again so the badge
  // updates without waiting for the next tick.
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 60_000);
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchNotifications]);

  // Refresh when the dropdown opens so the user always sees fresh data.
  useEffect(() => {
    if (notifOpen) {
      fetchNotifications();
    }
  }, [notifOpen, fetchNotifications]);

  // Close dropdowns on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleMarkAsRead = useCallback(async (id: string) => {
    // Optimistic update — flip readAt locally so the UI feels instant.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      // On failure, revert by re-fetching.
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    // Optimistic — mark everything read locally.
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  }, [fetchNotifications]);

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
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-12 z-50 w-[340px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg dark:border-white/10 dark:bg-[#0F172A]"
              >
                <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3 dark:border-white/10">
                  <div>
                    <p className="font-display text-[14px] font-semibold text-[#111827] dark:text-white">
                      Notifications
                    </p>
                    <p className="text-[11px] text-[#6B7280] dark:text-white/60">
                      {unreadCount > 0 ? `${unreadCount} non lues` : "Toutes lues"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={markingAll || unreadCount === 0}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#2563EB] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {markingAll ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                    Tout marquer comme lu
                  </button>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {loading ? (
                    <div className="space-y-3 p-4">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                          <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-[#F3F4F6] dark:bg-white/10" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-3/4 animate-pulse rounded bg-[#F3F4F6] dark:bg-white/10" />
                            <div className="h-2.5 w-full animate-pulse rounded bg-[#F9FAFB] dark:bg-white/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                      <Bell className="h-7 w-7 text-[#9CA3AF]" />
                      <p className="text-[13px] font-medium text-[#374151] dark:text-white/80">
                        Aucune notification
                      </p>
                      <p className="text-[12px] text-[#6B7280] dark:text-white/50">
                        Vous serez prévenu dès qu'un événement se produira.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const meta = TYPE_ICON[n.type] ?? TYPE_ICON.system;
                      const { Icon } = meta;
                      const isUnread = !n.readAt;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleMarkAsRead(n.id)}
                          className={cn(
                            "flex w-full gap-3 border-b border-[#F9FAFB] px-4 py-3 text-left transition-colors hover:bg-[#F9FAFB] dark:border-white/5 dark:hover:bg-white/5",
                            isUnread && "border-l-2 border-l-[#2563EB] bg-[#EFF6FF]/40 dark:bg-[#2563EB]/10",
                          )}
                        >
                          <span
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[#111827] dark:text-white">
                              {n.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-[#6B7280] dark:text-white/60">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-white/40">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </div>
                          {isUnread && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#2563EB]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    setPage("notifications");
                  }}
                  className="w-full border-t border-[#F3F4F6] py-2.5 text-[13px] font-medium text-[#2563EB] transition-colors hover:bg-[#F9FAFB] dark:border-white/10 dark:hover:bg-white/5"
                >
                  Voir toutes les notifications
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
            <div className="absolute right-0 top-12 z-50 w-[240px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg dark:border-white/10 dark:bg-[#0F172A]">
              <div className="border-b border-[#F3F4F6] px-4 py-3 dark:border-white/10">
                <p className="font-display text-[14px] font-semibold text-[#111827] dark:text-white">{profile.companyName}</p>
                <p className="text-[12px] text-[#6B7280] dark:text-white/60">Plan {profile.plan} · {profile.email}</p>
              </div>
              <div className="py-1">
                <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#374151] hover:bg-[#F9FAFB] dark:text-white/80 dark:hover:bg-white/10">
                  <User className="h-4 w-4 text-[#6B7280] dark:text-white/60" />
                  Profil entreprise
                </button>
                <button
                  onClick={() => {
                    setAvatarOpen(false);
                    setPage("parametres");
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#374151] hover:bg-[#F9FAFB] dark:text-white/80 dark:hover:bg-white/10"
                >
                  <Settings className="h-4 w-4 text-[#6B7280] dark:text-white/60" />
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
