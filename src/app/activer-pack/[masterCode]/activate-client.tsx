"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Plus,
  Trash2,
  QrCode,
  Layers,
  Sparkles,
  ArrowLeft,
  Package,
} from "lucide-react";
import PhotoPicker from "@/components/product/artisan/PhotoPicker";

/**
 * Client d'activation — DEUX MODES coexistants (choix de l'artisan) :
 *
 * MODE 1 « simple »  : tout le pack (ou le restant) d'un coup — 1 formulaire,
 *                      produits identiques. Ultra simple.
 * MODE 2 « flexible »: répartition des QR codes par produit — un formulaire
 *                      par groupe (ex. 100 karité + 50 lavande + 50 miel).
 *
 * Les deux modes passent par POST /api/artisan/activate-groups (transaction,
 * répartition déterministe des étiquettes, statut partial/activated).
 */

export type PackInfo = {
  status: string;
  quantity: number;
  activatedCount: number;
  remaining: number;
  groups: Array<{ productName: string; count: number }>;
};

type Mode = "simple" | "flexible";

/** Champs produit d'un groupe (mode flexible). */
type GroupForm = {
  count: string;
  photo: File | null;
  productName: string;
  productDesignation: string;
  contenance: string;
  ingredients: string;
  manufacturingDate: string;
  expirationDate: string;
  productPrice: string;
  artisanBio: string;
  usageTips: string;
};

/** Identité + réseaux + galerie — communs à tous les produits du pack. */
type SharedForm = {
  artisanName: string;
  contactPhone: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  galleryPhotos: File[];
};

type SuccessState = {
  activated: number;
  activatedTotal: number;
  quantity: number;
  remaining: number;
  fullyActivated: boolean;
  firstCode: string;
};

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition-colors focus:border-amber-500";
const labelCls = "mb-2 block text-sm font-semibold text-gray-700";

const emptyGroup = (): GroupForm => ({
  count: "",
  photo: null,
  productName: "",
  productDesignation: "",
  contenance: "",
  ingredients: "",
  manufacturingDate: "",
  expirationDate: "",
  productPrice: "",
  artisanBio: "",
  usageTips: "",
});

async function uploadPhoto(file: File, masterCode: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("masterCode", masterCode);
  const res = await fetch("/api/artisan/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Échec de l'upload d'une photo");
  return data.url as string;
}

/** Groupe produit envoyé à l'API activate-groups. */
type ApiGroup = {
  count: number;
  productData: {
    productName: string;
    productDesignation: string;
    contenance: string;
    ingredients: string;
    manufacturingDate: string;
    expirationDate: string;
    photoUrl: string;
    productPrice: string;
    artisanBio: string;
    usageTips: string;
  };
};

