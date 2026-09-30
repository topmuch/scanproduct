import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { INDUSTRIES } from "@/lib/industries";
import { getSiteUrl } from "@/lib/seo";

/**
 * Sitemap dynamique (/sitemap.xml).
 *
 * - Routes statiques publiques avec priorités différenciées.
 * - Passeports produits (/p/[lotId]) : lots récents récupérés depuis la DB
 *   (accès direct Prisma — le sitemap tourne côté serveur). En cas d'erreur
 *   DB (build sans base, incident), on sert les routes statiques quand même
 *   pour ne jamais renvoyer un sitemap vide ou en erreur.
 * - L'origine canonique est résolue dynamiquement (Setting siteUrl éditée
 *   par le SuperAdmin → fallback verifscan.com) via getSiteUrl().
 *
 * Référencé dans public/robots.txt (directive Sitemap).
 */

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const SITE_URL = await getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/produits`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    // Pages métiers (12) — ex-modales de la landing, désormais référençables.
    ...INDUSTRIES.map((i) => ({
      url: `${SITE_URL}/metiers/${i.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${SITE_URL}/carrieres`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/politique-confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    // Articles de blog publiés — référencement Google du blog.
    const posts = await db.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 200,
    });

    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt ?? now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    // Passeports numériques publics — 500 lots les plus récents.
    // On privilégie les lots avec QR actif si le champ existe.
    const lots = await db.lot.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    const lotEntries: MetadataRoute.Sitemap = lots.map((lot) => ({
      url: `${SITE_URL}/p/${lot.id}`,
      lastModified: lot.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...postEntries, ...lotEntries];
  } catch (e) {
    console.error("[sitemap] DB indisponible — routes statiques seules:", e);
    return staticRoutes;
  }
}
