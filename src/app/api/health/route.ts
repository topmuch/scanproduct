import { NextResponse } from "next/server";
import * as fs from "node:fs";
import { db } from "@/lib/db";

// Always run on the Node.js runtime (not Edge) and never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Constants ────────────────────────────────────────────────────────────
const SERVICE_NAME = "verifscan";
const SERVICE_VERSION = "1.0.0";
const MEMORY_THRESHOLD_MB = 512;
const MEMORY_THRESHOLD_BYTES = MEMORY_THRESHOLD_MB * 1024 * 1024;

type DbCheck = {
  status: "ok" | "down";
  latencyMs: number;
  error: string | null;
};

type MemoryCheck = {
  status: "ok" | "warn";
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  thresholdMb: number;
};

type DiskCheck = {
  status: "ok" | "warn";
  uploadDir: string;
  writable: boolean;
};

type Stats = {
  users: number;
  products: number;
  lots: number;
  qrCodes: number;
  scans: number;
};

type HealthResponse = {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database: DbCheck;
    memory: MemoryCheck;
    disk: DiskCheck;
  };
  stats: Stats;
};

/**
 * Production-grade health-check endpoint used by Coolify / Docker HEALTHCHECK,
 * uptime monitors, and the SuperAdmin status dashboard.
 *
 * No authentication required — must remain public.
 *
 * GET /api/health →
 *   - 200 if status is "ok" or "degraded"
 *   - 503 if status is "down" (database unreachable)
 */
export async function GET() {
  // ── Database check ───────────────────────────────────────────────────
  // Time a trivial `SELECT 1` against the SQLite database. On success we
  // record the round-trip latency; on failure we mark the DB as down and
  // capture the error message.
  let dbCheck: DbCheck = { status: "down", latencyMs: 0, error: "not-run" };
  try {
    const dbStart = performance.now();
    await db.$queryRaw`SELECT 1`;
    const dbEnd = performance.now();
    dbCheck = {
      status: "ok",
      latencyMs: Math.round((dbEnd - dbStart) * 100) / 100,
      error: null,
    };
  } catch (err) {
    dbCheck = {
      status: "down",
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // ── Memory check ─────────────────────────────────────────────────────
  // Read process.memoryUsage() and flag a warning if RSS exceeds the
  // configured threshold (512 MB by default). This is a soft signal — the
  // process is still functional, but operators may want to investigate.
  let memCheck: MemoryCheck = {
    status: "ok",
    rssMb: 0,
    heapUsedMb: 0,
    heapTotalMb: 0,
    thresholdMb: MEMORY_THRESHOLD_MB,
  };
  try {
    const mem = process.memoryUsage();
    const rssMb = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
    const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
    const heapTotalMb = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
    memCheck = {
      status: mem.rss > MEMORY_THRESHOLD_BYTES ? "warn" : "ok",
      rssMb,
      heapUsedMb,
      heapTotalMb,
      thresholdMb: MEMORY_THRESHOLD_MB,
    };
  } catch (err) {
    // Extremely unlikely — process.memoryUsage() is a core Node API.
    memCheck = {
      status: "warn",
      rssMb: 0,
      heapUsedMb: 0,
      heapTotalMb: 0,
      thresholdMb: MEMORY_THRESHOLD_MB,
    };
    void err;
  }

  // ── Disk check ───────────────────────────────────────────────────────
  // Verify that the upload directory is writable. In production this is
  // typically /app/uploads/products (mounted volume); in dev it falls back
  // to <cwd>/public/uploads/products.
  const uploadDir =
    process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== ""
      ? process.env.UPLOAD_DIR.trim()
      : "/app/uploads/products";

  let diskCheck: DiskCheck = {
    status: "ok",
    uploadDir,
    writable: false,
  };
  try {
    fs.accessSync(uploadDir, fs.constants.W_OK);
    diskCheck = { status: "ok", uploadDir, writable: true };
  } catch {
    // Directory missing or not writable — warn (not down) because the app
    // can still serve read-only traffic.
    diskCheck = { status: "warn", uploadDir, writable: false };
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  // Count rows in the 5 main tables. Run all in parallel via Promise.allSettled
  // so a single failure (e.g. a table being recreated) doesn't break the whole
  // health response. Failed counts default to 0.
  // Prisma's count() returns a plain number (not BigInt), but we wrap with
  // Number() defensively in case of any raw-query fallback in the future.
  const statsPromise = await Promise.allSettled([
    db.user.count(),
    db.product.count(),
    db.lot.count(),
    db.qRCode.count(),
    db.scan.count(),
  ]);

  const stats: Stats = {
    users: statsPromise[0].status === "fulfilled" ? Number(statsPromise[0].value) : 0,
    products: statsPromise[1].status === "fulfilled" ? Number(statsPromise[1].value) : 0,
    lots: statsPromise[2].status === "fulfilled" ? Number(statsPromise[2].value) : 0,
    qrCodes: statsPromise[3].status === "fulfilled" ? Number(statsPromise[3].value) : 0,
    scans: statsPromise[4].status === "fulfilled" ? Number(statsPromise[4].value) : 0,
  };

  // ── Aggregate status ──────────────────────────────────────────────────
  //   - database down        → "down"     (HTTP 503)
  //   - any check is "warn"  → "degraded" (HTTP 200, but flags an issue)
  //   - otherwise            → "ok"       (HTTP 200)
  let aggregate: "ok" | "degraded" | "down" = "ok";
  if (dbCheck.status === "down") {
    aggregate = "down";
  } else if (
    memCheck.status === "warn" ||
    diskCheck.status === "warn"
  ) {
    aggregate = "degraded";
  }

  const body: HealthResponse = {
    status: aggregate,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    uptime: Math.round(process.uptime() * 100) / 100,
    checks: {
      database: dbCheck,
      memory: memCheck,
      disk: diskCheck,
    },
    stats,
  };

  const httpStatus = aggregate === "down" ? 503 : 200;

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
