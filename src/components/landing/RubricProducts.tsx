import { db } from "@/lib/db";
import { getAllProducts } from "@/lib/public-data";
import { PopularProductsGrid, type PopularProductItem } from "./PopularProductsGrid";

/**
 * RubricProducts — Server Component.
 *
 * Fetches products filtered by the rubric type, then renders them using
 * the shared PopularProductsGrid (3-col layout, big images, "Scanner le QR"
 * CTA on each card).
 *
 * Rubric types:
 *   - "authentiques" : products with transparencyScore >= 71 (levels or+)
 *   - "local"        : products from manufacturers based in Sénégal
 *   - "export"       : products marked isExport = true
 *
 * Each rubric has its own title/subtitle/sectionId so the grid header is
 * contextually relevant.
 */

export type RubricType = "authentiques" | "local" | "export";

type RubricMeta = {
  title: string;
  subtitle: string;
  sectionId: string;
  emptyMessage: string;
};

const RUBRIC_META: Record<RubricType, RubricMeta> = {
  authentiques: {
    title: "Produits 100% authentiques",
    subtitle: "Score de transparence Or ou supérieur — origine et traçabilité vérifiées",
    sectionId: "produits-authentiques",
    emptyMessage:
      "Aucun produit authentique pour le moment. Les produits avec un score de transparence élevé apparaîtront ici.",
  },
  local: {
    title: "Soutenez nos produits",
    subtitle: "Fabriqués par nos producteurs locaux au Sénégal — savoir-faire d'ici",
    sectionId: "produits-locaux",
    emptyMessage:
      "Aucun produit local pour le moment. Les produits de nos fabricants sénégalais apparaîtront ici.",
  },
  export: {
    title: "Certifié pour l'export",
    subtitle: "Produits prêts pour l'export — normes internationales & traçabilité complète",
    sectionId: "produits-export",
    emptyMessage:
      "Aucun produit certifié pour l'export pour le moment. Les produits marqués pour l'export apparaîtront ici.",
  },
};

// Map a raw product (from getAllProducts or a custom db query) to the shape
// expected by PopularProductsGrid.
function toGridItem(p: {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  weight: string | null;
  transparencyScore: number | null;
  totalScans: number | null;
  averageRating: number | null;
  totalReviews: number | null;
  categoryRef?: { emoji: string | null } | null;
  fabricant?:
    | {
        name: string | null;
        companyName: string | null;
        logoUrl: string | null;
        isVerified: boolean | null;
      }
    | null;
  latestLot?: { id: string } | null;
  lots?: { id: string }[];
}): PopularProductItem {
  const latestLot = p.latestLot ?? (p.lots && p.lots.length > 0 ? p.lots[0] : null);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? null,
    category: p.category ?? null,
    imageUrl: p.imageUrl ?? null,
    weight: p.weight ?? null,
    transparencyScore: p.transparencyScore ?? 0,
    totalScans: p.totalScans ?? 0,
    averageRating: p.averageRating ?? 0,
    totalReviews: p.totalReviews ?? 0,
    categoryEmoji: p.categoryRef?.emoji ?? null,
    fabricant: p.fabricant
      ? {
          name: p.fabricant.name ?? null,
          companyName: p.fabricant.companyName ?? null,
          logoUrl: p.fabricant.logoUrl ?? null,
          isVerified: p.fabricant.isVerified ?? false,
        }
      : null,
    latestLotId: latestLot?.id ?? null,
  };
}

async function fetchAuthentiques(): Promise<PopularProductItem[]> {
  // Products with transparencyScore >= 71 (level "or" or "platine")
  const { products } = await getAllProducts({
    sort: "transparency",
    transparency: "or",
    limit: 12,
    page: 1,
  });
  return products.map(toGridItem);
}

async function fetchLocal(): Promise<PopularProductItem[]> {
  // Products from manufacturers based in Sénégal.
  // We query products whose fabricant.country contains "Sénégal" or "Senegal".
  const products = await db.product.findMany({
    where: {
      isPublic: true,
      status: "ACTIVE",
      fabricant: {
        country: { contains: "Sén" },
      },
    },
    orderBy: { totalScans: "desc" },
    take: 12,
    include: {
      categoryRef: true,
      lots: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Fetch fabricants separately (consistent with getAllProducts pattern)
  const fabricantIds = [...new Set(products.map((p) => p.fabricantId))];
  const fabricants = await db.user.findMany({
    where: { id: { in: fabricantIds } },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      city: true,
      country: true,
      isVerified: true,
    },
  });
  const fabricantMap = new Map(fabricants.map((f) => [f.id, f]));

  return products.map((p) =>
    toGridItem({
      ...p,
      fabricant: fabricantMap.get(p.fabricantId) ?? null,
      latestLot: p.lots[0] ?? null,
    }),
  );
}

async function fetchExport(): Promise<PopularProductItem[]> {
  // Products marked for export
  const products = await db.product.findMany({
    where: {
      isPublic: true,
      status: "ACTIVE",
      isExport: true,
    },
    orderBy: { totalScans: "desc" },
    take: 12,
    include: {
      categoryRef: true,
      lots: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const fabricantIds = [...new Set(products.map((p) => p.fabricantId))];
  const fabricants = await db.user.findMany({
    where: { id: { in: fabricantIds } },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      city: true,
      country: true,
      isVerified: true,
    },
  });
  const fabricantMap = new Map(fabricants.map((f) => [f.id, f]));

  return products.map((p) =>
    toGridItem({
      ...p,
      fabricant: fabricantMap.get(p.fabricantId) ?? null,
      latestLot: p.lots[0] ?? null,
    }),
  );
}

export async function RubricProducts({ rubric }: { rubric: RubricType }) {
  const meta = RUBRIC_META[rubric];

  let items: PopularProductItem[] = [];
  try {
    switch (rubric) {
      case "authentiques":
        items = await fetchAuthentiques();
        break;
      case "local":
        items = await fetchLocal();
        break;
      case "export":
        items = await fetchExport();
        break;
    }
  } catch (e) {
    console.error(`[RubricProducts] failed to fetch ${rubric}:`, e);
  }

  return (
    <PopularProductsGrid
      items={items}
      title={meta.title}
      subtitle={meta.subtitle}
      sectionId={meta.sectionId}
      showViewAll={false}
      emptyMessage={meta.emptyMessage}
    />
  );
}
