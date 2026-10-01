"use client";

// ============================================================================
// Dialogues d'action du détail fabricant (SuperAdmin) — partagés entre
// UserDetailPage et UsersPage.
// ============================================================================
//   - ChangePlanDialog         : Starter / Pro / Business → PATCH { plan }
//   - CancelSubscriptionDialog : clôture l'abonnement actif (confirm nominative)
//   - CreateTicketDialog       : ticket support rattaché au fabricant
//   - ResetPasswordDialog      : reset du mot de passe (auto ou manuel)
//   - HistoryDialog            : timeline complète (audit logs du compte)
// ============================================================================

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  KeyRound,
  LifeBuoy,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/admin/ui";
import { formatFCFA, type Maker, type Plan } from "@/lib/admin-server-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Coquille de dialogue commune (backdrop + carte + header)
// ---------------------------------------------------------------------------

function DialogShell({
  title,
  subtitle,
  icon,
  onClose,
  children,
  width = "max-w-md",
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "max-h-[92vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl",
          width,
        )}
      >
        <div className="flex items-start justify-between border-b border-[#F3F4F6] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#022150] text-white">
              {icon}
            </div>
            <div>
              <h2 className="font-display text-[16px] font-bold text-[#111827]">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[12px] text-[#6B7280]">{subtitle}</p>
              )}
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
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChangePlanDialog
// ---------------------------------------------------------------------------

const PLAN_OPTIONS: { id: "starter" | "pro" | "business"; label: Plan; mrr: number; perks: string }[] = [
  { id: "starter", label: "Starter", mrr: 10000, perks: "10 produits · 100 QR codes" },
  { id: "pro", label: "Pro", mrr: 25000, perks: "50 produits · 1 000 QR codes" },
  { id: "business", label: "Enterprise", mrr: 75000, perks: "Illimité · 10 000 QR codes" },
];

