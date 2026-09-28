import type { Metadata } from "next";
import Link from "next/link";
import {
  Newspaper,
  ArrowRight,
  Sparkles,
  Tag,
  Clock,
  MailOpen,
  Rss,
  QrCode,
  ShieldCheck,
  Sprout,
  BarChart3,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { NewsletterSignup } from "@/components/public/NewsletterSignup";
import { db } from "@/lib/db";

/**
 * /blog — liste des articles publiés par le SuperAdmin (modèle Post).
 * Référencement Google : metadata + canonical + JSON-LD Blog + BlogPosting
 * (ItemList) ; les articles sont aussi injectés dans sitemap.xml.
 */

export const dynamic = "force-dynamic";

const SITE_URL = "https://verifscan.sn";

export const metadata: Metadata = {
  title: "Blog — Traçabilité, export & anti-contrefaçon | VerifScan",
  description:
    "Le blog VerifScan : guides pratiques pour exporter vers l'UE et les USA, passeport numérique, traçabilité alimentaire et cosmétique, lutte contre la contrefaçon en Afrique de l'Ouest.",
  keywords: [
    "blog VerifScan",
    "export Union européenne",
    "export USA",
    "traçabilité alimentaire",
    "passeport numérique produit",
    "anti-contrefaçon",
    "QR code traçabilité",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Traçabilité, export & anti-contrefaçon | VerifScan",
    description:
      "Guides pratiques export UE/USA, passeport numérique et traçabilité produit.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Traçabilité: "#022150",
  Export: "#10B981",
  Consommateurs: "#F59E0B",
  "Anti-contrefaçon": "#EF4444",
  Produit: "#0284C7",
  "Agro-industrie": "#059669",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#022150";
}

const CATEGORY_ICONS = [QrCode, ShieldCheck, Sprout, BarChart3];

function fmtDate(iso: Date | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPage() {
  let posts: Array<{
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    readTime: number;
    author: string;
    coverImage: string | null;
    publishedAt: Date | null;
  }> = [];

  try {
    posts = await db.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        readTime: true,
        author: true,
        coverImage: true,
        publishedAt: true,
      },
    });
  } catch (e) {
    console.error("[blog] Impossible de charger les articles:", e);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog VerifScan",
    url: `${SITE_URL}/blog`,
    description:
      "Guides pratiques pour exporter vers l'UE et les USA, passeport numérique produit et traçabilité alimentaire & cosmétique.",
    publisher: { "@type": "Organization", name: "VerifScan", url: SITE_URL },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.publishedAt ? new Date(p.publishedAt).toISOString() : undefined,
      author: { "@type": "Organization", name: p.author },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[#0F172A] text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 30%, rgba(2, 33, 80,0.45) 0, transparent 45%), radial-gradient(circle at 85% 70%, rgba(16,185,129,0.30) 0, transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <Newspaper className="h-3.5 w-3.5 text-[#34D399]" />
              Le blog VerifScan
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              La vérité sur la{" "}
              <span className="bg-gradient-to-r from-[#4E74A8] via-[#34D399] to-[#FBBF24] bg-clip-text text-transparent">
                traçabilité produit.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              Guides pratiques pour exporter vers l&apos;Union européenne et
              les États-Unis, passeport numérique, traçabilité alimentaire et
              cosmétique : tout ce que les fabricants et les consommateurs
              doivent savoir.
            </p>
          </div>
        </section>

        {/* ARTICLES */}
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
                Derniers articles
              </h2>
              <p className="mt-2 text-sm text-[#6B7280]">
                {posts.length > 0
                  ? `${posts.length} article${posts.length > 1 ? "s" : ""} publié${posts.length > 1 ? "s" : ""}`
                  : "Un aperçu des sujets sur lesquels nous travaillons."}
              </p>
            </div>
            <span className="hidden items-center gap-1.5 text-xs text-[#6B7280] sm:flex">
              <Rss className="h-3.5 w-3.5" />
              Mis à jour régulièrement
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E5E7EB] bg-white py-16 text-center">
              <Sparkles className="h-10 w-10 text-[#D1D5DB]" />
              <p className="text-sm font-medium text-[#374151]">
                Le premier article arrive très bientôt.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, idx) => {
                const color = categoryColor(post.category);
                const Icon = CATEGORY_ICONS[idx % CATEGORY_ICONS.length];
                return (
                  <article
                    key={post.slug}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    {/* Top color stripe */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: color }} aria-hidden />
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          <Tag className="h-3 w-3" />
                          {post.category}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                          <Clock className="h-2.5 w-2.5" />
                          {post.readTime} min
                        </span>
                      </div>

                      <div
                        className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <h3 className="mt-4 font-display text-base font-semibold leading-snug text-[#111827] group-hover:text-[#022150]">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B7280]">
                        {post.excerpt}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-[#F3F4F6] pt-4">
                        <span className="text-xs text-[#9CA3AF]">
                          {fmtDate(post.publishedAt)}
                        </span>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#022150] transition-all group-hover:gap-1.5"
                        >
                          Lire l&apos;article
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* NEWSLETTER + CTA */}
        <section className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#0D3068] to-[#022150] p-10 text-white shadow-xl sm:p-14">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Une idée de sujet&nbsp;?
                </h2>
                <p className="mt-3 text-sm text-white/80 sm:text-base">
                  Vous aimeriez lire un article sur un sujet précis lié à
                  la traçabilité ou à l&apos;export ? Écrivez-nous : nos
                  rédacteurs étudient toutes les propositions.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#022150] shadow-md transition-colors hover:bg-white/90"
                  >
                    Proposer un sujet
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/produits"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                  >
                    Explorer le catalogue
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur sm:p-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MailOpen className="h-4 w-4 text-[#34D399]" />
                  Newsletter
                </div>
                <p className="mt-2 text-sm text-white/70">
                  Recevez nos prochains articles directement dans votre boîte
                  mail. Pas de spam, désinscription en un clic.
                </p>
                <div className="mt-4">
                  <NewsletterSignup
                    id="blog-newsletter"
                    buttonLabel="S'abonner"
                    successMessage="Inscription enregistrée. À très vite !"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
