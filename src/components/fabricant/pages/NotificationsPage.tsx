"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  AlertCircle,
  ScanLine,
  BarChart3,
  Info,
  MessageSquare,
  CreditCard,
  CheckCheck,
  Trash2,
  Bell,
  Loader2,
  ExternalLink,
  ChevronRight,
  Mail,
  Smartphone,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PageHeader,
  SectionCard,
  GradientButton,
  OutlineButton,
} from "@/components/fabricant/ui";
import { useFabricantNav } from "@/lib/fabricant-store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — mirror the API response shape.
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

type FilterTab = "all" | "unread" | "alerts" | "system";

// ---------------------------------------------------------------------------
// Visual maps (kept in sync with the header bell)
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  NotificationType,
  { Icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  lot_recall: { Icon: AlertTriangle, color: "#EF4444", bg: "#FEE2E2", label: "Lot rappelé" },
  quota_warning: { Icon: AlertCircle, color: "#F59E0B", bg: "#FEF3C7", label: "Alerte quota" },
  quota_exceeded: { Icon: AlertCircle, color: "#EF4444", bg: "#FEE2E2", label: "Quota atteint" },
  new_scan: { Icon: ScanLine, color: "#2563EB", bg: "#EFF6FF", label: "Nouveau scan" },
  weekly_report: { Icon: BarChart3, color: "#10B981", bg: "#D1FAE5", label: "Rapport hebdo" },
  system: { Icon: Info, color: "#2563EB", bg: "#EFF6FF", label: "Système" },
  ticket_update: { Icon: MessageSquare, color: "#8B5CF6", bg: "#EDE9FE", label: "Ticket" },
  subscription: { Icon: CreditCard, color: "#2563EB", bg: "#EFF6FF", label: "Abonnement" },
};

const SEVERITY_META: Record<
  NotificationSeverity,
  { bg: string; text: string; label: string }
> = {
  critical: { bg: "#FEE2E2", text: "#991B1B", label: "Critique" },
  warning: { bg: "#FEF3C7", text: "#92400E", label: "Avertissement" },
  info: { bg: "#EFF6FF", text: "#1E40AF", label: "Info" },
  success: { bg: "#D1FAE5", text: "#065F46", label: "Succès" },
};

const ALERT_TYPES: NotificationType[] = ["lot_recall", "quota_warning", "quota_exceeded"];
const SYSTEM_TYPES: NotificationType[] = ["system", "weekly_report"];

const FILTER_OPTIONS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "unread", label: "Non lues" },
  { value: "alerts", label: "Alertes" },
  { value: "system", label: "Système" },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Relative time formatter — French, short style.
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
// Notification row
// ---------------------------------------------------------------------------

