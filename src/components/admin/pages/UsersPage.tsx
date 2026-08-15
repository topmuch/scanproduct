"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Download,
  MoreVertical,
  Eye,
  Pencil,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  MessageCircle,
  UserPlus,
  X,
  Shield,
  Package,
} from "lucide-react";
import { PageContainer, Card, Badge, SectionTitle, Button } from "@/components/admin/ui";
import {
  formatFCFA,
  formatDate,
  type Maker,
  type Plan,
  type UserStatus,
  type UserRole,
} from "@/lib/admin-server-data";
import { useAdminData, useAdminMutations } from "@/components/admin/AdminDataProvider";
import { useAdminNav } from "@/lib/admin-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PillColor = "blue" | "green" | "orange" | "red" | "gray" | "purple" | "yellow";

const PLAN_BADGE: Record<Plan, PillColor> = {
  Starter: "blue",
  Pro: "green",
  Enterprise: "orange",
  Essai: "gray",
};

const STATUS_BADGE: Record<UserStatus, PillColor> = {
  Actif: "green",
  Inactif: "gray",
  Suspendu: "red",
};

const ROLE_BADGE: Record<UserRole, { color: PillColor; label: string }> = {
  FABRICANT: { color: "blue", label: "Fabricant" },
  SUPERADMIN: { color: "purple", label: "Super Admin" },
};

const STATUS_FILTERS: { key: "Tous" | UserStatus; label: string }[] = [
  { key: "Tous", label: "Tous" },
  { key: "Actif", label: "Actifs" },
  { key: "Inactif", label: "Inactifs" },
  { key: "Suspendu", label: "Suspendus" },
];

