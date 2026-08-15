/**
 * VerifScan — Standalone HTTP load-testing script.
 *
 * Run with:  bun run scripts/load-test.ts
 *
 * Uses only Node.js built-in modules (no autocannon / k6 / axios) so the
 * script is fully portable and has zero install footprint.
 *
 * It spawns `concurrency` workers, each of which loops making HTTP requests
 * against weighted-random endpoints until the configured `duration` elapses.
 * At the end it prints a formatted summary table with latency percentiles
 * and throughput.
 *
 * Flags:
 *   --help            Show usage and exit
 *   --duration=<ms>   Override CONFIG.duration
 *   --concurrency=<n> Override CONFIG.concurrency
 *   --url=<base>      Override CONFIG.baseUrl (or set LOAD_TEST_URL env var)
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────
type Endpoint = { path: string; weight: number };
type LatencyRecord = number;

// ────────────────────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────────────────────
const CONFIG: {
  baseUrl: string;
  duration: number;
  concurrency: number;
  endpoints: Endpoint[];
} = {
  baseUrl: process.env.LOAD_TEST_URL || "http://localhost:3000",
  duration: 30_000, // 30 seconds total
  concurrency: 10, // 10 concurrent requests at a time
  endpoints: [
    { path: "/", weight: 3 }, // landing page (most traffic)
    { path: "/api/health", weight: 2 }, // health check
    { path: "/api/lots/some-lot-id?scan=true", weight: 5 }, // public scan (heavy)
    { path: "/produits", weight: 2 }, // catalog
  ],
};

interface Stats {
  total: number;
  success: number; // 2xx
  clientErrors: number; // 4xx
  serverErrors: number; // 5xx
  connectionErrors: number; // ECONNREFUSED, timeouts, etc.
  latencies: LatencyRecord[];
  startTime: number;
}

// ────────────────────────────────────────────────────────────────────────────
// HELP
// ────────────────────────────────────────────────────────────────────────────
function printHelp(): void {
  console.log(`
VerifScan Load Test Script
==========================

Usage:
  bun run scripts/load-test.ts [options]

Options:
  --help                Show this help message and exit
  --duration=<ms>       Test duration in milliseconds (default: 30000)
  --concurrency=<n>     Number of concurrent workers (default: 10)
  --url=<base_url>      Base URL to test (default: http://localhost:3000
                        or $LOAD_TEST_URL env var)

Environment:
  LOAD_TEST_URL         Base URL override (same as --url)

Examples:
  bun run scripts/load-test.ts
  bun run scripts/load-test.ts --duration=60000 --concurrency=20
  bun run scripts/load-test.ts --url=https://staging.verifscan.sn
`);
}

// ────────────────────────────────────────────────────────────────────────────
// CLI PARSING
// ────────────────────────────────────────────────────────────────────────────
function parseArgs(argv: string[]): {
  duration: number;
  concurrency: number;
  baseUrl: string;
  showHelp: boolean;
} {
  let duration = CONFIG.duration;
  let concurrency = CONFIG.concurrency;
  let baseUrl = CONFIG.baseUrl;
  let showHelp = false;

  for (const arg of argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      showHelp = true;
    } else if (arg.startsWith("--duration=")) {
      const v = Number(arg.split("=")[1]);
      if (!Number.isFinite(v) || v <= 0) {
        console.error(`Invalid --duration value: ${arg}`);
        process.exit(1);
      }
      duration = v;
    } else if (arg.startsWith("--concurrency=")) {
      const v = Number(arg.split("=")[1]);
      if (!Number.isFinite(v) || v <= 0 || !Number.isInteger(v)) {
        console.error(`Invalid --concurrency value: ${arg}`);
        process.exit(1);
      }
      concurrency = v;
    } else if (arg.startsWith("--url=")) {
      baseUrl = arg.split("=")[1];
    } else {
      console.error(`Unknown argument: ${arg} (use --help for usage)`);
      process.exit(1);
    }
  }

  return { duration, concurrency, baseUrl, showHelp };
}

// ────────────────────────────────────────────────────────────────────────────
// WEIGHTED RANDOM ENDPOINT SELECTION
// ────────────────────────────────────────────────────────────────────────────
function buildWeightedPool(endpoints: Endpoint[]): Endpoint[] {
  const pool: Endpoint[] = [];
  for (const ep of endpoints) {
    const w = Math.max(1, Math.floor(ep.weight));
    for (let i = 0; i < w; i++) pool.push(ep);
  }
  return pool;
}

function pickEndpoint(pool: Endpoint[]): Endpoint {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ────────────────────────────────────────────────────────────────────────────
// HTTP REQUEST
// ────────────────────────────────────────────────────────────────────────────
/**
 * Issue a single GET request. Resolves with { statusCode, latencyMs } on
 * success, or rejects with an Error on connection failure / timeout.
 */
