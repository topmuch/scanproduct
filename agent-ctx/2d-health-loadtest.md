# Task 2d — Health Endpoint Enhancement + Load-Test Script

**Agent:** Z.ai Code (main)
**Task ID:** 2d
**Date:** 2026-08-15

## Goal
Two deliverables for Phase 4:
- **A** — Rewrite `/src/app/api/health/route.ts` as a production-grade health endpoint with DB / memory / disk checks + table stats.
- **B** — Create `/scripts/load-test.ts`, a standalone HTTP load-testing script (Node built-ins only).

## Reference files consulted
- `/home/z/my-project/worklog.md` — prior work (Phase 1–3 landing, dashboards, exports, WOW components)
- `/home/z/my-project/src/app/api/health/route.ts` — original minimal endpoint (status/timestamp/version/service)
- `/home/z/my-project/src/lib/db.ts` — Prisma client singleton
- `/home/z/my-project/prisma/schema.prisma` — confirmed models: User, Product, Lot, QRCode, Scan (all have `.count()`)
- `/home/z/my-project/src/lib/upload-config.ts` — UPLOAD_DIR resolution pattern (env var → fallback)
- `/home/z/my-project/tsconfig.json` — `@/*` path alias, strict mode, `@types/node` available

## Deliverable A — `/src/app/api/health/route.ts`

### Implementation
- `runtime = "nodejs"`, `dynamic = "force-dynamic"` (kept from original).
- Response shape exactly matches the spec:
  ```json
  {
    "status": "ok"|"degraded"|"down",
    "timestamp": "ISO-8601",
    "service": "verifscan",
    "version": "1.0.0",
    "uptime": 123.45,
    "checks": {
      "database": { "status": "ok"|"down", "latencyMs": 5, "error": null },
      "memory":   { "status": "ok"|"warn", "rssMb": 120, "heapUsedMb": 60, "heapTotalMb": 80, "thresholdMb": 512 },
      "disk":     { "status": "ok"|"warn", "uploadDir": "...", "writable": true }
    },
    "stats": { "users": N, "products": N, "lots": N, "qrCodes": N, "scans": N }
  }
  ```
- **Database check**: timed `db.$queryRaw\`SELECT 1\`` via `performance.now()`. On success → status ok + rounded latency. On throw → status down + error message.
- **Memory check**: `process.memoryUsage()` → rss/heapUsed/heapTotal in MB (rounded to 2 dp). `status = "warn"` if `rss > 512MB` (536870912 bytes), else `"ok"`.
- **Disk check**: `uploadDir = process.env.UPLOAD_DIR || "/app/uploads/products"`. `fs.accessSync(uploadDir, fs.constants.W_OK)` in try/catch → writable true/false. status warn if not writable.
- **Stats**: 5 `db.<model>.count()` calls run via `Promise.allSettled`. Each fulfilled value wrapped in `Number()` defensively (Prisma `count()` already returns `number`, but this guards against future raw-query swaps). Failed counts default to 0.
- **Aggregate status**: `"down"` if database down; `"degraded"` if any check is warn; else `"ok"`.
- **HTTP status**: 200 for ok/degraded, 503 for down.
- **Cache-Control**: `no-store, no-cache, must-revalidate` header added.
- Every check wrapped in its own try/catch so a single failure can't break the whole response.
- Typed via `HealthResponse` / `DbCheck` / `MemoryCheck` / `DiskCheck` / `Stats` interfaces for compile-time safety.

### Verification (live dev server)
`curl -s -i http://localhost:3000/api/health` returned:
```
HTTP/1.1 200 OK
cache-control: no-store, no-cache, must-revalidate
content-type: application/json

{
  "status":"degraded",
  "timestamp":"2026-08-15T10:33:11.497Z",
  "service":"verifscan",
  "version":"1.0.0",
  "uptime":29.74,
  "checks":{
    "database":{"status":"ok","latencyMs":3.55,"error":null},
    "memory":{"status":"warn","rssMb":1044.71,"heapUsedMb":110.04,"heapTotalMb":118.49,"thresholdMb":512},
    "disk":{"status":"warn","uploadDir":"/app/uploads/products","writable":false}
  },
  "stats":{"users":3,"products":6,"lots":6,"qrCodes":36,"scans":48}
}
```
- HTTP 200 (degraded, not down) ✓
- `Cache-Control: no-store` ✓
- DB ok with latency ✓
- Memory warn (dev server RSS > 512MB during Turbopack compile) ✓
- Disk warn (dev env has no /app/uploads/products — production default) ✓
- Real DB stats returned ✓

## Deliverable B — `/scripts/load-test.ts`

