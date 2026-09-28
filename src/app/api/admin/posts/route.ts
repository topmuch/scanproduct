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

const PostSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(2).max(220).optional(), // auto-depuis title si absent
  excerpt: z.string().min(10).max(500),
  content: z.string().min(10),
  coverImage: z.string().max(500).optional().nullable(),
  category: z.string().min(2).max(60).default("Traçabilité"),
  readTime: z.number().int().min(1).max(120).default(5),
  author: z.string().min(2).max(120).default("Équipe VerifScan"),
  published: z.boolean().default(false),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
});

/**
 * GET /api/admin/posts
 * SuperAdmin-only — liste de TOUS les articles (publiés ou non) pour l'éditeur.
 */
export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const posts = await db.post.findMany({
    orderBy: [{ published: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(posts);
}

/**
 * POST /api/admin/posts
 * SuperAdmin-only — crée un article de blog. `publishedAt` est fixé à la
 * première publication (et n'est plus touché ensuite, pour la stabilité SEO).
 */
export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Slug unique : depuis le champ fourni, sinon depuis le titre.
  let slug = slugify(data.slug || data.title) || `article-${Date.now()}`;
  const clash = await db.post.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const post = await db.post.create({
    data: {
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage || null,
      category: data.category,
      readTime: data.readTime,
      author: data.author,
      published: data.published,
      publishedAt: data.published ? new Date() : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      seoKeywords: data.seoKeywords || null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user?.id ?? null,
      action: "CREATE_POST",
      entity: "Post",
      entityId: post.id,
      metadata: JSON.stringify({ title: post.title, published: post.published }),
    },
  });

  return NextResponse.json(post, { status: 201 });
}
