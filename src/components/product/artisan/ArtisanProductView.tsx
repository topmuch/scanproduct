"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf, ShieldCheck, Sparkles, CalendarDays, Heart, ChevronDown, ChevronUp, Phone, Mail } from "lucide-react";

/**
 * ArtisanProductView — page produit artisanale ENGAGEANTE (scan client final).
 *
 * 11 sections (design 2026) :
 *   1.  Hero image pleine largeur + badge « Fait main » animé
 *   2.  Carte produit (nom, artisan, contenance, étoiles)
 *   3.  Pourquoi choisir ce produit ? (4 avantages)
 *   4.  Composition naturelle (+ encadré sans allergènes)
 *   5.  Fraîcheur (badge jours restants, dates, barre de progression)
 *   6.  Histoire de l'artisan (bio + avatar)
 *   7.  Conseils d'utilisation (numérotés)
 *   8.  Bouton WhatsApp géant (pulse) + téléphone
 *   9.  Avis clients (placeholder « soyez le premier »)
 *   10. Autres produits du même artisan (dynamiques, si disponibles)
 *   11. Footer vérification VerifScan
 *
 * Champs optionnels remplis par l'artisan à l'activation : artisanBio,
 * usageTips (un conseil par ligne) — le reste est généré automatiquement.
 */

type SimilarProduct = {
  qrCode: string;
  productName: string;
  photoUrl: string | null;
  contenance: string | null;
};

