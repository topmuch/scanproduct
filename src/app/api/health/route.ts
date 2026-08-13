import { NextResponse } from "next/server";

// Always run on the Node.js runtime (not Edge) and never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight health-check endpoint used by Coolify / Docker HEALTHCHECK.
 * No authentication required — must remain public.
 *
 * GET /api/health → 200 { status, timestamp, version, service }
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      service: "verifscan",
    },
    { status: 200 }
  );
}
