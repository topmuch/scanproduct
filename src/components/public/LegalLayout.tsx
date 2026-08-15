import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export type LegalSection = {
  id: string;
  title: string;
};

export type LegalLayoutProps = {
  /** Document title shown in the hero block */
  title: string;
  /** One-line description / subtitle */
  description: string;
  /** Last-updated label, e.g. "Dernière mise à jour : 1 janvier 2026" */
  updatedAt?: string;
  /** Ordered list of sections for the table of contents */
  sections: LegalSection[];
  /** Main content (article body) */
  children: ReactNode;
};

/**
 * LegalLayout — shared wrapper for legal-document pages:
 *  - Hero with title + last updated date
 *  - Sticky table-of-contents sidebar on desktop
 *  - Numbered-article content area
 *
 * Server component — no "use client".
 */
export function LegalLayout({
  title,
  description,
  updatedAt,
  sections,
  children,
}: LegalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <PublicHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="border-b border-[#F3F4F6] bg-[#0F172A] text-white">
          <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              <FileText className="h-3.5 w-3.5 text-[#34D399]" />
              Document légal
            </span>
            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
              {description}
            </p>
            {updatedAt ? (
              <p className="mt-4 text-xs text-white/50">{updatedAt}</p>
            ) : null}
          </div>
        </section>

        {/* BODY */}
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* Sidebar TOC */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <Link
                  href="/"
                  className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#2563EB]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à l&apos;accueil
                </Link>
                <div className="rounded-xl border border-[#F3F4F6] bg-white p-5 shadow-sm">
                  <p className="font-display text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Sommaire
                  </p>
                  <nav className="mt-3">
                    <ol className="space-y-1">
                      {sections.map((s, i) => (
                        <li key={s.id}>
                          <a
                            href={`#${s.id}`}
                            className="flex gap-2 rounded-md px-2 py-1.5 text-sm text-[#374151] transition-colors hover:bg-[#F3F4F6] hover:text-[#2563EB]"
                          >
                            <span className="font-semibold text-[#2563EB]">
                              {i + 1}.
                            </span>
                            <span>{s.title}</span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <article className="min-w-0 max-w-3xl">
              {/* Mobile TOC */}
              <details className="mb-8 rounded-xl border border-[#F3F4F6] bg-white p-4 lg:hidden">
                <summary className="cursor-pointer text-sm font-semibold text-[#111827]">
                  Sommaire
                </summary>
                <ol className="mt-3 space-y-1">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex gap-2 rounded-md px-2 py-1.5 text-sm text-[#374151]"
                      >
                        <span className="font-semibold text-[#2563EB]">
                          {i + 1}.
                        </span>
                        <span>{s.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </details>

              {children}
            </article>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * Article block — numbered article with a title and body.
 * Use inside <LegalLayout>.
 */
export function LegalArticle({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[#F3F4F6] py-8 first:border-t-0">
      <header className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-sm font-bold text-[#2563EB]">
          Article {index}
        </span>
        <h2 className="font-display text-xl font-semibold text-[#111827] sm:text-2xl">
          {title}
        </h2>
      </header>
      <div className="space-y-3 text-[15px] leading-relaxed text-[#374151]">
        {children}
      </div>
    </section>
  );
}
