import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminUsers } from "@/lib/admin-server-data";

/**
 * GET /api/admin/users
 * SuperAdmin-only — returns the list of fabricants, with optional filters.
 *
 * Query params:
 *   search  — substring match on company / email / contact name
 *   status  — "Actif" | "Inactif" | "Suspendu" | "Tous" (default "Tous")
 *   plan    — "Starter" | "Pro" | "Enterprise" | "Essai" | "Tous"
 *   limit   — max items (default 100, max 500)
 */
export async function GET(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search") || undefined;
  const status = (sp.get("status") as "Actif" | "Inactif" | "Suspendu" | "Tous" | null) || "Tous";
  const plan = (sp.get("plan") as "Starter" | "Pro" | "Enterprise" | "Essai" | "Tous" | null) || "Tous";
  const limit = Math.min(parseInt(sp.get("limit") || "100", 10) || 100, 500);

  try {
    const users = await getAdminUsers({ search, status, plan, limit });
    return NextResponse.json({ users, total: users.length });
  } catch (error) {
    console.error("[GET /api/admin/users] Error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new fabricant (used by the AddMakerModal in UsersPage)
// ---------------------------------------------------------------------------

const CreateMakerSchema = z.object({
  company: z.string().min(2).max(120),
  contactName: z.string().min(2).max(80),
  email: z.string().email().max(255),
  phone: z.string().max(40).optional().default(""),
  address: z.string().max(255).optional().default(""),
  plan: z.enum(["Starter", "Pro", "Enterprise", "Essai"]).default("Starter"),
  status: z.enum(["Actif", "Inactif", "Suspendu"]).default("Actif"),
  logoColor: z.string().max(20).optional(),
});

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

  const parsed = CreateMakerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Status mapping to DB status codes
  const dbStatus = data.status === "Actif" ? "ACTIVE" : data.status === "Suspendu" ? "SUSPENDED" : "PENDING";

  try {
    // Check email is not already taken
    const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // Generate a random 16-char temporary password (admin-created accounts
    // must reset it on first sign-in — for now we just hash it and store it).
    const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const hashed = await bcrypt.hash(tempPassword, 10);

    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.contactName,
        companyName: data.company,
        phone: data.phone || null,
        address: data.address || null,
        role: "FABRICANT",
        status: dbStatus,
        brandColor: data.logoColor ?? "#2563EB",
        password: hashed,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "CREATE_USER",
        entity: "User",
        entityId: user.id,
        metadata: JSON.stringify({ email: user.email, companyName: user.companyName }),
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        companyName: user.companyName,
        // Returned so the admin can hand the temp password to the new fabricant.
        // In production this would be sent via an invitation email instead.
        temporaryPassword: tempPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/users] Error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
