"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Save, X } from "lucide-react";
import PhotoPicker from "@/components/product/artisan/PhotoPicker";

/**
 * /artisan/products/[productId]/edit — Modification EN MASSE d'un produit
 * par l'artisan connecté (portail artisan).
 *
 * « Quand l'artisan modifie un produit, TOUS les QR codes du même produit
 * sont mis à jour automatiquement » (spec) : le bandeau ambre affiche le
 * nombre d'étiquettes concernées (groupCount renvoyé par l'API).
 *
 * Formulaire identique à l'activation : photo principale + galerie atelier
 * (PhotoPicker), identité produit, dates, contact, réseaux sociaux, prix
 * affiché, histoire et conseils. Soumission : PUT /api/artisan/products/
 * <productId> avec le JWT artisan.
 */

const TOKEN_KEY = "verifscan_artisan_token";

type EditData = {
  groupCount: number;
  product: {
    id: string;
    qrCode: string;
    status: string;
    productName: string;
    contenance: string;
    ingredients: string;
    manufacturingDate: string;
    expirationDate: string;
    artisanName: string;
    contactPhone: string;
    photoUrl: string;
    artisanBio: string;
    usageTips: string;
  };
  pack: {
    id: string;
    masterQrCode: string;
    packNumber: number;
    quantity: number;
    contactEmail: string;
    instagramUrl: string;
    facebookUrl: string;
    tiktokUrl: string;
    productPrice: string;
    productDesignation: string;
    artisanPhotos: string[];
  };
};

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition-colors focus:border-amber-500";
const labelCls = "mb-2 block text-sm font-semibold text-gray-700";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const router = useRouter();
  const { productId } = use(params);

  const [data, setData] = useState<EditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardError, setGuardError] = useState("");

  // Formulaire (strings) — prérempli depuis l'API
  const [form, setForm] = useState({
    productName: "",
    productDesignation: "",
    contenance: "",
    ingredients: "",
    manufacturingDate: "",
    expirationDate: "",
    artisanName: "",
    contactPhone: "",
    contactEmail: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    productPrice: "",
    artisanBio: "",
    usageTips: "",
  });
  // Photos : existantes (URLs) + nouvelles (Files)
  const [existingPhoto, setExistingPhoto] = useState<string>("");
  const [newPhoto, setNewPhoto] = useState<File[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [newGallery, setNewGallery] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ updated: number } | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/artisan/login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/artisan/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/artisan/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setGuardError(json?.error || "Produit introuvable");
        return;
      }
      const d = json as EditData;
      setData(d);
      setForm({
        productName: d.product.productName,
        productDesignation: d.pack.productDesignation,
        contenance: d.product.contenance,
        ingredients: d.product.ingredients,
        manufacturingDate: d.product.manufacturingDate,
        expirationDate: d.product.expirationDate,
        artisanName: d.product.artisanName,
        contactPhone: d.product.contactPhone,
        contactEmail: d.pack.contactEmail,
        instagramUrl: d.pack.instagramUrl,
        facebookUrl: d.pack.facebookUrl,
        tiktokUrl: d.pack.tiktokUrl,
        productPrice: d.pack.productPrice,
        artisanBio: d.product.artisanBio,
        usageTips: d.product.usageTips,
      });
      setExistingPhoto(d.product.photoUrl);
      setExistingGallery(d.pack.artisanPhotos);
    } catch {
      setGuardError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    load();
  }, [load]);

  /** Upload d'un fichier via le mode ÉDITION (JWT + packId). */
  const uploadFile = async (file: File): Promise<string> => {
    const token = localStorage.getItem(TOKEN_KEY) ?? "";
    const body = new FormData();
    body.append("file", file);
    body.append("packId", data?.pack.id ?? "");
    const res = await fetch("/api/artisan/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Upload impossible");
    return json.url as string;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // Uploads d'abord (photo principale + nouvelles photos atelier)
      let photoUrl = existingPhoto;
      if (newPhoto.length > 0) {
        photoUrl = await uploadFile(newPhoto[0]);
      }
      const gallery = [
        ...existingGallery,
        ...(await Promise.all(newGallery.map(uploadFile))),
      ];

      const token = localStorage.getItem(TOKEN_KEY) ?? "";
      const res = await fetch(`/api/artisan/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          photoUrl,
          artisanPhotos: gallery,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Enregistrement impossible");
        return;
      }
      setSuccess({ updated: json.updated });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 text-gray-500">
        Chargement...
      </main>
    );
  }

  if (guardError || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <p className="text-lg font-bold text-gray-800">{guardError || "Produit introuvable"}</p>
        <a
          href="/artisan/dashboard"
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-bold text-white shadow-lg"
        >
          Retour au tableau de bord
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-16" data-testid="artisan-edit-page">
      <header className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-4 py-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <a
            href="/artisan/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-lg font-extrabold text-white drop-shadow-sm">
              Modifier le produit
            </h1>
            <p className="text-[13px] text-amber-100">{data.product.qrCode}</p>
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 px-4 pt-6 sm:px-6">
        {/* Bandeau : modification en masse */}
        <div
          className="rounded-2xl bg-amber-100 px-5 py-4 text-sm font-semibold text-amber-900 ring-1 ring-amber-200"
          data-testid="mass-update-banner"
        >
          ⚠️ Cette modification s&apos;appliquera à{" "}
          <strong>{data.groupCount} QR code{data.groupCount > 1 ? "s" : ""}</strong> du
          même produit.
        </div>

        {/* Écran succès */}
        {success && (
          <div
            className="rounded-2xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200"
            data-testid="edit-success"
          >
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-3 text-lg font-extrabold text-emerald-700">
              {success.updated} QR code{success.updated > 1 ? "s" : ""} mis à jour !
            </h2>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="rounded-xl border-2 border-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-600"
              >
                Continuer la modification
              </button>
              <a
                href={`/a/${data.product.qrCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white"
              >
                Voir la fiche publique
              </a>
              <a
                href="/artisan/dashboard"
                className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-600"
              >
                Tableau de bord
              </a>
            </div>
          </div>
        )}

        {/* ── Photos ──────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-extrabold text-gray-900">Photo du produit</h2>
          {existingPhoto && newPhoto.length === 0 && (
            <div className="relative mb-3 w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={existingPhoto} alt="Photo actuelle" className="h-28 w-28 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setExistingPhoto("")}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow"
                aria-label="Retirer la photo actuelle"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <PhotoPicker
            label="Nouvelle photo (optionnel)"
            helpText="Prendre une photo ou télécharger depuis l'appareil"
            maxCount={1}
            files={newPhoto}
            onChange={(files) => setNewPhoto(files)}
          />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-extrabold text-gray-900">L&apos;atelier en images</h2>
          {existingGallery.length > 0 && (
            <div className="mb-3 flex gap-2">
              {existingGallery.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Atelier" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setExistingGallery((g) => g.filter((u) => u !== url))}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
                    aria-label="Retirer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <PhotoPicker
            label="Ajouter des photos d'atelier"
            helpText="Maximum 3 photos au total"
            maxCount={3}
            multiple
            files={newGallery}
            onChange={(files) => setNewGallery(files.slice(0, 3 - existingGallery.length))}
          />
        </section>

        {/* ── Identité produit ────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold text-gray-900">Informations produit</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>🏷️ Nom du produit *</label>
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.productName}
                onChange={(e) => set("productName")(e.target.value)}
                className={inputCls}
                data-testid="edit-productName"
              />
            </div>
            <div>
              <label className={labelCls}>Désignation courte (affichée sous le nom)</label>
              <input
                maxLength={300}
                value={form.productDesignation}
                onChange={(e) => set("productDesignation")(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>⚖️ Contenance *</label>
                <input
                  required
                  maxLength={40}
                  value={form.contenance}
                  onChange={(e) => set("contenance")(e.target.value)}
                  className={inputCls}
                  data-testid="edit-contenance"
                />
              </div>
              <div>
                <label className={labelCls}>Prix affiché aux clients</label>
                <input
                  maxLength={40}
                  value={form.productPrice}
                  onChange={(e) => set("productPrice")(e.target.value)}
                  placeholder="Ex. 5 000 FCFA"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>🌿 Ingrédients *</label>
              <textarea
                required
                minLength={2}
                maxLength={2000}
                rows={3}
                value={form.ingredients}
                onChange={(e) => set("ingredients")(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>📅 Fabrication *</label>
                <input
                  required
                  type="date"
                  value={form.manufacturingDate}
                  onChange={(e) => set("manufacturingDate")(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>⏳ Péremption *</label>
                <input
                  required
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => set("expirationDate")(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Contact ─────────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold text-gray-900">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>👤 Votre nom / Marque *</label>
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.artisanName}
                onChange={(e) => set("artisanName")(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>📞 WhatsApp / Téléphone *</label>
              <input
                required
                minLength={7}
                maxLength={30}
                value={form.contactPhone}
                onChange={(e) => set("contactPhone")(e.target.value)}
                className={inputCls}
                data-testid="edit-contactPhone"
              />
            </div>
            <div>
              <label className={labelCls}>Email (optionnel)</label>
              <input
                type="email"
                maxLength={120}
                value={form.contactEmail}
                onChange={(e) => set("contactEmail")(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Instagram (optionnel)</label>
              <input
                maxLength={200}
                value={form.instagramUrl}
                onChange={(e) => set("instagramUrl")(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Facebook (optionnel)</label>
              <input
                maxLength={200}
                value={form.facebookUrl}
                onChange={(e) => set("facebookUrl")(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>TikTok (optionnel)</label>
              <input
                maxLength={200}
                value={form.tiktokUrl}
                onChange={(e) => set("tiktokUrl")(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* ── Histoire & conseils ─────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-extrabold text-gray-900">
            Histoire &amp; conseils (optionnels)
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>L&apos;histoire de l&apos;artisan</label>
              <textarea
                rows={3}
                maxLength={1200}
                value={form.artisanBio}
                onChange={(e) => set("artisanBio")(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Conseils d&apos;utilisation (un par ligne)</label>
              <textarea
                rows={3}
                maxLength={800}
                value={form.usageTips}
                onChange={(e) => set("usageTips")(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600" data-testid="edit-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          data-testid="edit-submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-base font-extrabold text-white shadow-lg shadow-amber-500/30 transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          <Save className="h-5 w-5" />
          {saving
            ? "Enregistrement..."
            : `Enregistrer (${data.groupCount} QR code${data.groupCount > 1 ? "s" : ""})`}
        </button>
      </form>
    </main>
  );
}
