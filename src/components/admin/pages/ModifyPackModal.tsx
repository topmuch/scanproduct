"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui";

/**
 * ModifyPackModal — le SuperAdmin modifie les données produit attachées à
 * un pack de QR codes artisans (demande utilisateur : « le QR code créé
 * par l'artisan doit pouvoir être modifié par le superadmin »).
 *
 * - Pré-remplissage via GET /api/admin/packs/<packId>/product
 * - Sauvegarde via PATCH (met à jour TOUTES les étiquettes du pack +
 *   les champs pack : contact, réseaux sociaux, prix, désignation)
 * - Champs identiques au formulaire d'activation artisan, pour que la
 *   page publique /a/<code> reflète immédiatement les corrections.
 */

type ProductFormData = {
  productName: string;
  productDesignation: string;
  contenance: string;
  ingredients: string;
  manufacturingDate: string;
  expirationDate: string;
  artisanName: string;
  contactPhone: string;
  contactEmail: string;
  photoUrl: string;
  artisanBio: string;
  usageTips: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  productPrice: string;
};

const EMPTY_FORM: ProductFormData = {
  productName: "",
  productDesignation: "",
  contenance: "",
  ingredients: "",
  manufacturingDate: "",
  expirationDate: "",
  artisanName: "",
  contactPhone: "",
  contactEmail: "",
  photoUrl: "",
  artisanBio: "",
  usageTips: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  productPrice: "",
};

const inputCls =
  "w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#022150]";
const labelCls = "mb-1.5 block text-[13px] font-medium text-[#374151]";

type ModifyPackModalProps = {
  packId: string;
  masterQrCode: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ModifyPackModal({
  packId,
  masterQrCode,
  onClose,
  onSaved,
}: ModifyPackModalProps) {
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/packs/${packId}/product`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        if (!cancelled) {
          setForm({ ...EMPTY_FORM, ...data.productData });
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Chargement des données impossible",
        );
        if (!cancelled) onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  const set = (patch: Partial<ProductFormData>) =>
    setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/packs/${packId}/product`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productData: form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.details
            ? `${data.error || `HTTP ${res.status}`} — ${data.details}`
            : data?.error || `HTTP ${res.status}`,
        );
      }
      toast.success(
        `Pack mis à jour (${data.lotsUpdated ?? "?"} étiquettes corrigées)`,
        { duration: 6000 },
      );
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la modification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Modifier les informations produit du pack"
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-4">
          <div>
            <h2 className="font-display text-[16px] font-bold text-[#111827]">
              Modifier les informations produit
            </h2>
            <p className="mt-0.5 font-mono text-[12px] text-[#6B7280]">
              Pack {masterQrCode} — les corrections s'appliquent à toutes les
              étiquettes du pack.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des données…
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="mod-productName">
                  Nom du produit *
                </label>
                <input
                  id="mod-productName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.productName}
                  onChange={(e) => set({ productName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="mod-productDesignation">
                  Désignation du produit
                </label>
                <textarea
                  id="mod-productDesignation"
                  rows={2}
                  maxLength={300}
                  value={form.productDesignation}
                  onChange={(e) => set({ productDesignation: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-contenance">
                  Contenance *
                </label>
                <input
                  id="mod-contenance"
                  type="text"
                  required
                  maxLength={40}
                  value={form.contenance}
                  onChange={(e) => set({ contenance: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-productPrice">
                  Prix affiché aux clients
                </label>
                <input
                  id="mod-productPrice"
                  type="text"
                  maxLength={40}
                  placeholder="Ex : 5 000 FCFA"
                  value={form.productPrice}
                  onChange={(e) => set({ productPrice: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="mod-ingredients">
                  Ingrédients *
                </label>
                <textarea
                  id="mod-ingredients"
                  rows={2}
                  required
                  maxLength={2000}
                  value={form.ingredients}
                  onChange={(e) => set({ ingredients: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-manufacturingDate">
                  Fabrication *
                </label>
                <input
                  id="mod-manufacturingDate"
                  type="date"
                  required
                  value={form.manufacturingDate}
                  onChange={(e) => set({ manufacturingDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-expirationDate">
                  Péremption *
                </label>
                <input
                  id="mod-expirationDate"
                  type="date"
                  required
                  value={form.expirationDate}
                  onChange={(e) => set({ expirationDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-artisanName">
                  Artisan / Marque *
                </label>
                <input
                  id="mod-artisanName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.artisanName}
                  onChange={(e) => set({ artisanName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-contactPhone">
                  WhatsApp / Téléphone *
                </label>
                <input
                  id="mod-contactPhone"
                  type="tel"
                  required
                  minLength={7}
                  maxLength={30}
                  value={form.contactPhone}
                  onChange={(e) => set({ contactPhone: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-contactEmail">
                  Email
                </label>
                <input
                  id="mod-contactEmail"
                  type="email"
                  maxLength={120}
                  value={form.contactEmail}
                  onChange={(e) => set({ contactEmail: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-instagramUrl">
                  Instagram
                </label>
                <input
                  id="mod-instagramUrl"
                  type="url"
                  maxLength={200}
                  value={form.instagramUrl}
                  onChange={(e) => set({ instagramUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-facebookUrl">
                  Facebook
                </label>
                <input
                  id="mod-facebookUrl"
                  type="url"
                  maxLength={200}
                  value={form.facebookUrl}
                  onChange={(e) => set({ facebookUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mod-tiktokUrl">
                  TikTok
                </label>
                <input
                  id="mod-tiktokUrl"
                  type="url"
                  maxLength={200}
                  value={form.tiktokUrl}
                  onChange={(e) => set({ tiktokUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="mod-artisanBio">
                  Histoire de l'artisan
                </label>
                <textarea
                  id="mod-artisanBio"
                  rows={3}
                  maxLength={1200}
                  value={form.artisanBio}
                  onChange={(e) => set({ artisanBio: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="mod-usageTips">
                  Conseils d'utilisation (un par ligne)
                </label>
                <textarea
                  id="mod-usageTips"
                  rows={3}
                  maxLength={800}
                  value={form.usageTips}
                  onChange={(e) => set({ usageTips: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="mod-photoUrl">
                  URL de la photo du produit
                </label>
                <input
                  id="mod-photoUrl"
                  type="text"
                  maxLength={500}
                  placeholder="/api/uploads/artisan-….jpg"
                  value={form.photoUrl}
                  onChange={(e) => set({ photoUrl: e.target.value })}
                  className={inputCls}
                />
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Uploadée par l'artisan via la caméra/téléchargement — laisser
                  vide pour retirer la photo.
                </p>
              </div>
            </div>
          </form>
        )}

        {/* Pied : actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button size="sm" onClick={save} disabled={saving || loading}>
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}
