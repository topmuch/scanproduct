"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Newspaper,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageContainer,
  SectionTitle,
  Card,
  Badge,
  Button,
} from "@/components/admin/ui";

/**
 * BlogPage — onglet "Blog" du panneau SuperAdmin.
 *
 * CRUD complet des articles publiés sur /blog (visibles depuis la page
 * d'accueil, référencés Google). Contenu en Markdown, champs SEO dédiés
 * (seoTitle / seoDescription / seoKeywords) alimentant generateMetadata,
 * le JSON-LD Article et le sitemap.
 */

type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  readTime: number;
  author: string;
  published: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  readTime: number;
  author: string;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  category: "Traçabilité",
  readTime: 5,
  author: "Équipe VerifScan",
  published: false,
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
};

const CATEGORIES_SUGGEST = [
  "Traçabilité",
  "Export",
  "Consommateurs",
  "Anti-contrefaçon",
  "Produit",
  "Agro-industrie",
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export function BlogPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const publishedCount = posts.filter((p) => p.published).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.slug.includes(q)
    );
  }, [posts, query]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/posts");
      if (!res.ok) throw new Error("Chargement impossible");
      setPosts((await res.json()) as AdminPost[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreview(false);
    setEditorOpen(true);
  }

  function openEdit(post: AdminPost) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage ?? "",
      category: post.category,
      readTime: post.readTime,
      author: post.author,
      published: post.published,
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
      seoKeywords: post.seoKeywords ?? "",
    });
    setPreview(false);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreview(false);
  }

  function validate(): string | null {
    if (form.title.trim().length < 3) return "Le titre doit contenir au moins 3 caractères.";
    if (form.excerpt.trim().length < 10)
      return "Le résumé (excerpt) doit contenir au moins 10 caractères.";
    if (form.content.trim().length < 10) return "Le contenu de l'article est trop court.";
    return null;
  }

  async function handleSave(publish?: boolean) {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const published = publish ?? form.published;
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || slugify(form.title),
      excerpt: form.excerpt.trim(),
      content: form.content,
      coverImage: form.coverImage.trim() || null,
      category: form.category.trim() || "Traçabilité",
      readTime: Number(form.readTime) || 5,
      author: form.author.trim() || "Équipe VerifScan",
      published,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      seoKeywords: form.seoKeywords.trim() || null,
    };
    try {
      const res = await fetch(
        editingId ? `/api/admin/posts/${editingId}` : "/api/admin/posts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Échec de l'enregistrement");
      }
      toast.success(
        published
          ? editingId
            ? "Article mis à jour et publié"
            : "Article publié sur le blog"
          : "Brouillon enregistré"
      );
      closeEditor();
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(post: AdminPost) {
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !post.published }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, published: !p.published } : p))
      );
      toast.success(!post.published ? "Article publié" : "Article dépublié");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(post: AdminPost) {
    if (
      !window.confirm(
        `Supprimer définitivement l'article « ${post.title} » ? Cette action est irréversible.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success("Article supprimé");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition-colors focus:border-[#022150] focus:ring-2 focus:ring-[#022150]/10";
  const labelCls = "mb-1.5 block text-xs font-semibold text-[#374151]";

  return (
    <PageContainer>
      <SectionTitle
        title="Blog & Articles"
        subtitle="Publiez des articles visibles sur /blog, la page d'accueil et référencés sur Google."
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvel article
          </Button>
        }
      />

      {/* Stats + recherche */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="rounded-xl border border-[#F3F4F6] bg-white px-4 py-3">
            <p className="text-2xl font-bold text-[#022150]">{posts.length}</p>
            <p className="text-xs text-[#6B7280]">Articles au total</p>
          </div>
          <div className="rounded-xl border border-[#F3F4F6] bg-white px-4 py-3">
            <p className="text-2xl font-bold text-[#10B981]">{publishedCount}</p>
            <p className="text-xs text-[#6B7280]">Publiés</p>
          </div>
          <div className="rounded-xl border border-[#F3F4F6] bg-white px-4 py-3">
            <p className="text-2xl font-bold text-[#F59E0B]">
              {posts.length - publishedCount}
            </p>
            <p className="text-xs text-[#6B7280]">Brouillons</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article…"
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#022150]"
          />
        </div>
      </div>

      {/* Liste */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#6B7280]">
            Chargement des articles…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Newspaper className="h-10 w-10 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#374151]">
              {query ? "Aucun article ne correspond à la recherche." : "Aucun article pour le moment."}
            </p>
            {!query && (
              <Button variant="primary" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Écrire le premier article
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#F3F4F6] text-xs uppercase tracking-wide text-[#9CA3AF]">
                  <th className="px-5 py-3 font-semibold">Article</th>
                  <th className="px-5 py-3 font-semibold">Rubrique</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 font-semibold">Publication</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#111827]">{post.title}</p>
                      <p className="mt-0.5 text-xs text-[#9CA3AF]">
                        /blog/{post.slug} · {post.readTime} min
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge color="blue">{post.category}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      {post.published ? (
                        <Badge color="green">Publié</Badge>
                      ) : (
                        <Badge color="yellow">Brouillon</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#6B7280]">
                      {fmtDate(post.publishedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => togglePublished(post)}
                          title={post.published ? "Dépublier" : "Publier"}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#022150]"
                        >
                          {post.published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Voir la page publique"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#022150]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => openEdit(post)}
                          title="Modifier"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#022150]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post)}
                          title="Supprimer"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#EF4444] hover:bg-[#FEE2E2]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ÉDITEUR — modale plein écran */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8">
          <div className="my-4 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F3F4F6] rounded-t-2xl bg-white px-6 py-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#111827]">
                  {editingId ? "Modifier l'article" : "Nouvel article"}
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  Markdown supporté : ## titres, **gras**, listes, liens…
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[#F3F4F6]"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Titre de l&apos;article *</label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        title: e.target.value,
                        slug: editingId
                          ? f.slug
                          : slugify(e.target.value),
                      }))
                    }
                    placeholder="Ex : Comment exporter des produits vers l'Union européenne"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Slug (URL /blog/…)</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Résumé (excerpt — cards & Google) *</label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                    rows={2}
                    maxLength={500}
                    placeholder="1 à 2 phrases qui résument l'article (affichée sur la page d'accueil et dans les résultats Google)."
                    className={inputCls}
                  />
                  <p className="mt-1 text-right text-[11px] text-[#9CA3AF]">
                    {form.excerpt.length}/500
                  </p>
                </div>
              </div>

              {/* Contenu markdown + aperçu */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#374151]">
                    Contenu (Markdown) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreview((p) => !p)}
                    className="rounded-md bg-[#F0F4F9] px-3 py-1 text-xs font-semibold text-[#022150] hover:bg-[#DCE7F2]"
                  >
                    {preview ? "Éditer" : "Aperçu"}
                  </button>
                </div>
                {preview ? (
                  <div className="max-h-[420px] min-h-[300px] overflow-y-auto rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm leading-relaxed text-[#374151] [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#111827] [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:font-bold [&_h3]:text-[#111827] [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2 [&_a]:text-[#022150] [&_a]:underline">
                    {/* Aperçu markdown léger (le rendu réel utilise react-markdown côté public) */}
                    <MarkdownPreview content={form.content} />
                  </div>
                ) : (
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={16}
                    placeholder={"## Introduction\n\nVotre texte… **gras**, [lien](https://…)\n\n## Section\n\n- point 1\n- point 2"}
                    className={`${inputCls} font-mono text-[13px] leading-relaxed`}
                  />
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Rubrique</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    list="blog-categories"
                    className={inputCls}
                  />
                  <datalist id="blog-categories">
                    {CATEGORIES_SUGGEST.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={labelCls}>Temps de lecture (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={form.readTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, readTime: Number(e.target.value) }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Auteur</label>
                  <input
                    value={form.author}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Image de couverture (chemin public optionnel, ex : /images/blog/export-ue.webp)
                </label>
                <input
                  value={form.coverImage}
                  onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                  placeholder="/images/blog/…"
                  className={inputCls}
                />
              </div>

              {/* SEO */}
              <div className="rounded-xl border border-[#DCE7F2] bg-[#F0F4F9] p-4">
                <p className="mb-3 text-sm font-bold text-[#022150]">
                  Référencement Google (SEO)
                </p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Balise title Google (si différente du titre)</label>
                    <input
                      value={form.seoTitle}
                      onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                      maxLength={200}
                      placeholder="≤ 60 caractères recommandé"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Meta description</label>
                    <textarea
                      value={form.seoDescription}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, seoDescription: e.target.value }))
                      }
                      rows={2}
                      maxLength={320}
                      placeholder="≤ 160 caractères recommandé — sinon le résumé est utilisé."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mots-clés (séparés par des virgules)</label>
                    <input
                      value={form.seoKeywords}
                      onChange={(e) => setForm((f) => ({ ...f, seoKeywords: e.target.value }))}
                      placeholder="export UE, réglementation, traçabilité, VerifScan"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-b-2xl border-t border-[#F3F4F6] bg-white px-6 py-4">
              <Button variant="ghost" onClick={closeEditor}>
                Annuler
              </Button>
              <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}>
                Enregistrer le brouillon
              </Button>
              <Button variant="primary" disabled={saving} onClick={() => handleSave(true)}>
                {saving ? "Enregistrement…" : "Publier"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

/** Aperçu markdown minimal pour l'éditeur admin (titres, gras, listes, liens). */
function MarkdownPreview({ content }: { content: string }) {
  const html = useMemo(() => {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const lines = content.split("\n");
    const out: string[] = [];
    let inList = false;
    for (const raw of lines) {
      const line = esc(raw);
      const li = line.match(/^\s*[-*]\s+(.*)/);
      if (li) {
        if (!inList) {
          out.push("<ul>");
          inList = true;
        }
        out.push(`<li>${inline(li[1])}</li>`);
        continue;
      }
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const h = line.match(/^(#{1,4})\s+(.*)/);
      if (h) {
        const lvl = Math.min(h[1].length + 1, 5);
        out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      } else if (line.trim() === "") {
        // skip
      } else {
        out.push(`<p>${inline(line)}</p>`);
      }
    }
    if (inList) out.push("</ul>");
    function inline(s: string) {
      return s
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(
          /\[(.+?)\]\((.+?)\)/g,
          '<a href="$2" target="_blank" rel="noreferrer" class="text-[#022150] underline">$1</a>'
        );
    }
    return out.join("\n");
  }, [content]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
