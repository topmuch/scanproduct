import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ArtisanProductView } from "@/components/product/artisan/ArtisanProductView";
import { InactiveMasterView } from "@/components/product/artisan/InactiveMasterView";
import { InactiveProductView } from "@/components/product/artisan/InactiveProductView";

/**
 * Page publique des produits ARTISANAUX : /a/<code>
 *   - code MASTER-… inactif  → page d'accueil du maître (CTA activation)
 *   - code ART-… inactif     → page d'attente (pack pas encore activé)
 *   - code actif             → page produit artisan (photo, fraîcheur,
 *                              WhatsApp direct)
 *
 * Le système FORMEL garde sa page dédiée /p/[lotId] — zéro régression.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produit artisanal — VerifScan",
  robots: { index: false }, // pages à usage unique : pas d'intérêt SEO
};

function deviceTypeFromUserAgent(ua: string | null): string {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (s.includes("ipad") || (s.includes("android") && !s.includes("mobile"))) return "tablet";
  if (s.includes("mobile")) return "mobile";
  return "desktop";
}

/** Journalise le scan d'un produit artisanal actif (fire-and-forget). */
async function recordArtisanScan(lotId: string) {
  try {
    const h = await headers();
    await db.artisanScan.create({
      data: {
        lotId,
        deviceType: deviceTypeFromUserAgent(h.get("user-agent")),
        country: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null,
        city: h.get("x-vercel-ip-city") ?? null,
      },
    });
  } catch (e) {
    console.error("[a/[code]] recordArtisanScan a échoué:", e);
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

  // Produit actif → journaliser le scan (sans bloquer le rendu)
  void recordArtisanScan(lot.id);

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
      similarProducts={similarProducts}
    />
  );
}
