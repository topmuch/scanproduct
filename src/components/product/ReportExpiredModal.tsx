"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Store,
} from "lucide-react";
import { toast } from "sonner";

type ReportExpiredModalProps = {
  lotId: string;
  productName: string;
  fabricantId: string;
  lotReference?: string;
};

const REPORT_REASONS = [
  {
    value: "expired_on_shelf",
    label: "Produit périmé en rayon",
    description: "Le produit est en vente alors que la date de péremption est dépassée",
  },
  {
    value: "damaged_packaging",
    label: "Emballage endommagé",
    description: "L'emballage est abîmé, ouvert ou non conforme",
  },
  {
    value: "suspicious_counterfeit",
    label: "Suspicion de contrefaçon",
    description: "Le produit semble être une contrefaçon (QR code, étiquette...)",
  },
  {
    value: "quality_issue",
    label: "Problème de qualité",
    description: "Le produit ne correspond pas à ce qui est annoncé",
  },
  {
    value: "other",
    label: "Autre",
    description: "Autre type de signalement",
  },
];

/**
 * ReportExpiredModal — a modal dialog that lets a consumer report an issue
 * with a product they scanned (expired on shelf, damaged, counterfeit...).
 *
 * This is the "Signaler un produit périmé en rayon" feature requested by
 * the product team. It:
 *   - Opens via a prominent red CTA button (shown on every scan page)
 *   - Collects: reason (select), description (textarea), optional contact email
 *   - POSTs to /api/reports (public endpoint)
 *   - Creates a Ticket with category="Signalement" + a Notification to the
 *     fabricant so they can act on it
 *   - Shows a success confirmation with the ticket reference
 *
 * Design notes:
 *   - Uses Framer Motion for the modal entrance (scale + fade)
 *   - Red/danger color theme (this is a consumer-safety feature)
 *   - The CTA button is always visible (sticky-ish) — not hidden behind a
 *     menu — because reporting expired products should be frictionless
 */
export function ReportExpiredModal({
  lotId,
  productName,
  fabricantId,
  lotReference,
}: ReportExpiredModalProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      toast.error("Veuillez sélectionner un motif de signalement");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          productName,
          fabricantId,
          lotReference,
          reason,
          description: description.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Erreur lors de l'envoi du signalement");
      }
      const data = (await res.json()) as { reference?: string };
      setSubmittedRef(data.reference || null);
      toast.success("Signalement envoyé. Merci pour votre vigilance !");
      // Reset form (but keep the success state visible)
      setReason("");
      setDescription("");
      setContactEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    // If we just submitted, keep the success state for next open so the
    // reference isn't lost if they close+reopen. It'll reset on page reload.
    if (submittedRef) {
      setTimeout(() => setSubmittedRef(null), 500);
    }
  }

  return (
    <>
      {/* CTA button — always visible on the scan page */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-all hover:border-red-300 hover:bg-red-100 hover:shadow-md"
      >
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        Signaler un produit périmé en rayon
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2
                    id="report-modal-title"
                    className="text-base font-bold text-gray-900"
                  >
                    Signaler un problème
                  </h2>
                  <p className="text-xs text-gray-500">
                    Votre vigilance protège les consommateurs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            {submittedRef ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">
                  Signalement envoyé !
                </h3>
                <p className="mt-2 max-w-sm text-sm text-gray-600">
                  Merci pour votre vigilance. Le fabricant a été notifié et votre
                  signalement sera traité dans les plus brefs délais.
                </p>
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-2.5">
                  <p className="text-xs text-gray-500">Référence du signalement</p>
                  <p className="font-mono text-sm font-bold text-gray-900">
                    {submittedRef}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
                {/* Product context */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">
                      {productName}
                    </p>
                  </div>
                  {lotReference && (
                    <p className="mt-1 pl-6 text-xs text-gray-500">
                      Lot : {lotReference}
                    </p>
                  )}
                </div>

                {/* Reason select */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Motif du signalement <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                          reason === r.value
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={r.value}
                          checked={reason === r.value}
                          onChange={(e) => setReason(e.target.value)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-red-600"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {r.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Détails <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez ce que vous avez observé (lieu, date, état du produit...)"
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                {/* Contact email */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Email de contact{" "}
                    <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Pour vous informer du suivi"
                    maxLength={200}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                {/* Privacy note */}
                <p className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
                  🔒 Votre signalement sera transmis au fabricant et à l&apos;équipe
                  VerifScan. Vos données ne sont jamais partagées avec des tiers.
                </p>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !reason}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {submitting ? "Envoi..." : "Envoyer le signalement"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
