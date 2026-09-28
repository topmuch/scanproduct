import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const PatchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  slug: z.string().min(2).max(220).optional(),
  excerpt: z.string().min(10).max(500).optional(),
  content: z.string().min(10).optional(),
  coverImage: z.string().max(500).nullable().optional(),
  category: z.string().min(2).max(60).optional(),
  readTime: z.number().int().min(1).max(120).optional(),
  author: z.string().min(2).max(120).optional(),
  published: z.boolean().optional(),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  seoKeywords: z.string().max(500).nullable().optional(),
});

/**
 * PATCH /api/admin/posts/[id]
 * SuperAdmin-only — met à jour un article. À la première publication,
 * publishedAt est fixé (et jamais réécrasé ensuite, stabilité SEO).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await db.post.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (data.title !== undefined) patch.title = data.title;
  if (data.slug !== undefined) {
    const slug = slugify(data.slug);
    if (slug && slug !== existing.slug) {
      const clash = await db.post.findUnique({ where: { slug } });
      patch.slug = clash ? `${slug}-${Date.now().toString(36)}` : slug;
    }
  }
  if (data.excerpt !== undefined) patch.excerpt = data.excerpt;
  if (data.content !== undefined) patch.content = data.content;
  if (data.coverImage !== undefined) patch.coverImage = data.coverImage || null;
  if (data.category !== undefined) patch.category = data.category;
  if (data.readTime !== undefined) patch.readTime = data.readTime;
  if (data.author !== undefined) patch.author = data.author;
  if (data.seoTitle !== undefined) patch.seoTitle = data.seoTitle || null;
  if (data.seoDescription !== undefined) patch.seoDescription = data.seoDescription || null;
  if (data.seoKeywords !== undefined) patch.seoKeywords = data.seoKeywords || null;

  if (data.published !== undefined) {
    patch.published = data.published;
    // Première publication → on fige la date (les mises à jour ultérieures
    // ne la modifient pas : stable pour Google / sitemap / JSON-LD).
    if (data.published && !existing.publishedAt) {
      patch.publishedAt = new Date();
    }
  }

  const post = await db.post.update({ where: { id }, data: patch });

  await db.auditLog.create({
    data: {
      userId: session.user?.id ?? null,
      action: "UPDATE_POST",
      entity: "Post",
      entityId: post.id,
      metadata: JSON.stringify({
        title: post.title,
        published: post.published,
        fields: Object.keys(patch),
      }),
    },
  });

  return NextResponse.json(post);
}

/**
 * DELETE /api/admin/posts/[id]
 * SuperAdmin-only — supprime définitivement un article.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.post.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  await db.post.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      userId: session.user?.id ?? null,
      action: "DELETE_POST",
      entity: "Post",
      entityId: id,
      metadata: JSON.stringify({ title: existing.title, slug: existing.slug }),
    },
  });

  return NextResponse.json({ ok: true });
}
