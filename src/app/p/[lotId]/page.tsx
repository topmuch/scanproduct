import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { Store } from "lucide-react";

import {
  getLotWithDetails,
  getSimilarProducts,
  recordScan,
  isBotUserAgent,
} from "@/lib/public-data";
import {
  getSiteUrl,
  buildProductPath,
  parseLotIdParam,
  decodeUrlSafe,
} from "@/lib/seo";
import { getIndustry } from "@/lib/industries";
import { PublicFooter } from "@/components/public/PublicFooter";

import { SimilarProducts } from "@/components/product/SimilarProducts";

// WOW premium components
import { WowHero, categoryEmoji } from "@/components/product/wow/WowHero";
import { ImmersiveHero } from "@/components/product/wow/ImmersiveHero";
import { FreshnessGlow } from "@/components/product/wow/FreshnessGlow";
import { ContactOrb } from "@/components/product/wow/ContactOrb";
import { WowAccordion } from "@/components/product/wow/WowAccordion";
import { VerificationGlow } from "@/components/product/wow/VerificationGlow";

// V3 modules — consumer loyalty widget + B2B inquiry modal
import { LoyaltyWidget } from "@/components/loyalty/LoyaltyWidget";
import { InquiryModal } from "@/components/marketplace/InquiryModal";

// Content components (used inside accordions — keep the rich content, just upgrade the wrapper)
import { CompactIngredients } from "@/components/product/compact/CompactIngredients";
import { CompactTraceability } from "@/components/product/compact/CompactTraceability";
import { CompactHistory } from "@/components/product/compact/CompactHistory";
import { TransparencyLite } from "@/components/product/compact/TransparencyLite";
import { CompactCertifications } from "@/components/product/compact/CompactCertifications";
import { CompactReviews } from "@/components/product/compact/CompactReviews";
import { CertificationsSection } from "@/components/product/CertificationsSection";
import { ProductDetailsSection } from "@/components/product/ProductDetailsSection";

// Consumer engagement: review prompt (floating notification after 10s) +
// expired-product report modal (consumer safety feature)
import { ReviewPrompt } from "@/components/product/ReviewPrompt";
import { ReportExpiredModal } from "@/components/product/ReportExpiredModal";

// ---------------------------------------------------------------------------
// Force dynamic rendering so the page always reflects the latest reviews
// and product data. Without this, Next.js might cache the page and new
// reviews wouldn't appear until manual revalidation.
// ---------------------------------------------------------------------------
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Metadata (SEO)
// ---------------------------------------------------------------------------

/** Rend une URL d'image absolue (les uploads locaux sont relatifs à la racine). */
function absolutiser(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/** Date longue en français (ex. « 15 mars 2024 ») — rendu serveur uniquement. */
function formatDateFr(date: Date | null | undefined): string | null {
  if (!date) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return null;
  }
}

/** Phrasé de péremption adapté à la famille produit (alimentaire vs cosmétique). */
function phrasettePeremption(
  category: string | null | undefined,
  dateFr: string,
): string {
  const c = (category || "").toLowerCase();
  if (
    c.includes("cosmét") ||
    c.includes("cosmet") ||
    c.includes("hygièn") ||
    c.includes("hygien") ||
    c.includes("savon")
  ) {
    return `à utiliser de préférence avant le ${dateFr}`;
  }
  return `à consommer de préférence avant le ${dateFr}`;
}

/**
 * Description META UNIQUE PAR LOT (lutte anti-contenu dupliqué).
 *
 * La description produit saisie par le fabricant est IDENTIQUE pour tous les
 * lots d'un même produit : 50 lots → 50 pages aux meta-descriptions identiques
 * que Google fusionne (ou pénalise). On injecte donc des variables propres à
 * CHAQUE lot — référence/numéro, date de fabrication, lieu, péremption — pour
 * que chaque passeport ait un extrait Google distinct et informatif.
 */