function makeRequest(
  baseUrl: string,
  path: string
): Promise<{ statusCode: number | null; latencyMs: number }> {
  return new Promise((resolve) => {
    const start = performance.now();
    let url: URL;
    try {
      url = new URL(path, baseUrl);
    } catch (err) {
      // Malformed URL — count as connection error, never throw.
      resolve({ statusCode: null, latencyMs: 0 });
      return;
    }

    const transport = url.protocol === "https:" ? https : http;
    const defaultPort = url.protocol === "https:" ? 443 : 80;
    const port = url.port ? Number(url.port) : defaultPort;
    const req = transport.request(
      {
        hostname: url.hostname,
        port,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          "User-Agent": "VerifScan-LoadTest/1.0",
          Accept: "*/*",
          // Don't keep connections alive between requests — we want to measure
          // the full request lifecycle including connection setup.
          Connection: "close",
        },
      },
      (res) => {
        // Drain the response so the socket can close cleanly.
        res.resume();
        res.on("end", () => {
          const latencyMs = Math.round((performance.now() - start) * 100) / 100;
          resolve({ statusCode: res.statusCode ?? null, latencyMs });
        });
        res.on("error", () => {
          const latencyMs = Math.round((performance.now() - start) * 100) / 100;
          resolve({ statusCode: res.statusCode ?? null, latencyMs });
        });
      }
    );

    req.on("error", () => {
      // ECONNREFUSED, ECONNRESET, ETIMEDOUT, DNS errors, etc.
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      resolve({ statusCode: null, latencyMs });
    });

    // Hard timeout per request (10s) so a hung server doesn't stall a worker.
    req.setTimeout(10_000, () => {
      req.destroy();
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      resolve({ statusCode: null, latencyMs });
    });

    req.end();
  });
}

// ────────────────────────────────────────────────────────────────────────────
// STAT TRACKING
// ────────────────────────────────────────────────────────────────────────────
function createStats(): Stats {
  return {
    total: 0,
    success: 0,
    clientErrors: 0,
    serverErrors: 0,
    connectionErrors: 0,
    latencies: [],
    startTime: 0,
  };
}

