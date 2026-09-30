import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  Tag,
  Clock,
  CalendarDays,
  User,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { db } from "@/lib/db";
import { buildAlternates } from "@/lib/seo";

/**
 * /blog/[slug] — page article du blog VerifScan.
 *
 * Référencement Google complet :
 *  - generateMetadata : seoTitle/seoDescription (fallback title/excerpt),
 *    canonical, openGraph avec image de couverture.
 *  - JSON-LD "BlogPosting" (headline, description, dates, auteur, publisher).
 *  - URLs injectées dans sitemap.ts (posts publiés).
 */

export const dynamic = "force-dynamic";

const SITE_URL = "https://verifscan.com";

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  try {
    return await db.post.findUnique({ where: { slug } });
  } catch (e) {
    console.error("[blog/[slug]] erreur DB:", e);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) {
    return {
      title: "Article introuvable — VerifScan",
      robots: { index: false, follow: true },
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    title,
    description,
    keywords: post.seoKeywords
      ? post.seoKeywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined,
    alternates: await buildAlternates(`/blog/${post.slug}`),
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.publishedAt ? post.publishedAt.toISOString() : undefined,
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
      images: post.coverImage
        ? [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }]
        : [{ url: "/og-image.png", width: 1200, height: 630, alt: "VerifScan" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.coverImage ? [post.coverImage] : ["/og-image.png"],
    },
  };
}

function fmtDate(iso: Date | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Styles Markdown sans plugin typography — composants custom. */
const MD_COMPONENTS = {
  h1: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mt-10 mb-4 font-display text-2xl font-bold leading-tight text-[#111827] sm:text-3xl" {...p} />
  ),
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mt-10 mb-4 font-display text-2xl font-bold leading-tight text-[#111827] sm:text-3xl" {...p} />
  ),
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-8 mb-3 font-display text-xl font-bold text-[#111827]" {...p} />
  ),
  h4: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="mt-6 mb-2 text-base font-bold text-[#111827]" {...p} />
  ),
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-4 text-[15px] leading-7 text-[#374151] sm:text-base" {...p} />
  ),
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 space-y-2 pl-1" {...p} />
  ),
  ol: (p: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 list-decimal space-y-2 pl-6" {...p} />
  ),
  li: (p: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="relative pl-6 text-[15px] leading-7 text-[#374151] before:absolute before:left-0 before:top-2.5 before:h-2 before:w-2 before:rounded-full before:bg-[#10B981] sm:text-base" {...p} />
  ),
  strong: (p: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-[#111827]" {...p} />
  ),
  em: (p: React.HTMLAttributes<HTMLElement>) => <em className="italic" {...p} />,
  a: (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="font-semibold text-[#022150] underline decoration-[#10B981]/60 underline-offset-2 hover:decoration-[#10B981]"
      target="_blank"
      rel="noopener noreferrer"
      {...p}
    />
  ),
  blockquote: (p: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-6 rounded-r-xl border-l-4 border-[#10B981] bg-[#F0F4F9] px-5 py-4 text-[15px] italic leading-7 text-[#022150]"
      {...p}
    />
  ),
  hr: () => <hr className="my-8 border-[#E5E7EB]" />,
  code: (p: React.HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-[#F0F4F9] px-1.5 py-0.5 font-mono text-[13px] text-[#022150]" {...p} />
  ),
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) notFound();

  // Articles liés (même rubrique, autres posts publiés)
  const related = await db.post.findMany({
    where: { published: true, slug: { not: post.slug } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      readTime: true,
      publishedAt: true,
    },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    keywords: post.seoKeywords || undefined,
    datePublished: post.publishedAt ? post.publishedAt.toISOString() : undefined,
    dateModified: post.updatedAt.toISOString(),
    url: `${SITE_URL}/blog/${post.slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    author: { "@type": "Organization", name: post.author, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "VerifScan",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
    },
    image: post.coverImage ? `${SITE_URL}${post.coverImage}` : `${SITE_URL}/og-image.png`,
    articleSection: post.category,
    inLanguage: "fr",
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <PublicHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[#0F172A] text-white">
          {post.coverImage ? (
            <>
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-[#0F172A]/30" />
            </>
          ) : (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 15% 30%, rgba(2, 33, 80,0.5) 0, transparent 45%), radial-gradient(circle at 85% 70%, rgba(16,185,129,0.3) 0, transparent 50%)",
              }}
            />
          )}
          <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            <nav className="flex items-center gap-2 text-xs text-white/70 sm:text-sm">
              <Link href="/" className="transition-colors hover:text-white">
                Accueil
              </Link>
              <span>/</span>
              <Link href="/blog" className="transition-colors hover:text-white">
                Blog
              </Link>
              <span>/</span>
              <span className="truncate font-medium text-white">{post.category}</span>
            </nav>

            <h1 className="mt-8 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-[#34D399] backdrop-blur">
                <Tag className="h-3 w-3" />
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {post.author}
              </span>
              {post.publishedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {fmtDate(post.publishedAt)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readTime} min de lecture
              </span>
            </div>
          </div>
        </section>

        {/* CONTENU */}
        <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="mb-8 border-l-4 border-[#10B981] bg-[#F0F4F9] px-5 py-4 text-[15px] font-medium leading-7 text-[#022150] sm:text-base">
            {post.excerpt}
          </p>

          <div className="max-w-none">
            <ReactMarkdown components={MD_COMPONENTS}>{post.content}</ReactMarkdown>
          </div>

          {/* CTA article */}
          <div className="mt-14 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#0D3068] to-[#022150] p-8 text-white shadow-xl sm:p-10">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <ShieldCheck className="h-6 w-6 text-[#34D399]" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold sm:text-2xl">
                    Donnez un passeport numérique à vos produits
                  </h2>
                  <p className="mt-1 text-sm text-white/75">
                    QR code anti-contrefaçon, certificats digitaux et
                    traçabilité complète — dès aujourd&apos;hui sur VerifScan.
                  </p>
                </div>
              </div>
              <a
                href="/register"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#10B981] px-6 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#059669]"
              >
                <QrCode className="h-4 w-4" />
                Créer mon compte gratuit
              </a>
            </div>
          </div>

          {/* Retour blog */}
          <div className="mt-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#022150] transition-all hover:gap-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au blog
            </Link>
          </div>
        </article>

        {/* ARTICLES LIÉS */}
        {related.length > 0 && (
          <section className="border-t border-[#F3F4F6] bg-gradient-to-b from-gray-50 to-white py-14">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
              <h2 className="font-display text-2xl font-bold text-[#111827]">
                À lire aussi
              </h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F0F4F9] px-2.5 py-1 text-[11px] font-semibold text-[#022150]">
                      <Tag className="h-3 w-3" />
                      {r.category}
                    </span>
                    <h3 className="mt-3 font-display text-base font-semibold leading-snug text-[#111827] group-hover:text-[#022150]">
                      {r.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[#6B7280]">
                      {r.excerpt}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#022150] transition-all group-hover:gap-2">
                      Lire l&apos;article
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