function buildLotMetaDescription(
  lot: NonNullable<Awaited<ReturnType<typeof getLotWithDetails>>>,
): string {
  const marque = lot.product.brand || lot.fabricant.companyName || "";
  const base = marque
    ? `Vérifiez l'authenticité et la traçabilité de ${lot.product.name} par ${marque}.`
    : `Vérifiez l'authenticité et la traçabilité de ${lot.product.name}.`;
  // Variables UNIQUES par lot (elles différencient la page de ses sœurs).
  const details: string[] = [];
  const refLot = lot.lotNumber || lot.reference;
  if (refLot) details.push(`lot ${refLot}`);
  const dateProduction = formatDateFr(lot.manufactureDate);
  if (dateProduction) details.push(`fabriqué le ${dateProduction}`);
  const lieu = lot.manufacturingLocation || lot.transformationLocation;
  if (lieu) details.push(lieu);
  const datePeremption = formatDateFr(lot.expiryDate);
  if (datePeremption)
    details.push(phrasettePeremption(lot.product.category, datePeremption));
  const partieLot = details.length > 0 ? ` ${details.join(", ")}.` : "";
  const fin = " Ingrédients, origine et certificats vérifiés sur VerifScan.";
  return `${base}${partieLot}${fin}`.slice(0, 300);
}

/**
 * ID métier (/metiers/[slug]) correspondant à une catégorie produit —
 * maillage interne contextuel (le robot découvre les 12 pages métiers SSG
 * depuis des milliers de passeports). Matching par mots-clés sur le nom de
 * catégorie, sans accent ; null → pas de lien métiers affiché.
 */
