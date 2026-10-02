"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Leaf,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  Heart,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Share2,
  Star,
  Instagram,
  Facebook,
  Check,
  AlertTriangle,
  BadgeCheck,
  Clock,
  Hand,
  FlaskConical,
  Scale,
  X,
} from "lucide-react";
import { ScanTracker } from "./ScanTracker";
import { Logo } from "@/components/landing/Logo";

/**
 * ArtisanProductView — page produit artisanale PREMIUM (scan client final).
 *
 * Design 2026 v2 — « boutique d'artisan » chaleureuse et éditoriale :
 *   1.  Hero photo PLEIN ÉCRAN — nom + designation + chips authentique
 *       posés sur l'image (style fiche produit premium)
 *   2.  Carte flottante artisan — avatar, vérification VerifScan,
 *       fraîcheur (badge jours restants + dates + progression),
 *       contenance / prix, partage
 *   3.  Bandeau bénéfices (4 pastilles)
 *   4.  Composition naturelle (+ encadré sans allergènes)
 *   5.  Précautions d'emploi (assistant intelligent)
 *   6.  Conditions de conservation (assistant intelligent)
 *   7.  Histoire de l'artisan (+ galerie atelier, lightbox)
 *   8.  Conseils d'utilisation numérotés
 *   9.  CTA WhatsApp géant + coordonnées cliquables
 *   10. Avis clients réels + formulaire
 *   11. Autres produits du même artisan (produits DIFFÉRENTS seulement)
 *   12. Footer vérification VerifScan
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
        className={`flex items-center justify-center bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 ${className} ${fallbackClassName}`}
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

export function ArtisanProductView({
  lot,
  scanCount = 0,
  counterfeitAlert = null,
  socials,
  artisanPhotos = [],
  initialReviews = [],
  similarProducts = [],
}: Props) {
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [reviewThanks, setReviewThanks] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);

  // ── Avis : formulaire (note 1-5, nom, commentaire) ──────────────────────
  const [reviewRating, setReviewRating] = useState(0);
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
  const shelfLifePct = (() => {
    if (expTime === null || mfgTime === null || expTime <= mfgTime) return 50;
    const pct = ((now - mfgTime) / (expTime - mfgTime)) * 100;
    return Math.min(100, Math.max(2, Math.round(pct)));
  })();

  // ── Avantages (bandeau 3) ────────────────────────────────────────────────
  const benefits = [
    { icon: "🌱", text: "100% Naturel" },
    { icon: "✋", text: "Fait main" },
    { icon: "🚫", text: "Sans produits chimiques" },
    { icon: "🇸🇳", text: "Soutien local" },
  ];

  // ── Conseils (8) : remplis par l'artisan, sinon défauts ──────────────────
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

  // ── Composition : « voir plus » si longue liste ──────────────────────────
  const ingredients = lot.ingredients ?? "";
  const isLongIngredients = ingredients.length > 280;
  const displayedIngredients =
    isLongIngredients && !showAllIngredients ? `${ingredients.slice(0, 280)}…` : ingredients;

  const bio =
    lot.artisanBio?.trim() ||
    `${lot.artisanName} fabrique des produits naturels avec passion depuis plusieurs années. Chaque produit est fait main avec des ingrédients soigneusement sélectionnés pour vous offrir le meilleur de la nature sénégalaise.`;

  return (
    <main className="min-h-screen bg-[#FAF6F0] text-stone-900">
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

      {/* ── 0b. BARRE DE MARQUE ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center border-b border-stone-200/70 bg-white/90 py-3 backdrop-blur">
        <Link href="/" aria-label="VerifScan accueil" className="inline-flex items-center">
          <Logo size="md" />
        </Link>
      </div>

      {/* ── 1. HERO PHOTO PLEIN ÉCRAN — nom posé sur l'image ───────────── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <SafeImage
            src={lot.photoUrl}
            alt={lot.productName}
            className="h-full w-full object-cover"
            icon={<Leaf className="h-28 w-28 text-white/90" strokeWidth={1.5} />}
          />
          {/* Voiles de lisibilité : bas sombre pour le texte, haut léger */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/20 via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[30rem] max-w-lg flex-col justify-end px-5 pb-10 pt-16 text-white">
          {/* Chips de confiance en glassmorphism */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-100 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" /> Produit authentique
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/40 bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-100 backdrop-blur-md">
              <Hand className="h-3.5 w-3.5" /> Fait main
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-md">
              <Leaf className="h-3.5 w-3.5" /> Naturel
            </span>
          </div>

          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-200/90">
            Création artisanale du Sénégal
          </p>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight drop-shadow-sm">
            {lot.productName}
          </h1>
          {lot.productDesignation && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
              {lot.productDesignation}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Stars
              value={avgRating > 0 ? Math.round(avgRating) : 5}
              className="h-5 w-5"
              emptyClassName="text-white/30"
            />
            <span className="text-xs font-semibold text-white/80">
              {avgRating > 0
                ? `${avgRating.toFixed(1)}/5 · ${reviews.length} avis vérifié${reviews.length > 1 ? "s" : ""}`
                : "Avis vérifiés par scan"}
            </span>
          </div>
        </div>
      </header>

      {/* ── 2. CARTE FLOTTANTE ARTISAN + FRAÎCHEUR ─────────────────────── */}
      <div className="relative z-10 mx-auto -mt-12 max-w-lg px-5">
        <section className="rounded-[2rem] border border-stone-200/80 bg-white shadow-xl shadow-stone-900/5">
          {/* Ligne artisan */}
          <div className="flex items-center gap-4 border-b border-stone-100 p-6">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-2xl font-black text-white shadow-md shadow-orange-500/25">
              {(lot.artisanName || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold leading-tight">{lot.artisanName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <BadgeCheck className="h-4 w-4" /> Artisan vérifié par VerifScan
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

          {/* Fraîcheur : badge circulaire + dates + progression */}
          <div className="p-6">
            <div className="flex items-center gap-4">
              {/* Badge circulaire jours restants */}
              <div
                className={`relative flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-full border-4 ${
                  isExpired
                    ? "border-red-100 bg-red-50"
                    : daysLeft !== null && daysLeft <= 30
                      ? "border-amber-100 bg-amber-50"
                      : "border-emerald-100 bg-emerald-50"
                }`}
              >
                <span
                  className={`text-xl font-black leading-none ${
                    isExpired ? "text-red-600" : daysLeft !== null && daysLeft <= 30 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {isExpired ? Math.abs(daysLeft ?? 0) : daysLeft ?? 0}
                </span>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                  {isExpired ? "jours dépassé" : "jours restants"}
                </span>
              </div>

              {/* Dates */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
                  <CalendarDays className="h-4 w-4 flex-shrink-0 text-stone-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      Fabriqué le
                    </p>
                    <p className="truncate text-xs font-bold text-stone-700">
                      {formatDate(lot.manufacturingDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 px-3 py-2">
                  <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/80">
                      À utiliser avant
                    </p>
                    <p className="truncate text-xs font-bold text-amber-800">
                      {formatDate(lot.expirationDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Barre de progression durée de vie */}
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isExpired
                      ? "bg-gradient-to-r from-red-400 to-rose-500"
                      : "bg-gradient-to-r from-emerald-400 to-green-500"
                  }`}
                  style={{ width: `${shelfLifePct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-medium text-stone-400">
                <span>Fabrication</span>
                <span>Péremption</span>
              </div>
            </div>

            {/* Contenance / prix + partage */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {lot.contenance && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-1.5 text-sm font-semibold text-stone-700">
                  <Scale className="h-3.5 w-3.5 text-stone-400" /> {lot.contenance}
                </span>
              )}
              {lot.productPrice && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200/70">
                  💰 {lot.productPrice}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 py-3 text-sm font-bold text-stone-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 active:scale-[0.98]"
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

        {/* ── 3. BANDEAU BÉNÉFICES ─────────────────────────────────────────── */}
        <section className="mt-8">
          <div className="grid grid-cols-4 gap-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-100 bg-white text-2xl shadow-sm">
                  {benefit.icon}
                </div>
                <span className="text-[11px] font-semibold leading-tight text-stone-600">
                  {benefit.text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. COMPOSITION NATURELLE ────────────────────────────────────── */}
        {ingredients && (
          <section className="mt-8 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm">
            <Eyebrow>Ce qu&rsquo;il y a dedans</Eyebrow>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <FlaskConical className="h-5 w-5 text-emerald-600" /> Composition naturelle
            </h2>
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-5">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-stone-700">
                {displayedIngredients}
              </p>
              {isLongIngredients && (
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
                      Voir plus <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Encadré sans allergènes */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-bold text-emerald-900">Sans allergènes de synthèse</p>
                <p className="text-xs text-emerald-700/80">
                  Formule naturelle, adaptée aux peaux sensibles
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── 5. PRÉCAUTIONS D'EMPLOI (assistant intelligent) ─────────────── */}
        {precautions.length > 0 && (
          <section className="mt-6 rounded-[2rem] border border-rose-100 bg-rose-50/70 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <span className="text-2xl">⚠️</span> Précautions d&rsquo;emploi
            </h2>
            <ul className="space-y-2.5">
              {precautions.map((prec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white/80 p-3.5"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-black text-rose-600">
                    !
                  </span>
                  <span className="text-sm leading-relaxed text-stone-700">{prec}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── 6. CONDITIONS DE CONSERVATION (assistant intelligent) ───────── */}
        {storageConditions && (
          <section className="mt-6 rounded-[2rem] border border-sky-100 bg-sky-50/70 p-6">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
              <span className="text-2xl">📍</span> Conservation
            </h2>
            <p className="rounded-2xl border border-sky-100 bg-white/80 p-4 text-sm leading-relaxed text-stone-700">
              {storageConditions}
            </p>
          </section>
        )}

        {/* ── 7. HISTOIRE DE L'ARTISAN + ATELIER ──────────────────────────── */}
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 shadow-sm">
          <div className="p-6">
            <Eyebrow>Rencontrez l&rsquo;artisan</Eyebrow>
            <h2 className="mb-4 text-xl font-bold">L&rsquo;histoire de {lot.artisanName}</h2>

            <blockquote className="relative rounded-2xl border border-amber-100 bg-white/85 p-5 backdrop-blur">
              <span className="absolute -top-3 left-5 text-4xl leading-none text-amber-300">
                &ldquo;
              </span>
              <p className="pt-2 italic leading-relaxed text-stone-700">{bio}</p>
            </blockquote>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-bold text-white shadow-lg shadow-orange-500/25">
                {(lot.artisanName || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{lot.artisanName}</p>
                <p className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> Artisan certifié VerifScan
                </p>
              </div>
            </div>

            {/* Galerie — l'atelier en images */}
            {artisanPhotos.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-sm font-bold text-stone-800">
                  📷 L&rsquo;atelier en images
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {artisanPhotos.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox(url)}
                      aria-label={`Agrandir la photo de l'atelier de ${lot.artisanName}`}
                      className="group h-24 cursor-zoom-in overflow-hidden rounded-2xl border border-amber-100 shadow-sm"
                    >
                      <SafeImage
                        src={url}
                        alt={`Atelier de ${lot.artisanName}`}
                        className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        emoji="📷"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 8. CONSEILS D'UTILISATION ───────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm">
          <Eyebrow>Bien l&rsquo;utiliser</Eyebrow>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-amber-500" /> Conseils d&rsquo;utilisation
          </h2>
          <div className="space-y-3">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 p-3.5"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-white shadow-sm shadow-orange-500/25">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-relaxed text-stone-700">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 9. CONTACT & CTA WHATSAPP ───────────────────────────────────── */}
        {lot.contactPhone && (
          <section className="mt-8">
            {/* CTA WhatsApp géant (conversion) */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex w-full transform items-center justify-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-r from-green-500 to-emerald-600 py-5 text-lg font-bold text-white shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.02] hover:from-green-600 hover:to-emerald-700 active:scale-95"
            >
              <div className="artisan-pulse-slow absolute inset-0 bg-white/20" />
              <svg
                className="relative z-10 h-7 w-7"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d={WHATSAPP_SVG_PATH} />
              </svg>
              <span className="relative z-10">Contacter {lot.artisanName}</span>
            </a>

            {/* Coordonnées COMPACTES — grille 2 colonnes de tuiles cliquables */}
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
                    className="flex items-center gap-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-2.5 transition-colors hover:border-amber-300 hover:bg-amber-50"
                  >
                    <span
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${c.bg}`}
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
        )}

        {/* ── 10. AVIS CLIENTS ────────────────────────────────────────────── */}
        <section className="mt-8 rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm">
          <Eyebrow>Votre expérience compte</Eyebrow>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl">💬</span> Avis des clients
          </h2>

          {/* Résumé : moyenne + nombre d'avis */}
          {reviews.length > 0 && (
            <div className="mb-4 flex items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
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
                <div key={r.id} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                        {r.authorName.charAt(0).toUpperCase()}
                      </div>
                      <p className="truncate text-sm font-bold text-stone-800">{r.authorName}</p>
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
              className="mt-4 rounded-2xl border border-stone-200 bg-white p-4"
            >
              <p className="mb-3 text-sm font-bold text-stone-800">
                {reviews.length === 0
                  ? "Soyez le premier à partager votre expérience !"
                  : "Donner mon avis"}
              </p>

              {/* Sélecteur d'étoiles */}
              <div className="mb-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${n <= reviewRating ? "text-amber-400" : "text-stone-300"}`}
                      fill="currentColor"
                    />
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                required
                minLength={2}
                maxLength={40}
                placeholder="Votre nom"
                className="mb-3 w-full rounded-xl border-2 border-stone-200 px-4 py-2.5 outline-none transition-colors focus:border-amber-500"
              />
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                required
                minLength={2}
                maxLength={500}
                rows={3}
                placeholder="Votre expérience avec ce produit…"
                className="mb-3 w-full resize-none rounded-xl border-2 border-stone-200 px-4 py-2.5 outline-none transition-colors focus:border-amber-500"
              />
              {reviewError && (
                <p className="mb-3 text-xs font-semibold text-red-600">{reviewError}</p>
              )}
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                {reviewSubmitting ? "Envoi…" : "Envoyer mon avis"}
              </button>
            </form>
          )}
        </section>

        {/* ── 11. AUTRES PRODUITS DU MÊME ARTISAN (produits DIFFÉRENTS) ───── */}
        {similarProducts.length > 0 && (
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
                  className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                    <SafeImage
                      src={p.photoUrl}
                      alt={p.productName}
                      className="h-full w-full object-cover"
                      emoji="🧴"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-bold text-stone-800">{p.productName}</p>
                    {p.contenance && <p className="text-xs text-stone-500">{p.contenance}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 12. FOOTER VÉRIFICATION ─────────────────────────────────────── */}
        <section className="mb-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-8 text-center shadow-xl">
          <div className="mb-4 flex justify-center">
            <Logo variant="light" size="lg" />
          </div>
          <h3 className="mb-2 flex items-center justify-center gap-2 text-xl font-bold text-white">
            <Heart className="h-4 w-4 text-rose-400" /> Vérifié par VerifScan
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-stone-300">
            Ce produit est authentique et traçable — chaque scan soutient{" "}
            {lot.artisanName} et l&rsquo;artisanat sénégalais.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
            <span className="text-xs font-medium text-stone-200">🔒 Historique sécurisé</span>
          </div>
        </section>

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
