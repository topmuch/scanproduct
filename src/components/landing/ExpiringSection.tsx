import { db } from "@/lib/db";
import { ExpiringProductsClient, type ExpiringProductItem } from "./ExpiringProductsClient";

/**
 * ExpiringSection — Server Component.
 *
 * VerifScan-specific twist on Nest "Deals Of The Day": instead of discounts,
 * we surface 4 lots whose expiry date is approaching. Each card has a live
 * countdown (days / hours / mins / secs) until the lot expires.
 *
 * This is genuinely useful for VerifScan: a consumer looking at the home page
 * can see which products need to be scanned/consumed soon — a real differentiator
 * vs. a plain e-commerce catalog.
 */
export async function ExpiringSection() {
  let items: ExpiringProductItem[] = [];

  try {
    // Fetch the 4 nearest-expiring ACTIVE lots, with their product + fabricant.
    const lots = await db.lot.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: { gte: new Date() }, // only future-expiring
      },
      orderBy: { expiryDate: "asc" },
      take: 4,
      include: {
        product: {
          include: {
            categoryRef: true,
          },
        },
      },
    });

    const fabricantIds = [...new Set(lots.map((l) => l.product?.fabricantId).filter(Boolean) as string[])];
    const fabricants = await db.user.findMany({
      where: { id: { in: fabricantIds } },
      select: {
        id: true,
        name: true,
        companyName: true,
        logoUrl: true,
        isVerified: true,
      },
    });
    const fabricantMap = new Map(fabricants.map((f) => [f.id, f]));

    items = lots
      .filter((l) => l.product) // safety: skip orphan lots
      .map((l) => {
        const product = l.product!;
        const fabricant = fabricantMap.get(product.fabricantId);
        return {
          lotId: l.id,
          lotReference: l.reference,
          expiryDate: l.expiryDate.toISOString(),
          productName: product.name,
          productBrand: product.brand ?? null,
          productImage: product.imageUrl ?? null,
          productWeight: product.weight ?? null,
          category: product.category ?? null,
          categoryEmoji: product.categoryRef?.emoji ?? null,
          transparencyScore: product.transparencyScore ?? 0,
          averageRating: product.averageRating ?? 0,
          totalReviews: product.totalReviews ?? 0,
          fabricant: fabricant
            ? {
                companyName: fabricant.companyName ?? fabricant.name ?? null,
                logoUrl: fabricant.logoUrl ?? null,
                isVerified: fabricant.isVerified ?? false,
              }
            : null,
        } satisfies ExpiringProductItem;
      });
  } catch (e) {
    console.error("[ExpiringSection] failed to fetch:", e);
    return null;
  }

  if (items.length === 0) return null;

  return <ExpiringProductsClient items={items} />;
}
