"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, CheckCircle2 } from "lucide-react";

/**
 * /activer-pack/[masterCode] — formulaire d'activation EN MASSE du pack
 * artisanal. L'artisan (sans compte) remplit les infos produit UNE fois :
 * toutes les étiquettes du pack reçoivent ces données et passent `active`.
 */

type FormState = {
  photo: File | null;
  galleryPhotos: File[];
  productName: string;
  contenance: string;
  ingredients: string;
  manufacturingDate: string;
  expirationDate: string;
  artisanName: string;
  contactPhone: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  productPrice: string;
  artisanBio: string;
  usageTips: string;
};

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition-colors focus:border-amber-500";
const labelCls = "mb-2 block text-sm font-semibold text-gray-700";

export default function ActivatePackPage({
  params,
}: {
  params: Promise<{ masterCode: string }>;
}) {
  const router = useRouter();
  const { masterCode } = use(params);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [totalActivated, setTotalActivated] = useState(0);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<FormState>({
    photo: null,
    galleryPhotos: [],
    productName: "",
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

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Upload photo principale si présente (route dédiée artisan)
      let photoUrl = "";
      if (form.photo) {
        const fd = new FormData();
        fd.append("file", form.photo);
        fd.append("masterCode", masterCode);
        const uploadRes = await fetch("/api/artisan/upload", {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Échec de l'upload de la photo");
        }
        photoUrl = uploadData.url;
      }

      // 1b. Upload galerie « atelier » (max 3 photos, échec non bloquant)
      const galleryUrls: string[] = [];
      for (const gp of form.galleryPhotos.slice(0, 3)) {
        try {
          const fd = new FormData();
          fd.append("file", gp);
          fd.append("masterCode", masterCode);
          const upRes = await fetch("/api/artisan/upload", { method: "POST", body: fd });
          const upData = await upRes.json().catch(() => ({}));
          if (upRes.ok && upData.url) galleryUrls.push(upData.url);
        } catch {
          // une photo d'atelier ratée ne bloque pas l'activation
        }
      }

      // 2. Activation en masse
      const response = await fetch("/api/artisan/activate-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterCode,
          productData: {
            productName: form.productName,
            contenance: form.contenance,
            ingredients: form.ingredients,
            manufacturingDate: form.manufacturingDate,
            expirationDate: form.expirationDate,
            artisanName: form.artisanName,
            contactPhone: form.contactPhone,
            contactEmail: form.contactEmail,
            photoUrl,
            instagramUrl: form.instagramUrl,
            facebookUrl: form.facebookUrl,
            tiktokUrl: form.tiktokUrl,
            productPrice: form.productPrice,
            artisanPhotos: galleryUrls,
            artisanBio: form.artisanBio,
            usageTips: form.usageTips,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Erreur pendant l'activation");
      }
      setTotalActivated(data.activated ?? 0);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // ── Écran de succès ────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Pack activé avec succès !
          </h1>
          <p className="mb-6 text-gray-600">
            <strong>{totalActivated} produits</strong> sont maintenant visibles
            par vos clients.
          </p>
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Vos clients peuvent maintenant scanner les QR codes sur vos
              produits : photo, ingrédients, fraîcheur et contact WhatsApp
              direct.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ── Formulaire ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-6 pt-4 text-center">
          <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
            ACTIVATION EN MASSE
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Activez tout votre pack
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Remplissez ces infos <strong>une seule fois</strong> pour tous vos
            produits.
          </p>
          {masterCode && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <QrCode className="h-4 w-4 text-amber-600" />
              <span className="font-mono text-xs font-bold text-gray-700">
                {masterCode}
              </span>
            </div>
          )}
        </div>

        <form
          onSubmit={handleActivate}
          className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm"
        >
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Ces informations s'appliqueront à <strong>tous les QR codes</strong>{" "}
            de votre pack.
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="photo">
              Photo du produit
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => set({ photo: e.target.files?.[0] || null })}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-amber-100 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-200"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="productName">
              Nom du produit *
            </label>
            <input
              id="productName"
              type="text"
              required
              minLength={2}
              maxLength={120}
              placeholder="Ex : Savon au karité pur"
              value={form.productName}
              onChange={(e) => set({ productName: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="contenance">
              Contenance *
            </label>
            <input
              id="contenance"
              type="text"
              required
              maxLength={40}
              placeholder="Ex : 250g, 100ml"
              value={form.contenance}
              onChange={(e) => set({ contenance: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="ingredients">
              Ingrédients *
            </label>
            <textarea
              id="ingredients"
              required
              rows={3}
              maxLength={2000}
              placeholder="Ex : Beurre de karité, huile de coco, soude…"
              value={form.ingredients}
              onChange={(e) => set({ ingredients: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="manufacturingDate">
                Fabrication *
              </label>
              <input
                id="manufacturingDate"
                type="date"
                required
                value={form.manufacturingDate}
                onChange={(e) => set({ manufacturingDate: e.target.value })}
                className={`${inputCls} px-3`}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="expirationDate">
                Péremption *
              </label>
              <input
                id="expirationDate"
                type="date"
                required
                value={form.expirationDate}
                onChange={(e) => set({ expirationDate: e.target.value })}
                className={`${inputCls} px-3`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="artisanName">
              Votre nom / Marque *
            </label>
            <input
              id="artisanName"
              type="text"
              required
              minLength={2}
              maxLength={120}
              placeholder="Ex : Aïssata Cosmétiques"
              value={form.artisanName}
              onChange={(e) => set({ artisanName: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="contactPhone">
              WhatsApp / Téléphone *
            </label>
            <input
              id="contactPhone"
              type="tel"
              required
              minLength={7}
              maxLength={30}
              placeholder="Ex : 77 123 45 67"
              value={form.contactPhone}
              onChange={(e) => set({ contactPhone: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="contactEmail">
              Email (optionnel)
            </label>
            <input
              id="contactEmail"
              type="email"
              maxLength={120}
              placeholder="Ex : aissata@gmail.com"
              value={form.contactEmail}
              onChange={(e) => set({ contactEmail: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* ── Prix affiché aux clients (optionnel) ── */}
          <div>
            <label className={labelCls} htmlFor="productPrice">
              💰 Prix affiché aux clients (optionnel)
            </label>
            <input
              id="productPrice"
              type="text"
              maxLength={40}
              placeholder="Ex : 5 000 FCFA le pot"
              value={form.productPrice}
              onChange={(e) => set({ productPrice: e.target.value })}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              Texte libre : il s&rsquo;affiche sur votre page produit à côté de la contenance.
            </p>
          </div>

          {/* ── Réseaux sociaux (optionnels) : visibilité sur la page produit ── */}
          <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
            <p className="mb-1 text-sm font-bold text-pink-800">
              📱 Vos réseaux sociaux (optionnel)
            </p>
            <p className="mb-3 text-xs text-pink-700">
              Ils apparaissent sur votre page produit — vos clients vous suivent partout.
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls} htmlFor="instagramUrl">
                  Instagram
                </label>
                <input
                  id="instagramUrl"
                  type="url"
                  maxLength={200}
                  placeholder="Ex : https://instagram.com/aissata.cosmetics"
                  value={form.instagramUrl}
                  onChange={(e) => set({ instagramUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="facebookUrl">
                  Facebook
                </label>
                <input
                  id="facebookUrl"
                  type="url"
                  maxLength={200}
                  placeholder="Ex : https://facebook.com/aissata.cosmetics"
                  value={form.facebookUrl}
                  onChange={(e) => set({ facebookUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="tiktokUrl">
                  TikTok
                </label>
                <input
                  id="tiktokUrl"
                  type="url"
                  maxLength={200}
                  placeholder="Ex : https://tiktok.com/@aissata"
                  value={form.tiktokUrl}
                  onChange={(e) => set({ tiktokUrl: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── Optionnels : page produit plus engageante ── */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-1 text-sm font-bold text-amber-800">
              ✨ Pour mieux vendre (optionnel)
            </p>
            <p className="mb-3 text-xs text-amber-700">
              Ces textes enrichissent votre page produit : histoire, conseils,
              confiance. Vous pouvez les laisser vides.
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls} htmlFor="artisanBio">
                  Votre histoire
                </label>
                <textarea
                  id="artisanBio"
                  rows={3}
                  maxLength={1200}
                  placeholder="Ex : Je fabrique des savons au karité depuis 2020 à Dakar, avec des ingrédients locaux…"
                  value={form.artisanBio}
                  onChange={(e) => set({ artisanBio: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="usageTips">
                  Conseils d&rsquo;utilisation (un par ligne)
                </label>
                <textarea
                  id="usageTips"
                  rows={3}
                  maxLength={800}
                  placeholder={"Ex :\nAppliquer matin et soir\nConserver au frais"}
                  value={form.usageTips}
                  onChange={(e) => set({ usageTips: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="galleryPhotos">
                  Photos de votre atelier (jusqu&rsquo;à 3)
                </label>
                <input
                  id="galleryPhotos"
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 3);
                    set({ galleryPhotos: files });
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-amber-100 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-200"
                />
                {form.galleryPhotos.length > 0 && (
                  <p className="mt-2 text-xs text-green-700">
                    {form.galleryPhotos.length} photo(s) sélectionnée(s)
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
          >
            {loading ? "Activation en cours…" : "Activer tous mes produits"}
          </button>
        </form>
      </div>
    </div>
  );
}
