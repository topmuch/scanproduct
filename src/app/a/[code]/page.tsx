import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ArtisanProductView } from "@/components/product/artisan/ArtisanProductView";
import { InactiveMasterView } from "@/components/product/artisan/InactiveMasterView";
import { InactiveProductView } from "@/components/product/artisan/InactiveProductView";
import { parseCounterfeitAlert } from "@/lib/artisan-anti-counterfeit";
import { ensureArtisanTables, isTableMissingError } from "@/lib/ensure-artisan-tables";

/**
 * Page publique des produits ARTISANAUX : /a/<code>
 *   - code MASTER-… inactif  → page d'accueil du maître (CTA activation)
 *   - code ART-… inactif     → page d'attente (pack pas encore activé)
 *   - code actif             → page produit artisan (photo, fraîcheur,
 *                              WhatsApp direct, compteur de scans, avis,
 *                              alerte contrefaçon, réseaux sociaux)
 *
 * Le système FORMEL garde sa page dédiée /p/[lotId] — zéro régression.
 */

export const dynamic = "force-dynamic";

/** URL absolue pour les meta OG (WhatsApp exige une URL complète). */
async function absoluteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "verifscan.sn";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Aperçu RICHE quand le lien est partagé sur WhatsApp/Facebook/X :
 * titre produit + artisan, description « Produit Authentique vérifié »,
 * image = photo du produit. (robots noindex conservé : pages à usage
 * unique sans intérêt SEO, mais les crawlers sociaux lisent quand même
 * les balises OG.)
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const lot = await db.preActivatedLot
    .findUnique({
      where: { qrCode: code },
      select: {
        productName: true,
        artisanName: true,
        photoUrl: true,
        artisanBio: true,
        status: true,
        pack: { select: { status: true } },
      },
    })
    .catch(() => null);

  if (!lot) {
    return { title: "Produit — VerifScan", robots: { index: false } };
  }

  const productName = lot.productName ?? "Produit artisanal";
  const artisanName = lot.artisanName ?? "Artisan";
  const isActive = lot.status === "active" && lot.pack.status === "activated";
  const description = isActive
    ? `Produit Authentique vérifié par VerifScan — fabriqué à la main par ${artisanName}. Photos, fraîcheur, avis clients et contact direct.`
    : `Découvrez ${productName} de ${artisanName} sur VerifScan — la traçabilité artisanale.`;

  const origin = await absoluteOrigin();
  const ogImage = lot.photoUrl && lot.photoUrl.startsWith("/") ? `${origin}${lot.photoUrl}` : lot.photoUrl ?? undefined;

  return {
    title: `${productName} — ${artisanName} | Produit Authentique VerifScan`,
    description,
    robots: { index: false },
    openGraph: {
      title: `✅ ${productName} — Produit Authentique`,
      description: description.slice(0, 200),
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: productName }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `✅ ${productName} — Produit Authentique`,
      description: description.slice(0, 200),
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/** Charge les avis du lot — auto-réparation si table ArtisanReview absente. */
async function loadReviews(lotId: string) {
  const fetchReviews = () =>
    db.artisanReview.findMany({
      where: { lotId, hidden: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        authorName: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

  try {
    return await fetchReviews();
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          return await fetchReviews();
        } catch {
          // rejeu échoué → section avis vide, page fonctionnelle
        }
      }
    }
    console.error("[a/[code]] chargement des avis échoué (non bloquant):", error);
    return [];
  }
}

export default async function ArtisanCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const lot = await db.preActivatedLot.findUnique({
    where: { qrCode: code },
    include: { pack: true },
  });

  if (!lot) {
    notFound();
  }

  if (lot.status === "inactive" || lot.pack.status !== "activated") {
    if (lot.isMaster) {
      return <InactiveMasterView masterCode={lot.qrCode} packSize={lot.pack.quantity} />;
    }
    return (
      <InactiveProductView
        qrCode={lot.qrCode}
        hint="Ce produit n'a pas encore été activé par son artisan."
      />
    );
  }

  // Produit actif → compteur de scans (preuve sociale « Vérifié N fois »)
  const scanCount = await db.artisanScan.count({ where: { lotId: lot.id } }).catch(() => 0);

  // Avis clients réels (section 9)
  const reviews = await loadReviews(lot.id);

  // Produits similaires : autres produits ACTIFS du même artisan (max 4).
  // La section ne s'affiche que s'il y en a — pas de cartes factices.
  let similarProducts: Array<{
    qrCode: string;
    productName: string;
    photoUrl: string | null;
    contenance: string | null;
  }> = [];
  try {
    const rows = await db.preActivatedLot.findMany({
      where: {
        artisanName: lot.artisanName ?? undefined,
        status: "active",
        isMaster: false,
        id: { not: lot.id },
      },
      select: { qrCode: true, productName: true, photoUrl: true, contenance: true },
      orderBy: { activatedAt: "desc" },
      take: 4,
    });
    similarProducts = rows.map((p) => ({
      qrCode: p.qrCode,
      productName: p.productName ?? "Produit artisanal",
      photoUrl: p.photoUrl,
      contenance: p.contenance,
    }));
  } catch (e) {
    // Non bloquant : la page produit reste fonctionnelle sans suggestions
    console.error("[a/[code]] produits similaires:", e);
  }

  // Galerie atelier + réseaux sociaux (JSON/colonnes optionnelles du pack)
  const artisanPhotos = (() => {
    if (!lot.pack.artisanPhotos) return [];
    try {
      const arr = JSON.parse(lot.pack.artisanPhotos) as unknown;
      return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string").slice(0, 3) : [];
    } catch {
      return [];
    }
  })();

  return (
    <ArtisanProductView
      lot={{
        qrCode: lot.qrCode,
        productName: lot.productName ?? "Produit artisanal",
        contenance: lot.contenance ?? "",
        ingredients: lot.ingredients ?? "",
        manufacturingDate: lot.manufacturingDate,
        expirationDate: lot.expirationDate,
        artisanName: lot.artisanName ?? "Artisan",
        contactPhone: lot.contactPhone ?? "",
        contactEmail: lot.pack.artisanEmail ?? null,
        photoUrl: lot.photoUrl,
        artisanBio: lot.artisanBio,
        usageTips: lot.usageTips,
      }}
      scanCount={scanCount}
      counterfeitAlert={parseCounterfeitAlert(lot.counterfeitAlert)}
      socials={{
        instagramUrl: lot.pack.instagramUrl,
        facebookUrl: lot.pack.facebookUrl,
        tiktokUrl: lot.pack.tiktokUrl,
      }}
      artisanPhotos={artisanPhotos}
      initialReviews={reviews}
      similarProducts={similarProducts}
    />
  );
}