function downloadCSV(rows: Maker[]) {
  const header = ["ID", "Entreprise", "Contact", "Email", "Plan", "Statut", "Produits", "Scans", "Inscription"];
  const body = rows.map((m) => [
    m.id,
    m.company,
    m.contactName,
    m.email,
    m.plan,
    m.status,
    String(m.products),
    String(m.scans),
    m.registeredAt,
  ]);
  const csv = [header, ...body]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fabricants-verifscan.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function UsersPage() {
  const { openDetail } = useAdminNav();
  const { users: makers } = useAdminData();
  const { updateUser } = useAdminMutations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Tous" | UserStatus>("Tous");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);
  const [modalOpen, setModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the row dropdown on outside click.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    if (openMenuId) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return makers.filter((m) => {
      if (statusFilter !== "Tous" && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.company.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.contactName.toLowerCase().includes(q)
      );
    });
  }, [makers, search, statusFilter]);

  const allChecked = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));
  const selectedCount = selectedIds.size;

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((m) => next.add(m.id));
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <PageContainer>
      <SectionTitle
        title="Gestion des Fabricants"
        subtitle={`${makers.length} fabricants inscrits`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="md" onClick={() => downloadCSV(filtered)}>
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
            <Button variant="gradient" size="md" onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Ajouter fabricant
            </Button>
          </div>
        }
      />

      {/* Search + filter pills */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, entreprise..."
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.key === "Tous"
                ? makers.length
                : makers.filter((m) => m.status === f.key).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  statusFilter === f.key
                    ? "bg-[#2563EB] text-white"
                    : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    statusFilter === f.key ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        {/* Bulk action bar */}
        {selectedCount > 0 && (
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] bg-[#EFF6FF] px-4 py-2.5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1E40AF]">
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#2563EB] px-2 text-[12px] text-white">
                {selectedCount}
              </span>
              sélectionné(s)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={clearSelection}>
                <Pause className="h-3.5 w-3.5" />
                Suspendre la sélection
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                <RefreshCw className="h-3.5 w-3.5" />
                Changer de plan
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadCSV(filtered.filter((m) => selectedIds.has(m.id)))}
              >
                <Download className="h-3.5 w-3.5" />
                Exporter la sélection
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Tout désélectionner
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[12px] uppercase tracking-wide text-[#6B7280]">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Entreprise</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Rôle</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Produits</th>
                <th className="px-4 py-3 text-right font-semibold">Scans</th>
                <th className="px-4 py-3 font-semibold">Inscription</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => {
                const isOpen = openMenuId === m.id;
                const isChecked = selectedIds.has(m.id);
                const dropUp = idx >= filtered.length - 3;
                return (
                  <tr
                    key={m.id}
                    className={cn(
                      "h-16 border-b border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]",
                      isChecked && "bg-[#EFF6FF]/60"
                    )}
                  >
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(m.id)}
                        className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                      />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
                          style={{ backgroundColor: m.logoColor }}
                        >
                          {m.company.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-[#111827]">{m.company}</div>
                          <div className="truncate text-[12px] text-[#6B7280]">{m.contactName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="text-[13px] font-medium text-[#111827]">{m.contactName}</div>
                      <div className="text-[12px] text-[#6B7280]">{m.email}</div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge color={ROLE_BADGE[m.role].color}>
                        {m.role === "SUPERADMIN" && <Shield className="h-3 w-3" />}
                        {ROLE_BADGE[m.role].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge color={PLAN_BADGE[m.plan]}>{m.plan}</Badge>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Badge color={STATUS_BADGE[m.status]}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {m.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right align-middle text-[14px] font-semibold text-[#111827]">
                      {m.products}
                    </td>
                    <td className="px-4 py-3 text-right align-middle text-[14px] font-semibold text-[#111827]">
                      {formatFCFA(m.scans)}
                    </td>
                    <td className="px-4 py-3 align-middle text-[12px] text-[#6B7280]">
                      {formatDate(m.registeredAt)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="relative" ref={isOpen ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(isOpen ? null : m.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {isOpen && (
                          <div
                            className={cn(
                              "absolute right-0 z-30 w-56 rounded-xl border border-[#E5E7EB] bg-white py-1.5 shadow-lg",
                              dropUp ? "bottom-full mb-1" : "top-full mt-1"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                openDetail("user-detail", m.id);
                              }}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                            >
                              <Eye className="h-4 w-4 text-[#2563EB]" />
                              Voir détails
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(null)}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                            >
                              <Pencil className="h-4 w-4 text-[#6B7280]" />
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(null)}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                            >
                              <RefreshCw className="h-4 w-4 text-[#6B7280]" />
                              Changer de plan
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                const nextStatus = m.status === "Suspendu" ? "Actif" : "Suspendu";
                                updateUser(m.id, { status: nextStatus }).then(() => {
                                  toast.success(
                                    nextStatus === "Suspendu"
                                      ? `Fabricant « ${m.company} » suspendu`
                                      : `Fabricant « ${m.company} » réactivé`
                                  );
                                });
                              }}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                            >
                              {m.status === "Suspendu" ? (
                                <Play className="h-4 w-4 text-[#10B981]" />
                              ) : (
                                <Pause className="h-4 w-4 text-[#F59E0B]" />
                              )}
                              {m.status === "Suspendu" ? "Réactiver" : "Suspendre"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(null)}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                            >
                              <MessageCircle className="h-4 w-4 text-[#10B981]" />
                              Envoyer un message
                            </button>
                            <div className="my-1 border-t border-[#F3F4F6]" />
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(m.id);
                                  return next;
                                });
                              }}
                              className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-[#EF4444] hover:bg-[#FEF2F2]"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6]">
                        <Search className="h-5 w-5 text-[#9CA3AF]" />
                      </div>
                      <p className="text-[14px] font-semibold text-[#111827]">Aucun fabricant trouvé</p>
                      <p className="text-[13px] text-[#6B7280]">
                        Essayez de modifier votre recherche ou vos filtres.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex flex-col gap-3 border-t border-[#F3F4F6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[13px] text-[#6B7280]">
            Affichage <span className="font-semibold text-[#111827]">1-{filtered.length}</span> sur{" "}
            <span className="font-semibold text-[#111827]">{makers.length}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[#6B7280]">Par page</span>
            {([20, 50, 100] as const).map((size, i) => (
              <span key={size} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#E5E7EB]">|</span>}
                <button
                  type="button"
                  onClick={() => setPageSize(size)}
                  className={cn(
                    "font-semibold",
                    pageSize === size ? "text-[#2563EB]" : "text-[#374151] hover:text-[#2563EB]"
                  )}
                >
                  {size}
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled>
              Précédent
            </Button>
            <button
              type="button"
              className="flex h-8 min-w-[32px] items-center justify-center rounded-lg bg-[#2563EB] px-2 text-[13px] font-semibold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-[13px] font-semibold text-[#374151] hover:bg-[#F3F4F6]"
            >
              2
            </button>
            <button
              type="button"
              className="flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-[13px] font-semibold text-[#374151] hover:bg-[#F3F4F6]"
            >
              3
            </button>
            <span className="px-1 text-[#6B7280]">…</span>
            <Button size="sm" variant="outline">
              Suivant
            </Button>
          </div>
        </div>
      </Card>

      {/* Add fabricant modal */}
      {modalOpen && (
        <AddMakerModal
          onClose={() => setModalOpen(false)}
          onSubmit={async (data) => {
            try {
              const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as { error?: string };
                throw new Error(err.error || "Échec de la création");
              }
              toast.success(
                data.role === "SUPERADMIN"
                  ? `Super admin « ${data.contactName} » créé avec succès`
                  : `Fabricant « ${data.company} » créé avec succès`
              );
              setModalOpen(false);
              // Refresh server data so the new fabricant shows up
              if (typeof window !== "undefined") window.location.reload();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}
    </PageContainer>
  );
}

// ============================================================================
// AddMakerModal — form to create a new fabricant (or super admin) from the
// superadmin panel.
// ============================================================================
const LOGO_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

function AddMakerModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: {
    role: UserRole;
    company: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    plan: Plan;
    status: UserStatus;
    logoColor: string;
  }) => void;
}) {
  const [role, setRole] = useState<UserRole>("FABRICANT");
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+221 ");
  const [address, setAddress] = useState("Dakar, Sénégal");
  const [plan, setPlan] = useState<Plan>("Starter");
  const [status, setStatus] = useState<UserStatus>("Actif");
  const [logoColor, setLogoColor] = useState(LOGO_COLORS[0]);

  const isSuperAdmin = role === "SUPERADMIN";
  const companyLabel = isSuperAdmin ? "Département" : "Entreprise";
  const companyPlaceholder = isSuperAdmin ? "Ex : Opérations" : "Ex : Sarine Bio";
  const contactLabel = isSuperAdmin ? "Nom complet" : "Nom du contact";

  const canSubmit = Boolean(company.trim() && contactName.trim() && email.trim());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      role,
      company: company.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      // Superadmins have no plan / status — we still send sensible defaults
      // so the API contract stays uniform, but the UI hides them.
      plan: isSuperAdmin ? "Enterprise" : plan,
      status: isSuperAdmin ? "Actif" : status,
      logoColor,
    });
  }

  const inputCls =
    "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition";
  const labelCls = "mb-1.5 block text-[13px] font-medium text-[#374151]";

  const roleOptions: {
    value: UserRole;
    label: string;
    description: string;
    icon: typeof Package;
    activeCls: string;
  }[] = [
    {
      value: "FABRICANT",
      label: "Fabricant",
      description: "Compte entreprise",
      icon: Package,
      activeCls: "border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF]",
    },
    {
      value: "SUPERADMIN",
      label: "Super Admin",
      description: "Accès total",
      icon: Shield,
      activeCls: "border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6]",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-white",
                isSuperAdmin
                  ? "bg-gradient-to-br from-[#7C3AED] to-[#A855F7]"
                  : "bg-gradient-to-br from-[#2563EB] to-[#10B981]"
              )}
            >
              {isSuperAdmin ? <Shield className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-display text-[18px] font-bold text-[#111827]">
                {isSuperAdmin ? "Ajouter un super administrateur" : "Ajouter un fabricant"}
              </h2>
              <p className="text-[13px] text-[#6B7280]">
                {isSuperAdmin
                  ? "Créez un nouveau compte super admin."
                  : "Créez un nouveau compte fabricant."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(92vh-140px)] space-y-4 overflow-y-auto px-6 py-5">
          {/* Role segmented control */}
          <div>
            <label className={labelCls}>Type de compte</label>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const active = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                      active
                        ? opt.activeCls
                        : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        active
                          ? isSuperAdmin && opt.value === "SUPERADMIN"
                            ? "bg-[#7C3AED] text-white"
                            : "bg-[#2563EB] text-white"
                          : "bg-[#F3F4F6] text-[#6B7280]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight">
                        {opt.label}
                      </span>
                      <span className="block text-[11px] text-current/70 leading-tight">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelCls}>
              {companyLabel} <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={companyPlaceholder}
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                {contactLabel} <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex : Aminata Diop"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Email <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@entreprise.sn"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 000 00 00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Adresse</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dakar, Sénégal"
                className={inputCls}
              />
            </div>
          </div>

          {/* Plan + Status — only relevant for fabricants. Super admins are
              forced to Actif and have no plan. */}
          {!isSuperAdmin && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Plan)}
                  className={inputCls}
                >
                  <option value="Essai">Essai</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className={inputCls}
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Suspendu">Suspendu</option>
                </select>
              </div>
            </div>
          )}

          {isSuperAdmin && (
            <div className="flex items-center gap-2 rounded-lg border border-[#EDE9FE] bg-[#F5F3FF] px-3 py-2 text-[12px] text-[#5B21B6]">
              <Shield className="h-4 w-4 shrink-0" />
              <span>
                Le compte sera créé avec le statut <strong>Actif</strong> et un accès
                administrateur complet au tableau de bord VerifScan.
              </span>
            </div>
          )}

          {/* Logo color picker — only for fabricants */}
          {!isSuperAdmin && (
            <div>
              <label className={labelCls}>Couleur du logo</label>
              <div className="flex flex-wrap gap-2">
                {LOGO_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLogoColor(c)}
                    className={cn(
                      "h-9 w-9 rounded-lg border-2 transition-all",
                      logoColor === c
                        ? "border-[#111827] ring-2 ring-[#2563EB]/30"
                        : "border-transparent hover:scale-110"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
          <Button variant="outline" size="md" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant={isSuperAdmin ? "primary" : "gradient"}
            size="md"
            type="submit"
            disabled={!canSubmit}
            className={isSuperAdmin ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : undefined}
          >
            {isSuperAdmin ? <Shield className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isSuperAdmin ? "Créer le super admin" : "Créer le fabricant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