function recordResult(stats: Stats, result: { statusCode: number | null; latencyMs: number }): void {
  stats.total += 1;
  if (result.latencyMs > 0) {
    stats.latencies.push(result.latencyMs);
  }
  const code = result.statusCode;
  if (code === null) {
    stats.connectionErrors += 1;
  } else if (code >= 200 && code < 300) {
    stats.success += 1;
  } else if (code >= 400 && code < 500) {
    stats.clientErrors += 1;
  } else if (code >= 500) {
    stats.serverErrors += 1;
  } else {
    // 3xx and weird codes — count as connection-style failures for simplicity.
    stats.connectionErrors += 1;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PERCENTILE CALCULATION
// ────────────────────────────────────────────────────────────────────────────
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

// ────────────────────────────────────────────────────────────────────────────
// WORKER
// ────────────────────────────────────────────────────────────────────────────
async function worker(
  workerId: number,
  baseUrl: string,
  pool: Endpoint[],
  deadline: number,
  stats: Stats
): Promise<void> {
  while (performance.now() < deadline) {
    const ep = pickEndpoint(pool);
    const result = await makeRequest(baseUrl, ep.path);
    recordResult(stats, result);
  }
  void workerId;
}

// ────────────────────────────────────────────────────────────────────────────
// PROGRESS REPORTER
// ────────────────────────────────────────────────────────────────────────────
function startProgressReporter(stats: Stats, intervalMs = 5_000): NodeJS.Timeout {
  let lastTickTotal = 0;
  let lastTickTime = performance.now();
  return setInterval(() => {
    const now = performance.now();
    const elapsedSinceTick = (now - lastTickTime) / 1000;
    const reqsSinceTick = stats.total - lastTickTotal;
    const rps = reqsSinceTick / elapsedSinceTick;
    const avgLatency = average(stats.latencies);
    const errorCount =
      stats.clientErrors + stats.serverErrors + stats.connectionErrors;
    const errorRate =
      stats.total > 0 ? ((errorCount / stats.total) * 100).toFixed(1) : "0.0";
    const elapsedSinceStart = ((now - stats.startTime) / 1000).toFixed(1);
    process.stdout.write(
      `[${elapsedSinceStart}s] rps=${rps.toFixed(1)} avg=${avgLatency.toFixed(0)}ms ` +
        `total=${stats.total} errors=${errorCount} (${errorRate}%)\n`
    );
    lastTickTotal = stats.total;
    lastTickTime = now;
  }, intervalMs);
}

// ────────────────────────────────────────────────────────────────────────────
// SUMMARY REPORT
// ────────────────────────────────────────────────────────────────────────────
function padLine(content: string, width: number): string {
  // Pad content to fit inside the box (width = total inner width including borders).
  // The box uses box-drawing chars; we pad with spaces up to (width - content.length - 2).
  const inner = width - 2; // 2 chars for left/right border
  const visibleLen = content.length;
  const padding = Math.max(0, inner - visibleLen);
  return "║" + content + " ".repeat(padding) + "║";
}

function printSummary(stats: Stats, durationMs: number, concurrency: number): void {
  const BOX_WIDTH = 60;
  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const min = sorted.length > 0 ? sorted[0]! : 0;
  const max = sorted.length > 0 ? sorted[sorted.length - 1]! : 0;
  const avg = average(sorted);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);

  const failed = stats.clientErrors + stats.serverErrors + stats.connectionErrors;
  const successPct =
    stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : "0.0";
  const failedPct =
    stats.total > 0 ? ((failed / stats.total) * 100).toFixed(1) : "0.0";
  const durationSec = (durationMs / 1000).toFixed(1);
  const throughput = stats.total / (durationMs / 1000);

  const lines: string[] = [];
  lines.push("╔" + "═".repeat(BOX_WIDTH - 2) + "╗");
  lines.push(padLine("VerifScan Load Test Report", BOX_WIDTH));
  // Center the title
  const title = "VerifScan Load Test Report";
  const titlePad = Math.max(0, BOX_WIDTH - 2 - title.length);
  const titleLeft = Math.floor(titlePad / 2);
  const titleRight = titlePad - titleLeft;
  lines[lines.length - 1] = "║" + " ".repeat(titleLeft) + title + " ".repeat(titleRight) + "║";
  lines.push("╠" + "═".repeat(BOX_WIDTH - 2) + "╣");
  lines.push(padLine(`Duration:        ${durationSec}s`, BOX_WIDTH));
  lines.push(padLine(`Concurrency:     ${concurrency}`, BOX_WIDTH));
  lines.push(padLine(`Total requests:  ${stats.total}`, BOX_WIDTH));
  lines.push(padLine(`Successful:      ${stats.success} (${successPct}%)`, BOX_WIDTH));
  lines.push(padLine(`Failed:          ${failed} (${failedPct}%)`, BOX_WIDTH));
  lines.push(padLine("", BOX_WIDTH));
  lines.push(padLine("Latency (ms):", BOX_WIDTH));
  lines.push(
    padLine(
      `  min: ${min.toFixed(0).padStart(4)}  p50: ${p50.toFixed(0).padStart(4)}  p95: ${p95.toFixed(0).padStart(4)}  p99: ${p99.toFixed(0).padStart(4)}`,
      BOX_WIDTH
    )
  );
  lines.push(
    padLine(
      `  avg: ${avg.toFixed(0).padStart(4)}    max: ${max.toFixed(0).padStart(4)}`,
      BOX_WIDTH
    )
  );
  lines.push(padLine("", BOX_WIDTH));
  lines.push(padLine(`Throughput: ${throughput.toFixed(1)} req/s`, BOX_WIDTH));
  lines.push("╚" + "═".repeat(BOX_WIDTH - 2) + "╝");

  console.log(lines.join("\n"));

  // Detailed breakdown (outside the box)
  if (stats.connectionErrors > 0 || stats.clientErrors > 0 || stats.serverErrors > 0) {
    console.log("\nError breakdown:");
    if (stats.connectionErrors > 0) {
      console.log(`  Connection errors: ${stats.connectionErrors}`);
    }
    if (stats.clientErrors > 0) {
      console.log(`  4xx client errors:  ${stats.clientErrors}`);
    }
    if (stats.serverErrors > 0) {
      console.log(`  5xx server errors:  ${stats.serverErrors}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.showHelp) {
    printHelp();
    process.exit(0);
  }

  const { duration, concurrency, baseUrl } = args;
  const durationSec = (duration / 1000).toFixed(0);

  console.log(
    `🚀 Starting load test against ${baseUrl} for ${durationSec}s with ${concurrency} concurrent users...`
  );
  console.log(
    `   Endpoints: ${CONFIG.endpoints
      .map((e) => `${e.path} (w=${e.weight})`)
      .join(", ")}`
  );
  console.log("");

  const pool = buildWeightedPool([...CONFIG.endpoints]);
  const stats = createStats();
  stats.startTime = performance.now();
  const deadline = stats.startTime + duration;

  const progressTimer = startProgressReporter(stats, 5_000);

  // Spawn `concurrency` workers. Each worker independently loops making
  // requests until the deadline is reached.
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker(i, baseUrl, pool, deadline, stats));
  }

  try {
    await Promise.all(workers);
  } finally {
    clearInterval(progressTimer);
  }

  const actualDuration = performance.now() - stats.startTime;
  console.log("");
  printSummary(stats, actualDuration, concurrency);
}

main().catch((err) => {
  console.error("Load test failed unexpectedly:", err);
  process.exit(1);
});
