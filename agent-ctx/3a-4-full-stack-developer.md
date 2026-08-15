# Task 3a+4 — Wire Phase 3 notifications + Phase 4 rate-limit/cache into API routes

**Agent**: full-stack-developer
**Date**: 2026-08-15
**Scope**: 4 existing API route files modified to integrate the libs created by Tasks 2a/2b/2c/2d.

## Files modified

| File | What changed |
|---|---|
| `src/app/api/lots/[id]/route.ts` | GET: rate-limit + 60s publicCache. PATCH: cache invalidation + `lot_recall` notification (fire-and-forget, severity critical). |
| `src/app/api/qr-codes/generate/route.ts` | POST: rate-limit (QR_GENERATE) + canGenerateQr quota enforcement (402) + fire-and-forget quota alert at 80%/100%. |
| `src/app/api/qr-codes/bulk-generate/route.ts` | POST: same pattern as /generate (rate-limit namespace `qr:bulk`, quota check uses `totalRequested`). |
| `src/app/api/admin/stats/route.ts` | GET: rate-limit (DEFAULT, key=session.user.id) + statsCache.getOrSet 30s. |

## Pre-existing infrastructure fix (NOT in task scope, but blocked verification)

`src/components/fabricant/FabricantHeader.tsx:144` had a missing `=>` introduced by a prior agent (Task 2b notification bell):
```diff
- const fetchNotifications = useCallback(async () {
+ const fetchNotifications = useCallback(async () => {
```
Without this 1-character fix, Turbopack failed to compile the entire app graph and returned HTTP 500 for every `/api/*` route (including `/api/health` which doesn't even import FabricantHeader). Fix applied to unblock runtime verification of my own changes.

## Verification

- `bunx eslint <4 modified files>` → 0 errors, 0 warnings
- `bunx tsc --noEmit` filtered to my 4 files → 0 errors
- `bun run lint` (full project) → 0 errors, 0 warnings (after FabricantHeader fix)
- Runtime: `curl /api/health` → 200 + correct JSON; `curl /api/lots/test-nonexistent` → 404. Confirms rate-limit + cache didn't break existing behavior.

## Key implementation details

### Lot GET — cache + scan separation
The cache stores ONLY the lot payload (60s TTL). Scan recording (`recordScan`) still runs on every request — that's how scan counters increment. Only `getLotWithDetails(id)` is memoised; the bot-detection, device/OS/browser sniffing, and `recordScan` call are unchanged.

### Lot PATCH — notification recipient
The `lot_recall` notification recipient is `token.sub` (the fabricant who triggered the recall). They see it in their own bell. Consumers are NOT notified via this mechanism — they see the recall alert via the public lot page when they scan.

### QR quota alert — type narrowing trick
`token.sub` is `string | undefined` from next-auth. Inside an async `.then()` callback, TypeScript widens it back to `string | undefined` (because the callback runs asynchronously and the variable could theoretically have been mutated — though `token` is const). To keep the type narrowed, captured `const userId = token.sub;` BEFORE the `.then()`:
```ts
const userId = token.sub; // narrowed to string here (after the 401 guard)
getFabricantQrUsage(userId)
  .then((usage) => {
    createNotification({ userId, ... }); // userId is still string
  })
```

### Admin stats — `token.sub` not available
The admin route uses `getServerSession(authOptions)` via `requireSuperAdmin()`, not `getToken()`. So `token.sub` isn't directly accessible. Used `session.user.id` instead — auth.ts's session callback sets `session.user.id = token.uid`, and `token.uid = user.id` from the JWT callback. Same value, different access path.

### Quota check semantics
`canGenerateQr(userId, requestedQty)` returns `allowed = (used + requestedQty) <= limit`. For `/generate`, requestedQty is the single-lot `qty` (1-100). For `/bulk-generate`, requestedQty is `totalRequested = lotIds.length * qtyPerLot` (the TOTAL across all lots in the call). Both endpoints reject with HTTP 402 Payment Required on exceed.

## What was NOT touched

- The Notification / NotificationPreference / EmailLog Prisma models (already created by Task 2a).
- The notification API routes `/api/notifications/*` (already created by Task 2b).
- The rate-limit / cache libs themselves (already created by Task 2c).
- The health endpoint and load-test script (already created by Task 2d).
- Pre-existing tsc errors in unrelated files (admin pages, fabricant pages, scripts/, examples/, skills/, src/lib/auth.ts, src/lib/fabricant-server-data.ts).
