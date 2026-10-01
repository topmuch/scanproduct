import { NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/lib/db";
import { UPLOAD_DIR } from "@/lib/upload-config";

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
  /** Populated when the directory is missing or the write probe fails. */
  error: string | null;
};

type Stats = {
  users: number;
  products: number;
  lots: number;
  qrCodes: number;
  scans: number;
  /** Répartition des designs QR (diagnostic : tous les QR doivent être "badge" sauf choix explicite). */
  qrByDesign: { badge: number; classic: number };
};

type HealthResponse = {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  service: string;
  version: string;
  /** Git commit deployed in this container (from Coolify SOURCE_COMMIT). */
  commit: string | null;
  uptime: number;
  checks: {
    database: DbCheck;
    memory: MemoryCheck;
    disk: DiskCheck;
  };
  stats: Stats;
};

/**
 * Resolve the git commit running in this container.
 *
 * Resolution chain (first valid wins):
 *   1. NEXT_PUBLIC_DEPLOY_COMMIT — inlined into the server bundle at BUILD
 *      time by next.config.ts (reads /app/.deploy-commit written by the
 *      Dockerfile bake step). Most reliable: survives any runtime file
 *      disappearance because it is baked INTO the JavaScript itself.
 *   2. DEPLOY_COMMIT env var (Coolify SOURCE_COMMIT injection).
 *   3. /app/.deploy-commit file (baked by the Dockerfile).
 *   4. ./.deploy-commit relative to cwd (standalone fallback copy).
 *
 * Lets anyone verify what is actually running with a single
 * `curl /api/health` — catches stale-code deploys instantly.
 */
function getDeployedCommit(): string | null {
  const candidates: Array<string | null | undefined> = [
    process.env.NEXT_PUBLIC_DEPLOY_COMMIT,
    process.env.DEPLOY_COMMIT,
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v && v !== "unknown") return v;
  }
  const paths = [
    "/app/.deploy-commit",
    path.join(process.cwd(), ".deploy-commit"),
  ];
  for (const p of paths) {
    try {
      const fromFile = fs.readFileSync(p, "utf8").trim();
      if (fromFile && fromFile !== "unknown") return fromFile;
    } catch {
      // File missing (local dev / standalone layout) — try next candidate.
    }
  }
  return null;
}

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
  // Verify that the upload directory is writable — using the SAME source of
  // truth as the upload API (src/lib/upload-config.ts), so the check can
  // never drift from where files are actually written.
  //
  // History: this check used to hardcode /app/uploads/products as fallback,
  // which NEVER existed in the container (the real dir is
  // /app/public/uploads/product per the Coolify volume mount) → the whole
  // health endpoint permanently reported status:"degraded" with
  // disk.writable:false even though uploads worked fine.
  //
  // The check is also SELF-HEALING: if the directory is missing (fresh
  // volume, changed mount, manual wipe) it is recreated on the spot instead
  // of failing forever. Writability is tested with a real probe file —
  // fs.accessSync(W_OK) always succeeds for root, even on read-only mounts.
  const uploadDir = UPLOAD_DIR;

  let diskCheck: DiskCheck = {
    status: "warn",
    uploadDir,
    writable: false,
    error: "not-run",
  };
  try {
    // Self-heal: create the directory (and parents) if missing.
    fs.mkdirSync(uploadDir, { recursive: true });
    // Real write probe: write + delete a temp file.
    const probe = path.join(
      uploadDir,
      `.health-probe-${process.pid}-${Date.now()}`,
    );
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    diskCheck = { status: "ok", uploadDir, writable: true, error: null };
  } catch (err) {
    // Directory truly unwritable — warn (not down) because the app can
    // still serve read-only traffic; uploads will fail until fixed.
    diskCheck = {
      status: "warn",
      uploadDir,
      writable: false,
      error: err instanceof Error ? err.message : String(err),
    };
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
    // Répartition des designs QR : diagnostique en un coup d'œil si les
    // lignes en base sont bien "badge" (design officiel) ou "classic".
    db.qRCode.groupBy({ by: ["design"], _count: { _all: true } }),
  ]);

  const qrByDesign: Stats["qrByDesign"] = { badge: 0, classic: 0 };
  if (statsPromise[5].status === "fulfilled") {
    for (const row of statsPromise[5].value) {
      const n = Number(row._count?._all ?? 0);
      if (row.design === "classic") qrByDesign.classic += n;
      else qrByDesign.badge += n;
    }
  }

  const stats: Stats = {
    users: statsPromise[0].status === "fulfilled" ? Number(statsPromise[0].value) : 0,
    products: statsPromise[1].status === "fulfilled" ? Number(statsPromise[1].value) : 0,
    lots: statsPromise[2].status === "fulfilled" ? Number(statsPromise[2].value) : 0,
    qrCodes: statsPromise[3].status === "fulfilled" ? Number(statsPromise[3].value) : 0,
    scans: statsPromise[4].status === "fulfilled" ? Number(statsPromise[4].value) : 0,
    qrByDesign,
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
    commit: getDeployedCommit(),
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