### Implementation
- **Zero external deps**: only `node:http`, `node:https`, `node:url`. No autocannon/k6/axios.
- **CONFIG** object at top:
  ```ts
  {
    baseUrl: process.env.LOAD_TEST_URL || "http://localhost:3000",
    duration: 30_000,
    concurrency: 10,
    endpoints: [
      { path: "/", weight: 3 },
      { path: "/api/health", weight: 2 },
      { path: "/api/lots/some-lot-id?scan=true", weight: 5 },
      { path: "/produits", weight: 2 },
    ],
  }
  ```
- **Weighted random**: builds a flat pool of endpoint refs repeated by weight, then `Math.random()` picks one. Simple & uniform.
- **Worker pool**: spawns `concurrency` async workers, each loops `makeRequest()` until `performance.now() >= deadline`. Workers share a single `Stats` object (no locks needed — JS is single-threaded between awaits).
- **makeRequest**: uses `http.request` / `https.request` based on URL protocol. 10s hard timeout per request (`req.setTimeout`). Resolves `{ statusCode, latencyMs }` — never rejects (errors resolve with `statusCode: null`).
- **Stats tracked**: total, success (2xx), clientErrors (4xx), serverErrors (5xx), connectionErrors (null status), latencies[].
- **Percentiles**: sort latencies → `p50/p95/p99` via `Math.floor((p/100)*n)`. avg/min/max computed from sorted array.
- **Progress reporter**: `setInterval(5000)` prints `[Xs] rps=Y avg=Zms total=N errors=M (P%)`.
- **Summary table**: box-drawing chars (╔═╗║╠╣╚╝), width 60. Title centered. Includes Duration / Concurrency / Total / Successful (%) / Failed (%) / Latency (min/p50/p95/p99/avg/max) / Throughput. Error breakdown printed below the box if any.
- **Graceful error handling**: ECONNREFUSED / ECONNRESET / ETIMEDOUT / DNS errors all caught via `req.on('error')` and counted as connectionErrors — never crashes the script.
- **`--help` flag**: prints usage with options + examples.
- **CLI overrides**: `--duration=<ms>`, `--concurrency=<n>`, `--url=<base>`.
- **Banner**: `🚀 Starting load test against {baseUrl} for {duration}s with {concurrency} concurrent users...` + endpoint list.

### Verification
1. `bun run scripts/load-test.ts --help` → printed usage cleanly.
2. Against dead server (localhost:3999), 5s/3 workers:
   - 198070 connection errors, 0 crashes, 100% failure rate, summary table rendered correctly.
3. Against live dev server (localhost:3000), 10s/5 workers:
   - 104 total requests, 59 success (56.7%), 45 4xx (from `/api/lots/some-lot-id` 404s — expected since "some-lot-id" isn't a real lot).
   - Progress lines: `[5.0s] rps=7.4 avg=312ms total=37 errors=20 (54.1%)` / `[10.0s] rps=12.4 avg=490ms total=99 errors=43 (43.4%)`.
   - Summary: min 52 / p50 347 / p95 1098 / p99 4059 / avg 486 / max 4159 ms, throughput 10.2 req/s.

## Verification steps
- `bun run lint` → passes clean (0 errors).
- `bunx tsc --noEmit` → 0 errors in `src/app/api/health/route.ts` and `scripts/load-test.ts`. (Pre-existing errors in other files — `examples/`, `scripts/gen-remaining*.ts`, `skills/*`, `src/lib/auth.ts`, admin/fabricant pages — are unrelated and not touched.)
- Live runtime test of `/api/health` → correct JSON shape, 200 status, `Cache-Control: no-store` header.
- Live runtime test of `load-test.ts` → banner, progress, summary table, error breakdown all render correctly; ECONNREFUSED handled gracefully.

## Files touched
- **Rewritten**: `/home/z/my-project/src/app/api/health/route.ts` (24 → 178 lines)
- **Created**: `/home/z/my-project/scripts/load-test.ts` (new, ~370 lines)

No other files modified. No test files created.

## Stage Summary
- Deliverable A: production-grade health endpoint with DB latency, memory threshold (512MB), disk writability, 5-table row counts (parallel via Promise.allSettled), aggregate ok/degraded/down status, 503 on DB-down, `Cache-Control: no-store` header. Verified live returning correct JSON.
- Deliverable B: portable load-test script (zero external deps, http/https built-ins) with weighted endpoint selection, worker-pool concurrency, 5s progress reports, full percentile summary table, graceful connection-error handling, `--help` + CLI overrides. Verified live against both dead and live servers.
- Both files lint clean and type-check clean.
