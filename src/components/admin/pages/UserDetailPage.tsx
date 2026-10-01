"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  StickyNote,
  LifeBuoy,
  CheckCircle2,
  RefreshCw,
  Eye,
  Trash2,
  KeyRound,
  Clock,
} from "lucide-react";
import { PageContainer, Card, CardHeader, Badge, Button } from "@/components/admin/ui";
import { AreaTrend } from "@/components/admin/charts";
import { formatFCFA, formatDate, type MakerNote, type Plan } from "@/lib/admin-server-data";
import { useAdminData, useAdminMutations } from "@/components/admin/AdminDataProvider";
import { useAdminNav } from "@/lib/admin-store";
import { toast } from "sonner";
import {
  ChangePlanDialog,
  CancelSubscriptionDialog,
  CreateTicketDialog,
  ResetPasswordDialog,
  HistoryDialog,
} from "./UserDetailDialogs";

type PillColor = "blue" | "green" | "orange" | "red" | "gray" | "purple" | "yellow";

const PLAN_BADGE: Record<Plan, PillColor> = {
  Starter: "blue",
  Pro: "green",
  Enterprise: "orange",
  Essai: "gray",
};

const PRODUCT_STATUS_BADGE: Record<string, PillColor> = {
  Actif: "green",
  Rupture: "orange",
  Suspendu: "red",
  Brouillon: "gray",
};

function ProductStatusBadge({ status }: { status: string }) {
  const color = PRODUCT_STATUS_BADGE[status] ?? "gray";
  return <Badge color={color}>{status}</Badge>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6]">
        <Icon className="h-4 w-4 text-[#6B7280]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-[#6B7280]">{label}</div>
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#111827]">
          <span className="truncate">{value}</span>
          {action}
        </div>
      </div>
    </div>
  );
}

function QuotaBox({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#F3F4F6] p-4">
      <div className="text-[12px] font-medium text-[#6B7280]">{label}</div>
      <div className="mt-1 text-[16px] font-bold text-[#111827]">{value}</div>
      {children}
      {hint && <div className="mt-2 text-[11px] text-[#9CA3AF]">{hint}</div>}
    </div>
  );
}

