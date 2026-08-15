# Task 2a — AI Intelligence backend (service library + API routes)

**Agent**: AI Backend Builder (Z.ai Code)
**Task ID**: 2a
**Project**: VerifScan V3 — AI Intelligence Module

## Task
Build the AI Intelligence backend for VerifScan V3 — a server-only service library wrapping the `z-ai-web-dev-sdk` LLM, plus 7 API route handlers exposing it to the fabricant dashboard.

## Context Reviewed
- Read `/home/z/my-project/worklog.md` — confirmed V2 Phases 3 (notifications) & 4 (rate-limiting + caching) are complete.
- Read `/home/z/my-project/prisma/schema.prisma` — confirmed `AiConversation` and `AiMessage` models exist (db:push done by main agent). The `AiConversation` model has `messages AiMessage[]` relation with `onDelete: Cascade`, so deleting a conversation also deletes its messages.
- Read `/home/z/my-project/src/app/api/notifications/route.ts` — pattern reference for auth + the project's existing `applyRateLimit` / `RATE_LIMITS` usage.
- Read `/home/z/my-project/src/app/api/admin/stats/route.ts` — confirmed `applyRateLimit` takes `(request, options)` where `options.key` is the user identifier (IP is overridden inside the helper for public endpoints; for auth'd endpoints we pass `session.user.id` explicitly).
- Read `/home/z/my-project/src/lib/auth.ts` — confirmed `session.user.id` is populated via the `session` callback (set to `token.uid`).
- Read `/home/z/my-project/src/lib/rate-limit.ts` — confirmed `RATE_LIMITS.DEFAULT = { windowMs: 60_000, max: 100 }` and `applyRateLimit` signature is synchronous, returns `NextResponse | null`.
- Read `/home/z/my-project/node_modules/z-ai-web-dev-sdk/dist/index.d.ts` — confirmed `ChatMessage.role` accepts `'system' | 'user' | 'assistant'` (so I used `'system'` for system prompts, which is the OpenAI convention).
- Verified `z-ai-web-dev-sdk@0.0.18` is in `package.json` dependencies.

## Files Created

### 1. `src/lib/ai.ts` (server-only module, ~770 lines)
Exports 5 async functions + their TypeScript types:

1. **`generateProductDescription(params)`** → `{ description, seoKeywords[] }`
   - System prompt: expert e-commerce copywriter for West-African food/cosmetic products, SEO-optimized, highlights traceability & authenticity.
   - Asks the LLM for STRICT JSON `{"description": "...", "seoKeywords": ["..."]}`.
   - On parse failure: returns raw text as `description` + empty `seoKeywords`.
   - On LLM failure: returns a sensible fallback description (product + brand + "Produit authentique d'Afrique de l'Ouest...").

2. **`translateText(params)`** → `{ translation }`
   - System prompt: professional translator (FR / EN / Wolof). Wolof = Senegalese national language. Preserves product/marketing tone.
   - Short-circuits when `from === to` (returns the original text).
   - On LLM failure: returns the original text (better than crashing the UI).

3. **`analyzeIngredients(params)`** → `{ allergens[], anomalies[], recommendations[] }`
   - System prompt: food safety expert (CEDEAO/UE compliance). Detects undeclared allergens (gluten, lactose, nuts, soy, eggs, fish, sesame, sulphites, peanut, mustard, celery), suspicious/inconsistent ingredients, missing origin info.
   - Asks for STRICT JSON with the 3 fields.
   - Validates each anomaly object (`type` / `severity` ∈ {info,warning,critical} / `message`).
   - On empty input: returns a warning anomaly + a recommendation.
   - On LLM failure: returns a warning anomaly + 2 manual-check recommendations.

4. **`getRecommendations({ userId })`** → `{ bestPublishTime, tips, predictions }`
   - Fetches scans via `db.scan.findMany({ where: { lot: { fabricantId: userId } }, select: { scannedAt: true } })`.
   - **If < 10 scans**: returns sensible defaults (Tuesday 10h, generic tips).
   - **Otherwise**: computes peak weekday + peak hour-within-peak-weekday (using a 7×24 matrix). Builds a scan summary (total scans, weekday distribution, top 3 hours) and passes it to the LLM as context for tailored tips/predictions.
   - LLM returns `{ reason, tips[], predictions[] }` (parsed safely).
   - On DB error: returns defaults. On LLM error: returns the computed peak slot with default tips/predictions.

5. **`chatWithAssistant({ userId, message, conversationId? })`** → `{ response, conversationId }`
   - System prompt: "VerifScan AI Assistant" — helps fabricants with descriptions, traceability, marketing, regulations (CEDEAO/UE), ingredients, scan stats. Always responds in French unless asked otherwise. Concise, practical, encouraging.
   - Loads or creates an `AiConversation` (auto-title = first 50 chars of message). If a `conversationId` is passed but doesn't belong to the user, a fresh conversation is created instead of leaking info.
   - Loads the last 10 messages from DB as context (oldest → newest order).
   - **Saves the user message BEFORE calling the LLM** — so the message is persisted even if the LLM call fails.
   - On LLM failure: returns a graceful French error message and still persists it.
   - Persists the assistant response + bumps `updatedAt`.

**Internal helpers**:
- `stripMarkdownFences(raw)` — removes ```json ... ``` fences (and partial fences).
- `parseJsonObjectSafe<T>(raw)` — strips fences, tries direct JSON.parse, then falls back to extracting the outermost `{ ... }` block. Returns `null` on failure (never throws).
- `getZai()` — dynamically imports `z-ai-web-dev-sdk` and calls `ZAI.create()`. Dynamic import isolates transient SDK init failures.
- `callLlm(systemPrompt, userMessage)` — wrapper that builds the `messages` array (system + user), disables thinking, returns the raw text response. Throws on empty response so callers can catch.

### 2. `src/app/api/ai/generate-description/route.ts` (POST)
- Auth via `getServerSession(authOptions)` → 401 if no `session.user.id`.
- Rate-limited with `RATE_LIMITS.DEFAULT` (100/min) + namespace `ai:description`, keyed by `session.user.id`.
- Validates `productName` (required string) and `language` (must be `fr`/`en`/`wolof` if provided).
- Calls `generateProductDescription` and returns its result.
- 400 on invalid body, 500 on unexpected error.

### 3. `src/app/api/ai/translate/route.ts` (POST)
- Same auth + rate-limit pattern (namespace `ai:translate`).
- Validates `text` (required string) + `from`/`to` (must each be in `fr`/`en`/`wolof`).
- Calls `translateText` and returns its result.

### 4. `src/app/api/ai/analyze-ingredients/route.ts` (POST)
- Same auth + rate-limit pattern (namespace `ai:analyze`).
- Validates `ingredients` (required string). `productName` is optional.
- Calls `analyzeIngredients` and returns its result.

### 5. `src/app/api/ai/recommendations/route.ts` (GET)
- Same auth + rate-limit pattern (namespace `ai:recommendations`).
- Calls `getRecommendations({ userId: session.user.id })` and returns its result.

### 6. `src/app/api/ai/chat/route.ts` (POST)
- Same auth + rate-limit pattern (namespace `ai:chat`).
- Validates `message` (required non-empty string). `conversationId` is optional.
- Calls `chatWithAssistant` and returns `{ response, conversationId }`.

### 7. `src/app/api/ai/conversations/route.ts` (GET)
- Same auth + rate-limit pattern (namespace `ai:conversations`).
- Returns the user's 50 most-recent conversations via:
  ```ts
  db.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { _count: { select: { messages: true } } },
  })
  ```
- Maps to `{ id, title, tool, updatedAt, messageCount }`.

### 8. `src/app/api/ai/conversations/[id]/route.ts` (GET + DELETE)
- Same auth + rate-limit pattern (namespaces `ai:conversation-detail` / `ai:conversation-delete`).
- **GET**: loads the conversation + its messages (ordered `createdAt asc`). Returns 404 if not found, **403 if found but doesn't belong to the user** (avoids ID probing).
- **DELETE**: same ownership check, then `db.aiConversation.delete` (messages cascade-deleted by Prisma).

## Design Decisions

1. **Dynamic SDK import inside `getZai()`** — avoids a module-level side-effect that could crash the whole module on import failure. Each LLM call re-imports (cached by Node/Bun's module system, so effectively free after the first call).

2. **System prompts use `role: 'system'`** (not `role: 'assistant'` as the task example showed). The SDK's TypeScript types explicitly allow `'system' | 'user' | 'assistant'`, and `'system'` is the OpenAI convention for instructions — it produces better-grounded responses.

3. **`thinking: { type: 'disabled' }`** on every LLM call — these are focused, single-purpose tasks; chain-of-thought reasoning would add latency + tokens without improving output quality.

4. **JSON safety net (`parseJsonObjectSafe`)** — three-tier strategy: (1) direct JSON.parse, (2) extract outermost `{...}` block, (3) return null. Never throws. Combined with `stripMarkdownFences`, this handles LLM responses that wrap JSON in fences despite instructions.

5. **`chatWithAssistant` saves the user message BEFORE calling the LLM** — so even if the LLM fails (timeout, network error), the user's message is persisted. The assistant response (whether real or a graceful fallback message) is saved separately afterward.

6. **Ownership for `conversations/[id]` returns 403 (not 404) on mismatch** — prevents attackers from probing which conversation IDs exist. The route still returns 404 for genuinely non-existent IDs.

7. **Rate-limit key = `session.user.id`** (not IP) for all AI routes — they're all auth-required, so per-user is more accurate than per-IP. The 100 req/min limit (`RATE_LIMITS.DEFAULT`) is generous enough for interactive use but blocks abuse.

8. **`export const runtime = "nodejs"`** on every route — required because `z-ai-web-dev-sdk` uses Node APIs (and Prisma does too).

## Verification

### Lint
```
bunx eslint src/lib/ai.ts src/app/api/ai/generate-description/route.ts \
  src/app/api/ai/translate/route.ts src/app/api/ai/analyze-ingredients/route.ts \
  src/app/api/ai/recommendations/route.ts src/app/api/ai/chat/route.ts \
  src/app/api/ai/conversations/route.ts 'src/app/api/ai/conversations/[id]/route.ts'
```
→ **0 errors, 0 warnings** on all 8 new files.

Fixed one initial ESLint parsing error: an extraneous `[...` array spread wrapper around the `top3Hours` chain in `getRecommendations` (leftover from an earlier draft) — removed it; the chain is now a straightforward `Array.map().sort().slice().map().join(", ")`.

### TypeScript
```
bunx tsc --noEmit
```
→ **0 errors in any of the 8 new files**. (Pre-existing tsc errors in unrelated files: `examples/`, `scripts/`, `skills/`, `src/components/admin/pages/*`, `src/components/fabricant/pages/AIAssistantPage.tsx`, `src/lib/auth.ts`, `src/lib/fabricant-server-data.ts` — all untouched by this task.)

### Full-project lint
`bun run lint` reports 2 errors, both in `src/components/fabricant/pages/AIAssistantPage.tsx` (a `react-hooks/set-state-in-effect` warning about `setState()` in effect bodies). That file was created by a parallel frontend agent and is **not in scope** for Task 2a — my 8 files are clean.

### Runtime curl
The dev server (port 3000) was **down** during verification — last log entry is `GET /api/health 200 in 80ms` at 10:57 UTC; the process is not listed by `ps`. Per project rules I cannot run `bun run dev` myself. The expected curl tests:
- `curl /api/ai/recommendations` → expected 401 (no auth)
- `curl -X POST /api/ai/translate -d '{"text":"hello","from":"en","to":"fr"}'` → expected 401

Could not be executed due to the dev server being unavailable. However:
- Auth check pattern is identical to the working `/api/notifications` route (which returns 401 for unauthenticated requests per the V2 worklog).
- TypeScript + ESLint pass, so the route handlers are syntactically valid and will compile cleanly when Turbopack picks them up.
- The `getServerSession(authOptions)` + `if (!session?.user?.id) return NextResponse.json({error:'Non autorisé'}, {status:401})` pattern is verbatim from the task spec and matches the project's existing auth conventions.

Once the dev server is restarted, the routes should respond as expected.

## Stage Summary
- **8 new files created** (1 lib + 7 route files) — no existing files modified (except worklog append).
- **AI service library** (`src/lib/ai.ts`) wraps `z-ai-web-dev-sdk@0.0.18` with 5 high-level helpers: `generateProductDescription`, `translateText`, `analyzeIngredients`, `getRecommendations`, `chatWithAssistant`. Every function is wrapped in try/catch with sensible French fallbacks. JSON-returning calls use a 3-tier safe parser (`stripMarkdownFences` + `parseJsonObjectSafe`).
- **7 API routes** exposed under `/api/ai/*`: `generate-description` (POST), `translate` (POST), `analyze-ingredients` (POST), `recommendations` (GET), `chat` (POST), `conversations` (GET list), `conversations/[id]` (GET + DELETE). All enforce auth (401), rate-limit (`RATE_LIMITS.DEFAULT` 100/min per user, distinct namespaces), and ownership (403 for other users' conversations).
- **Chat persistence**: `chatWithAssistant` auto-creates an `AiConversation` (title = first 50 chars of message), loads the last 10 messages as context, saves the user message before the LLM call (so it's never lost on LLM failure), and saves the assistant response after.
- **Recommendations** uses real scan data: groups by weekday + hour (7×24 matrix), finds the peak slot, and asks the LLM for tailored tips/predictions grounded in the scan summary. Falls back to Tuesday 10h defaults when < 10 scans.
- All system prompts are in French, tailored to Senegalese/West-African manufacturers.
- ESLint clean (0 errors, 0 warnings) on all 8 files. TypeScript clean. Runtime curl not executed because the dev server is currently down (environmental issue, not a code issue).
