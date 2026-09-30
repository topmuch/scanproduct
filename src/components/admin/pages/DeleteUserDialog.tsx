"use client";

import { useMemo, useState } from "react";
import { Trash2, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/admin/ui";
import type { Maker } from "@/lib/admin-server-data";

// ---------------------------------------------------------------------------
// DeleteUserDialog — shared confirmation modal for DEFINITIVELY deleting a
// fabricant (used by both the Fabricants tab and the Abonnements tab).
//
// The deletion is irreversible and cascades to every piece of data owned by
// the account (products, lots, QR codes, scans, reviews, certifications,
// marketplace inquiries, AI conversations, notifications, subscription…).
// To protect against misclicks the SuperAdmin must type the account email
// EXACTLY before the red button unlocks. The API enforces the same rule.
// ---------------------------------------------------------------------------

export function DeleteUserDialog({
  user,
  onClose,
  onDeleted,
}: {
  user: Maker;
  onClose: () => void;
  /** Called after the API confirmed the deletion (UI already patched). */
  onDeleted: (result: { email: string; companyName: string; products: number; lots: number }) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmation.trim() === user.email && !loading;

  const hasData = user.products > 0 || user.scans > 0;

  // Human-friendly summary of what will be destroyed with the account.
  const dataSummary = useMemo(() => {
    const parts: string[] = [];
    if (user.products > 0) parts.push(`${user.products} produit${user.products > 1 ? "s" : ""}`);
    if (user.scans > 0) parts.push(`${user.scans} scan${user.scans > 1 ? "s" : ""}`);
    return parts;
  }, [user.products, user.scans]);

  async function handleDelete() {
    if (confirmation.trim() !== user.email || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        deleted?: { email: string; companyName: string; products: number; lots: number };
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Échec de la suppression du compte.");
      }
      onDeleted(
        payload.deleted ?? {
          email: user.email,
          companyName: user.company,
          products: user.products,
          lots: 0,
        }
      );
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Supprimer le compte ${user.company}`}
        className="max-h-[92vh] w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#F3F4F6] px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-[18px] font-bold text-[#111827]">
              Supprimer définitivement
            </h2>
            <p className="text-[13px] text-[#6B7280]">Action irréversible — à confirmer</p>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          {/* Account summary */}
          <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
              style={{ backgroundColor: user.logoColor }}
            >
              {user.company.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-[#111827]">{user.company}</div>
              <div className="truncate text-[13px] text-[#6B7280]">
                {user.contactName} · {user.email}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" />
            <div className="space-y-1 text-[13px] leading-relaxed text-[#991B1B]">
              <p className="font-semibold">
                Toutes les données de ce compte seront supprimées pour toujours :
              </p>
              <p>
                produits, lots, QR codes, scans, avis clients, certifications, demandes
                marketplace, conversations IA, notifications et abonnement
                {dataSummary.length > 0 ? (
                  <>
                    {" "}
                    — soit <strong>{dataSummary.join(" et ")}</strong>
                  </>
                ) : null}
                .
              </p>
              <p className="text-[#B91C1C]">
                Cette action est <strong>immédiate et irréversible</strong>. Le compte ne
                pourra plus se connecter.
              </p>
            </div>
          </div>

          {/* Nominative confirmation */}
          <div>
            <label htmlFor="delete-user-confirmation" className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Tapez l&apos;email du compte{" "}
              <span className="font-semibold text-[#111827]">{user.email}</span> pour confirmer
            </label>
            <input
              id="delete-user-confirmation"
              type="email"
              autoFocus
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) handleDelete();
              }}
              placeholder={user.email}
              disabled={loading}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 disabled:opacity-60"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]">
              {error}
            </div>
          )}

          {hasData && (
            <p className="text-[12px] leading-relaxed text-[#6B7280]">
              Astuce : si vous souhaitez seulement bloquer l&apos;accès sans perdre les
              données, utilisez plutôt l&apos;action <strong>Suspendre</strong> du menu.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
          <Button variant="outline" size="md" type="button" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="danger"
            size="md"
            type="button"
            disabled={!canSubmit}
            onClick={handleDelete}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        </div>
      </div>
    </div>
  );
}
