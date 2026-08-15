# Task 2b — full-stack-developer

## Task
Create 4 API route files for the VerifScan notification center:
1. `GET` / `POST /api/notifications`
2. `PATCH` / `DELETE /api/notifications/[id]`
3. `POST /api/notifications/mark-all-read`
4. `GET` / `PATCH` / `PUT /api/notifications/preferences`

All routes use next-auth/jwt `getToken` auth, require `token.sub`, run on the
Node.js runtime, and delegate to `@/lib/notifications` (created in parallel
by Task 2a).

## Work Log
- Read `worklog.md`, `prisma/schema.prisma` (Notification / NotificationPreference
  / EmailLog models), and the existing route patterns in
  `src/app/api/lots/route.ts`, `src/app/api/lots/[id]/route.ts`,
  `src/app/api/admin/users/route.ts`, and `src/lib/utils.ts`.
- Created directory tree:
  - `src/app/api/notifications/`
  - `src/app/api/notifications/[id]/`
  - `src/app/api/notifications/mark-all-read/`
  - `src/app/api/notifications/preferences/`
- Wrote 4 route files matching the existing code style (JSDoc comments,
  try/catch, French error messages, `console.error` with `[ROUTE]` prefix).
- Noted that Task 2a's actual `markAsRead` / `deleteNotification` return
  `{ count: number }` (Prisma `updateMany` / `deleteMany` payloads) rather
  than the `Promise<boolean>` declared in the spec. Coded defensively so
  both shapes work:
  ```ts
  const res: unknown = await markAsRead(id, token.sub);
  const success = typeof res === "boolean"
    ? res
    : ((res as { count?: number } | null)?.count ?? 0) > 0;
  ```
- `GET /api/notifications` runs `listNotifications` + `getUnreadCount` +
  a `db.notification.count` for the total in parallel via `Promise.all`,
  then normalizes each item so `data` and `channels` are pre-parsed JSON.
- `POST /api/notifications` validates `title` / `message` (required) and
  `type` / `severity` (whitelist, defaults to `"system"` / `"info"`).
  Informal rate-limit observability: counts notifications created in the
  last hour and logs `console.warn` if >10. No enforcement.
- `PATCH /api/notifications/[id]` supports `read: false` to clear `readAt`
  (mark as unread) via a direct `db.notification.update` with explicit
  `userId` ownership check.
- `PUT /api/notifications/preferences` is an alias that delegates to `PATCH`.
- `PATCH /api/notifications/preferences` sanitizes the per-type `prefs`
  object — only `in_app` / `email` / `sms` boolean fields are kept, all
  other keys / shapes are stripped.

## Files Created
- `/home/z/my-project/src/app/api/notifications/route.ts`
- `/home/z/my-project/src/app/api/notifications/[id]/route.ts`
- `/home/z/my-project/src/app/api/notifications/mark-all-read/route.ts`
- `/home/z/my-project/src/app/api/notifications/preferences/route.ts`

## Verification
- `bun run lint` → clean (0 errors).
- `bunx tsc --noEmit` → no errors in any of the 4 new files (pre-existing
  errors in unrelated files only: examples/websocket, scripts/,
  src/components/admin/pages/SettingsPage.tsx, src/lib/auth.ts, etc.).
- Dev server (`bun run dev`) still serving `/` in ~25ms — no regressions.

## Stage Summary
All 4 notification-center API route files are in place, type-check cleanly,
and delegate correctly to the `@/lib/notifications` helpers from Task 2a.
Ready for the frontend notification bell / center UI to consume these
endpoints.
