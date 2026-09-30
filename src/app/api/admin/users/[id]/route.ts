import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminUserDetail } from "@/lib/admin-server-data";
import { setUserSubscription } from "@/lib/subscription";

/**
 * GET /api/admin/users/[id]
 * SuperAdmin-only — returns the full detail of a single fabricant.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const user = await getAdminUserDetail(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("[GET /api/admin/users/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — update user (suspend, verify, change role, change status)
// ---------------------------------------------------------------------------

const PatchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),
  role: z.enum(["FABRICANT", "SUPERADMIN"]).optional(),
  isVerified: z.boolean().optional(),
  // Plan change → creates/renews the fabricant's Subscription row
  // (period ends at planExpiresAt, default +30 days).
  plan: z.enum(["starter", "pro", "business"]).optional(),
  planExpiresAt: z.string().datetime().optional(),
  name: z.string().min(2).max(80).optional(),
  companyName: z.string().min(2).max(120).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(255).optional(),
});

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

  // Plan change → real Subscription lifecycle (plan + expiry). Handled
  // separately from the User patch because plans live on Subscription.
  let subscriptionResult: Record<string, unknown> | null = null;
  if (data.plan) {
    try {
      const sub = await setUserSubscription(id, data.plan, {
        expiresAt: data.planExpiresAt ? new Date(data.planExpiresAt) : undefined,
      });
      subscriptionResult = {
        plan: sub.plan,
        planName: sub.planName,
        status: sub.status,
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
      };
    } catch (error) {
      console.error("[PATCH /api/admin/users/[id]] subscription error:", error);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 },
      );
    }
  }

  // Build the DB patch (skip `plan` — stored on Subscription, not User)
  const patch: Record<string, unknown> = {};
  if (data.status) patch.status = data.status;
  if (data.role) patch.role = data.role;
  if (data.isVerified !== undefined) {
    patch.isVerified = data.isVerified;
    patch.verifiedAt = data.isVerified ? new Date() : null;
  }
  if (data.name) patch.name = data.name;
  if (data.companyName) patch.companyName = data.companyName;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.address !== undefined) patch.address = data.address || null;

  if (Object.keys(patch).length === 0) {
    // Plan-only change is a valid request — return the subscription state.
    if (subscriptionResult) {
      return NextResponse.json({ plan: subscriptionResult });
    }
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await db.user.update({
      where: { id },
      data: patch,
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        role: true,
        status: true,
        isVerified: true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: data.status === "SUSPENDED" ? "SUSPEND_USER" : "UPDATE_USER",
        entity: "User",
        entityId: id,
        metadata: JSON.stringify(patch),
      },
    });

    // Security alert to the SuperAdmins when an account is suspended
    if (data.status === "SUSPENDED") {
      (async () => {
        try {
          const { notifySuperAdmins } = await import("@/lib/notifications");
          await notifySuperAdmins({
            toggle: "notifSecurity",
            type: "system",
            title: "Alerte sécurité",
            message: `Le compte ${updated.email}${updated.companyName ? ` (${updated.companyName})` : ""} a été suspendu par l'administration.`,
            severity: "warning",
            data: { userId: id, email: updated.email, action: "SUSPEND_USER" },
            emailSubject: "VerifScan — Alerte sécurité : compte suspendu",
          });
        } catch (err) {
          console.error("[PATCH /api/admin/users/[id]] security notification failed:", err);
        }
      })();
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/users/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — DEFINITIVE deletion of a fabricant (or super admin) and ALL their
// data, in a single transaction with explicit deleteMany (old production
// SQLite databases may lack FK CASCADE constraints, so we never rely on them
// — same lesson as pack deletion).
//
// Safety rails:
//   1. SuperAdmin session required (403 otherwise)
//   2. Nominative confirmation: body { confirmation } must equal the account
//      email exactly (400 otherwise)
//   3. Self-deletion forbidden (400)
//   4. The last SUPERADMIN cannot be deleted (400)
//   5. Full audit log entry after success
// ---------------------------------------------------------------------------

const DeleteSchema = z.object({
  confirmation: z.string().min(1, "Confirmation requise"),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Rail 3 — never delete yourself.
  if (session.user?.id && session.user.id === id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Confirmation requise (corps JSON attendu)." },
      { status: 400 }
    );
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirmation requise.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, companyName: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Compte introuvable (déjà supprimé ?)" }, { status: 404 });
    }

    // Rail 2 — nominative confirmation must match the account email exactly.
    if (parsed.data.confirmation.trim() !== target.email) {
      return NextResponse.json(
        {
          error:
            "La confirmation ne correspond pas à l'email du compte. La suppression a été annulée.",
        },
        { status: 400 }
      );
    }

    // Rail 4 — protect the last SUPERADMIN.
    if (target.role === "SUPERADMIN") {
      const superAdminCount = await db.user.count({ where: { role: "SUPERADMIN" } });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: "Impossible de supprimer le dernier compte Super Admin." },
          { status: 400 }
        );
      }
    }

    // Pre-compute the data graph owned by this user so we can delete every
    // child row explicitly (old prod DBs have no FK cascades).
    const productIds = (
      await db.product.findMany({ where: { fabricantId: id }, select: { id: true } })
    ).map((p) => p.id);
    const lotIds = (
      await db.lot.findMany({ where: { fabricantId: id }, select: { id: true } })
    ).map((l) => l.id);
    const conversationIds = (
      await db.aiConversation.findMany({ where: { userId: id }, select: { id: true } })
    ).map((c) => c.id);

    const result = await db.$transaction(async (tx) => {
      // 1) Lot children (history, certifications, scans, reviews, QR codes)
      if (lotIds.length > 0) {
        await tx.lotHistory.deleteMany({ where: { lotId: { in: lotIds } } });
        await tx.lotCertification.deleteMany({ where: { lotId: { in: lotIds } } });
        await tx.scan.deleteMany({ where: { lotId: { in: lotIds } } });
        await tx.review.deleteMany({ where: { lotId: { in: lotIds } } });
        await tx.qRCode.deleteMany({ where: { lotId: { in: lotIds } } });
      }

      // 2) Reviews received as fabricant (any product/lot) + product reviews
      await tx.review.deleteMany({ where: { fabricantId: id } });
      if (productIds.length > 0) {
        await tx.review.deleteMany({ where: { productId: { in: productIds } } });
      }

      // 3) Lots, marketplace inquiries, products, fabricant certifications
      await tx.lot.deleteMany({ where: { fabricantId: id } });
      await tx.marketplaceInquiry.deleteMany({ where: { fabricantId: id } });
      if (productIds.length > 0) {
        await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }
      await tx.certification.deleteMany({ where: { fabricantId: id } });

      // 4) AI conversations + messages
      if (conversationIds.length > 0) {
        await tx.aiMessage.deleteMany({ where: { conversationId: { in: conversationIds } } });
      }
      await tx.aiConversation.deleteMany({ where: { userId: id } });

      // 5) Notifications, preferences, subscriptions
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.notificationPreference.deleteMany({ where: { userId: id } });
      await tx.subscription.deleteMany({ where: { userId: id } });

      // 6) Detach nullable references (history is preserved, denormalized
      //    display fields keep the rows renderable)
      await tx.ticket.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.emailLog.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.scan.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.review.updateMany({ where: { userId: id }, data: { userId: null } });

      // 7) Finally, the account itself
      const deleted = await tx.user.delete({ where: { id }, select: { id: true, email: true } });
      return deleted;
    });

    // Audit log (after commit so it logs a completed action)
    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "DELETE_USER",
        entity: "User",
        entityId: id,
        metadata: JSON.stringify({
          email: target.email,
          companyName: target.companyName,
          role: target.role,
          products: productIds.length,
          lots: lotIds.length,
          definitive: true,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      id: result.id,
      deleted: {
        email: target.email,
        companyName: target.companyName,
        products: productIds.length,
        lots: lotIds.length,
      },
    });
  } catch (error) {
    console.error("[DELETE /api/admin/users/[id]] Error:", error);
    return NextResponse.json(
      { error: "Échec de la suppression du compte (transaction annulée)." },
      { status: 500 }
    );
  }
}
