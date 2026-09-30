import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ArtisanProductView } from "@/components/product/artisan/ArtisanProductView";
import { InactiveMasterView } from "@/components/product/artisan/InactiveMasterView";
import { InactiveProductView } from "@/components/product/artisan/InactiveProductView";
import {
  isReliableRegion,
  parseCounterfeitAlert,
} from "@/lib/artisan-anti-counterfeit";
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
  const isActive = lot.status === "active"; // pack partiel = produits actifs visibles
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

  // Requête principale PROTÉGÉE : en prod, une DB persistante créée avant
  // l'ajout de colonnes au schéma (ex. productPrice/productDesignation de
  // l'activation flexible) fait échouer findUnique avec P2022 → « Application
  // error » sur TOUS les QR scannés. Auto-réparation au moment de l'erreur
  // (ALTER TABLE ADD COLUMN via le même canal Prisma) puis rejeu UNE fois —
  // même stratégie que les routes API (activate-pack, track-scan…).
  const loadLot = () =>
    db.preActivatedLot.findUnique({
      where: { qrCode: code },
      include: { pack: { include: { lots: true } } },
    });

  let lot: Awaited<ReturnType<typeof loadLot>> = null;
  try {
    lot = await loadLot();
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          lot = await loadLot();
        } catch (retryError) {
          console.error("[a/[code]] rejeu après auto-réparation échoué:", retryError);
        }
      } else {
        console.error("[a/[code]] auto-réparation impossible:", heal.errors);
      }
    } else {
      throw error;
    }
  }

  if (!lot) {
    notFound();
  }

  // UN LOT ACTIF EST TOUJOURS VISIBLE — même si le pack n'est que partiel
  // (activation flexible : 100 karité actives sur 200, les 100 autres
  // attendent). Seul le statut du LOT décide de la vue.
  if (lot.status === "inactive") {
    if (lot.isMaster) {
      // Progression d'activation (mode flexible : plusieurs produits)
      const productLots = lot.pack.lots.filter((l) => !l.isMaster);
      const activatedCount = productLots.filter((l) => l.status === "active").length;
      const groupMap = new Map<string, { productName: string; count: number }>();
      for (const l of productLots
        .filter((l) => l.status === "active")
        .sort((a, b) => a.qrCode.localeCompare(b.qrCode))) {
        const name = l.productName ?? "Produit sans nom";
        const g = groupMap.get(name);
        if (g) g.count += 1;
        else groupMap.set(name, { productName: name, count: 1 });
      }
      return (
        <InactiveMasterView
          masterCode={lot.qrCode}
          packSize={lot.pack.quantity}
          activatedCount={activatedCount}
          groups={[...groupMap.values()]}
        />
      );
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
        // Activation flexible : chaque lot porte SON prix / SA désignation
        // (fallback pack pour les packs mono-produit historiques)
        productPrice: lot.productPrice ?? lot.pack.productPrice ?? null,
        productDesignation: lot.productDesignation ?? lot.pack.productDesignation ?? null,
        photoUrl: lot.photoUrl,
        artisanBio: lot.artisanBio,
        usageTips: lot.usageTips,
      }}
      scanCount={scanCount}
      counterfeitAlert={(() => {
        const alert = parseCounterfeitAlert(lot.counterfeitAlert);
        if (!alert) return null;
        // Filet d'affichage : une alerte fondée sur une région non géographique
        // (UTC / Etc/* — fuseau par défaut de certains navigateurs) est un faux
        // positif → on ne la montre JAMAIS. Complète l'auto-purge de la lib.
        return isReliableRegion(alert.regionA) && isReliableRegion(alert.regionB)
          ? alert
          : null;
      })()}
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
