"use client";

/**
 * VerifScan — Fabricant dashboard · Marketplace B2B page
 *
 * 3 tabs (state-based switcher with PillFilter-style tab buttons):
 *   1. "Demandes reçues"   — inquiries received by this fabricant, KPIs +
 *      status filter + detail Dialog with response form (PATCH).
 *   2. "Visibilité produits" — table of the fabricant's products with
 *      isPublic / isFeatured visual toggles (no API mutation — those flags
 *      are managed on the Produits page).
 *   3. "Partenaires suggérés" — grid of cross-promotion partner suggestions
 *      from GET /api/marketplace/matches, with a "Contacter" toast button.
 *
 * All API calls use relative paths (Next.js gateway). Errors are surfaced
 * via sonner toasts in French.
 *
 * Design: NO blue/indigo primary — marketplace accent = emerald (#10B981),
 * CTA gradient = amber (#F59E0B) → red (#EF4444). White cards on #F9FAFB bg.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Handshake,
  Store,
  Eye,
  Loader2,
  Send,
  Mail,
  Building2,
  MapPin,
  Package,
  Star,
  Sparkles,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  KpiCard,
  EmptyState,
} from "@/components/fabricant/ui";
import { useFabricantData } from "@/components/fabricant/FabricantDataProvider";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// ---------------------------------------------------------------------------
// Types — mirror the API response shape.
// ---------------------------------------------------------------------------

type InquiryStatus = "pending" | "responded" | "accepted" | "declined";

type InquiryItem = {
  id: string;
  requesterName: string;
  requesterCompany: string | null;
  requesterEmail: string;
  requesterPhone: string | null;
  requesterCountry: string | null;
  requesterCity: string | null;
  message: string;
  quantity: number | null;
  targetPrice: string | null;
  deliveryDelay: string | null;
  status: InquiryStatus;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    category: string | null;
    categoryRef?: { name: string } | null;
  };
};

type PartnerMatch = {
  fabricantId: string;
  companyName: string;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  productCount: number;
  sharedCategories: string[];
};

type TabKey = "inquiries" | "products" | "partners";

const TAB_OPTIONS: { key: TabKey; label: string; Icon: typeof Inbox }[] = [
  { key: "inquiries", label: "Demandes reçues", Icon: Inbox },
  { key: "products", label: "Visibilité produits", Icon: Store },
  { key: "partners", label: "Partenaires suggérés", Icon: Handshake },
];

const STATUS_FILTERS: { value: InquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "responded", label: "Répondues" },
  { value: "accepted", label: "Acceptées" },
  { value: "declined", label: "Refusées" },
];

const STATUS_META: Record<
  InquiryStatus,
  { label: string; bg: string; text: string; Icon: typeof Clock }
> = {
  pending: { label: "En attente", bg: "#FEF3C7", text: "#92400E", Icon: Clock },
  responded: { label: "Répondu", bg: "#DBEAFE", text: "#1E40AF", Icon: CheckCircle2 },
  accepted: { label: "Acceptée", bg: "#D1FAE5", text: "#065F46", Icon: CheckCircle2 },
  declined: { label: "Refusée", bg: "#FEE2E2", text: "#991B1B", Icon: XCircle },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

// ===========================================================================
// Main page
// ===========================================================================

export function MarketplacePage() {
  const [tab, setTab] = useState<TabKey>("inquiries");

  return (
    <div>
      <PageHeader
        title="Marketplace B2B"
        subtitle="Recevez des demandes de devis des distributeurs et explorez des partenariats."
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-3 py-1 text-[12px] font-semibold text-[#065F46]">
          <Sparkles className="h-3.5 w-3.5" />
          V3 · Module 2
        </span>
      </PageHeader>

      {/* Tab switcher */}
      <div
        role="tablist"
        aria-label="Sections marketplace"
        className="mb-6 inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white p-1"
      >
        {TAB_OPTIONS.map((opt) => {
          const active = tab === opt.key;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(opt.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-[#10B981] text-white shadow-sm"
                  : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]",
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "inquiries" && <InquiriesTab />}
          {tab === "products" && <ProductsVisibilityTab />}
          {tab === "partners" && <PartnersTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default MarketplacePage;

// ===========================================================================
// Tab 1 — Demandes reçues
// ===========================================================================

function InquiriesTab() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InquiryStatus | "all">("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketplace/inquiries?limit=100", {
        cache: "no-store",
      });
      if (!res.ok) {
        toast.error("Impossible de charger les demandes de devis.");
        return;
      }
      const json = await res.json();
      const list: InquiryItem[] = Array.isArray(json.inquiries) ? json.inquiries : [];
      setInquiries(list);
    } catch {
      toast.error("Erreur réseau lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // KPIs
  const total = inquiries.length;
  const pending = inquiries.filter((i) => i.status === "pending").length;
  const responded = inquiries.filter((i) => i.status === "responded").length;
  const accepted = inquiries.filter((i) => i.status === "accepted").length;

  const visible =
    filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter);

  const detail =
    detailId !== null ? inquiries.find((i) => i.id === detailId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon="📥"
          iconBg="#EFF6FF"
          label="Total demandes"
          value={total}
          subText="Reçues via le catalogue B2B"
        />
        <KpiCard
          icon="⏳"
          iconBg="#FEF3C7"
          label="En attente"
          value={pending}
          subText="À traiter rapidement"
        />
        <KpiCard
          icon="✉️"
          iconBg="#DBEAFE"
          label="Répondues"
          value={responded}
          subText="Réponses envoyées"
        />
        <KpiCard
          icon="🤝"
          iconBg="#D1FAE5"
          label="Acceptées"
          value={accepted}
          subText="Devis convertis"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.value;
          const count =
            f.value === "all"
              ? total
              : inquiries.filter((i) => i.status === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-[#10B981] text-white shadow-sm"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#374151]",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#9CA3AF]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-12 w-12 text-[#9CA3AF]" />}
          title="Aucune demande de devis pour le moment"
          subtitle="Vos produits apparaissent dans le catalogue B2B public. Les distributeurs peuvent vous envoyer des demandes 24/7."
        />
      ) : (
        <div className="grid gap-4">
          {visible.map((inq) => {
            const meta = STATUS_META[inq.status];
            const Icon = meta.Icon;
            const productName = inq.product?.name ?? "Produit supprimé";
            const productCategory =
              inq.product?.categoryRef?.name ?? inq.product?.category ?? null;
            return (
              <SectionCard key={inq.id} className="transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: requester + product */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <span className="text-[12px] font-medium text-[#9CA3AF]">
                        {formatDate(inq.createdAt)}
                      </span>
                    </div>
                    <h4 className="mt-2 font-display text-[16px] font-semibold text-[#111827]">
                      {inq.requesterName}
                      {inq.requesterCompany && (
                        <span className="ml-2 text-[13px] font-normal text-[#6B7280]">
                          · {inq.requesterCompany}
                        </span>
                      )}
                    </h4>
                    <p className="mt-1 text-[13px] text-[#6B7280]">
                      <span className="font-medium text-[#374151]">Produit :</span>{" "}
                      {productName}
                      {productCategory && (
                        <span className="ml-1 text-[#9CA3AF]">· {productCategory}</span>
                      )}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#374151]">
                      {truncate(inq.message, 160)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#6B7280]">
                      {inq.quantity != null && (
                        <span className="inline-flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          Qté : <strong className="text-[#374151]">{inq.quantity}</strong>
                        </span>
                      )}
                      {inq.targetPrice && (
                        <span> Prix cible : <strong className="text-[#374151]">{inq.targetPrice}</strong></span>
                      )}
                      {inq.deliveryDelay && (
                        <span> Délai : <strong className="text-[#374151]">{inq.deliveryDelay}</strong></span>
                      )}
                      {inq.requesterCountry && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {inq.requesterCity ? `${inq.requesterCity}, ` : ""}
                          {inq.requesterCountry}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: action */}
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <button
                      type="button"
                      onClick={() => setDetailId(inq.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
                    >
                      <Eye className="h-4 w-4" />
                      Voir détails
                    </button>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <InquiryDetailDialog
        inquiry={detail}
        onClose={() => setDetailId(null)}
        onResponded={(updatedId, status, response) => {
          setInquiries((prev) =>
            prev.map((i) =>
              i.id === updatedId
                ? { ...i, status, response, respondedAt: new Date().toISOString() }
                : i,
            ),
          );
          setDetailId(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inquiry detail dialog with response form
// ---------------------------------------------------------------------------

function InquiryDetailDialog({
  inquiry,
  onClose,
  onResponded,
}: {
  inquiry: InquiryItem | null;
  onClose: () => void;
  onResponded: (id: string, status: InquiryStatus, response: string) => void;
}) {
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState<InquiryStatus>("responded");
  const [submitting, setSubmitting] = useState(false);

  // Reset local state whenever the inquiry changes (i.e. dialog opens).
  useEffect(() => {
    if (inquiry) {
      setResponse(inquiry.response ?? "");
      setNewStatus(
        inquiry.status === "pending" ? "responded" : inquiry.status,
      );
    }
  }, [inquiry]);

  async function handleSubmit() {
    if (!inquiry) return;
    if (!response.trim()) {
      toast.error("Veuillez saisir une réponse.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: response.trim(), status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: undefined }));
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : "Échec de l'enregistrement de la réponse.",
        );
        return;
      }
      toast.success("Réponse envoyée avec succès.");
      onResponded(inquiry.id, newStatus, response.trim());
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={inquiry !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl overflow-y-auto bg-white p-0 sm:rounded-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#10B981] to-[#059669]" />
        {inquiry && (
          <>
            <DialogHeader className="border-b border-[#F3F4F6] px-6 py-5">
              <DialogTitle className="font-display text-[18px] font-bold text-[#111827]">
                Demande de {inquiry.requesterName}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[#6B7280]">
                Reçue le {formatDate(inquiry.createdAt)} · Produit :{" "}
                <span className="font-semibold text-[#111827]">
                  {inquiry.product?.name ?? "—"}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              {/* Requester info */}
              <div className="grid gap-3 rounded-lg border border-[#F3F4F6] bg-[#F9FAFB] p-4 sm:grid-cols-2">
                <InfoRow
                  icon={<Building2 className="h-4 w-4 text-[#6B7280]" />}
                  label="Entreprise"
                  value={inquiry.requesterCompany ?? "—"}
                />
                <InfoRow
                  icon={<Mail className="h-4 w-4 text-[#6B7280]" />}
                  label="Email"
                  value={inquiry.requesterEmail}
                />
                <InfoRow
                  icon={<MessageSquare className="h-4 w-4 text-[#6B7280]" />}
                  label="Téléphone"
                  value={inquiry.requesterPhone ?? "—"}
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4 text-[#6B7280]" />}
                  label="Localisation"
                  value={
                    [inquiry.requesterCity, inquiry.requesterCountry]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
                <InfoRow
                  icon={<Package className="h-4 w-4 text-[#6B7280]" />}
                  label="Quantité"
                  value={inquiry.quantity != null ? String(inquiry.quantity) : "—"}
                />
                <InfoRow
                  icon={<Star className="h-4 w-4 text-[#6B7280]" />}
                  label="Prix cible"
                  value={inquiry.targetPrice ?? "—"}
                />
              </div>

              {/* Original message */}
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-[#374151]">
                  Message du demandeur
                </p>
                <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 text-[14px] leading-relaxed text-[#111827]">
                  {inquiry.message}
                </div>
              </div>

              {/* Previous response (if any) */}
              {inquiry.response && (
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-[#374151]">
                    Votre réponse précédente
                  </p>
                  <div className="rounded-lg border border-[#D1FAE5] bg-[#ECFDF5] p-4 text-[14px] leading-relaxed text-[#065F46]">
                    {inquiry.response}
                  </div>
                </div>
              )}

              {/* Response form */}
              <div className="space-y-3 border-t border-[#F3F4F6] pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inq-resp" className="text-[13px] font-medium text-[#374151]">
                    Votre réponse <span className="text-[#EF4444]">*</span>
                  </Label>
                  <Textarea
                    id="inq-resp"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Saisissez votre réponse (prix, conditions, délais, informations complémentaires…)"
                    className="min-h-[120px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/15"
                    maxLength={4000}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#374151]">
                    Statut de la demande
                  </Label>
                  <Select
                    value={newStatus}
                    onValueChange={(v) => setNewStatus(v as InquiryStatus)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[14px] text-[#111827] focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/15">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="responded">Répondu</SelectItem>
                      <SelectItem value="accepted">Acceptée</SelectItem>
                      <SelectItem value="declined">Refusée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse gap-3 border-t border-[#F3F4F6] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#EF4444] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer la réponse
                  </>
                )}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
          {label}
        </p>
        <p className="truncate text-[13px] font-semibold text-[#111827]">{value}</p>
      </div>
    </div>
  );
}

// ===========================================================================
// Tab 2 — Visibilité produits
// ===========================================================================

function ProductsVisibilityTab() {
  const { data } = useFabricantData();
  const products = data.products ?? [];

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[#065F46]">
            Vos produits publics apparaissent automatiquement dans le catalogue B2B VerifScan.
          </p>
          <p className="mt-1 text-[13px] text-[#047857]">
            Les distributeurs peuvent vous envoyer des demandes de devis 24/7. Activez la
            visibilité publique et mettez en avant vos meilleurs produits pour augmenter
            votre exposition.
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<Store className="h-12 w-12 text-[#9CA3AF]" />}
          title="Aucun produit dans votre catalogue"
          subtitle="Ajoutez votre premier produit pour apparaître dans la marketplace B2B."
        />
      ) : (
        <SectionCard
          title="Vos produits"
          subtitle={`${products.length} produit(s) · visibilité publique sur le marketplace`}
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#F9FAFB] text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-5 py-3">Produit</th>
                  <th className="px-5 py-3">Catégorie</th>
                  <th className="px-5 py-3 text-right">Scans totaux</th>
                  <th className="px-5 py-3 text-center">Public</th>
                  <th className="px-5 py-3 text-center">À la une</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  // `status` here is the FabricantData "actif"|"brouillon"|"masque" enum.
                  // A product is "public" on the marketplace when status === "actif".
                  const isPublic = p.status === "actif";
                  const isFeatured = p.scans >= 500; // simple visual proxy
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-[#F3F4F6] text-[14px] hover:bg-[#F9FAFB]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] text-[16px] font-bold text-white">
                            {p.photo && p.photo.startsWith("http") ? (
                              <img
                                src={p.photo}
                                alt={p.nom}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              p.categorieIcon || "📦"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#111827]">
                              {p.nom}
                            </p>
                            {p.marque && (
                              <p className="truncate text-[12px] text-[#6B7280]">
                                {p.marque} · {p.poids}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-medium text-[#374151]">
                          {p.categorieIcon && <span>{p.categorieIcon}</span>}
                          {p.categorie}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-[#111827]">
                          {p.scans.toLocaleString("fr-FR")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={isPublic}
                            aria-label="Visibilité publique"
                            // visual only — toggle is handled on the Produits page
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={isFeatured}
                            aria-label="Mettre à la une"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ===========================================================================
// Tab 3 — Partenaires suggérés
// ===========================================================================

function PartnersTab() {
  const [matches, setMatches] = useState<PartnerMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketplace/matches", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Impossible de charger les partenaires suggérés.");
        return;
      }
      const json = await res.json();
      const list: PartnerMatch[] = Array.isArray(json.matches) ? json.matches : [];
      setMatches(list);
    } catch {
      toast.error("Erreur réseau lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#9CA3AF]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Handshake className="h-12 w-12 text-[#9CA3AF]" />}
        title="Aucun partenaire suggéré pour le moment"
        subtitle="Les suggestions apparaîtront ici dès que d'autres fabricants auront des produits publics dans le catalogue."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-[#FEF3C7] bg-[#FFFBEB] p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" />
        <div>
          <p className="text-[14px] font-semibold text-[#92400E]">
            Suggestions de partenariats B2B
          </p>
          <p className="mt-1 text-[13px] text-[#92400E]">
            Ces fabricants opèrent dans des catégories complémentaires. Échangez des
            leads, montez des opérations co-brandées ou partagez vos réseaux de
            distribution.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => {
          const initials = (m.companyName || "?")
            .split(/\s+/)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase() ?? "")
            .join("");
          return (
            <SectionCard key={m.fabricantId} className="transition-shadow hover:shadow-md">
              <div className="flex flex-col items-start gap-4">
                {/* Header: logo + name */}
                <div className="flex w-full items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-[16px] font-bold text-white">
                      {m.logoUrl && m.logoUrl.startsWith("http") ? (
                        <img
                          src={m.logoUrl}
                          alt={m.companyName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials || "🏭"
                      )}
                    </div>
                    <div>
                      <p className="font-display text-[15px] font-semibold text-[#111827]">
                        {m.companyName}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-[#6B7280]">
                        <MapPin className="h-3 w-3" />
                        {[m.city, m.country].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid w-full grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#F9FAFB] px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                      Produits publics
                    </p>
                    <p className="mt-0.5 text-[16px] font-bold text-[#111827]">
                      {m.productCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F9FAFB] px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                      Catégories communes
                    </p>
                    <p className="mt-0.5 text-[16px] font-bold text-[#10B981]">
                      {m.sharedCategories.length}
                    </p>
                  </div>
                </div>

                {/* Shared categories */}
                {m.sharedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.sharedCategories.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[11px] font-medium text-[#065F46]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Fonctionnalité de messagerie bientôt disponible.")
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#10B981] bg-white px-4 py-2 text-[13px] font-semibold text-[#10B981] transition-colors hover:bg-[#ECFDF5]"
                >
                  <Mail className="h-4 w-4" />
                  Contacter
                </button>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
