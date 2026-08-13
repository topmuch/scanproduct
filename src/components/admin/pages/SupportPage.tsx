"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Eye, UserPlus, XCircle, X, ChevronDown } from "lucide-react";
import { PageContainer, SectionTitle, Card, Badge, Button } from "@/components/admin/ui";
import { formatDate, type Ticket } from "@/lib/admin-data";
import { useAdminNav } from "@/lib/admin-store";
import { useTickets } from "@/lib/admin-data-store";
import { toast } from "sonner";

type TabKey = "Ouverts" | "En cours" | "Résolus" | "Tous";
type PriorityKey = Ticket["priority"];
type CategoryKey = Ticket["category"];

const TABS: { key: TabKey; label: string; count: number }[] = [
  { key: "Ouverts", label: "Ouverts", count: 12 },
  { key: "En cours", label: "En cours", count: 5 },
  { key: "Résolus", label: "Résolus", count: 145 },
  { key: "Tous", label: "Tous", count: 162 },
];

const PRIORITIES: PriorityKey[] = ["Basse", "Normale", "Haute", "Urgente"];
const CATEGORIES_FILTER: CategoryKey[] = ["Technique", "Facturation", "Compte", "Autre"];

const PRIORITY_COLOR: Record<PriorityKey, "gray" | "blue" | "orange" | "red"> = {
  Basse: "gray",
  Normale: "blue",
  Haute: "orange",
  Urgente: "red",
};

const STATUS_COLOR: Record<Ticket["status"], "blue" | "yellow" | "gray" | "green"> = {
  Ouvert: "blue",
  "En cours": "yellow",
  "En attente": "gray",
  Résolu: "green",
};

function statusForTab(tab: TabKey): Ticket["status"] | null {
  switch (tab) {
    case "Ouverts":
      return "Ouvert";
    case "En cours":
      return "En cours";
    case "Résolus":
      return "Résolu";
    default:
      return null;
  }
}

export function SupportPage() {
  const { openDetail } = useAdminNav();
  const { tickets, addTicket } = useTickets();
  const [activeTab, setActiveTab] = useState<TabKey>("Tous");
  const [activePriority, setActivePriority] = useState<PriorityKey | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = useMemo(() => {
    const status = statusForTab(activeTab);
    return tickets.filter((t) => {
      if (status && t.status !== status) return false;
      if (activePriority && t.priority !== activePriority) return false;
      if (activeCategory && t.category !== activeCategory) return false;
      return true;
    });
  }, [tickets, activeTab, activePriority, activeCategory]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "Ouvert").length,
    [tickets]
  );

  const tabCounts = useMemo(() => ({
    Ouverts: tickets.filter((t) => t.status === "Ouvert").length,
    "En cours": tickets.filter((t) => t.status === "En cours").length,
    Résolus: tickets.filter((t) => t.status === "Résolu").length,
    Tous: tickets.length,
  }), [tickets]);

  const tabsWithCounts = TABS.map((tab) => ({ ...tab, count: tabCounts[tab.key] }));

  return (
    <PageContainer>
      <SectionTitle
        title="Support Client"
        subtitle={`${openCount} tickets ouverts`}
        action={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Créer un ticket interne
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabsWithCounts.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]",
              ].join(" ")}
            >
              {tab.label}
              <span
                className={[
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]",
                ].join(" ")}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <FilterRow
          label="Priorité"
          options={PRIORITIES}
          active={activePriority}
          onChange={(v) => setActivePriority(v as PriorityKey | null)}
        />
        <FilterRow
          label="Catégorie"
          options={CATEGORIES_FILTER}
          active={activeCategory}
          onChange={(v) => setActiveCategory(v as CategoryKey | null)}
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Sujet</th>
                <th className="px-4 py-3">Demandeur</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Assigné à</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3">Dernière réponse</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[14px] text-[#9CA3AF]">
                    Aucun ticket ne correspond à ces filtres.
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <TicketRow key={t.id} ticket={t} onView={() => openDetail("ticket-detail", t.id)} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showCreateModal && (
          <CreateTicketModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(data) => {
              const t = addTicket(data);
              toast.success(`Ticket ${t.id} créé avec succès`);
              setShowCreateModal(false);
              openDetail("ticket-detail", t.id);
            }}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  );
}

