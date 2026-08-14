import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminAuditLogs } from "@/lib/admin-server-data";

/**
 * GET /api/admin/audit-logs
 * SuperAdmin-only — returns recent audit log entries, paginated & filtered.
 *
 * Query params:
 *   action  — filter by exact action string (e.g. "LOGIN", "CREATE_PRODUCT")
 *   limit   — max items (default 50, max 200)
 */
export async function GET(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action") || undefined;
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10) || 50, 200);

  try {
    const logs = await getAdminAuditLogs({ action, limit });
    return NextResponse.json({ logs, total: logs.length });
  } catch (error) {
    console.error("[GET /api/admin/audit-logs] Error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