type Props = {
  lot: {
    qrCode: string;
    productName: string;
    contenance: string;
    ingredients: string;
    manufacturingDate: Date | null;
    expirationDate: Date | null;
    artisanName: string;
    contactPhone: string;
    contactEmail?: string | null;
    photoUrl?: string | null;
    artisanBio?: string | null;
    usageTips?: string | null;
  };
  similarProducts?: SimilarProduct[];
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Normalise un numéro sénégalais/local vers le format international wa.me. */
function toWhatsAppLink(phone: string, artisanName: string, productName: string): string {
  const digits = phone.replace(/\D/g, "");
  let international = digits;
  if (international.startsWith("00")) international = international.slice(2);
  else if (international.startsWith("221")) international = international;
  else if (international.startsWith("0")) international = `221${international.slice(1)}`;
  else if (international.length <= 9) international = `221${international}`;
  const message = `Bonjour ${artisanName}, je suis intéressé(e) par votre ${productName} vu sur VerifScan.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

const WHATSAPP_SVG_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

export function ArtisanProductView({ lot, similarProducts = [] }: Props) {
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [reviewThanks, setReviewThanks] = useState(false);

  const waLink = toWhatsAppLink(lot.contactPhone, lot.artisanName, lot.productName);

  // ── Fraîcheur : jours restants + progression réelle de la durée de vie ──
  const now = Date.now();
  const expTime = lot.expirationDate ? new Date(lot.expirationDate).getTime() : null;
  const mfgTime = lot.manufacturingDate ? new Date(lot.manufacturingDate).getTime() : null;
  const daysLeft =
    expTime !== null ? Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const shelfLifePct = (() => {
    if (expTime === null || mfgTime === null || expTime <= mfgTime) return 50;
    const pct = ((now - mfgTime) / (expTime - mfgTime)) * 100;
    return Math.min(100, Math.max(2, Math.round(pct)));
  })();

  // ── Avantages (section 3) ────────────────────────────────────────────────
  const benefits = [
    { icon: "🌱", text: "100% Naturel" },
    { icon: "✋", text: "Fait main" },
    { icon: "🚫", text: "Sans produits chimiques" },
    { icon: "🇸🇳", text: "Soutien local" },
  ];

  // ── Conseils (section 7) : remplis par l'artisan, sinon défauts ──────────
  const usageTips =
    (lot.usageTips ?? "")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean) || [];
  const tips = usageTips.length > 0 ? usageTips : [
    "Appliquer sur peau propre",
    "Masser délicatement en mouvements circulaires",
    "Utiliser matin et soir pour un résultat optimal",
    "Conserver à l'abri de la chaleur",
  ];

  // ── Composition : « voir plus » si longue liste ──────────────────────────
  const ingredients = lot.ingredients ?? "";
  const isLongIngredients = ingredients.length > 280;
  const displayedIngredients =
    isLongIngredients && !showAllIngredients ? `${ingredients.slice(0, 280)}…` : ingredients;

  const bio =
    lot.artisanBio?.trim() ||
    `${lot.artisanName} fabrique des produits naturels avec passion depuis plusieurs années. Chaque produit est fait main avec des ingrédients soigneusement sélectionnés pour vous offrir le meilleur de la nature sénégalaise.`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-white">
      {/* ── 1. HERO IMAGE ─────────────────────────────────────────────────── */}
      <div className="relative h-96 overflow-hidden bg-stone-200">
        {lot.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lot.photoUrl} alt={lot.productName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300">
            <Leaf className="h-28 w-28 text-white/90" strokeWidth={1.5} />
          </div>
        )}

        {/* Badge « Fait main » animé */}
        <div className="artisan-bounce-slow absolute right-5 top-5 rounded-full border-2 border-amber-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-md">
          <span className="flex items-center gap-2 text-sm font-bold text-amber-700">
            <span className="text-lg">🌿</span> Fait main
          </span>
        </div>

        {/* Badge « Produit Authentique » — sceau vert, preuve anti-contrefaçon */}
        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-emerald-300/60 bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-2 shadow-xl">
          <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
          <span className="text-sm font-bold tracking-wide text-white">Produit Authentique</span>
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto -mt-12 max-w-lg px-5 pb-4">
        {/* ── 2. CARTE PRODUIT PRINCIPALE ─────────────────────────────────── */}
        <div className="rounded-3xl border border-stone-100 bg-white p-7 shadow-xl transition-shadow duration-300 hover:shadow-2xl">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{lot.productName}</h1>
          <p className="mb-4 text-lg font-semibold text-amber-600">Par {lot.artisanName}</p>

          {/* Bandeau authenticité — vérification anti-contrefaçon */}
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-md">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-800">Produit Authentique</p>
              <p className="text-xs text-green-700">Vérifié par VerifScan à chaque scan</p>
            </div>
          </div>

          {lot.contenance && (
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-amber-200 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 font-medium text-amber-800 shadow-sm">
                ⚖️ {lot.contenance}
              </span>
            </div>
          )}

          {/* Note étoiles (placeholder — avis à venir) */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500">(Soyez le premier à donner votre avis)</span>
          </div>
        </div>

        {/* ── 3. POURQUOI CHOISIR CE PRODUIT ──────────────────────────────── */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
            <Sparkles className="h-5 w-5 text-amber-500" /> Pourquoi choisir ce produit ?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-3xl">{benefit.icon}</span>
                <span className="text-sm font-semibold text-gray-700">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. COMPOSITION NATURELLE ────────────────────────────────────── */}
        {ingredients && (
          <div className="mt-6 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Leaf className="h-5 w-5 text-green-600" /> Composition naturelle
            </h2>
            <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
              <p className="whitespace-pre-line leading-relaxed text-gray-700">
                {displayedIngredients}
              </p>
              {isLongIngredients && (
                <button
                  type="button"
                  onClick={() => setShowAllIngredients((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  {showAllIngredients ? (
                    <>
                      Voir moins <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Voir plus <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Encadré sans allergènes */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-blue-900">Sans allergènes de synthèse</p>
                <p className="text-xs text-blue-700">Formule naturelle, adaptée aux peaux sensibles</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. FRAÎCHEUR GARANTIE ───────────────────────────────────────── */}
        <div className="mt-6 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <CalendarDays className="h-5 w-5 text-amber-600" /> Fraîcheur garantie
          </h2>

          {isExpired ? (
            /* Produit périmé → badge rouge honnête */
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white shadow-lg">
              <div>
                <p className="text-sm opacity-90">Date de fraîcheur dépassée depuis</p>
                <p className="text-3xl font-bold">{daysLeft !== null ? Math.abs(daysLeft) : 0} jours</p>
              </div>
              <span className="text-5xl">⚠️</span>
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white shadow-lg">
              <div>
                <p className="text-sm opacity-90">Encore frais pendant</p>
                <p className="text-3xl font-bold">{daysLeft ?? 0} jours</p>
              </div>
              <span className="artisan-pulse-slow text-5xl">✨</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="mb-1 text-xs font-medium text-green-700">Fabriqué le</p>
              <p className="text-sm font-bold text-green-900">{formatDate(lot.manufacturingDate)}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="mb-1 text-xs font-medium text-amber-700">À utiliser avant</p>
              <p className="text-sm font-bold text-amber-900">{formatDate(lot.expirationDate)}</p>
            </div>
          </div>

          {/* Barre de progression : portion de durée de vie consommée */}
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs text-gray-600">
              <span>Fabrication</span>
              <span>Péremption</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isExpired
                    ? "bg-gradient-to-r from-red-400 to-rose-500"
                    : "bg-gradient-to-r from-green-400 to-emerald-500"
                }`}
                style={{ width: `${shelfLifePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 6. HISTOIRE DE L'ARTISAN ────────────────────────────────────── */}
        <div className="mt-6 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-100 to-orange-100 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="text-2xl">👤</span> L&rsquo;histoire de {lot.artisanName}
          </h2>

          <div className="rounded-2xl border border-amber-100 bg-white/80 p-5 backdrop-blur">
            <p className="italic leading-relaxed text-gray-700">« {bio} »</p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-bold text-white shadow-lg">
              {(lot.artisanName || "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{lot.artisanName}</p>
              <p className="flex items-center gap-1 text-sm text-gray-600">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Artisan certifié VerifScan
              </p>
            </div>
          </div>
        </div>

        {/* ── 7. CONSEILS D'UTILISATION ───────────────────────────────────── */}
        <div className="mt-6 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="text-2xl">💡</span> Conseils d&rsquo;utilisation
          </h2>
          <div className="space-y-3">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 8. CONTACT DE L'ARTISAN ───────────────────────────────────── */}
        {lot.contactPhone && (
          <div className="mb-6 mt-8">
            {/* CTA WhatsApp géant (conversion) */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex w-full transform items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 py-5 text-lg font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:from-green-600 hover:to-emerald-700 active:scale-95"
            >
              <div className="artisan-pulse-slow absolute inset-0 bg-white/20" />
              <svg className="relative z-10 h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d={WHATSAPP_SVG_PATH} />
              </svg>
              <span className="relative z-10">Contacter {lot.artisanName}</span>
            </a>

            {/* Carte infos de contact — chaque ligne est cliquable */}
            <div className="mt-4 rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <span className="text-xl">📇</span> Coordonnées de l&rsquo;artisan
              </h3>

              <div className="space-y-3">
                {/* Ligne Téléphone */}
                <a
                  href={`tel:${lot.contactPhone}`}
                  className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 transition-all hover:border-amber-300 hover:bg-amber-50"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Téléphone</p>
                    <p className="truncate text-base font-bold text-gray-900">{lot.contactPhone}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">Appeler</span>
                </a>

                {/* Ligne WhatsApp */}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 transition-all hover:border-green-400 hover:bg-green-100"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d={WHATSAPP_SVG_PATH} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">WhatsApp</p>
                    <p className="truncate text-base font-bold text-gray-900">Message direct</p>
                  </div>
                  <span className="text-sm font-semibold text-green-700">Discuter</span>
                </a>

                {/* Ligne Email (affichée seulement si l'artisan l'a renseignée) */}
                {lot.contactEmail && (
                  <a
                    href={`mailto:${lot.contactEmail}`}
                    className="flex items-center gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 transition-all hover:border-sky-400 hover:bg-sky-100"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 shadow-md">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</p>
                      <p className="truncate text-base font-bold text-gray-900">{lot.contactEmail}</p>
                    </div>
                    <span className="text-sm font-semibold text-sky-700">Écrire</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 9. TÉMOIGNAGES (placeholder) ────────────────────────────────── */}
        <div className="mt-6 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="text-2xl">💬</span> Avis des clients
          </h2>

          {reviewThanks ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
              <p className="text-4xl mb-2">🙏</p>
              <p className="font-semibold text-green-800">Merci !</p>
              <p className="text-sm text-green-700">
                Le système d&rsquo;avis arrive bientôt — votre intérêt compte beaucoup pour{" "}
                {lot.artisanName}.
              </p>
            </div>
          ) : (
            <div className="py-6 text-center">
              <div className="mb-3 text-6xl">💝</div>
              <p className="mb-4 text-gray-600">Soyez le premier à partager votre expérience !</p>
              <button
                type="button"
                onClick={() => setReviewThanks(true)}
                className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
              >
                Donner mon avis
              </button>
            </div>
          )}
        </div>

        {/* ── 10. AUTRES PRODUITS DU MÊME ARTISAN (dynamiques) ────────────── */}
        {similarProducts.length > 0 && (
          <div className="mb-8 mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
              <span className="text-2xl">🛍️</span> Autres produits de {lot.artisanName}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {similarProducts.map((p) => (
                <Link
                  key={p.qrCode}
                  href={`/a/${p.qrCode}`}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.productName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl">🧴</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-gray-900">{p.productName}</p>
                    {p.contenance && <p className="text-xs text-gray-600">{p.contenance}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── 11. FOOTER VÉRIFICATION ─────────────────────────────────────── */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center shadow-xl">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h3 className="mb-2 flex items-center justify-center gap-2 text-xl font-bold text-white">
            <Heart className="h-4 w-4 text-rose-400" /> Vérifié par VerifScan
          </h3>
          <p className="mb-4 text-sm text-slate-300">
            Ce produit est authentique et traçable — chaque scan soutient {lot.artisanName}.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
            <span className="text-xs font-medium">🔒 Historique sécurisé</span>
          </div>
        </div>
      </div>
    </main>
  );
}