function FilterRow({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: string[];
  active: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={[
          "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
          active === null
            ? "bg-[#111827] text-white"
            : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]",
        ].join(" ")}
      >
        Tous
      </button>
      {options.map((opt) => {
        const isActive = active === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(isActive ? null : opt)}
            className={[
              "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
              isActive
                ? "bg-[#2563EB] text-white"
                : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TicketRow({ ticket, onView }: { ticket: Ticket; onView: () => void }) {
  return (
    <tr className="h-16 border-b border-[#F3F4F6] text-[14px] transition-colors last:border-b-0 hover:bg-[#F9FAFB]">
      <td className="px-4 py-3">
        <span className="font-mono text-[12px] text-[#6B7280]">#{ticket.id}</span>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onView}
          className="text-left text-[14px] font-semibold text-[#111827] transition-colors hover:text-[#2563EB]"
        >
          {ticket.subject}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: ticket.avatarColor }}
          >
            {ticket.requester.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[#111827]">{ticket.requester}</p>
            <p className="truncate text-[12px] text-[#6B7280]">{ticket.company}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge color={PRIORITY_COLOR[ticket.priority]}>{ticket.priority}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge color={STATUS_COLOR[ticket.status]}>{ticket.status}</Badge>
      </td>
      <td className="px-4 py-3">
        {ticket.assignedTo ? (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#10B981] text-[10px] font-bold text-white">
              AV
            </div>
            <span className="text-[13px] font-medium text-[#374151]">{ticket.assignedTo}</span>
          </div>
        ) : (
          <span className="text-[13px] italic text-[#9CA3AF]">Non assigné</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#6B7280]">{formatDate(ticket.createdAt)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#6B7280]">{ticket.lastReply}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <RowIcon label="Voir" onClick={onView}>
            <Eye className="h-4 w-4" />
          </RowIcon>
          <RowIcon
            label="Assigner"
            onClick={() => toast.info(`Assignation du ticket ${ticket.id} — bientôt disponible`)}
          >
            <UserPlus className="h-4 w-4" />
          </RowIcon>
          <RowIcon
            label="Fermer"
            tone="danger"
            onClick={() => toast.success(`Ticket ${ticket.id} fermé`)}
          >
            <XCircle className="h-4 w-4" />
          </RowIcon>
        </div>
      </td>
    </tr>
  );
}

function RowIcon({
  children,
  onClick,
  label,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
        "border-[#E5E7EB] bg-white",
        tone === "danger"
          ? "text-[#EF4444] hover:border-[#EF4444] hover:bg-[#FEF2F2]"
          : "text-[#6B7280] hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ============================================================================
// CreateTicketModal — full form to create a new internal support ticket.
// ============================================================================
const AVATAR_COLORS = ["#DC2626", "#10B981", "#2563EB", "#F59E0B", "#8B5CF6", "#EC4899", "#0891B2", "#7C3AED"];
const PLAN_OPTIONS: Ticket["plan"][] = ["Starter", "Pro", "Enterprise", "Essai"];

function CreateTicketModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Omit<Ticket, "id" | "createdAt" | "lastReply" | "assignedTo" | "messages" | "internalNotes" | "tags">) => void;
}) {
  const [subject, setSubject] = useState("");
  const [requester, setRequester] = useState("");
  const [company, setCompany] = useState("");
  const [priority, setPriority] = useState<PriorityKey>("Normale");
  const [category, setCategory] = useState<CategoryKey>("Technique");
  const [plan, setPlan] = useState<Ticket["plan"]>("Pro");
  const [description, setDescription] = useState("");

  const canSubmit = subject.trim().length > 2 && requester.trim().length > 1 && company.trim().length > 1;

  function handleSubmit() {
    if (!canSubmit) return;
    onCreate({
      subject: subject.trim(),
      requester: requester.trim(),
      company: company.trim(),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      priority,
      status: "Ouvert",
      category,
      plan,
      description: description.trim() || subject.trim(),
    });
  }

  const inputClass =
    "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[600px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
          <div>
            <h2 className="font-display text-[18px] font-bold text-[#111827]">
              Créer un ticket interne
            </h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              Ouvrez un nouveau ticket de support pour un fabricant.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F9FAFB]"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(92vh-130px)] space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Sujet du ticket <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Problème avec la génération de QR codes"
              className={inputClass}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                Demandeur <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                placeholder="Ex : Marième Diop"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                Entreprise <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex : Jus de Bissap Sénégal"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                Priorité
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityKey)}
                  className={`${inputClass} appearance-none pr-9`}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                Catégorie
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryKey)}
                  className={`${inputClass} appearance-none pr-9`}
                >
                  {CATEGORIES_FILTER.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                Plan
              </label>
              <div className="relative">
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Ticket["plan"])}
                  className={`${inputClass} appearance-none pr-9`}
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Description initiale
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème ou la demande du client..."
              rows={4}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            <Plus className="h-4 w-4" />
            Créer le ticket
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