export default function ActivatePackClient({
  masterCode,
  initialPackInfo,
  initialMode,
}: {
  masterCode: string;
  initialPackInfo: PackInfo;
  initialMode: Mode | null;
}) {
  const router = useRouter();
  const [packInfo, setPackInfo] = useState<PackInfo>(initialPackInfo);
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // ── MODE 1 : formulaire unique (toutes étiquettes encore inactives) ──
  const [simple, setSimple] = useState({
    photo: null as File | null,
    galleryPhotos: [] as File[],
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
  const setS = (patch: Partial<typeof simple>) => setSimple((f) => ({ ...f, ...patch }));

  // ── MODE 2 : groupes produits + infos communes ──
  const [groups, setGroups] = useState<GroupForm[]>([emptyGroup()]);
  const [shared, setShared] = useState<SharedForm>({
    artisanName: "",
    contactPhone: "",
    contactEmail: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    galleryPhotos: [],
  });
  const setG = (i: number, patch: Partial<GroupForm>) =>
    setGroups((gs) => gs.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const setSh = (patch: Partial<SharedForm>) => setShared((f) => ({ ...f, ...patch }));

  const allocated = groups.reduce((s, g) => s + (parseInt(g.count, 10) || 0), 0);
  const overflow = allocated > packInfo.remaining;

  const isPartial = packInfo.activatedCount > 0;
  const targetCount = packInfo.remaining; // Mode 1 : tout le restant d'un coup

  // ── Soumission (les 2 modes passent par activate-groups) ────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let payloadGroups: ApiGroup[] = [];

      if (mode === "simple") {
        // Photo produit + galerie atelier
        const photoUrl = simple.photo ? await uploadPhoto(simple.photo, masterCode) : "";
        const galleryUrls: string[] = [];
        for (const gp of simple.galleryPhotos.slice(0, 3)) {
          try {
            galleryUrls.push(await uploadPhoto(gp, masterCode));
          } catch {
            /* photo d'atelier ratée → non bloquant */
          }
        }
        payloadGroups = [
          {
            count: targetCount,
            productData: {
              productName: simple.productName,
              productDesignation: simple.productDesignation,
              contenance: simple.contenance,
              ingredients: simple.ingredients,
              manufacturingDate: simple.manufacturingDate,
              expirationDate: simple.expirationDate,
              photoUrl,
              productPrice: simple.productPrice,
              artisanBio: simple.artisanBio,
              usageTips: simple.usageTips,
            },
          },
        ];
        // Identité + réseaux + galerie communs (envoyés tels quels à l'API)
        const sharedPayload = {
          artisanName: simple.artisanName,
          contactPhone: simple.contactPhone,
          contactEmail: simple.contactEmail,
          instagramUrl: simple.instagramUrl,
          facebookUrl: simple.facebookUrl,
          tiktokUrl: simple.tiktokUrl,
          artisanPhotos: galleryUrls,
        };
        const res = await fetch("/api/artisan/activate-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masterCode, groups: payloadGroups, shared: sharedPayload }),
        });
        await handleResponse(res);
        return;
      }

      // MODE 2 — flexible : uploads photos par groupe + galerie commune
      const apiGroups: ApiGroup[] = [];
      for (const g of groups) {
        const count = parseInt(g.count, 10);
        if (!Number.isInteger(count) || count < 1) {
          throw new Error("Chaque produit doit avoir un nombre de QR codes (au moins 1).");
        }
        const photoUrl = g.photo ? await uploadPhoto(g.photo, masterCode) : "";
        apiGroups.push({
          count,
          productData: {
            productName: g.productName,
            productDesignation: g.productDesignation,
            contenance: g.contenance,
            ingredients: g.ingredients,
            manufacturingDate: g.manufacturingDate,
            expirationDate: g.expirationDate,
            photoUrl,
            productPrice: g.productPrice,
            artisanBio: g.artisanBio,
            usageTips: g.usageTips,
          },
        });
      }
      const galleryUrls: string[] = [];
      for (const gp of shared.galleryPhotos.slice(0, 3)) {
        try {
          galleryUrls.push(await uploadPhoto(gp, masterCode));
        } catch {
          /* non bloquant */
        }
      }
      const res = await fetch("/api/artisan/activate-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterCode,
          groups: apiGroups,
          shared: {
            artisanName: shared.artisanName,
            contactPhone: shared.contactPhone,
            contactEmail: shared.contactEmail,
            instagramUrl: shared.instagramUrl,
            facebookUrl: shared.facebookUrl,
            tiktokUrl: shared.tiktokUrl,
            artisanPhotos: galleryUrls,
          },
        }),
      });
      await handleResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur pendant l'activation");
    const s: SuccessState = {
      activated: data.activated ?? 0,
      activatedTotal: data.activatedTotal ?? 0,
      quantity: data.quantity ?? packInfo.quantity,
      remaining: data.remaining ?? 0,
      fullyActivated: Boolean(data.fullyActivated),
      firstCode: typeof data.firstCode === "string" ? data.firstCode : "",
    };
    // Met à jour la progression locale (barre + groupes affichés)
    const applied: Array<{ productName: string; count: number }> = Array.isArray(data.groups)
      ? data.groups
      : [];
    const map = new Map(packInfo.groups.map((g) => [g.productName, g.count]));
    for (const g of applied) map.set(g.productName, (map.get(g.productName) ?? 0) + g.count);
    setPackInfo((p) => ({
      ...p,
      activatedCount: s.activatedTotal,
      remaining: s.remaining,
      groups: [...map.entries()].map(([productName, count]) => ({ productName, count })),
    }));
    setSuccess(s);
  };

  const progressPct =
    packInfo.quantity > 0
      ? Math.min(Math.round((packInfo.activatedCount / packInfo.quantity) * 100), 100)
      : 0;

  // ── Écran de SUCCÈS ─────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {success.activated} QR codes activés !
          </h1>
          <p className="mb-6 text-gray-600">
            <strong>
              {success.activatedTotal}/{success.quantity}
            </strong>{" "}
            QR codes de votre pack sont maintenant visibles par vos clients.
          </p>

          {/* Progression du pack */}
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>
                {success.activatedTotal}/{success.quantity} activés
              </span>
              <span>
                {success.remaining} restant{success.remaining > 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                style={{
                  width: `${
                    success.quantity > 0
                      ? Math.min(Math.round((success.activatedTotal / success.quantity) * 100), 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            {!success.fullyActivated && (
              <p className="mt-3 text-xs text-emerald-700">
                Il vous reste {success.remaining} QR codes : rescannez votre QR
                Maître quand vous serez prêt pour activer la suite.
              </p>
            )}
          </div>

          {success.fullyActivated ? (
            <button
              onClick={() => router.push(success.firstCode ? `/a/${success.firstCode}` : "/")}
              className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
            >
              Voir le produit activé
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSuccess(null);
                  setMode(null);
                }}
                data-testid="continue-activation"
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                Activer la suite maintenant
              </button>
              <button
                onClick={() => router.push(success.firstCode ? `/a/${success.firstCode}` : "/")}
                className="w-full rounded-xl border-2 border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:border-gray-300"
              >
                Voir le produit activé
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Écran de CHOIX du mode (mode === null) ──────────────────────────────
  if (mode === null) {
    return (
      <div className="min-h-screen bg-amber-50 p-4">
        <div className="mx-auto max-w-md pt-8">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
              ACTIVATION DU PACK
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Comment voulez-vous activer votre pack ?
            </h1>
            {masterCode && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm">
                <QrCode className="h-4 w-4 text-amber-600" />
                <span className="font-mono text-xs font-bold text-gray-700">
                  {masterCode}
                </span>
              </div>
            )}
          </div>

          {/* Progression si pack déjà partiellement activé */}
          {isPartial && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-800">
                  {packInfo.activatedCount}/{packInfo.quantity} QR codes activés
                </span>
                <span className="text-emerald-600">
                  {packInfo.remaining} restant{packInfo.remaining > 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {packInfo.groups.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {packInfo.groups.map((g) => (
                    <span
                      key={g.productName}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-emerald-200"
                    >
                      <Package className="h-3 w-3 text-emerald-500" />
                      {g.productName} · {g.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OPTION 1 — tout d'un coup */}
          <button
            onClick={() => setMode("simple")}
            data-testid="choose-simple"
            className="mb-3 block w-full rounded-2xl border-2 border-emerald-200 bg-white p-5 text-left shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow">
                <Sparkles className="h-6 w-6 text-white" />
              </span>
              <div>
                <p className="text-base font-extrabold text-gray-900">
                  ✅ Tout le {isPartial ? "restant" : "pack"} d&apos;un coup
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Mêmes infos pour les {targetCount} produits — un seul
                  formulaire, ultra simple et rapide.
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  Idéal si votre pack contient un seul produit
                </p>
              </div>
            </div>
          </button>

          {/* OPTION 2 — par produits différents */}
          <button
            onClick={() => setMode("flexible")}
            data-testid="choose-flexible"
            className="block w-full rounded-2xl border-2 border-amber-200 bg-white p-5 text-left shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow">
                <Layers className="h-6 w-6 text-white" />
              </span>
              <div>
                <p className="text-base font-extrabold text-gray-900">
                  ✏️ Activer par produits différents
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Répartissez vos {packInfo.remaining} QR codes : ex. 100
                  karité + 50 lavande + 50 miel — un formulaire par produit.
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-600">
                  Idéal si votre pack contient plusieurs produits
                </p>
              </div>
            </div>
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            ⏱ 2 minutes · aucun compte nécessaire
          </p>
        </div>
      </div>
    );
  }

  // ── FORMULAIRES (mode simple / flexible) ────────────────────────────────
  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="mx-auto max-w-md pb-16 pt-4">
        <button
          onClick={() => setMode(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Changer de mode d&apos;activation
        </button>

        <div className="mb-6 pt-2 text-center">
          <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
            {mode === "simple" ? "ACTIVATION EN MASSE" : "ACTIVATION PAR PRODUITS"}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "simple"
              ? `Activez ${targetCount} produits d'un coup`
              : "Répartissez vos QR codes par produit"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {mode === "simple"
              ? "Remplissez ces infos une seule fois — elles s'appliquent à toutes les étiquettes restantes."
              : `Un formulaire par produit. Total à répartir : ${packInfo.remaining} QR codes.`}
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

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "simple" ? (
            /* ═══════════ MODE 1 — formulaire unique ═══════════ */
            <>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Ces informations s&apos;appliqueront aux{" "}
                <strong>{targetCount} QR codes</strong> encore inactifs de
                votre pack.
              </div>

              <div>
                <PhotoPicker
                  label="Photo du produit"
                  helpText="Prenez-la sur fond clair et bien nette, ou choisissez-la dans votre galerie."
                  maxCount={1}
                  files={simple.photo ? [simple.photo] : []}
                  onChange={(files) => setS({ photo: files[0] ?? null })}
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
                  value={simple.productName}
                  onChange={(e) => setS({ productName: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls} htmlFor="productDesignation">
                  Désignation du produit (optionnel)
                </label>
                <textarea
                  id="productDesignation"
                  rows={2}
                  maxLength={300}
                  placeholder="Ex : Beurre de karité brut 100 % naturel, préparé à la main"
                  value={simple.productDesignation}
                  onChange={(e) => setS({ productDesignation: e.target.value })}
                  className={`${inputCls} resize-none`}
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
                  value={simple.contenance}
                  onChange={(e) => setS({ contenance: e.target.value })}
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
                  value={simple.ingredients}
                  onChange={(e) => setS({ ingredients: e.target.value })}
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
                    value={simple.manufacturingDate}
                    onChange={(e) => setS({ manufacturingDate: e.target.value })}
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
                    value={simple.expirationDate}
                    onChange={(e) => setS({ expirationDate: e.target.value })}
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
                  value={simple.artisanName}
                  onChange={(e) => setS({ artisanName: e.target.value })}
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
                  value={simple.contactPhone}
                  onChange={(e) => setS({ contactPhone: e.target.value })}
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
                  value={simple.contactEmail}
                  onChange={(e) => setS({ contactEmail: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls} htmlFor="productPrice">
                  💰 Prix affiché aux clients (optionnel)
                </label>
                <input
                  id="productPrice"
                  type="text"
                  maxLength={40}
                  placeholder="Ex : 5 000 FCFA le pot"
                  value={simple.productPrice}
                  onChange={(e) => setS({ productPrice: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
                <p className="mb-3 text-sm font-bold text-pink-800">
                  📱 Vos réseaux sociaux (optionnel)
                </p>
                <div className="space-y-3">
                  <input
                    id="instagramUrl"
                    type="url"
                    maxLength={200}
                    placeholder="Instagram : https://instagram.com/…"
                    value={simple.instagramUrl}
                    onChange={(e) => setS({ instagramUrl: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    id="facebookUrl"
                    type="url"
                    maxLength={200}
                    placeholder="Facebook : https://facebook.com/…"
                    value={simple.facebookUrl}
                    onChange={(e) => setS({ facebookUrl: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    id="tiktokUrl"
                    type="url"
                    maxLength={200}
                    placeholder="TikTok : https://tiktok.com/@…"
                    value={simple.tiktokUrl}
                    onChange={(e) => setS({ tiktokUrl: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-3 text-sm font-bold text-amber-800">
                  ✨ Pour mieux vendre (optionnel)
                </p>
                <div className="space-y-3">
                  <textarea
                    id="artisanBio"
                    rows={3}
                    maxLength={1200}
                    placeholder="Votre histoire…"
                    value={simple.artisanBio}
                    onChange={(e) => setS({ artisanBio: e.target.value })}
                    className={`${inputCls} resize-none`}
                  />
                  <textarea
                    id="usageTips"
                    rows={3}
                    maxLength={800}
                    placeholder={"Conseils d'utilisation (un par ligne)"}
                    value={simple.usageTips}
                    onChange={(e) => setS({ usageTips: e.target.value })}
                    className={`${inputCls} resize-none`}
                  />
                  <PhotoPicker
                    label="Photos de votre atelier (jusqu'à 3)"
                    helpText="Montrez votre savoir-faire : fabrication, matière première, finition."
                    maxCount={3}
                    multiple
                    files={simple.galleryPhotos}
                    onChange={(files) => setS({ galleryPhotos: files })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="activation-submit"
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
              >
                {loading
                  ? "Activation en cours…"
                  : `Activer mes ${targetCount} produits`}
              </button>
            </>
          ) : (
            /* ═══════════ MODE 2 — groupes produits ═══════════ */
            <>
              {/* Récapitulatif de répartition */}
              <div
                className={`sticky top-2 z-10 rounded-xl border p-3 text-sm shadow-sm ${
                  overflow
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
                data-testid="flex-summary"
              >
                <div className="flex items-center justify-between font-bold">
                  <span>
                    Réparti : {allocated}/{packInfo.remaining} QR codes
                  </span>
                  <span>
                    {overflow
                      ? `${allocated - packInfo.remaining} de trop !`
                      : `Restant après activation : ${packInfo.remaining - allocated}`}
                  </span>
                </div>
                {overflow && (
                  <p className="mt-1 text-xs">
                    La somme dépasse les QR codes restants — réduisez les
                    quantités.
                  </p>
                )}
              </div>

              {/* Infos communes (identité + réseaux + galerie) */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="mb-1 text-sm font-extrabold text-gray-900">
                  🧑‍🌾 Vos infos d&apos;artisan
                </p>
                <p className="mb-3 text-xs text-gray-500">
                  Communes à tous vos produits (identité, contact, réseaux,
                  atelier).
                </p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls} htmlFor="sharedName">
                      Votre nom / Marque *
                    </label>
                    <input
                      id="sharedName"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Ex : Aïssata Cosmétiques"
                      value={shared.artisanName}
                      onChange={(e) => setSh({ artisanName: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="sharedPhone">
                      WhatsApp / Téléphone *
                    </label>
                    <input
                      id="sharedPhone"
                      type="tel"
                      required
                      minLength={7}
                      maxLength={30}
                      placeholder="Ex : 77 123 45 67"
                      value={shared.contactPhone}
                      onChange={(e) => setSh({ contactPhone: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="sharedEmail">
                      Email (optionnel)
                    </label>
                    <input
                      id="sharedEmail"
                      type="email"
                      maxLength={120}
                      value={shared.contactEmail}
                      onChange={(e) => setSh({ contactEmail: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <input
                    type="url"
                    maxLength={200}
                    placeholder="Instagram (optionnel) : https://instagram.com/…"
                    value={shared.instagramUrl}
                    onChange={(e) => setSh({ instagramUrl: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="url"
                    maxLength={200}
                    placeholder="Facebook (optionnel) : https://facebook.com/…"
                    value={shared.facebookUrl}
                    onChange={(e) => setSh({ facebookUrl: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    type="url"
                    maxLength={200}
                    placeholder="TikTok (optionnel) : https://tiktok.com/@…"
                    value={shared.tiktokUrl}
                    onChange={(e) => setSh({ tiktokUrl: e.target.value })}
                    className={inputCls}
                  />
                  <PhotoPicker
                    label="Photos de votre atelier (jusqu'à 3)"
                    helpText="Communes à toutes vos pages produits."
                    maxCount={3}
                    multiple
                    files={shared.galleryPhotos}
                    onChange={(files) => setSh({ galleryPhotos: files })}
                  />
                </div>
              </div>

              {/* Groupes produits */}
              {groups.map((g, i) => (
                <div
                  key={i}
                  data-testid={`flexible-group-${i}`}
                  className="rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      Produit {i + 1}
                    </p>
                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setGroups((gs) => gs.filter((_, idx) => idx !== i))
                        }
                        aria-label={`Retirer le produit ${i + 1}`}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mb-4 rounded-xl bg-amber-50 p-3">
                    <label
                      className={labelCls}
                      htmlFor={`g${i}-count`}
                    >
                      Nombre de QR codes pour ce produit *
                    </label>
                    <input
                      id={`g${i}-count`}
                      data-testid={`group-count-${i}`}
                      type="number"
                      required
                      min={1}
                      max={packInfo.remaining}
                      placeholder={`Ex : ${Math.max(packInfo.remaining - (allocated - (parseInt(g.count, 10) || 0)), 1)}`}
                      value={g.count}
                      onChange={(e) => setG(i, { count: e.target.value })}
                      className={`${inputCls} font-bold`}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className={labelCls} htmlFor={`g${i}-name`}>
                        Nom du produit *
                      </label>
                      <input
                        id={`g${i}-name`}
                        data-testid={`group-name-${i}`}
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder={i === 0 ? "Ex : Savon au karité pur" : "Ex : Savon à la lavande"}
                        value={g.productName}
                        onChange={(e) => setG(i, { productName: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`g${i}-designation`}>
                        Désignation (optionnel)
                      </label>
                      <input
                        id={`g${i}-designation`}
                        type="text"
                        maxLength={300}
                        placeholder="Description courte affichée sous le nom"
                        value={g.productDesignation}
                        onChange={(e) => setG(i, { productDesignation: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls} htmlFor={`g${i}-contenance`}>
                          Contenance *
                        </label>
                        <input
                          id={`g${i}-contenance`}
                          data-testid={`group-contenance-${i}`}
                          type="text"
                          required
                          maxLength={40}
                          placeholder="Ex : 250g"
                          value={g.contenance}
                          onChange={(e) => setG(i, { contenance: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor={`g${i}-price`}>
                          Prix (optionnel)
                        </label>
                        <input
                          id={`g${i}-price`}
                          data-testid={`group-price-${i}`}
                          type="text"
                          maxLength={40}
                          placeholder="Ex : 5 000 FCFA"
                          value={g.productPrice}
                          onChange={(e) => setG(i, { productPrice: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`g${i}-ingredients`}>
                        Ingrédients *
                      </label>
                      <textarea
                        id={`g${i}-ingredients`}
                        data-testid={`group-ingredients-${i}`}
                        required
                        rows={2}
                        maxLength={2000}
                        placeholder="Ex : Beurre de karité, huile de coco…"
                        value={g.ingredients}
                        onChange={(e) => setG(i, { ingredients: e.target.value })}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls} htmlFor={`g${i}-mfg`}>
                          Fabrication *
                        </label>
                        <input
                          id={`g${i}-mfg`}
                          data-testid={`group-mfg-${i}`}
                          type="date"
                          required
                          value={g.manufacturingDate}
                          onChange={(e) => setG(i, { manufacturingDate: e.target.value })}
                          className={`${inputCls} px-3`}
                        />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor={`g${i}-exp`}>
                          Péremption *
                        </label>
                        <input
                          id={`g${i}-exp`}
                          data-testid={`group-exp-${i}`}
                          type="date"
                          required
                          value={g.expirationDate}
                          onChange={(e) => setG(i, { expirationDate: e.target.value })}
                          className={`${inputCls} px-3`}
                        />
                      </div>
                    </div>
                    <div>
                      <PhotoPicker
                        label="Photo du produit"
                        helpText="Caméra ou galerie — propre à ce produit."
                        maxCount={1}
                        files={g.photo ? [g.photo] : []}
                        onChange={(files) => setG(i, { photo: files[0] ?? null })}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`g${i}-bio`}>
                        Histoire de ce produit (optionnel)
                      </label>
                      <textarea
                        id={`g${i}-bio`}
                        rows={2}
                        maxLength={1200}
                        value={g.artisanBio}
                        onChange={(e) => setG(i, { artisanBio: e.target.value })}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`g${i}-tips`}>
                        Conseils d&apos;utilisation (optionnel, un par ligne)
                      </label>
                      <textarea
                        id={`g${i}-tips`}
                        rows={2}
                        maxLength={800}
                        value={g.usageTips}
                        onChange={(e) => setG(i, { usageTips: e.target.value })}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Ajouter un produit */}
              {groups.length < 10 && (
                <button
                  type="button"
                  onClick={() => {
                    const left = packInfo.remaining - allocated;
                    setGroups((gs) => [...gs, { ...emptyGroup(), count: left > 0 ? String(left) : "" }]);
                  }}
                  data-testid="add-group"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 py-3.5 text-sm font-bold text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-50"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un autre produit
                </button>
              )}

              <button
                type="submit"
                disabled={loading || allocated < 1 || overflow}
                data-testid="flexible-submit"
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
              >
                {loading
                  ? "Activation en cours…"
                  : `Activer mes ${allocated} QR codes`}
              </button>
              <p className="text-center text-xs text-gray-500">
                Les {packInfo.remaining - allocated} QR codes non répartis
                resteront activables plus tard (re-scannez le QR Maître).
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