export function industryIdForCategory(
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  const c = category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (c.includes("cosmet") || c.includes("hygien") || c.includes("savon"))
    return "cosmetiques";
  if (c.includes("boisson") || c.includes("jus") || c.includes("sirop"))
    return "boissons";
  if (c.includes("epice")) return "epices";
  if (c.includes("mer") || c.includes("poisson") || c.includes("crevette") || c.includes("thiof"))
    return "produits-de-la-mer";
  if (c.includes("viande") || c.includes("volaille") || c.includes("poulet"))
    return "viandes";
  if (c.includes("cereal") || c.includes("graine")) return "cereales";
  if (c.includes("noix") || c.includes("anacarde") || c.includes("fruit sec"))
    return "noix-fruits-secs";
  if (c.includes("huile")) return "huiles";
  if (c.includes("cafe") || c.includes("cacao") || c.includes("chocolat") || c.includes(" the "))
    return "cafe-cacao";
  if (c.includes("miel")) return "miel";
  if (c.includes("lait") || c.includes("yaourt") || c.includes("yogurt") || c.includes("fromage"))
    return "produits-laitiers";
  if (c.includes("fruit") || c.includes("legume")) return "fruits-legumes";
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lotId: string }>;
}): Promise<Metadata> {
  const { lotId } = await params;
  // Le param peut porter un suffixe slug SEO (« {id}-beurre-de-karite ») —
  // les QR codes imprimés pointent la forme courte, les deux sont servies.
  const realLotId = parseLotIdParam(lotId);
  let lot: Awaited<ReturnType<typeof getLotWithDetails>> = null;
  try {
    lot = await getLotWithDetails(realLotId);
  } catch (e) {
    console.error("[generateMetadata /p/[lotId]] getLotWithDetails threw:", e);
  }
  if (!lot) {
    return {
      title: "Produit introuvable — VerifScan",
      description:
        "Ce QR code ne correspond à aucun produit enregistré. Vérifiez le catalogue VerifScan.",
      robots: { index: false, follow: true },
      openGraph: {
        title: "Produit introuvable — VerifScan",
        description:
          "Ce QR code ne correspond à aucun produit enregistré. Vérifiez le catalogue VerifScan.",
        type: "website",
      },
    };
  }
  // Image produit absolue pour les partages sociaux (OG/Twitter) — une
  // vignette produit augmente fortement le CTR dans les partages WhatsApp/
  // Facebook, canal majeur en Afrique de l'Ouest.
  const siteUrl = await getSiteUrl();
  const imageProduit = lot.product.imageUrl
    ? absolutiser(lot.product.imageUrl, siteUrl)
    : undefined;
  // Description unique par lot + titre enrichi marque + référence de lot
  // (anti-contenu dupliqué : chaque passeport a son propre extrait Google).
  const metaDescription = buildLotMetaDescription(lot);
  const refMeta = lot.lotNumber || lot.reference;
  const titre = `${lot.product.name}${
    lot.product.brand ? ` — ${lot.product.brand}` : ""
  }${refMeta ? ` · Lot ${refMeta}` : ""} | Passeport numérique VerifScan`;

  return {
    title: titre,
    description: metaDescription,
    // Canonical « parlante » : /p/{id}-{nom-produit-marque}. La forme
    // courte (QR codes) est servie en 200 et consolidée ici par Google.
    alternates: {
      canonical: buildProductPath(lot.id, lot.product.name, lot.product.brand),
    },
    keywords: [
      lot.product.name,
      lot.product.brand,
      lot.product.category,
      lot.fabricant.companyName,
      "passeport numérique",
      "traçabilité",
      "authenticité",
      "VerifScan",
    ]
      .filter((k): k is string => !!k)
      .join(", "),
    openGraph: {
      title: titre,
      description: metaDescription,
      url: buildProductPath(lot.id, lot.product.name, lot.product.brand),
      type: "website",
      ...(imageProduit ? { images: [{ url: imageProduit }] } : {}),
    },
    twitter: {
      card: imageProduit ? "summary_large_image" : "summary",
      title: titre,
      description: metaDescription,
      ...(imageProduit ? { images: [imageProduit] } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ lotId: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { lotId } = await params;
  // ⚠️ awaiter UNE fois dans une variable dédiée : `searchParams` reste la
  // Promise — Object.entries(searchParams) sur la Promise renvoie [] et la
  // query string (?code= d'attribution QR) était perdue à la redirection.
  const sp = await searchParams;
  const qrCodeId = sp.code;
  // URL parlante acceptée : /p/{id}-{slug} — on récupère le vrai id de lot
  // (cuid sans tiret) avant la requête. Les QR codes courts passent tels quels.
  const realLotId = parseLotIdParam(lotId);

  let lot: Awaited<ReturnType<typeof getLotWithDetails>> = null;
  try {
    lot = await getLotWithDetails(realLotId);
  } catch (e) {
    // This is the real "server-side exception" path. Log it clearly so we
    // can debug, then fall through to the not-found / mock handling below.
    console.error("[ProductPage /p/[lotId]] getLotWithDetails threw:", e);
  }

  if (!lot) {
    // ── VRAI statut 404 (correctif Search Console « Introuvable (404) ») ──
    // Auparavant cette branche rendait une page amicale en STATUT 200
    // (soft-404) : Google la considérait comme un contenu indexable et le
    // rapport Search Console polluait les motifs de non-indexation.
    // notFound() renvoie désormais le statut HTTP 404 correct tout en
    // affichant une page BRANDING (voir src/app/p/[lotId]/not-found.tsx) —
    // l'expérience « scan QR d'un lot non enregistré » reste soignée
    // (en-tête/pied publics + lien catalogue), mais le signal envoyé aux
    // moteurs est net : la page n'existe pas, retirez-la de l'index.
    notFound();
  }

  // ── Canonicalisation de l'URL passeport (correctif Search Console) ─────
  // La forme courte QR « /p/{id} » (et toute ancienne forme parlante après
  // renommage produit) est désormais REDIRIGÉE EN 308 PERMANENT vers la
  // forme parlante canonique au lieu d'être servie en 200 + balise
  // canonical. Motif Search Console visé : « Autre page avec balise
  // canonique correcte » — la redirection 308 consolide définitivement les
  // signaux, supprime le contenu dupliqué 200/200 et nettoie le rapport.
  // Les QR codes imprimés continuent de fonctionner (les lecteurs suivent
  // les redirections) ; le paramètre ?code= d'attribution est préservé.
  const cheminParlant = buildProductPath(
    lot.id,
    lot.product.name,
    lot.product.brand,
  );
  const segmentParlant = cheminParlant.replace(/^\/p\//, "");
  const segmentRecu = decodeUrlSafe(lotId);
  if (segmentRecu !== segmentParlant) {
    // Reconstruction de la query string (au minimum ?code= pour
    // l'attribution analytics du QR scanné) — sans elle, les scans
    // attribués par code QR seraient comptés comme scans directs.
    const usp = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(sp)) {
      const val = Array.isArray(valeur) ? valeur[0] : valeur;
      if (typeof val === "string" && val !== "") usp.set(cle, val);
    }
    const qs = usp.toString();
    permanentRedirect(`${cheminParlant}${qs ? `?${qs}` : ""}`);
  }

  // Fire and forget — don't block the page render on scan recording.
  // Skip bots/crawlers so analytics counters aren't inflated by search
  // engines or uptime monitors hitting the page.
  // If the QR code ID is in the ?code= param, record it so we can track
  // which specific QR code was scanned (useful for attribution analytics).
  try {
    const h = await headers();
    const ua = h.get("user-agent") || "";
    if (ua && !isBotUserAgent(ua)) {
      void recordScan(lot.id, {
        userAgent: ua || undefined,
        qrCodeId: qrCodeId || undefined,
      }).catch((e) =>
        console.error("[ProductPage] recordScan failed:", e),
      );
    }
  } catch (e) {
    console.error("[ProductPage] headers() failed:", e);
  }

  // Similar products (same category, excluding current product).
  // Wrapped in try/catch so a failure here doesn't crash the whole page —
  // we just render without the "similar products" section.
  let similar: Awaited<ReturnType<typeof getSimilarProducts>> = [];
  try {
    similar = await getSimilarProducts(
      lot.product.categoryId,
      lot.product.id,
      4,
    );
  } catch (e) {
    console.error("[ProductPage] getSimilarProducts failed:", e);
  }

  const totalCerts =
    (lot.lotCerts?.length ?? 0) +
    (lot.fabricantCerts?.length ?? 0) +
    (lot.productCertifications?.length ?? 0);

  // Maillage interne contextuel : page métiers du secteur de la catégorie.
  const industrie = getIndustry(
    industryIdForCategory(lot.product.category) ?? "",
  );

  // ── JSON-LD « Product » — référencement Google des passeports produits ──
  // Données structurées lues par Googlebot (rich results) : nom, marque,
  // image, SKU/GTIN, note agrégée des avis approuvés. Sécurité : les
  // valeurs optionnelles sont simplement omises du graphe.
  const siteUrlPage = await getSiteUrl();
  const imagePage = lot.product.imageUrl
    ? absolutiser(lot.product.imageUrl, siteUrlPage)
    : undefined;
  const marqueNom =
    lot.product.brand || lot.fabricant.companyName || "VerifScan";
  const notesApprouvees = (lot.reviews ?? []).map((r) => r.rating);
  // ── Exigence Google « Extraits de produits » ────────────────────────────
  // Un graphe « Product » DOIT contenir au moins UN de : offers / review /
  // aggregateRating — sinon Search Console signale le problème critique
  // « Il faut indiquer "offers", "review", ou "aggregateRating" » et la
  // page perd son éligibilité aux rich results.
  //   - Avis approuvés → aggregateRating + review[] (étoiles dans Google).
  //   - Aucun avis     → Offer de secours (honnête : disponibilité + URL +
  //     devise ; le produit fabricant n'expose pas de prix public — ne
  //     JAMAIS inventer un prix ni un avis).
  // ── URL passeport « parlante » (SEO) — calculée plus haut pour la
  // canonicalisation 308 ; réutilisée ici par le JSON-LD ──────────────────
  const offersFallback = {
    "@type": "Offer",
    url: `${siteUrlPage}${cheminParlant}`,
    priceCurrency: "XOF",
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
  };
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: lot.product.name,
    ...(lot.product.description
      ? { description: lot.product.description }
      : {}),
    ...(imagePage ? { image: [imagePage] } : {}),
    url: `${siteUrlPage}${cheminParlant}`,
    brand: { "@type": "Brand", name: marqueNom },
    manufacturer: {
      "@type": "Organization",
      name: lot.fabricant.companyName || lot.fabricant.name || marqueNom,
    },
    sku: lot.lotNumber || lot.reference,
    // Dates propres au lot — données structurées différenciantes (Google
    // ignore les propriétés inconnues, les connues enrichissent la fiche).
    ...(lot.manufactureDate
      ? { productionDate: lot.manufactureDate.toISOString() }
      : {}),
    ...(lot.expiryDate ? { expiryDate: lot.expiryDate.toISOString() } : {}),
    ...(lot.product.barcode ? { gtin13: lot.product.barcode } : {}),
    ...(lot.product.category ? { category: lot.product.category } : {}),
    ...(notesApprouvees.length > 0
      ? {
          aggregateRating: {
            "@type": "aggregateRating",
            ratingValue:
              Math.round(
                (notesApprouvees.reduce((s, r) => s + r, 0) /
                  notesApprouvees.length) *
                  10,
              ) / 10,
            reviewCount: notesApprouvees.length,
          },
          review: (lot.reviews ?? [])
            .filter((r) => r.authorName || r.comment)
            .slice(0, 10)
            .map((r) => ({
              "@type": "Review",
              ...(r.authorName
                ? { author: { "@type": "Person", name: r.authorName } }
                : {}),
              ...(r.comment ? { reviewBody: r.comment } : {}),
              datePublished: r.createdAt.toISOString().slice(0, 10),
              reviewRating: {
                "@type": "Rating",
                ratingValue: r.rating,
                bestRating: 5,
                worstRating: 1,
              },
            })),
        }
      : { offers: offersFallback }),
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-[#F0F4F9] to-purple-50">
      {/* JSON-LD « Product » — données structurées pour Google (indexation
          des passeports produits + rich results). Côté serveur uniquement. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── HERO IMMERSIF — photo produit PLEIN ÉCRAN, même présentation que
          la page artisan (/a/[code]) : zoom lent Ken Burns, pilule VerifScan,
          bouton « Découvrir » + badge d'authenticité. La photo occupe tout
          le premier écran au scan (demande utilisateur).

          ⚠️ PAS de PublicHeader sur cette page (retour utilisateur : la barre
          sticky logo + menu se collait en haut au défilement puis glissait
          PAR-DESSUS la photo du hero — « le logo se chevauche sur l'image »,
          « le menu ne doit pas s'afficher sur la page produit », web comme
          mobile). Même présentation que la page artisan : la navigation
          reste assurée par la pilule VerifScan du hero (lien accueil) et le
          footer (Connexion, Devenir partenaire, plan du site). */}
      <ImmersiveHero
        imageUrl={lot.product.imageUrl}
        productName={lot.product.name}
        emoji={categoryEmoji(lot.product.category)}
        isActive={lot.status === "ACTIVE"}
        targetId="produit"
      />

      {/* ── Background decorations: floating colored blobs ───────────────
          Three large blurred circles that slowly float around, creating
          a dynamic, premium atmosphere. `pointer-events-none` so they
          never interfere with clicks. `mix-blend-multiply` makes them
          blend softly into the background. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="wow-animate-float absolute -left-20 top-0 h-96 w-96 rounded-full bg-purple-300 opacity-20 mix-blend-multiply blur-3xl" />
        <div
          className="wow-animate-float absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#8FA9C9] opacity-20 mix-blend-multiply blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="wow-animate-float absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-pink-300 opacity-20 mix-blend-multiply blur-3xl"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        {/* 1. HERO WOW — bandeau authentique + carte produit + stats.
            Ancre #produit : cible du bouton « Découvrir » du hero immersif.
            scroll-mt-6 : petite marge de respiration sous le bord haut —
            plus de header sticky à compenser (barre retirée de cette page). */}
        <div id="produit" className="scroll-mt-6">
          <WowHero
            product={lot.product}
            lot={lot}
            fabricant={lot.fabricant}
          />
        </div>

        {/* 2. FRAÎCHEUR GLOW — barre de fraîcheur animée */}
        <FreshnessGlow
          expiryDate={lot.expiryDate}
          manufactureDate={lot.manufactureDate}
        />

        {/* 2a. SIGNALEMENT PRODUIT PÉRIMÉ — bouton CTA visible (sécurité conso) */}
        <ReportExpiredModal
          lotId={lot.id}
          productName={lot.product.name}
          fabricantId={lot.fabricantId}
          lotReference={lot.reference}
        />

        {/* 2b. FIDÉLITÉ CONSO — widget points/badges (V3 Module 5) */}
        <LoyaltyWidget lotId={lot.id} productName={lot.product.name} />

        {/* 3. CONTACT ORB — boutons contact premium */}
        <ContactOrb fabricant={lot.fabricant} />

        {/* 3b. DEMANDE DE DEVIS B2B — marketplace inquiry (V3 Module 2) */}
        <div className="rounded-2xl border border-[#10B981]/20 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#10B981] text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#111827]">Vous êtes distributeur ?</h3>
                <p className="text-[13px] text-[#6B7280]">Demandez un devis personnalisé pour ce produit. Réponse sous 48h.</p>
              </div>
            </div>
            <InquiryModal
              productId={lot.product.id}
              productName={lot.product.name}
              fabricantName={lot.fabricant?.companyName ?? lot.fabricant?.name ?? "Fabricant"}
            />
          </div>
        </div>

        {/* 4. ACCORDÉONS WOW — sections repliables premium */}
        <div className="space-y-4">
          {/* Ingrédients & Allergènes — OPEN by default (essential info) */}
          <WowAccordion
            title="Ingrédients & Allergènes"
            icon="🌾"
            defaultOpen={true}
            color="green"
          >
            <CompactIngredients lot={lot} />
          </WowAccordion>

          {/* Conseils d'utilisation / Précautions / Conservation — remplis
              via l'assistant intelligent (produits types), modifiables par
              le fabricant. Section absente si rien n'a été renseigné. */}
          {(lot.product.usageTips ||
            lot.product.precautions ||
            lot.product.storageConditions) && (
            <WowAccordion
              title="Conseils & Précautions"
              icon="💡"
              defaultOpen={true}
              color="amber"
            >
              <ProductDetailsSection
                usageTips={lot.product.usageTips}
                precautions={lot.product.precautions}
                storageConditions={lot.product.storageConditions}
                showFreshness={false}
              />
            </WowAccordion>
          )}

          {/* Traçabilité complète */}
          <WowAccordion
            title="Traçabilité complète"
            icon="📍"
            defaultOpen={false}
            color="blue"
          >
            <CompactTraceability lot={lot} />
          </WowAccordion>

          {/* Historique du lot */}
          <WowAccordion
            title="Historique du lot"
            icon="⏱️"
            defaultOpen={false}
            color="purple"
            badge={
              lot.historyEvents?.length
                ? String(lot.historyEvents.length)
                : undefined
            }
          >
            <CompactHistory events={lot.historyEvents} />
          </WowAccordion>

          {/* Score de transparence */}
          <WowAccordion
            title="Score de transparence"
            icon="💎"
            defaultOpen={false}
            color="amber"
            badge={`${lot.transparency.score}/${lot.transparency.maxScore}`}
          >
            <TransparencyLite transparency={lot.transparency} />
          </WowAccordion>

          {/* Certifications */}
          <WowAccordion
            title="Certifications"
            icon="🏆"
            defaultOpen={false}
            color="emerald"
            badge={totalCerts > 0 ? String(totalCerts) : undefined}
          >
            {/* Section 1: certifications produits (catalogue VerifScan — Bio, Halal, ISO 22000…) */}
            {lot.productCertifications && lot.productCertifications.length > 0 && (
              <div className="mb-4">
                <CertificationsSection
                  certifications={lot.productCertifications}
                  showTitle
                  compact
                />
              </div>
            )}
            {/* Section 2: certifications du lot + certifications du fabricant (legacy) */}
            <CompactCertifications
              lotCerts={lot.lotCerts}
              fabricantCerts={lot.fabricantCerts}
            />
          </WowAccordion>

          {/* Avis consommateurs */}
          <WowAccordion
            title="Avis consommateurs"
            icon="⭐"
            defaultOpen={false}
            color="yellow"
            badge={
              lot.product.totalReviews
                ? String(lot.product.totalReviews)
                : undefined
            }
          >
            <div id="avis-consommateurs">
              <CompactReviews
                reviews={lot.reviews}
                averageRating={lot.product.averageRating}
                totalReviews={lot.product.totalReviews}
                lotId={lot.id}
                productName={lot.product.name}
              />
            </div>
          </WowAccordion>
        </div>

        {/* Similar products (still full-width, outside accordions) */}
        {similar.length > 0 && <SimilarProducts products={similar} />}

        {/* ── MAILLAGE INTERNE (SEO) — depuis chaque passeport (des milliers
            de pages indexables), le robot découvre le catalogue, la page
            métiers du secteur (12 pages SSG) et le blog (guides conformité
            export). Ancres descriptives, liens réels côté serveur. */}
        <section
          aria-labelledby="explorer-verifscan"
          className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm"
        >
          <h2
            id="explorer-verifscan"
            className="text-[15px] font-bold text-[#111827]"
          >
            Explorer VerifScan
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[#4B5563]">
            <li>
              <Link
                href="/produits"
                className="font-semibold text-[#059669] hover:underline"
              >
                Catalogue des produits vérifiés
              </Link>{" "}
              — tous les passeports numériques actifs de la plateforme.
            </li>
            {industrie && (
              <li>
                <Link
                  href={`/metiers/${industrie.id}`}
                  className="font-semibold text-[#059669] hover:underline"
                >
                  Traçabilité : {industrie.title}
                </Link>{" "}
                — défis, solutions et exigences du passeport numérique dans ce
                secteur.
              </li>
            )}
            <li>
              <Link
                href="/blog"
                className="font-semibold text-[#059669] hover:underline"
              >
                Blog traçabilité &amp; conformité export
              </Link>{" "}
              — guides HACCP, certificat phytosanitaire, normes IFS/BRC,
              Global GAP.
            </li>
          </ul>
        </section>

        {/* 5. FOOTER VÉRIFICATION GLOW — spectacular verification footer */}
        <VerificationGlow lot={lot} />
      </main>

      {/* Notification visuelle : propose de laisser un avis après 10s */}
      <ReviewPrompt
        productName={lot.product.name}
        reviewSectionId="avis-consommateurs"
      />

      <PublicFooter />
    </div>
  );
}
