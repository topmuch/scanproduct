"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Facebook,
  FlaskConical,
  Hand,
  Heart,
  Instagram,
  Leaf,
  Mail,
  Phone,
  Quote,
  Refrigerator,
  Scale,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { ScanTracker } from "./ScanTracker";
import { Logo } from "@/components/landing/Logo";
import { Reveal } from "./Reveal";

/**
 * ArtisanProductView — page produit artisanale PREMIUM « effet waouh » (v4).
 *
 * Architecture visuelle (spec redesign WOW) :
 *   1.  HERO IMMERSIF plein écran — photo Ken Burns (ou placeholder stylisé
 *       si pas encore uploadée), overlay gradient animé, badges flottants,
 *       titre révélé, bouton « Découvrir » (scroll smooth)
 *   2.  CARTE PRODUIT FLOTTANTE en glassmorphism (overlap hero) — nom +
 *       marque + étoiles, badges dynamiques, PRIX mis en valeur
 *   3.  BARRE DE FRAÎCHEUR ANIMÉE — compte à rebours, progression shimmer,
 *       badge « Très frais » pulsant (dates de péremption en vedette)
 *   4.  POURQUOI CHOISIR — 4 cards animées, apparition staggered au scroll
 *   5.  COMPOSITION NATURELLE — liste d'ingrédients avec icônes + badge
 *       « sans allergènes » à coche dessinée
 *   6.  PRÉCAUTIONS — cards numérotées rouge/orange
 *   7.  CONSERVATION — icône frigo flottante + conseils
 *   8.  HISTOIRE ARTISAN — storytelling, citation, badge « Artisan certifié »
 *   9.  CONSEILS D'UTILISATION — timeline numérotée connectée
 *   10. CTA WHATSAPP GÉANT — anneaux pulsants, icône animée
 *   11. COORDONNÉES — tuiles compactes cliquables
 *   12. AVIS CLIENTS — étoiles interactives + formulaire
 *   13. FOOTER VÉRIFICATION — dark mode, mention blockchain
 *
 * Les apparitions au scroll sont pilotées par <Reveal> (IntersectionObserver)
 * et les classes CSS `.art-*` de globals.css (transform/opacity uniquement).
 */

type SimilarProduct = {
  qrCode: string;
  productName: string;
  photoUrl: string | null;
  contenance: string | null;
};

/** Alerte contrefaçon (JSON stocké sur PreActivatedLot.counterfeitAlert). */
export type CounterfeitAlertInfo = {
  detectedAt: string;
  regionA: string;
  tzA: string;
  regionB: string;
  tzB: string;
};

type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
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
    productPrice?: string | null;
    /** Désignation du produit : description courte sous le nom (champ artisan). */
    productDesignation?: string | null;
    photoUrl?: string | null;
    artisanBio?: string | null;
    usageTips?: string | null;
    // Auto-complétion intelligente — précautions (JSON array encodé) +
    // conservation (texte libre), remplis via l'assistant à l'activation.
    precautions?: string | null;
    storageConditions?: string | null;
  };
  /** Preuve sociale : nombre de scans enregistrés pour ce produit. */
  scanCount?: number;
  /** Alerte anti-contrefaçon (scans multi-régions en < 48 h). */
  counterfeitAlert?: CounterfeitAlertInfo | null;
  /** Réseaux sociaux de l'artisan (remplis à l'activation). */
  socials?: {
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    tiktokUrl?: string | null;
  };
  /** Logo de la marque (uploadé à l'activation) — avatar de la carte artisan
   *  + section histoire. Fallback : initiale de l'artisan. */
  logoUrl?: string | null;
  /** Galerie « L'atelier en images » (max 3 photos). */
  artisanPhotos?: string[];
  /** Avis clients réels chargés côté serveur. */
  initialReviews?: ReviewItem[];
  similarProducts?: SimilarProduct[];
};

const REGION_LABELS: Record<string, string> = {
  africa: "Afrique",
  europe: "Europe",
  america: "Amérique",
  asia: "Asie",
  australia: "Océanie",
  pacific: "Pacifique",
  utc: "UTC",
  etc: "UTC",
};

function regionLabel(region: string): string {
  return REGION_LABELS[region.toLowerCase()] ?? region;
}

const TIKTOK_SVG_PATH =
  "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

const WHATSAPP_SVG_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

/** Sur-titre éditorial : petites capitales espacées ambre. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
      {children}
    </p>
  );
}

/** Rangée d'étoiles (remplies jusqu'à `value`, jaunes ; vides personnalisables). */
function Stars({
  value,
  className = "h-4 w-4",
  emptyClassName = "text-gray-200",
}: {
  value: number;
  className?: string;
  emptyClassName?: string;
}) {
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`${className} ${i < value ? "text-amber-400" : emptyClassName}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Image avec filet de sécurité : si le fichier est ABSENT ou CASSÉ (404,
 * upload perdu, lien mort), affiche un placeholder dégradé au lieu du
 * texte alt brut — la page reste propre et professionnelle.
 */
function SafeImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  emoji = "🧴",
  icon,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  emoji?: string;
  icon?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  // ⚠️ Course d'hydratation : une image peut renvoyer 404 AVANT que le JS
  // n'ait hydraté la page. L'événement `error` est alors émis sans listener
  // React → perdu. Au montage, on interroge l'état RÉEL de l'élément.
  const imgRef = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  };

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 ${className} ${fallbackClassName}`}
      >
        {icon ?? <span className="text-6xl">{emoji}</span>}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/** Normalise un numéro sénégalais/local vers le format international wa.me. */
