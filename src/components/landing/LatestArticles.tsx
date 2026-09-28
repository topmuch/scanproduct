import Link from "next/link";
import { ArrowRight, Newspaper, Tag, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";

/**
 * LatestArticles — section "Blog" de la page d'accueil, placée juste avant
 * le footer. Affiche les 3 derniers articles publiés depuis le SuperAdmin
 * (modèle Post, published=true) et renvoie vers /blog.
 *
 * Server component : accès direct Prisma. En cas d'erreur DB (build, incident),
 * la section ne casse pas la page — elle affiche un fallback discret.
 */

export const dynamic = "force-dynamic";

function fmtDate(iso: Date | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function LatestArticles() {
  let posts: Array<{
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    readTime: number;
    publishedAt: Date | null;
  }> = [];

  try {
    posts = await db.post.findMany({
      where: { published: true },
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
  } catch (e) {
    console.error("[LatestArticles] erreur DB:", e);
  }

  if (posts.length === 0) return null;

  return (
    <section className="bg-[#F9FAFB] py-20 sm:py-24" id="blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mb-12 text-center">
          <SectionBadge bg="bg-[#F0F4F9]" color="text-[#022150]">
            <Newspaper className="mr-1 h-3.5 w-3.5" /> Blog
          </SectionBadge>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-[#111827] sm:text-4xl">
            Les derniers{" "}
            <span className="bg-gradient-to-r from-[#022150] to-[#10B981] bg-clip-text text-transparent">
              articles du blog
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-[#6B7280] sm:text-lg">
            Guides export UE &amp; USA, passeport numérique, traçabilité et
            lutte contre la contrefaçon : nos analyses pour les fabricants et
            les consommateurs.
          </p>
        </AnimatedSection>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <AnimatedSection key={post.slug} index={index} as="article">
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)]"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-[#022150] to-[#10B981]" aria-hidden />
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F4F9] px-2.5 py-1 text-[11px] font-semibold text-[#022150]">
                      <Tag className="h-3 w-3" />
                      {post.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#6B7280]">
                      <Clock className="h-2.5 w-2.5" />
                      {post.readTime} min
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-lg font-bold leading-snug text-[#111827] transition-colors group-hover:text-[#022150]">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#6B7280]">
                    {post.excerpt}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-[#F3F4F6] pt-4">
                    <span className="text-xs text-[#9CA3AF]">
                      {fmtDate(post.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#022150] transition-all group-hover:gap-2">
                      Lire
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </AnimatedSection>
          ))}
        </div>

        {/* Lien vers /blog */}
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#022150] px-7 text-sm font-semibold text-white shadow-md transition-all hover:gap-3 hover:bg-[#011D46]"
          >
            Voir tous les articles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
