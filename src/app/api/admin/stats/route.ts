import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminStats } from "@/lib/admin-server-data";

/**
 * GET /api/admin/stats
 * SuperAdmin-only — returns platform-wide counters (users, products, lots,
 * scans, MRR, ARR, ticket counts, retention/churn).
 */
export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/admin/stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