export function UserDetailPage() {
  const { selectedId, goBack } = useAdminNav();
  const { users } = useAdminData();
  const { updateUser } = useAdminMutations();
  const maker = users.find((m) => m.id === selectedId) ?? users[0];
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState<MakerNote[] | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [planDialog, setPlanDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [resetPwDialog, setResetPwDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Notes : optimistes (localNotes) par-dessus celles servies par l'API.
  const notes = localNotes ?? maker.notes;

  const scansData = maker.scans30d.map((v, i) => ({ label: `J${i + 1}`, value: v }));
  const topProducts = [...maker.productsList].sort((a, b) => b.scans - a.scans).slice(0, 5);
  const topMax = topProducts.length > 0 ? topProducts[0].scans : 1;

  const qrTotalDisplay = maker.quotaQrTotal >= 99999 ? "∞" : formatFCFA(maker.quotaQrTotal);
  const qrUsedPct =
    maker.quotaQrTotal >= 99999
      ? Math.min(100, Math.round((maker.quotaQrUsed / 10000) * 100))
      : Math.min(100, Math.round((maker.quotaQrUsed / maker.quotaQrTotal) * 100));
  const qrColor = qrUsedPct > 80 ? "#F59E0B" : "#10B981";

  const statusColor: PillColor =
    maker.status === "Actif" ? "green" : maker.status === "Suspendu" ? "red" : "gray";

  function copyToClipboard(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  // Lien WhatsApp (numéro du champ WhatsApp sinon téléphone), avec message
  // de contact pré-rempli — ouvert dans un nouvel onglet.
  const whatsappDigits = (maker.whatsapp ?? (maker.phone !== "—" ? maker.phone : ""))
    .replace(/[^\d]/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Bonjour ${maker.company}, c'est l'équipe VerifScan. Nous vous contactons au sujet de votre compte.`,
      )}`
    : null;
  const mailtoHref = `mailto:${maker.email}?subject=${encodeURIComponent(
    "VerifScan — Contact de l'équipe support",
  )}`;

  // Enregistre la note interne (AuditLog côté serveur) puis l'ajoute en tête.
  async function saveNote() {
    const content = noteInput.trim();
    if (!content) {
      toast.error("La note est vide.");
      return;
    }
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/users/${maker.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Échec de l'enregistrement");
      }
      const data = (await res.json()) as { note: MakerNote };
      setLocalNotes([data.note, ...(notes ?? [])]);
      setNoteInput("");
      toast.success("Note enregistrée");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <PageContainer>
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#6B7280] transition-colors hover:text-[#022150]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Informations entreprise */}
          <Card className="p-6">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div
                className="flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-full border-2 border-[#E5E7EB] text-[40px] font-bold text-white"
                style={{ backgroundColor: maker.logoColor }}
              >
                {maker.company.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-display text-[24px] font-bold text-[#111827]">{maker.company}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge color={PLAN_BADGE[maker.plan]}>{maker.plan}</Badge>
                  <Badge color={statusColor}>{maker.status}</Badge>
                  <span className="text-[13px] text-[#6B7280]">·</span>
                  <span className="text-[13px] text-[#6B7280]">ID : {maker.id}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                icon={Mail}
                label="Email"
                value={maker.email}
                action={
                  <button
                    type="button"
                    onClick={() => copyToClipboard(maker.email)}
                    className="text-[#9CA3AF] hover:text-[#022150]"
                    title="Copier l'email"
                    aria-label="Copier l'email"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <InfoRow
                icon={Phone}
                label="Téléphone"
                value={maker.phone}
                action={
                  <a
                    href={`tel:${maker.phone.replace(/\s/g, "")}`}
                    className="text-[#9CA3AF] hover:text-[#022150]"
                    title="Appeler"
                    aria-label="Appeler"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                }
              />
              <InfoRow
                icon={MessageCircle}
                label="WhatsApp"
                value={maker.whatsapp ?? "—"}
                action={
                  maker.whatsapp ? (
                    <a
                      href={`https://wa.me/${maker.whatsapp.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9CA3AF] hover:text-[#10B981]"
                      title="Discuter sur WhatsApp"
                      aria-label="Discuter sur WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  ) : null
                }
              />
              <InfoRow icon={MapPin} label="Adresse" value={maker.address} />
              <InfoRow icon={Calendar} label="Date d'inscription" value={formatDate(maker.registeredAt)} />
              <InfoRow icon={Calendar} label="Dernière connexion" value={formatDate(maker.lastLogin)} />
            </div>
          </Card>

          {/* Abonnement actuel */}
          <Card>
            <CardHeader title="Abonnement actuel" subtitle={`Méthode de paiement : ${maker.paymentMethod}`} />
            <div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge color={PLAN_BADGE[maker.plan]}>{maker.plan}</Badge>
                  <span className="text-[20px] font-bold text-[#111827]">
                    {formatFCFA(maker.mrr)}{" "}
                    <span className="text-[13px] font-medium text-[#6B7280]">FCFA/mois</span>
                  </span>
                  <span className="text-[13px] text-[#6B7280]">·</span>
                  <span className="text-[13px] text-[#6B7280]">
                    Prochaine facturation :{" "}
                    <span className="font-semibold text-[#111827]">{formatDate(maker.nextBilling)}</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-3 py-1 text-[13px] font-semibold text-[#065F46]">
                  <CheckCircle2 className="h-4 w-4" />
                  À jour
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" size="md" onClick={() => setPlanDialog(true)}>
                  <RefreshCw className="h-4 w-4" />
                  Changer de plan
                </Button>
                <Button variant="outline" size="md" onClick={() => setHistoryDialog(true)}>
                  <Clock className="h-4 w-4" />
                  Voir l'historique
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FCA5A5] hover:text-[#DC2626]"
                  onClick={() => setCancelDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Annuler l'abonnement
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <QuotaBox label="Produits" value={maker.quotaProducts} hint={`${maker.products} produits créés`} />
                <QuotaBox
                  label="QR codes"
                  value={`${qrUsedPct}%`}
                  hint={`${formatFCFA(maker.quotaQrUsed)} / ${qrTotalDisplay}`}
                >
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${qrUsedPct}%`, backgroundColor: qrColor }}
                    />
                  </div>
                </QuotaBox>
                <QuotaBox label="Statistiques" value="Illimité" hint="Accès complet BI" />
              </div>
            </div>
          </Card>

          {/* Produits de ce fabricant */}
          <Card>
            <CardHeader
              title={`Produits (${maker.products})`}
              subtitle="Liste des produits associés au compte"
            />
            <div className="overflow-x-auto">
              {maker.productsList.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6]">
                    <PackageIcon />
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827]">Aucun produit</p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    Ce fabricant n&apos;a pas encore ajouté de produit.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[12px] uppercase tracking-wide text-[#6B7280]">
                      <th className="px-5 py-3 font-semibold">Photo</th>
                      <th className="px-5 py-3 font-semibold">Nom</th>
                      <th className="px-5 py-3 font-semibold">Catégorie</th>
                      <th className="px-5 py-3 text-right font-semibold">Lots</th>
                      <th className="px-5 py-3 text-right font-semibold">Scans</th>
                      <th className="px-5 py-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maker.productsList.map((p, i) => (
                      <tr key={i} className="h-14 border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                        <td className="px-5 py-3">
                          <div
                            className="h-10 w-10 rounded-lg"
                            style={{
                              background: `linear-gradient(135deg, ${maker.logoColor}, ${maker.logoColor}cc)`,
                            }}
                          />
                        </td>
                        <td className="px-5 py-3 text-[13px] font-semibold text-[#111827]">{p.name}</td>
                        <td className="px-5 py-3 text-[13px] text-[#6B7280]">{p.category}</td>
                        <td className="px-5 py-3 text-right text-[13px] font-semibold text-[#111827]">{p.lots}</td>
                        <td className="px-5 py-3 text-right text-[13px] font-semibold text-[#111827]">
                          {formatFCFA(p.scans)}
                        </td>
                        <td className="px-5 py-3">
                          <ProductStatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4">
              {/* productsList affiche déjà TOUS les produits (take 20 côté API)
                  — plus de bouton fantôme « Voir tous les produits ». */}
            </div>
          </Card>

          {/* Historique des scans */}
          <Card>
            <CardHeader title="Historique des scans" subtitle="30 derniers jours" />
            <div className="p-5">
              <AreaTrend data={scansData} color="#022150" height={240} />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#F9FAFB] px-4 py-3">
                <div>
                  <div className="text-[12px] text-[#6B7280]">Total scans</div>
                  <div className="text-[18px] font-bold text-[#111827]">{formatFCFA(maker.scans)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-[#6B7280]">Moyenne / jour (30j)</div>
                  <div className="text-[18px] font-bold text-[#111827]">
                    {formatFCFA(
                      Math.round(maker.scans30d.reduce((a, b) => a + b, 0) / Math.max(1, maker.scans30d.length))
                    )}
                  </div>
                </div>
              </div>

              {topProducts.length > 0 && (
                <div className="mt-5">
                  <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Top produits scannés
                  </h4>
                  <div className="flex flex-col gap-2.5">
                    {topProducts.map((p, i) => {
                      const pct = Math.max(4, Math.round((p.scans / topMax) * 100));
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-40 shrink-0 truncate text-[13px] font-medium text-[#111827]">
                            {p.name}
                          </div>
                          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#F3F4F6]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: maker.logoColor }}
                            />
                          </div>
                          <div className="w-20 shrink-0 text-right text-[13px] font-semibold text-[#111827]">
                            {formatFCFA(p.scans)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Actions rapides */}
          <Card className="p-5">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-[#111827]">Actions rapides</h3>
            <div className="flex flex-col gap-2">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#10B981] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#059669]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contacter (WhatsApp)
                </a>
              ) : (
                <Button
                  variant="success"
                  className="w-full"
                  onClick={() =>
                    toast.error("Aucun numéro WhatsApp/téléphone sur ce compte.")
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  Contacter (WhatsApp)
                </Button>
              )}
              <a
                href={mailtoHref}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[14px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
              >
                <Mail className="h-4 w-4" />
                Envoyer email
              </a>
              <Button variant="outline" className="w-full" onClick={() => setTicketDialog(true)}>
                <LifeBuoy className="h-4 w-4" />
                Créer ticket support
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  noteInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  noteInputRef.current?.focus();
                }}
              >
                <StickyNote className="h-4 w-4" />
                Ajouter une note
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setResetPwDialog(true)}>
                <KeyRound className="h-4 w-4" />
                Réinitialiser le mot de passe
              </Button>
            </div>
          </Card>

          {/* Notes internes */}
          <Card className="p-5">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-[#111827]">Notes</h3>
            {notes.length === 0 ? (
              <p className="text-[13px] text-[#6B7280]">Aucune note pour le moment.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {notes.map((n, i) => (
                  <div key={i} className="rounded-lg border border-[#F3F4F6] bg-[#F9FAFB] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#111827]">{n.author}</span>
                      <span className="text-[11px] text-[#6B7280]">{formatDate(n.date)}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#374151]">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <input
                ref={noteInputRef}
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void saveNote();
                  }
                }}
                placeholder="Ajouter une note..."
                className="h-9 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#022150] focus:outline-none focus:ring-2 focus:ring-[#022150]/10"
              />
              <Button size="sm" onClick={saveNote} disabled={savingNote || !noteInput.trim()}>
                {savingNote ? "…" : "Enregistrer"}
              </Button>
            </div>
          </Card>

          {/* Activité récente */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[15px] font-semibold text-[#111827]">Activité récente</h3>
              <Button size="sm" variant="ghost" onClick={() => setHistoryDialog(true)}>
                Voir tout
              </Button>
            </div>
            {(() => {
              const items = showAllActivity
                ? maker.history?.length
                  ? maker.history
                  : maker.activity
                : maker.activity;
              if (items.length === 0) {
                return <p className="text-[13px] text-[#6B7280]">Aucune activité récente.</p>;
              }
              return (
                <ol className="flex flex-col gap-0">
                  {items.map((a, i) => {
                    const isLast = i === items.length - 1;
                    return (
                      <li key={i} className="relative flex gap-3 pb-4">
                        {!isLast && (
                          <span
                            className="absolute left-[5px] top-3 h-full w-px bg-[#E5E7EB]"
                            aria-hidden="true"
                          />
                        )}
                        <span className="z-10 mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-[#F0F4F9] bg-[#022150]" />
                        <div className="min-w-0">
                          <div className="text-[11px] text-[#6B7280]">{a.date}</div>
                          <div className="text-[13px] font-medium text-[#111827]">{a.label}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              );
            })()}
            {!showAllActivity && (maker.history?.length ?? 0) > maker.activity.length && (
              <button
                type="button"
                onClick={() => setShowAllActivity(true)}
                className="mt-1 text-[12px] font-semibold text-[#022150] hover:underline"
              >
                Afficher les {(maker.history?.length ?? 0)} derniers événements
              </button>
            )}
          </Card>
        </div>
      </div>

      {/* ── Dialogues d'action ── */}
      {planDialog && (
        <ChangePlanDialog
          makers={[maker]}
          onClose={() => setPlanDialog(false)}
          onDone={(newPlan) => {
            setPlanDialog(false);
            updateUser(maker.id, {
              plan: newPlan,
              mrr: newPlan === "Starter" ? 10000 : newPlan === "Pro" ? 25000 : newPlan === "Enterprise" ? 75000 : 0,
            });
          }}
        />
      )}
      {cancelDialog && (
        <CancelSubscriptionDialog
          maker={maker}
          onClose={() => setCancelDialog(false)}
          onDone={() => {
            setCancelDialog(false);
            updateUser(maker.id, { plan: "Essai", mrr: 0, nextBilling: "Essai", paymentMethod: "—" });
          }}
        />
      )}
      {ticketDialog && <CreateTicketDialog maker={maker} onClose={() => setTicketDialog(false)} />}
      {resetPwDialog && <ResetPasswordDialog maker={maker} onClose={() => setResetPwDialog(false)} />}
      {historyDialog && <HistoryDialog maker={maker} onClose={() => setHistoryDialog(false)} />}
    </PageContainer>
  );
}

function PackageIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9CA3AF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