export function ChangePlanDialog({
  makers,
  onClose,
  onDone,
}: {
  /** 1 compte (vue détail / menu ligne) ou N comptes (action groupée). */
  makers: Maker[];
  onClose: () => void;
  onDone: (newPlan: Plan) => void;
}) {
  const [selected, setSelected] = useState<string>(
    PLAN_OPTIONS.find((p) => p.label === makers[0]?.plan)?.id ?? "starter",
  );
  const [loading, setLoading] = useState(false);

  const subtitle =
    makers.length === 1
      ? `${makers[0].company} — plan actuel : ${makers[0].plan}`
      : `${makers.length} comptes sélectionnés — le plan sera appliqué à tous`;

  async function handleSubmit() {
    setLoading(true);
    try {
      for (const m of makers) {
        const res = await fetch(`/api/admin/users/${m.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: selected }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            err.error || `Échec du changement de plan pour « ${m.company} »`,
          );
        }
      }
      const opt = PLAN_OPTIONS.find((p) => p.id === selected)!;
      toast.success(
        makers.length === 1
          ? `Plan de « ${makers[0].company} » changé en ${opt.label} (${formatFCFA(opt.mrr)} FCFA/mois)`
          : `Plan ${opt.label} appliqué à ${makers.length} compte(s)`,
      );
      onDone(opt.label);
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <DialogShell
      title="Changer de plan"
      subtitle={subtitle}
      icon={<KeyRound className="h-4 w-4" />}
      onClose={onClose}
    >
      <div className="space-y-3 px-6 py-5">
        {PLAN_OPTIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all",
              selected === p.id
                ? "border-[#022150] bg-[#F0F4F9]"
                : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]",
            )}
          >
            <span>
              <span className="block text-[14px] font-bold text-[#111827]">
                {p.label}
              </span>
              <span className="block text-[12px] text-[#6B7280]">{p.perks}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-[#022150]">
                {formatFCFA(p.mrr)}
                <span className="text-[11px] font-medium text-[#6B7280]"> /mois</span>
              </span>
              {selected === p.id && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981] text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </span>
          </button>
        ))}
        <p className="text-[12px] text-[#9CA3AF]">
          Le nouveau plan prend effet immédiatement avec une période de 30 jours.
          L&apos;abonnement actif{makers.length > 1 ? " de chaque compte" : " du fabricant"} est remplacé.
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
        <Button variant="outline" size="md" type="button" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="gradient" size="md" type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Appliquer le plan
        </Button>
      </div>
    </DialogShell>
  );
}

// ---------------------------------------------------------------------------
// CancelSubscriptionDialog
// ---------------------------------------------------------------------------

export function CancelSubscriptionDialog({
  maker,
  onClose,
  onDone,
}: {
  maker: Maker;
  onClose: () => void;
  onDone: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = confirmation.trim() === "ANNULER" && !loading;

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${maker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelSubscription: true }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Échec de l'annulation");
      }
      toast.success(`Abonnement de « ${maker.company} » annulé`, {
        description: "Le compte repasse sur l'offre d'essai (gratuite).",
      });
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <DialogShell
      title="Annuler l'abonnement"
      subtitle={`${maker.company} — plan ${maker.plan}`}
      icon={<AlertTriangle className="h-4 w-4" />}
      onClose={onClose}
    >
      <div className="space-y-4 px-6 py-5">
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-[13px] text-[#B91C1C]">
          <p className="font-semibold">Cette action est immédiate :</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              L&apos;abonnement actif ({maker.plan} — {formatFCFA(maker.mrr)} FCFA/mois)
              est clôturé sans remboursement automatique.
            </li>
            <li>Le compte repasse sur l&apos;offre d&apos;essai (gratuite) et ses quotas.</li>
            <li>Les produits et QR codes déjà générés ne sont pas supprimés.</li>
          </ul>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
            Tapez <span className="font-bold text-[#DC2626]">ANNULER</span> pour confirmer
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="ANNULER"
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#111827] focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20"
            autoFocus
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
        <Button variant="outline" size="md" type="button" onClick={onClose} disabled={loading}>
          Garder l&apos;abonnement
        </Button>
        <Button
          size="md"
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-[#DC2626] hover:bg-[#B91C1C]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Annuler l&apos;abonnement
        </Button>
      </div>
    </DialogShell>
  );
}

// ---------------------------------------------------------------------------
// CreateTicketDialog
// ---------------------------------------------------------------------------

export function CreateTicketDialog({
  maker,
  onClose,
  onCreated,
}: {
  maker: Maker;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Basse" | "Normale" | "Haute" | "Urgente">("Normale");
  const [loading, setLoading] = useState(false);

  const canSubmit = subject.trim().length >= 3 && !loading;

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim() || undefined,
          priority,
          // Le modèle Ticket impose: "Technique" | "Facturation" | "Compte" | "Autre"
          category: "Technique",
          userId: maker.id,
          requesterName: maker.contactName,
          requesterCompany: maker.company,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Échec de la création du ticket");
      }
      const data = (await res.json()) as { ticket?: { reference?: string } };
      toast.success(
        `Ticket ${data.ticket?.reference ?? ""} créé pour « ${maker.company} »`,
        { description: "Retrouvez-le dans l'onglet Support." },
      );
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#022150] focus:outline-none focus:ring-2 focus:ring-[#022150]/20";

  return (
    <DialogShell
      title="Créer un ticket support"
      subtitle={`Pour ${maker.company} (${maker.email})`}
      icon={<LifeBuoy className="h-4 w-4" />}
      onClose={onClose}
    >
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
            Sujet <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex : Problème de génération de QR codes"
            className={inputCls}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_150px]">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Contexte, étapes, captures… (visible par le fabricant)"
              className={cn(inputCls, "resize-none")}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Priorité
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className={inputCls}
            >
              <option value="Basse">Basse</option>
              <option value="Normale">Normale</option>
              <option value="Haute">Haute</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
        <Button variant="outline" size="md" type="button" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="gradient" size="md" type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LifeBuoy className="h-4 w-4" />}
          Créer le ticket
        </Button>
      </div>
    </DialogShell>
  );
}

// ---------------------------------------------------------------------------
// ResetPasswordDialog
// ---------------------------------------------------------------------------

export function ResetPasswordDialog({
  maker,
  onClose,
}: {
  maker: Maker;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [manualPassword, setManualPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tempPassword?: string;
    emailed: boolean;
    smtpConfigured: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit =
    !loading &&
    (mode === "auto" ||
      (manualPassword.length >= 8 && manualPassword === confirmPassword));

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${maker.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "manual" ? { newPassword: manualPassword } : {},
        ),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Échec de la réinitialisation");
      }
      const data = (await res.json()) as {
        tempPassword?: string;
        emailed: boolean;
        smtpConfigured: boolean;
      };
      setResult(data);
      toast.success(
        `Mot de passe de « ${maker.company} » réinitialisé`,
        {
          description: data.emailed
            ? "Le nouveau mot de passe a été envoyé au fabricant par email."
            : "SMTP non configuré — transmettez le mot de passe manuellement.",
        },
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#111827] focus:border-[#022150] focus:outline-none focus:ring-2 focus:ring-[#022150]/20";

  return (
    <DialogShell
      title="Réinitialiser le mot de passe"
      subtitle={`${maker.company} — ${maker.email}`}
      icon={<KeyRound className="h-4 w-4" />}
      onClose={onClose}
    >
      {!result ? (
        <>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("auto")}
                className={cn(
                  "rounded-xl border-2 px-3 py-3 text-left transition-all",
                  mode === "auto"
                    ? "border-[#022150] bg-[#F0F4F9]"
                    : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]",
                )}
              >
                <span className="block text-[13px] font-bold text-[#111827]">
                  Générer automatiquement
                </span>
                <span className="block text-[11px] text-[#6B7280]">
                  Format lisible Verif-XXXX-XXXX
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={cn(
                  "rounded-xl border-2 px-3 py-3 text-left transition-all",
                  mode === "manual"
                    ? "border-[#022150] bg-[#F0F4F9]"
                    : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]",
                )}
              >
                <span className="block text-[13px] font-bold text-[#111827]">
                  Définir manuellement
                </span>
                <span className="block text-[11px] text-[#6B7280]">
                  8 caractères minimum
                </span>
              </button>
            </div>

            {mode === "manual" && (
              <>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="text"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
                    Confirmer
                  </label>
                  <input
                    type="text"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ressaisissez le mot de passe"
                    className={inputCls}
                  />
                  {confirmPassword.length > 0 && manualPassword !== confirmPassword && (
                    <p className="mt-1 text-[12px] font-medium text-[#DC2626]">
                      Les mots de passe ne correspondent pas.
                    </p>
                  )}
                </div>
              </>
            )}

            <p className="text-[12px] text-[#9CA3AF]">
              Le fabricant recevra le nouveau mot de passe par email (si le SMTP
              est configuré). L&apos;action est immédiate et journalisée.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
            <Button variant="outline" size="md" type="button" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button variant="gradient" size="md" type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Réinitialiser
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 px-6 py-5">
            {result.tempPassword ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#111827]">
                  Mot de passe temporaire généré :
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-dashed border-[#022150] bg-[#F0F4F9] px-4 py-3 text-center font-mono text-[18px] font-bold tracking-wider text-[#022150]">
                    {result.tempPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(result.tempPassword!)
                        .then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        })
                        .catch(() => {});
                    }}
                  >
                    {copied ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[#374151]">
                Le mot de passe que vous avez défini est actif.
              </p>
            )}
            <div
              className={cn(
                "rounded-lg p-3 text-[12px]",
                result.emailed
                  ? "border border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]"
                  : "border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
              )}
            >
              {result.emailed ? (
                "Un email avec le nouveau mot de passe a été envoyé au fabricant."
              ) : (
                <>
                  <strong>SMTP non configuré</strong> — aucun email envoyé.
                  Transmettez le mot de passe au fabricant par WhatsApp ou téléphone.
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
            <Button variant="gradient" size="md" type="button" onClick={onClose}>
              Terminé
            </Button>
          </div>
        </>
      )}
    </DialogShell>
  );
}

// ---------------------------------------------------------------------------
// HistoryDialog — timeline complète des audit logs du compte
// ---------------------------------------------------------------------------

export function HistoryDialog({
  maker,
  onClose,
}: {
  maker: Maker;
  onClose: () => void;
}) {
  const items = maker.history?.length ? maker.history : maker.activity;
  return (
    <DialogShell
      title="Historique du compte"
      subtitle={`${maker.company} — ${items.length} événement(s) récents`}
      icon={<Clock className="h-4 w-4" />}
      onClose={onClose}
      width="max-w-lg"
    >
      <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
        <ol className="flex flex-col">
          {items.map((a, i) => (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {i < items.length - 1 && (
                <span
                  className="absolute left-[5px] top-3 h-full w-px bg-[#E5E7EB]"
                  aria-hidden="true"
                />
              )}
              <span className="z-10 mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-white bg-[#022150] shadow" />
              <div className="min-w-0">
                <div className="text-[11px] text-[#6B7280]">{a.date}</div>
                <div className="text-[13px] font-medium text-[#111827]">{a.label}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-center justify-end border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
        <Button variant="outline" size="md" type="button" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </DialogShell>
  );
}