function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
  onOpenLot,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenLot: (lotId: string) => void;
}) {
  const meta = TYPE_META[notification.type] ?? TYPE_META.system;
  const { Icon } = meta;
  const sev = SEVERITY_META[notification.severity] ?? SEVERITY_META.info;
  const isUnread = !notification.readAt;
  const lotId =
    notification.type === "lot_recall" && typeof notification.data?.lotId === "string"
      ? (notification.data.lotId as string)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm dark:border-white/10 dark:bg-white/5",
        isUnread
          ? "border-l-2 border-l-[#2563EB] border-[#E5E7EB] bg-[#EFF6FF]/30 dark:bg-[#2563EB]/10"
          : "border-[#E5E7EB]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-[#111827] dark:text-white">
              {notification.title}
            </p>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: sev.bg, color: sev.text }}
            >
              {sev.label}
            </span>
            {isUnread && (
              <span className="inline-flex h-2 w-2 rounded-full bg-[#2563EB]" aria-label="Non lue" />
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280] dark:text-white/60">
            {notification.message}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-[#9CA3AF] dark:text-white/40">
            <span>{formatRelativeTime(notification.createdAt)}</span>
            {notification.channels?.includes("email") && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </span>
            )}
            {notification.channels?.includes("sms") && (
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3 w-3" /> SMS
              </span>
            )}
            {notification.channels?.includes("in_app") && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" /> In-app
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isUnread && (
              <button
                type="button"
                onClick={() => onMarkRead(notification.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB] dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marquer comme lu
              </button>
            )}
            {lotId && (
              <button
                type="button"
                onClick={() => onOpenLot(lotId)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2563EB]/30 bg-[#EFF6FF] px-2.5 py-1.5 text-[12px] font-medium text-[#2563EB] transition-colors hover:bg-[#DBEAFE]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Voir le lot
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(notification.id)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-[#EF4444] transition-colors hover:bg-[#FEE2E2]"
              aria-label="Supprimer la notification"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Preferences summary card (right column)
// ---------------------------------------------------------------------------

type PrefsSummary = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  prefs: Record<string, { in_app?: boolean; email?: boolean; sms?: boolean }>;
};

function PreferencesSummaryCard({
  prefs,
  loading,
  onEdit,
}: {
  prefs: PrefsSummary | null;
  loading: boolean;
  onEdit: () => void;
}) {
  // Count active channels per type (only show the 8 well-known types).
  const TYPE_LABELS: Record<NotificationType, string> = {
    lot_recall: "Lot rappelé",
    quota_warning: "Alerte quota (80%)",
    quota_exceeded: "Quota atteint (100%)",
    new_scan: "Nouveau scan",
    weekly_report: "Rapport hebdomadaire",
    system: "Système",
    ticket_update: "Mise à jour ticket",
    subscription: "Abonnement",
  };

  return (
    <SectionCard
      title="Préférences"
      subtitle="Vos canaux de notification"
      action={
        <button
          type="button"
          onClick={onEdit}
          className="text-[12px] font-medium text-[#2563EB] hover:opacity-80"
        >
          Modifier
        </button>
      }
      className="lg:sticky lg:top-[90px]"
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-[#F3F4F6] dark:bg-white/10" />
          ))}
        </div>
      ) : !prefs ? (
        <p className="text-[13px] text-[#6B7280]">Impossible de charger vos préférences.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                prefs.pushEnabled
                  ? "border-[#2563EB]/30 bg-[#EFF6FF]"
                  : "border-[#E5E7EB] bg-[#F9FAFB] dark:border-white/10 dark:bg-white/5",
              )}
            >
              <Globe
                className={cn(
                  "mx-auto h-4 w-4",
                  prefs.pushEnabled ? "text-[#2563EB]" : "text-[#9CA3AF]",
                )}
              />
              <p className="mt-1 text-[11px] font-medium text-[#374151] dark:text-white/80">
                In-app
              </p>
              <p className="text-[10px] text-[#6B7280] dark:text-white/50">
                {prefs.pushEnabled ? "Activé" : "Désactivé"}
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                prefs.emailEnabled
                  ? "border-[#10B981]/30 bg-[#D1FAE5]"
                  : "border-[#E5E7EB] bg-[#F9FAFB] dark:border-white/10 dark:bg-white/5",
              )}
            >
              <Mail
                className={cn(
                  "mx-auto h-4 w-4",
                  prefs.emailEnabled ? "text-[#10B981]" : "text-[#9CA3AF]",
                )}
              />
              <p className="mt-1 text-[11px] font-medium text-[#374151] dark:text-white/80">
                Email
              </p>
              <p className="text-[10px] text-[#6B7280] dark:text-white/50">
                {prefs.emailEnabled ? "Activé" : "Désactivé"}
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg border p-3 text-center",
                prefs.smsEnabled
                  ? "border-[#F59E0B]/30 bg-[#FEF3C7]"
                  : "border-[#E5E7EB] bg-[#F9FAFB] dark:border-white/10 dark:bg-white/5",
              )}
            >
              <Smartphone
                className={cn(
                  "mx-auto h-4 w-4",
                  prefs.smsEnabled ? "text-[#F59E0B]" : "text-[#9CA3AF]",
                )}
              />
              <p className="mt-1 text-[11px] font-medium text-[#374151] dark:text-white/80">
                SMS
              </p>
              <p className="text-[10px] text-[#6B7280] dark:text-white/50">
                {prefs.smsEnabled ? "Activé" : "Désactivé"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-white/50">
              Types configurés
            </p>
            <div className="space-y-1.5">
              {(Object.keys(TYPE_LABELS) as NotificationType[]).map((t) => {
                const p = prefs.prefs[t] ?? {};
                const channels = [
                  p.in_app && "in-app",
                  p.email && "email",
                  p.sms && "sms",
                ].filter(Boolean);
                return (
                  <div
                    key={t}
                    className="flex items-center justify-between rounded-md border border-[#F3F4F6] px-2.5 py-1.5 dark:border-white/5"
                  >
                    <span className="text-[12px] text-[#374151] dark:text-white/80">
                      {TYPE_LABELS[t]}
                    </span>
                    <span className="text-[11px] text-[#9CA3AF] dark:text-white/40">
                      {channels.length === 0 ? "—" : channels.join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <OutlineButton className="w-full" onClick={onEdit}>
            Modifier mes préférences
            <ChevronRight className="h-4 w-4" />
          </OutlineButton>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function NotificationsPage() {
  const { setPage, setSettingsSection, openDetail } = useFabricantNav();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [offset, setOffset] = useState(0);

  // Preferences summary
  const [prefs, setPrefs] = useState<PrefsSummary | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);

  // -----------------------------------------------------------------------
  // Fetch notifications — uses `unreadOnly` for the "unread" tab, otherwise
  // returns everything (filtered client-side for alerts/system tabs since the
  // API doesn't support type filters yet).
  // -----------------------------------------------------------------------

  const fetchNotifications = useCallback(async (resetOffset: boolean = true) => {
    const newOffset = resetOffset ? 0 : offset;
    try {
      if (resetOffset) setLoading(true);
      else setLoadingMore(true);
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(newOffset),
        // Request the total count — needed for pagination "load more" button.
        includeTotal: "true",
      });
      if (filter === "unread") params.set("unreadOnly", "true");
      const res = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        toast.error("Impossible de charger les notifications");
        return;
      }
      const json = await res.json();
      const list: NotificationItem[] = Array.isArray(json.notifications) ? json.notifications : [];
      setNotifications((prev) => (resetOffset ? list : [...prev, ...list]));
      setUnreadCount(typeof json.unreadCount === "number" ? json.unreadCount : 0);
      setTotal(typeof json.total === "number" ? json.total : list.length);
      setOffset(newOffset + list.length);
    } catch {
      toast.error("Erreur réseau lors du chargement");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, offset]);

  // Initial fetch + refetch when the filter changes.
  useEffect(() => {
    fetchNotifications(true);
  }, [filter]);

  // Fetch prefs for the summary card (parallel to the initial list fetch).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPrefsLoading(true);
      try {
        const res = await fetch("/api/notifications/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setPrefs({
            pushEnabled: json.pushEnabled,
            emailEnabled: json.emailEnabled,
            smsEnabled: json.smsEnabled,
            prefs: json.prefs ?? {},
          });
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setPrefsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Client-side filtering for the "alerts" / "system" tabs.
  // -----------------------------------------------------------------------

  const visibleNotifications = useMemo(() => {
    if (filter === "alerts") {
      return notifications.filter((n) => ALERT_TYPES.includes(n.type));
    }
    if (filter === "system") {
      return notifications.filter((n) => SYSTEM_TYPES.includes(n.type));
    }
    return notifications;
  }, [notifications, filter]);

  // For "alerts" and "system" tabs the API didn't filter — we display only
  // the matched subset. The "Charger plus" button should still be visible
  // if the underlying list has more pages.
  const hasMore = total > offset;

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleMarkRead = useCallback(async (id: string) => {
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
      toast.error("Échec du marquage");
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // Optimistic removal
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Notification supprimée");
    } catch {
      setNotifications(previous);
      toast.error("Échec de la suppression");
    }
  }, [notifications]);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch {
      toast.error("Échec du marquage");
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const handleOpenLot = useCallback(
    (lotId: string) => {
      openDetail("lot-detail", lotId);
    },
    [openDetail],
  );

  const handleEditPrefs = useCallback(() => {
    setPage("parametres");
    setSettingsSection("notifications");
  }, [setPage, setSettingsSection]);

  const handleLoadMore = useCallback(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Restez informé des événements de votre compte"
      >
        <OutlineButton onClick={handleMarkAllRead} disabled={markingAll || unreadCount === 0}>
          {markingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Tout marquer comme lu
        </OutlineButton>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: filters + list */}
        <div className="space-y-4 lg:col-span-2">
          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const isActive = filter === opt.value;
              const count =
                opt.value === "unread"
                  ? unreadCount
                  : opt.value === "alerts"
                    ? notifications.filter((n) => ALERT_TYPES.includes(n.type)).length
                    : opt.value === "system"
                      ? notifications.filter((n) => SYSTEM_TYPES.includes(n.type)).length
                      : total;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                      : "border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#2563EB] dark:border-white/10 dark:bg-white/5 dark:text-white/70",
                  )}
                >
                  {opt.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold",
                        isActive ? "bg-white/20" : "bg-[#F3F4F6] text-[#6B7280] dark:bg-white/10 dark:text-white/60",
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex gap-3">
                    <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-[#F3F4F6] dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded bg-[#F3F4F6] dark:bg-white/10" />
                      <div className="h-3 w-full animate-pulse rounded bg-[#F9FAFB] dark:bg-white/5" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-[#F9FAFB] dark:bg-white/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] py-16 text-center dark:border-white/10 dark:bg-white/5">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Bell className="h-8 w-8 text-[#2563EB]" />
              </div>
              <h3 className="font-display text-[18px] font-semibold text-[#111827] dark:text-white">
                Aucune notification
              </h3>
              <p className="mt-1 max-w-sm text-[14px] text-[#6B7280] dark:text-white/60">
                {filter === "unread"
                  ? "Vous êtes à jour — aucune notification non lue."
                  : filter === "alerts"
                    ? "Aucune alerte critique pour le moment."
                    : "Vous serez prévenu dès qu'un événement se produira."}
              </p>
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {visibleNotifications.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onMarkRead={handleMarkRead}
                      onDelete={handleDelete}
                      onOpenLot={handleOpenLot}
                    />
                  ))}
                </div>
              </AnimatePresence>

              {/* Load more */}
              {hasMore && filter !== "unread" && (
                <div className="flex justify-center pt-2">
                  <OutlineButton onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      "Charger plus"
                    )}
                  </OutlineButton>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: preferences summary */}
        <div className="lg:col-span-1">
          <PreferencesSummaryCard
            prefs={prefs}
            loading={prefsLoading}
            onEdit={handleEditPrefs}
          />
        </div>
      </div>
    </div>
  );
}
