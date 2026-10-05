"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail,
  MailOpen,
  Archive,
  ArchiveRestore,
  Trash2,
  RefreshCw,
  Search,
  Loader2,
  Inbox,
  Phone,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * MessagesPage — onglet SuperAdmin « Messages » : messages reçus depuis le
 * formulaire de contact public (/contact). Chaque soumission est stockée en
 * base ET notifiée par email à contact@verifscan.com (emailStatus lisible
 * ici). Actions : marquer lu / non lu, archiver / désarchiver, supprimer.
 */

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "NEW" | "READ" | "ARCHIVED";
  emailStatus: "PENDING" | "SENT" | "SKIPPED" | "FAILED" | string;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
};

const SUBJECT_LABELS: Record<string, string> = {
  demo: "Demander une démo",
  partner: "Devenir partenaire",
  support: "Support technique",
  press: "Presse / Médias",
  other: "Autre",
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  NEW: { label: "Non lu", className: "bg-[#FEF3C7] text-[#92400E]" },
  READ: { label: "Lu", className: "bg-[#DCE7F2] text-[#0A2B5F]" },
  ARCHIVED: { label: "Archivé", className: "bg-[#F3F4F6] text-[#6B7280]" },
};

const EMAIL_STATUS_STYLES: Record<string, { label: string; className: string; hint: string }> = {
  SENT: { label: "Email envoyé", className: "bg-[#D1FAE5] text-[#059669]", hint: "Notification envoyée à contact@verifscan.com" },
  SKIPPED: { label: "Email non configuré", className: "bg-[#FEF3C7] text-[#92400E]", hint: "SMTP non configuré — configurez Paramètres → Email pour recevoir les notifications" },
  FAILED: { label: "Email échoué", className: "bg-[#FEE2E2] text-[#991B1B]", hint: "L'envoi de la notification a échoué — vérifiez la configuration SMTP" },
  PENDING: { label: "Email en cours", className: "bg-[#DCE7F2] text-[#0A2B5F]", hint: "Notification en cours d'envoi" },
};

function formatDateFr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

type Filter = "ALL" | "NEW" | "READ" | "ARCHIVED";

export function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contact-messages");
      if (!res.ok) throw new Error("Chargement impossible");
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      toast.error("Impossible de charger les messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(id: string, status: ContactMessage["status"]) {
    setBusyIds((s) => new Set(s).add(id));
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setMessages((list) =>
        list.map((m) => (m.id === id ? { ...m, status } : m)),
      );
      toast.success(
        status === "READ" ? "Message marqué comme lu."
        : status === "ARCHIVED" ? "Message archivé."
        : "Message marqué comme non lu.",
      );
    } catch {
      toast.error("Action impossible. Réessayez.");
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Supprimer définitivement le message de ${name} ?`)) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessages((list) => list.filter((m) => m.id !== id));
      toast.success("Message supprimé.");
    } catch {
      toast.error("Suppression impossible. Réessayez.");
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  const counts = useMemo(
    () => ({
      ALL: messages.length,
      NEW: messages.filter((m) => m.status === "NEW").length,
      READ: messages.filter((m) => m.status === "READ").length,
      ARCHIVED: messages.filter((m) => m.status === "ARCHIVED").length,
    }),
    [messages],
  );

  const visible = useMemo(() => {
    let list = messages;
    if (filter !== "ALL") list = list.filter((m) => m.status === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q),
      );
    }
    return list;
  }, [messages, filter, query]);

  const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: "ALL", label: "Tous" },
    { key: "NEW", label: "Non lus" },
    { key: "READ", label: "Lus" },
    { key: "ARCHIVED", label: "Archivés" },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Messages de contact</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Messages reçus depuis le formulaire public — également notifiés à
            contact@verifscan.com.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                filter === f.key
                  ? "bg-[#0A2B5F] text-white"
                  : "bg-white text-[#6B7280] ring-1 ring-[#E5E7EB] hover:bg-[#F9FAFB]",
              )}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[11px]",
                    filter === f.key ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]",
                  )}
                >
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, email, message)..."
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm text-[#111827] outline-none focus:border-[#0A2B5F] focus:ring-2 focus:ring-[#0A2B5F]/15"
          />
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#F3F4F6] bg-white py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#0A2B5F]" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#F3F4F6] bg-white py-20 text-center">
          <Inbox className="h-10 w-10 text-[#D1D5DB]" />
          <p className="mt-3 text-[15px] font-semibold text-[#374151]">
            Aucun message {filter !== "ALL" ? "dans ce filtre" : "pour le moment"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-[#6B7280]">
            Les messages envoyés depuis la page Contact apparaîtront ici et
            seront notifiés à contact@verifscan.com.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const st = STATUS_STYLES[m.status] ?? STATUS_STYLES.READ;
            const es = EMAIL_STATUS_STYLES[m.emailStatus];
            const isOpen = expanded === m.id;
            const busy = busyIds.has(m.id);
            return (
              <article
                key={m.id}
                className={cn(
                  "rounded-2xl border bg-white transition-shadow",
                  m.status === "NEW"
                    ? "border-[#F59E0B]/40 shadow-sm"
                    : "border-[#F3F4F6]",
                  "hover:shadow-md",
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="flex w-full items-start gap-4 p-4 text-left sm:p-5"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                      m.status === "NEW"
                        ? "bg-[#0A2B5F] text-white"
                        : "bg-[#DCE7F2] text-[#0A2B5F]",
                    )}
                  >
                    {initials(m.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-[#111827]">
                        {m.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          st.className,
                        )}
                      >
                        {st.label}
                      </span>
                      {es && (
                        <span
                          title={es.hint}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            es.className,
                          )}
                        >
                          {es.label}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-sm text-[#6B7280]">
                      {SUBJECT_LABELS[m.subject] ?? m.subject} — {m.message.slice(0, 90)}
                      {m.message.length > 90 ? "…" : ""}
                    </span>
                    <span className="mt-1 block text-xs text-[#9CA3AF]">
                      {formatDateFr(m.createdAt)}
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[#F3F4F6] px-4 pb-4 pt-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <a
                        href={`mailto:${m.email}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#0A2B5F] hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {m.email}
                      </a>
                      {m.phone && (
                        <a
                          href={`tel:${m.phone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#059669] hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {m.phone}
                        </a>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-[#6B7280]">
                        <MessageSquare className="h-4 w-4" />
                        {SUBJECT_LABELS[m.subject] ?? m.subject}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#F9FAFB] p-4 text-[14px] leading-relaxed text-[#374151]">
                      {m.message}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.status === "NEW" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void patchStatus(m.id, "READ")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A2B5F] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0D3068] disabled:opacity-60"
                        >
                          <MailOpen className="h-4 w-4" />
                          Marquer comme lu
                        </button>
                      ) : (
                        m.status !== "ARCHIVED" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void patchStatus(m.id, "NEW")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:opacity-60"
                          >
                            <Mail className="h-4 w-4" />
                            Marquer comme non lu
                          </button>
                        )
                      )}
                      {m.status === "ARCHIVED" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void patchStatus(m.id, "READ")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:opacity-60"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                          Désarchiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void patchStatus(m.id, "ARCHIVED")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:opacity-60"
                        >
                          <Archive className="h-4 w-4" />
                          Archiver
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(m.id, m.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-1.5 text-[13px] font-semibold text-[#991B1B] transition-colors hover:bg-[#FEE2E2] disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