function toWhatsAppLink(
  phone: string,
  artisanName: string,
  productName: string,
  customMessage?: string
): string {
  const digits = phone.replace(/\D/g, "");
  let international = digits;
  if (international.startsWith("00")) international = international.slice(2);
  else if (international.startsWith("221")) international = international;
  else if (international.startsWith("0")) international = `221${international.slice(1)}`;
  else if (international.length <= 9) international = `221${international}`;
  const message =
    customMessage ??
    `Bonjour ${artisanName}, je suis intéressé(e) par votre ${productName} vu sur VerifScan.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

/**
 * Découpe la liste d'ingrédients en items affichables : l'artisan peut
 * saisir une ligne par ingrédient OU une liste séparée par virgules /
 * points-virgules / puces — les deux rendent une liste à puces icônée.
 */
function splitIngredients(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const parts = raw.includes("\n")
    ? raw.split("\n")
    : raw.split(/[,;]/);
  return parts
    .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

/** Cards de la section « Pourquoi choisir ce produit » (apparition staggered). */
const WHY_CARDS = [
  {
    icon: Leaf,
    bg: "bg-emerald-100 text-emerald-600",
    title: "100 % Naturel",
    text: "Une formule naturelle, sans additifs de synthèse.",
  },
  {
    icon: Hand,
    bg: "bg-amber-100 text-amber-600",
    title: "Fait main",
    text: "Fabriqué avec soin, pièce par pièce, au Sénégal.",
  },
  {
    icon: ShieldCheck,
    bg: "bg-sky-100 text-sky-600",
    title: "Authenticité prouvée",
    text: "Chaque scan vérifie l'authenticité du produit.",
  },
  {
    icon: Heart,
    bg: "bg-rose-100 text-rose-600",
    title: "Soutien direct",
    text: "Votre confiance soutient directement l'artisan.",
  },
] as const;

/** Libellés du sélecteur d'étoiles interactif (formulaire d'avis). */
const RATING_LABELS = [
  "Pas terrible",
  "Peut mieux faire",
  "Correct",
  "Très satisfait",
  "Coup de cœur !",
];

/**
 * AtelierSlider — carrousel « L'atelier en images » à GRANDES images
 * (retour test : remplacer la grille 3 miniatures par un slide).
 *
 * Scroll-snap horizontal (swipe natif mobile, aucune dépendance), flèches
 * ‹ › et points indicateurs cliquables ; clic sur une photo → lightbox.
 */
function AtelierSlider({
  photos,
  artisanName,
  onZoom,
}: {
  photos: string[];
  artisanName: string;
  onZoom: (url: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  /** Amène la slide `i` au centre (flèches / points). */
  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    (track.children[clamped] as HTMLElement | undefined)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  return (
    <div className="relative">
      {/* Piste scrollable — scrollbar masquée, snap au centre */}
      <div
        ref={trackRef}
        className="art-hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-p-4 px-1 pb-1"
        onScroll={(e) => {
          // Slide la plus proche du centre = index courant (points + flèches)
          const el = e.currentTarget;
          const slides = Array.from(el.children) as HTMLElement[];
          const center = el.scrollLeft + el.clientWidth / 2;
          let best = 0;
          let bestDist = Infinity;
          slides.forEach((s, i) => {
            const c = s.offsetLeft + s.offsetWidth / 2;
            const d = Math.abs(c - center);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
          setCurrent(best);
        }}
      >
        {photos.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => onZoom(url)}
            aria-label={`Agrandir la photo ${i + 1} de l'atelier de ${artisanName}`}
            className="group relative w-[88%] flex-shrink-0 cursor-zoom-in snap-center overflow-hidden rounded-3xl border border-amber-100 shadow-md sm:w-[75%]"
          >
            <SafeImage
              src={url}
              alt={`Atelier de ${artisanName} — photo ${i + 1}`}
              className="h-60 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-72"
              emoji="📷"
            />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              {i + 1}/{photos.length}
            </span>
          </button>
        ))}
      </div>

      {/* Flèches ‹ › (desktop surtout ; swipe naturel sur mobile) */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            aria-label="Photo précédente"
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-lg ring-1 ring-black/5 transition-all hover:scale-110 hover:bg-white disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current === photos.length - 1}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-lg ring-1 ring-black/5 transition-all hover:scale-110 hover:bg-white disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Points indicateurs cliquables */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Aller à la photo ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-7 bg-gradient-to-r from-amber-500 to-orange-500"
                    : "w-2 bg-stone-300 hover:bg-stone-400"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ArtisanProductView({
  lot,
  scanCount = 0,
  counterfeitAlert = null,
  socials,
  logoUrl = null,
  artisanPhotos = [],
  initialReviews = [],
  similarProducts = [],
}: Props) {
  // Composition : « voir plus » si longue liste d'ingrédients
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  // Conseils d'utilisation : on n'affiche que les 3 premiers par défaut
  // (retour utilisateur : la liste complète est trop longue).
  const [showAllTips, setShowAllTips] = useState(false);
  const [reviewThanks, setReviewThanks] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);

  // ── Avis : formulaire (note 1-5, nom, commentaire) + étoiles interactives ─
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // ── Partage : Web Share API, repli = copie du lien ──────────────────────
  const [shareCopied, setShareCopied] = useState(false);

  // ── Lightbox galerie atelier (zoom plein écran, fermeture au clic) ──────
  const [lightbox, setLightbox] = useState<string | null>(null);
  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  async function handleShare() {
    const url = window.location.href;
    const data = {
      title: `${lot.productName} — Produit Authentique`,
      text: `Découvrez ${lot.productName} de ${lot.artisanName}, authentifié par VerifScan ✅`,
      url,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // partage annulé par l'utilisateur → rien à faire
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // clipboard refusé → rien à faire
    }
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewError("");
    if (reviewRating === 0) {
      setReviewError("Choisissez une note de 1 à 5 étoiles.");
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/artisan/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: lot.qrCode,
          authorName: reviewName,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        review?: ReviewItem;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Erreur pendant l'envoi de l'avis");
      }
      if (data.review) {
        setReviews((prev) => [data.review as ReviewItem, ...prev]);
      }
      setReviewThanks(true);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setReviewSubmitting(false);
    }
  }

  const waLink = toWhatsAppLink(lot.contactPhone, lot.artisanName, lot.productName);
  // Lien de SIGNALEMENT (bannière contrefaçon) — message dédié
  const waReportLink = toWhatsAppLink(
    lot.contactPhone,
    lot.artisanName,
    lot.productName,
    `Bonjour ${lot.artisanName}, je viens de scanner un QR code VerifScan (produit : ${lot.productName}) et une alerte de possible contrefaçon s'affiche. Je vous signale ce produit suspect.`
  );

  /** Bouton « Découvrir » du hero → scroll fluide vers la carte produit. */
  function scrollToProduct() {
    document.getElementById("produit")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // ── Coordonnées COMPACTES — grille 2 colonnes de tuiles cliquables ──────
  type ContactTile = {
    key: string;
    href: string;
    label: string;
    value: string;
    external?: boolean;
    bg: string;
    icon: ReactNode;
  };
  const contactTiles: ContactTile[] = [];
  contactTiles.push({
    key: "phone",
    href: `tel:${lot.contactPhone}`,
    label: "Téléphone",
    value: lot.contactPhone,
    bg: "bg-gradient-to-br from-amber-400 to-orange-500",
    icon: <Phone className="h-4 w-4" />,
  });
  contactTiles.push({
    key: "whatsapp",
    href: waLink,
    label: "WhatsApp",
    value: "Message direct",
    external: true,
    bg: "bg-gradient-to-br from-green-500 to-emerald-600",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d={WHATSAPP_SVG_PATH} />
      </svg>
    ),
  });
  if (lot.contactEmail) {
    contactTiles.push({
      key: "email",
      href: `mailto:${lot.contactEmail}`,
      label: "Email",
      value: lot.contactEmail,
      bg: "bg-gradient-to-br from-sky-500 to-blue-600",
      icon: <Mail className="h-4 w-4" />,
    });
  }
  if (socials?.instagramUrl) {
    contactTiles.push({
      key: "instagram",
      href: socials.instagramUrl,
      label: "Instagram",
      value: socials.instagramUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      external: true,
      bg: "bg-gradient-to-br from-pink-500 to-rose-600",
      icon: <Instagram className="h-4 w-4" />,
    });
  }
  if (socials?.facebookUrl) {
    contactTiles.push({
      key: "facebook",
      href: socials.facebookUrl,
      label: "Facebook",
      value: socials.facebookUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      external: true,
      bg: "bg-gradient-to-br from-blue-600 to-blue-800",
      icon: <Facebook className="h-4 w-4" />,
    });
  }
  if (socials?.tiktokUrl) {
    contactTiles.push({
      key: "tiktok",
      href: socials.tiktokUrl,
      label: "TikTok",
      value: socials.tiktokUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      external: true,
      bg: "bg-gradient-to-br from-slate-800 to-black",
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d={TIKTOK_SVG_PATH} />
        </svg>
      ),
    });
  }

  // ── Fraîcheur : jours restants + progression réelle de la durée de vie ──
  const now = Date.now();
  const expTime = lot.expirationDate ? new Date(lot.expirationDate).getTime() : null;
  const mfgTime = lot.manufacturingDate ? new Date(lot.manufacturingDate).getTime() : null;
  const daysLeft =
    expTime !== null ? Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isVeryFresh = daysLeft !== null && !isExpired && daysLeft > 90;
  const shelfLifePct = (() => {
    if (expTime === null || mfgTime === null || expTime <= mfgTime) return 50;
    const pct = ((now - mfgTime) / (expTime - mfgTime)) * 100;
    return Math.min(100, Math.max(2, Math.round(pct)));
  })();

  // ── Statut de fraîcheur (chip colorée) ───────────────────────────────────
  const freshnessStatus = (() => {
    if (daysLeft === null) return null;
    if (isExpired)
      return { label: "Périmé", chip: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" };
    if (daysLeft <= 7)
      return {
        label: "Très bientôt périmé",
        chip: "bg-red-50 text-red-700 ring-red-200",
        dot: "bg-red-500",
      };
    if (daysLeft <= 30)
      return {
        label: "À utiliser bientôt",
        chip: "bg-amber-50 text-amber-700 ring-amber-200",
        dot: "bg-amber-500",
      };
    if (daysLeft <= 90)
      return {
        label: "Bonne fraîcheur",
        chip: "bg-lime-50 text-lime-700 ring-lime-200",
        dot: "bg-lime-500",
      };
    return {
      label: "Très frais",
      chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dot: "bg-emerald-500",
    };
  })();

  // ── Conseils : remplis par l'artisan, sinon défauts ──────────────────
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

  // ── Précautions + conservation (assistant intelligent) ─────────────────
  const precautions: string[] = (() => {
    const raw = lot.precautions;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string" && v.trim() !== "");
      }
    } catch {
      /* pas un JSON — fallback ligne par ligne */
    }
    return raw.split("\n").map((t) => t.trim()).filter(Boolean);
  })();
  const storageConditions = lot.storageConditions?.trim() || "";

  // ── Composition : liste d'ingrédients icônée (voir plus si > 6 items) ────
  const ingredientItems = splitIngredients(lot.ingredients ?? "");
  const MAX_INGREDIENTS = 6;
  const displayedIngredients = showAllIngredients
    ? ingredientItems
    : ingredientItems.slice(0, MAX_INGREDIENTS);

  const bio =
    lot.artisanBio?.trim() ||
    `${lot.artisanName} fabrique des produits naturels avec passion depuis plusieurs années. Chaque produit est fait main avec des ingrédients soigneusement sélectionnés pour vous offrir le meilleur de la nature sénégalaise.`;

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#FAF6F0] text-stone-900">
      {/* Tracking du scan (timezone → détection contrefaçon, fire-and-forget) */}
      <ScanTracker qrCode={lot.qrCode} />

      {/* ── 0. ALERTE CONTREFAÇON (si scans multi-régions suspects) ────── */}
      {counterfeitAlert && (
        <div
          role="alert"
          className="border-b border-red-500 bg-gradient-to-r from-red-600 to-rose-600 px-5 py-4 text-white"
        >
          <div className="mx-auto flex max-w-lg items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">Activité suspecte détectée</p>
              <p className="mt-1 text-xs leading-relaxed text-red-100">
                Ce QR code a été scanné depuis {regionLabel(counterfeitAlert.regionA)} puis{" "}
                {regionLabel(counterfeitAlert.regionB)} en moins de 48 h (
                {new Date(counterfeitAlert.detectedAt).toLocaleDateString("fr-FR")}). Un produit
                physique ne voyage pas si vite — possible contrefaçon. En cas de doute,{" "}
                <a
                  href={waReportLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white underline decoration-white/50 underline-offset-2 hover:decoration-white"
                >
                  signalez-le à l&rsquo;artisan sur WhatsApp
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════ 1. HERO IMMERSIF PLEIN ÉCRAN ═══════════════════════════════ */}
      {/* Mobile : hero plus bas (75svh) — corrige le grand vide entre la photo
          et la pilule VerifScan signalé sur téléphone. Desktop : 92svh. */}
      <header className="relative flex min-h-[75svh] flex-col overflow-hidden bg-stone-950 sm:min-h-[92svh]">
        {/* Photo produit plein écran (zoom Ken Burns) ou placeholder stylisé */}
        <div className="absolute inset-0">
          <SafeImage
            src={lot.photoUrl}
            alt={lot.productName}
            className="art-kenburns h-full w-full object-cover"
            icon={
              <span className="art-float text-[6.5rem] drop-shadow-2xl" aria-hidden>
                🧴
              </span>
            }
          />
        </div>

        {/* Halos lumineux animés (profondeur, effet premium) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="art-gradient-pan absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="art-gradient-pan absolute -right-24 top-1/2 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          {/* Trame de points uniquement sur le placeholder (pas de photo) */}
          {!lot.photoUrl && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 25%, white 1.5px, transparent 1.5px)",
                backgroundSize: "26px 26px",
              }}
            />
          )}
        </div>

        {/* Voile TRÈS léger : le hero ne porte plus AUCUN texte (retour test :
            titre/badges/avis supprimés de l'image) — juste une petite ombre
            en bas pour asseoir le bouton Découvrir. */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/5 to-transparent" />

        {/* Pilule marque VerifScan (verre dépoli) */}
        <div className="art-fade-down relative z-10 flex justify-center pt-5">
          {/* Logo officiel EN COULEUR sur pastille blanche (retour test : la
              variante blanche passait inaperçue / paraissait délavée). */}
          <Link
            href="/"
            aria-label="VerifScan accueil"
            className="inline-flex items-center rounded-full bg-white px-5 py-2.5 shadow-xl ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
          >
            <Logo variant="default" size="sm" />
          </Link>
        </div>

        {/* Espace flexible → bouton collé en bas */}
        <div className="flex-1" />

        {/* HERO 100 % IMAGE (retour test) : PLUS AUCUNE superposition sur la
            photo — badges, titre, étoiles et avis ont été déplacés ou
            supprimés. La photo produit se suffit à elle-même. Toutes les
            informations sont dans la carte flottante ci-dessous. */}

        {/* Bouton « Découvrir » — scroll fluide vers la carte produit.
            pb-24 : la carte flottante (-mt-16 = 64 px d'overlap) recouvre le
            bas du hero → le bouton doit rester AU-DESSUS de cette zone
            (sinon il est recouvert et inclicable — bug détecté au test).
            EN DESSOUS : badge « Produit authentique » mis en valeur (demande
            utilisateur) — pilule pleine emerald, visible sans surcharger
            la photo. */}
        <div className="art-fade-up art-delay-2 relative z-30 flex flex-col items-center gap-3 pb-24">
          <button
            type="button"
            onClick={scrollToProduct}
            className="group flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 active:scale-95"
          >
            Découvrir
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
          <span className="art-fade-up art-delay-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg ring-1 ring-white/40 backdrop-blur-md">
            <BadgeCheck className="h-4 w-4" />
            Produit authentique
          </span>
        </div>
      </header>

      {/* ════ CONTENU DÉROULANT (cartes flottantes au-dessus du hero) ════ */}
      <div id="produit" className="relative z-20 mx-auto -mt-16 max-w-lg scroll-mt-4 px-4 pb-2">
        {/* ════ 2. CARTE PRODUIT FLOTTANTE — GLASSMORPHISM ═══════════════ */}
        <Reveal>
          <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-stone-900/10 backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-emerald-300/25 blur-3xl" />

            <div className="relative p-6">
              {/* Artisan + logo + preuve sociale scans */}
              {/* object-contain + fond blanc : un logo horizontal (large)
                  n'est plus rogné par le cadrage carré (retour test). */}
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <SafeImage
                    src={logoUrl}
                    alt={`Logo de ${lot.artisanName}`}
                    className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white object-contain p-0.5 shadow-md ring-1 ring-stone-200"
                    icon={
                      <span className="text-xl font-black text-white">
                        {(lot.artisanName || "A").charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-xl font-black text-white shadow-md shadow-orange-500/25">
                    {(lot.artisanName || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold leading-tight">{lot.artisanName}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <BadgeCheck className="h-4 w-4" /> Artisan vérifié
                  </p>
                </div>
                {scanCount > 0 && (
                  <div className="flex-shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                    <p className="text-lg font-black leading-none text-amber-600">{scanCount}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700/80">
                      scan{scanCount > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Nom + désignation + étoiles */}
              <h2 className="mt-5 text-2xl font-black leading-tight">{lot.productName}</h2>
              {lot.productDesignation && (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-500">
                  {lot.productDesignation}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Stars value={avgRating > 0 ? Math.round(avgRating) : 5} />
                <span className="text-xs font-semibold text-stone-500">
                  {avgRating > 0
                    ? `${avgRating.toFixed(1)}/5 · ${reviews.length} avis`
                    : "Avis vérifiés par scan"}
                </span>
              </div>

              {/* Badges EN VEDETTE (retour test : « mettre en valeur fait main,
                  naturel et local ») — couleurs pleines, texte blanc, plus grands. */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-[13px] font-black text-white shadow-md shadow-amber-500/30">
                  <Hand className="h-4 w-4" /> Fait main
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-[13px] font-black text-white shadow-md shadow-emerald-500/30">
                  <Leaf className="h-4 w-4" /> Naturel
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-[13px] font-black text-white shadow-md shadow-sky-500/30">
                  🇸🇳 Local
                </span>
              </div>

              {/* PRIX mis en valeur + contenance */}
              {(lot.productPrice || lot.contenance) && (
                <div className="mt-5 flex items-end justify-between gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4">
                  {lot.productPrice ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70">
                        Prix artisan
                      </p>
                      <p className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-3xl font-black leading-tight text-transparent">
                        {lot.productPrice}
                      </p>
                    </div>
                  ) : (
                    <span />
                  )}
                  {lot.contenance && (
                    <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
                      <Scale className="h-3.5 w-3.5 text-stone-400" /> {lot.contenance}
                    </span>
                  )}
                </div>
              )}

              {/* Partage (Web Share → repli copie du lien) */}
              <button
                type="button"
                onClick={handleShare}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 py-3 text-sm font-bold text-stone-700 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 hover:shadow-md active:scale-[0.98]"
              >
                {shareCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" /> Lien copié !
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" /> Partager ce produit authentique
                  </>
                )}
              </button>
            </div>
          </section>
        </Reveal>

        {/* ════ 3. PÉREMPTION EN VEDETTE — CARTE À FOND VERT PLEIN ═══════
            (retour test : « le rubrique péremption le mettre en valeur avec
            un couleur de fond vert »). Le fond est VERT pour un produit
            frais ; il devient ambre (≤ 30 jours) ou rouge (périmé) pour
            rester honnête — la mise en valeur est conservée dans tous les
            cas. Texte blanc, cercle blanc, gros contraste. */}
        <Reveal delay={90}>
          <section
            className={`mt-4 rounded-[2rem] bg-gradient-to-br p-6 shadow-2xl ${
              isExpired
                ? "from-red-500 via-rose-500 to-red-600 shadow-red-900/30"
                : daysLeft !== null && daysLeft <= 30
                  ? "from-amber-500 via-orange-500 to-amber-600 shadow-amber-900/30"
                  : "from-emerald-500 via-green-500 to-teal-600 shadow-emerald-900/30"
            }`}
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
              🌿 Du frais, prouvé — péremption
            </p>
            <div className="flex items-center gap-5">
              {/* Compte à rebours : disque BLANC sur fond coloré + anneau pulsant */}
              <div className="relative flex-shrink-0">
                {isVeryFresh && (
                  <span
                    className="art-ring absolute inset-0 rounded-full border-4 border-white/70"
                    aria-hidden
                  />
                )}
                <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white/40">
                  <span
                    className={`text-2xl font-black leading-none ${
                      isExpired
                        ? "text-red-600"
                        : daysLeft !== null && daysLeft <= 30
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {isExpired ? Math.abs(daysLeft ?? 0) : daysLeft ?? 0}
                  </span>
                  <span
                    className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${
                      isExpired
                        ? "text-red-500/80"
                        : daysLeft !== null && daysLeft <= 30
                          ? "text-amber-600/80"
                          : "text-emerald-600/80"
                    }`}
                  >
                    {isExpired ? "jours dépassé" : "jours restants"}
                  </span>
                </div>
              </div>

              {/* LA date de péremption, en gros sur le fond vert */}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
                  À utiliser avant le
                </p>
                <p className="mt-0.5 text-[1.55rem] font-black leading-tight text-white drop-shadow-sm">
                  {formatDate(lot.expirationDate)}
                </p>
                {freshnessStatus && (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-800 shadow-sm">
                    <span
                      className={`h-2 w-2 rounded-full ${freshnessStatus.dot} ${
                        isVeryFresh ? "animate-pulse" : ""
                      }`}
                    />
                    {freshnessStatus.label}
                  </span>
                )}
              </div>
            </div>

            {/* Barre de progression durée de vie : piste translucide,
                remplissage blanc + reflet shimmer */}
            <div className="art-shimmer mt-5 h-2.5 rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white shadow-sm transition-all duration-1000"
                style={{ width: `${shelfLifePct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-white/85">
              <span>
                Fabriqué le{" "}
                <span className="font-bold text-white">
                  {formatDate(lot.manufacturingDate)}
                </span>
              </span>
              <span>Péremption</span>
            </div>
          </section>
        </Reveal>

        {/* ════ 4. POURQUOI CHOISIR — 4 CARDS ANIMÉES (staggered) ═════════ */}
        <section className="mt-8">
          <Reveal>
            <Eyebrow>Pourquoi l&rsquo;adorer</Eyebrow>
            <h2 className="text-xl font-bold">Pourquoi choisir ce produit&nbsp;?</h2>
          </Reveal>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {WHY_CARDS.map((card, i) => (
              <Reveal key={card.title} delay={i * 90} className="h-full">
                <div className="group h-full rounded-3xl border border-stone-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-900/5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.bg} transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}
                  >
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-bold">{card.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">{card.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ════ 5. COMPOSITION NATURELLE — liste icônée + check animé ═════ */}
        {ingredientItems.length > 0 && (
          <Reveal>
            <section className="mt-8 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm">
              <Eyebrow>Ce qu&rsquo;il y a dedans</Eyebrow>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <FlaskConical className="h-5 w-5 text-emerald-600" /> Composition naturelle
              </h2>
              <ul className="space-y-2">
                {displayedIngredients.map((ing, i) => (
                  <li
                    key={`${i}-${ing.slice(0, 12)}`}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 px-4 py-3 transition-colors hover:border-emerald-200"
                  >
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                      <Leaf className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm leading-relaxed text-stone-700">{ing}</span>
                  </li>
                ))}
              </ul>
              {ingredientItems.length > MAX_INGREDIENTS && (
                <button
                  type="button"
                  onClick={() => setShowAllIngredients((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                >
                  {showAllIngredients ? (
                    <>
                      Voir moins <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      + {ingredientItems.length - MAX_INGREDIENTS} autres ingrédients{" "}
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              {/* Badge « sans allergènes » — coche SVG qui se dessine */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path className="art-check-path" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Sans allergènes de synthèse
                  </p>
                  <p className="text-xs text-emerald-700/80">
                    Formule naturelle, adaptée aux peaux sensibles
                  </p>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        {/* ════ 6. PRÉCAUTIONS — cards numérotées rouge/orange ════════════ */}
        {precautions.length > 0 && (
          <Reveal>
            <section className="mt-6 rounded-[2rem] border border-rose-100 bg-gradient-to-br from-rose-50 via-orange-50/60 to-amber-50/40 p-6">
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-orange-500 text-white shadow-md shadow-rose-500/25">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                Précautions d&rsquo;emploi
              </h2>
              <div className="space-y-2.5">
                {precautions.map((prec, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-3 rounded-2xl border border-rose-100 bg-white/90 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
                  >
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-orange-100 text-[11px] font-black text-rose-600 transition-transform duration-300 group-hover:scale-110">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-stone-700">{prec}</span>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* ════ 7. CONSERVATION — icône frigo flottante + conseils ════════ */}
        {storageConditions && (
          <Reveal>
            <section className="mt-6 rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-cyan-50/50 to-blue-50/40 p-6">
              <div className="flex items-start gap-4">
                <div className="art-float flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-500/30">
                  <Refrigerator className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <Eyebrow>Garder toute sa fraîcheur</Eyebrow>
                  <h2 className="text-xl font-bold">Conservation</h2>
                  <p className="mt-2.5 rounded-2xl border border-sky-100 bg-white/85 p-4 text-sm leading-relaxed text-stone-700">
                    {storageConditions}
                  </p>
                </div>
              </div>
            </section>
          </Reveal>
        )}

        {/* ════ 8. HISTOIRE ARTISAN — storytelling + badge certifié ═══════ */}
        <Reveal>
          <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 shadow-sm">
            {/* Guillemet décoratif géant */}
            <span
              className="pointer-events-none absolute -top-7 right-3 select-none font-serif text-[7.5rem] leading-none text-amber-200/80"
              aria-hidden
            >
              &rdquo;
            </span>
            <div className="relative p-6">
              <Eyebrow>Rencontrez l&rsquo;artisan</Eyebrow>
              <h2 className="text-xl font-bold">L&rsquo;histoire de {lot.artisanName}</h2>

              <blockquote className="relative mt-4 rounded-2xl border border-amber-100 bg-white/85 p-5 backdrop-blur">
                <Quote
                  className="absolute -left-2.5 -top-2.5 h-6 w-6 rotate-180 rounded-full bg-amber-400 p-1 text-white shadow-md"
                  aria-hidden
                />
                <p className="italic leading-relaxed text-stone-700">{bio}</p>
              </blockquote>

              {/* Avatar + badge « Artisan certifié » */}
              {/* object-contain : logo horizontal entier, jamais coupé */}
              <div className="mt-5 flex items-center gap-3">
                {logoUrl ? (
                  <SafeImage
                    src={logoUrl}
                    alt={`Logo de ${lot.artisanName}`}
                    className="h-12 w-12 flex-shrink-0 rounded-full bg-white object-contain p-0.5 shadow-lg ring-1 ring-amber-200"
                    icon={
                      <span className="text-xl font-bold text-white">
                        {(lot.artisanName || "A").charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-bold text-white shadow-lg shadow-orange-500/25">
                    {(lot.artisanName || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold">{lot.artisanName}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Artisan certifié VerifScan
                  </span>
                </div>
              </div>

              {/* Galerie — l'atelier en images : SLIDER grandes photos
                  (retour test : la grille 3 miniatures h-24 était trop petite) */}
              {artisanPhotos.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-bold text-stone-800">
                    📷 L&rsquo;atelier en images
                  </p>
                  <AtelierSlider
                    photos={artisanPhotos}
                    artisanName={lot.artisanName}
                    onZoom={setLightbox}
                  />
                </div>
              )}
            </div>
          </section>
        </Reveal>

        {/* ════ 9. CONSEILS D'UTILISATION — TIMELINE VISUELLE ═════════════ */}
        <Reveal>
          <section className="mt-8 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm">
            <Eyebrow>Bien l&rsquo;utiliser</Eyebrow>
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-amber-500" /> Conseils d&rsquo;utilisation
            </h2>

            {/* Ligne verticale connectant les étapes numérotées */}
            <div className="relative space-y-4 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-[2.5px] before:rounded-full before:bg-gradient-to-b before:from-amber-300 before:via-orange-200 before:to-transparent">
              {(showAllTips ? tips : tips.slice(0, 3)).map((tip, index) => (
                <Reveal key={index} delay={index * 90}>
                  <div className="relative flex items-start gap-4">
                    <span className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-white shadow-md shadow-orange-500/30 ring-4 ring-white">
                      {index + 1}
                    </span>
                    <p className="pt-1.5 text-sm leading-relaxed text-stone-700">{tip}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {tips.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllTips((v) => !v)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100"
              >
                {showAllTips ? (
                  <>
                    Résumer <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Voir les {tips.length - 3} autres conseils <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </section>
        </Reveal>

        {/* ════ 10. CTA WHATSAPP GÉANT — anneaux pulsants ═════════════════ */}
        {lot.contactPhone && (
          <Reveal>
            <section className="mt-8">
              <div className="relative">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex w-full items-center justify-center gap-3 rounded-[1.8rem] bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 py-5 text-lg font-bold text-white shadow-2xl shadow-emerald-600/40 transition-transform duration-300 hover:scale-[1.02] active:scale-95"
                >
                  {/* Double anneau pulsant continu (démarré à la révélation) */}
                  <span
                    className="art-ring pointer-events-none absolute inset-0 rounded-[1.8rem] bg-emerald-500/50"
                    aria-hidden
                  />
                  <span
                    className="art-ring pointer-events-none absolute inset-0 rounded-[1.8rem] bg-emerald-400/40"
                    style={{ animationDelay: "0.75s" }}
                    aria-hidden
                  />
                  <svg
                    className="relative z-10 h-7 w-7 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path d={WHATSAPP_SVG_PATH} />
                  </svg>
                  <span className="relative z-10">Commander sur WhatsApp</span>
                </a>
              </div>
              <p className="mt-2.5 text-center text-xs font-medium text-stone-400">
                💬 Réponse directe de {lot.artisanName} — sans intermédiaire
              </p>

              {/* ════ 11. COORDONNÉES — tuiles compactes cliquables ═══════ */}
              <div className="mt-4 rounded-[2rem] border border-stone-200/80 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <span className="text-lg">📇</span> Coordonnées de l&rsquo;artisan
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {contactTiles.map((c) => (
                    <a
                      key={c.key}
                      href={c.href}
                      {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-center gap-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md"
                    >
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:scale-110 ${c.bg}`}
                      >
                        {c.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                          {c.label}
                        </span>
                        <span className="block truncate text-xs font-bold text-stone-800">
                          {c.value}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </Reveal>
        )}

        {/* ════ 12. AVIS CLIENTS — étoiles interactives + formulaire ══════ */}
        <Reveal>
          <section className="mt-8 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm">
            <Eyebrow>Votre expérience compte</Eyebrow>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <span className="text-2xl">💬</span> Avis des clients
            </h2>

            {/* Résumé : moyenne + nombre d'avis */}
            {reviews.length > 0 && (
              <div className="mb-4 flex items-center gap-4 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/90 to-orange-50/60 p-4">
                <div className="text-center">
                  <p className="text-3xl font-black leading-tight text-amber-600">
                    {avgRating.toFixed(1)}
                  </p>
                  <Stars value={Math.round(avgRating)} />
                </div>
                <p className="text-sm text-stone-600">
                  {reviews.length === 1
                    ? "Avis d'un client ayant scanné ce produit"
                    : `${reviews.length} avis de clients ayant scanné ce produit`}
                </p>
              </div>
            )}

            {/* Liste des avis réels */}
            {reviews.length > 0 && (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition-colors hover:border-amber-200"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                          {r.authorName.charAt(0).toUpperCase()}
                        </div>
                        <p className="truncate text-sm font-bold text-stone-800">
                          {r.authorName}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Stars value={r.rating} className="h-3.5 w-3.5" />
                        <span className="text-xs text-stone-400">
                          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-stone-700">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {reviewThanks ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <p className="mb-2 text-4xl">🙏</p>
                <p className="font-bold text-emerald-800">Merci pour votre avis !</p>
                <p className="text-sm text-emerald-700">
                  Votre expérience aide d&rsquo;autres clients et soutient {lot.artisanName}.
                </p>
              </div>
            ) : (
              <form
                onSubmit={submitReview}
                className="mt-4 rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50/80 to-white p-4"
              >
                <p className="mb-3 text-sm font-bold text-stone-800">
                  {reviews.length === 0
                    ? "Soyez le premier à partager votre expérience !"
                    : "Donner mon avis"}
                </p>

                {/* Étoiles interactives avec aperçu au survol */}
                <div className="mb-1.5 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = n <= (hoverRating || reviewRating);
                    return (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onFocus={() => setHoverRating(n)}
                        onBlur={() => setHoverRating(0)}
                        onClick={() => setReviewRating(n)}
                        aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                        className="p-1 transition-transform duration-150 hover:scale-125 active:scale-95"
                      >
                        <Star
                          className={`h-8 w-8 transition-colors duration-150 ${
                            active ? "text-amber-400" : "text-stone-300"
                          }`}
                          fill="currentColor"
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mb-3 h-5 text-sm font-semibold text-amber-600">
                  {reviewRating > 0 ? RATING_LABELS[reviewRating - 1] : ""}
                </p>

                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={40}
                  placeholder="Votre nom"
                  className="mb-3 w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-amber-500 focus:shadow-md focus:shadow-amber-500/10"
                />
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  minLength={2}
                  maxLength={500}
                  rows={3}
                  placeholder="Votre expérience avec ce produit…"
                  className="mb-3 w-full resize-none rounded-xl border-2 border-stone-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-amber-500 focus:shadow-md focus:shadow-amber-500/10"
                />
                {reviewError && (
                  <p className="mb-3 text-xs font-semibold text-red-600">{reviewError}</p>
                )}
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg active:translate-y-0 disabled:opacity-50"
                >
                  {reviewSubmitting ? "Envoi…" : "Envoyer mon avis"}
                </button>
              </form>
            )}
          </section>
        </Reveal>

        {/* ════ 12b. AUTRES PRODUITS DU MÊME ARTISAN (différents seulement) ═ */}
        {similarProducts.length > 0 && (
          <Reveal>
            <section className="mb-8 mt-8">
              <Eyebrow>Continuer à découvrir</Eyebrow>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <span className="text-2xl">🛍️</span> Autres produits de {lot.artisanName}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {similarProducts.map((p) => (
                  <Link
                    key={p.qrCode}
                    href={`/a/${p.qrCode}`}
                    className="group overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="h-32 overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                      <SafeImage
                        src={p.photoUrl}
                        alt={p.productName}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        emoji="🧴"
                      />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-bold text-stone-800">
                        {p.productName}
                      </p>
                      {p.contenance && (
                        <p className="text-xs text-stone-500">{p.contenance}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* ════ 13. FOOTER VÉRIFICATION — dark mode + blockchain ══════════ */}
        <Reveal>
          <section className="relative mb-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-stone-950 via-blue-950 to-stone-900 p-8 text-center shadow-2xl">
            {/* Halos colorés + ciel étoilé subtil */}
            <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(255,255,255,.4) 1px, transparent 1.6px), radial-gradient(circle at 70% 65%, rgba(255,255,255,.3) 1px, transparent 1.6px)",
                backgroundSize: "90px 90px, 130px 130px",
              }}
              aria-hidden
            />

            <div className="relative">
              {/* Logo officiel EN COULEUR sur carte blanche (retour test :
                  la variante blanche était délavée sur le fond sombre). */}
              <div className="mb-5 flex justify-center">
                <div className="rounded-3xl bg-white px-6 py-3.5 shadow-2xl ring-1 ring-black/10">
                  <Logo variant="default" size="lg" />
                </div>
              </div>
              <h3 className="flex items-center justify-center gap-2 text-xl font-bold text-white">
                <Heart className="h-4 w-4 text-rose-400" /> Vérifié par VerifScan
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-stone-300">
                Ce produit est authentique et traçable — chaque scan soutient{" "}
                {lot.artisanName} et l&rsquo;artisanat sénégalais.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-stone-200 backdrop-blur">
                  ⛓️ Traçabilité blockchain
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-stone-200 backdrop-blur">
                  🔒 Historique immuable
                </span>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Lightbox plein écran (galerie atelier) */}
        {lightbox && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo agrandie"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightbox(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt={`Atelier de ${lot.artisanName} en grand`}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Fermer"
              className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
