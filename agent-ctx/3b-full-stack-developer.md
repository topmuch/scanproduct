# Task 3b — Real-time Notifications UI (Fabricant dashboard)

Agent: full-stack-developer
Task ID: 3b

## Task

Replace the static mock notifications in the fabricant header with real API
calls, add a full Notifications page in the fabricant dashboard, and add a
real notification preferences section in the Parametres page.

## Reference files read

- `worklog.md` (Tasks 2a + 2b — notifications lib + API routes)
- `src/components/fabricant/FabricantHeader.tsx` (static NOTIFICATIONS array)
- `src/components/fabricant/FabricantSidebar.tsx` (NAV_SECTIONS / PAGE_TO_KEY)
- `src/components/fabricant/FabricantDataProvider.tsx`
- `src/lib/fabricant-store.ts` (FabricantPage / SettingsSection types)
- `src/components/fabricant/pages/ParametresPage.tsx`
- `src/components/fabricant/ui.tsx` (PageHeader, SectionCard, GradientButton, OutlineButton)
- `src/components/ui/switch.tsx` (shadcn Switch)
- `src/components/ui/sonner.tsx` (already mounted globally via `app/layout.tsx`)
- `src/app/api/notifications/route.ts`, `[id]/route.ts`,
  `mark-all-read/route.ts`, `preferences/route.ts`
- `src/lib/notifications.ts`
- `src/components/fabricant/FabricantShell.tsx`

## Work log

### 1. `src/lib/fabricant-store.ts`
- Added `"notifications"` to the `FabricantPage` union type.

### 2. `src/components/fabricant/FabricantSidebar.tsx`
- Imported `Bell` from `lucide-react`.
- Added a new `notifications` nav item to the `ANALYTIQUE` section, right
  after `Statistiques`.
- Updated `PAGE_TO_KEY` to map the new page id to its key.

### 3. `src/components/fabricant/FabricantHeader.tsx`
- Removed the static `NOTIFICATIONS` constant.
- Added `useState` for `notifications`, `unreadCount`, `loading`, `markingAll`.
- Added `useEffect` that calls `/api/notifications?limit=20` on mount, then
  every 30s via `setInterval` (cleared on unmount).
- Added a second `useEffect` that re-fetches when the dropdown opens so the
  user always sees fresh data.
- Bell badge now displays `unreadCount` straight from the API (capped at
  `99+`).
- Each notification row uses a `TYPE_ICON` map
  (lot_recall → AlertTriangle red, quota_warning → AlertCircle amber,
  quota_exceeded → AlertCircle red, new_scan → ScanLine blue,
  weekly_report → BarChart3 green, system → Info blue,
  ticket_update → MessageSquare purple, subscription → CreditCard blue).
- Unread items have a left-border accent + light blue tint + small blue dot.
- Clicking a notification optimistically marks it as read locally, then
  fires `PATCH /api/notifications/[id]` (reverts via re-fetch on failure).
- Added "Tout marquer comme lu" button at the top of the dropdown →
  `POST /api/notifications/mark-all-read` (optimistic update).
- "Voir toutes les notifications" button calls `setPage("notifications")`.
- Added an inline `formatRelativeTime(input)` helper producing French
  strings: "à l'instant", "il y a N min", "il y a N h", "hier", "il y a N j",
  "il y a N mois", "il y a N an(s)".
- Added `notifications` entry to the `PAGE_TITLES` map.
- Loading skeleton (4 rows) + empty state inside the dropdown.
- Used `framer-motion` `AnimatePresence` for the dropdown slide animation.
- Avatar "Paramètres" button now navigates to `parametres` instead of being
  a dead button.

### 4. `src/components/fabricant/pages/NotificationsPage.tsx` (NEW)
- Two-column layout on `lg+`: left = filters + notification list
  (`lg:col-span-2`), right = preferences summary card.
- Filter tabs: Toutes / Non lues / Alertes (lot_recall + quota_warning +
  quota_exceeded) / Système (system + weekly_report). Each tab shows a count
  badge.
- "Tout marquer comme lu" button in the header.
- Each notification is a card with: colored icon, title + message + relative
  time + severity badge + per-channel chips (Email/SMS/In-app if present).
  - "Marquer comme lu" button (PATCH `/api/notifications/[id]`) for unread.
  - "Supprimer" button (DELETE `/api/notifications/[id]`) with optimistic
    removal + revert.
  - For `lot_recall` items with `data.lotId`: "Voir le lot" button calling
    `useFabricantNav().openDetail("lot-detail", lotId)`.
- Empty state: centered dashed-border card with a Bell icon and a message
  adapted to the active filter.
- Loading state: 5 skeleton rows.
- Pagination: "Charger plus" button increments offset by 20 (PAGE_SIZE),
  only visible if `total > offset` (and not on the "Non lues" tab, where
  unreadOnly is server-filtered).
- Preferences summary card (right): fetches
  `GET /api/notifications/preferences`, displays 3 master-toggle chips and
  a per-type summary list. "Modifier" button calls
  `setPage("parametres"); setSettingsSection("notifications")`.
- Uses `framer-motion` `AnimatePresence` for item enter/exit animations.
- Uses `sonner`'s `toast.success` / `toast.error` for action feedback.

### 5. `src/components/fabricant/pages/ParametresPage.tsx`
- Added imports: `useEffect`, `Switch` (shadcn), `toast` from `sonner`.
- Replaced the old mock-based `NotificationsSection` (and its
  `NotifRow` / `INITIAL_NOTIFS` / `NotifRowView` / `FrequencySelect`
  helpers) with a real preferences UI:
  - Card "Préférences de notification" / subtitle
    "Choisissez comment vous souhaitez être informé".
  - Three master toggle cards at the top (in-app, email, SMS) using the
    shadcn `Switch`. The SMS card is `disabled` with a "Bientôt disponible"
    badge.
  - A per-type table (8 rows × 3 channel columns) with the shadcn `Switch`
    in each cell. Channel switches are disabled when their master toggle is
    off, so the table reflects the actual effective state.
  - `GET /api/notifications/preferences` on mount.
  - On any change (after the initial load), a 500ms debounce fires
    `PATCH /api/notifications/preferences` with the full prefs object.
  - `toast.success("Préférences enregistrées")` on save,
    `toast.error(...)` on failure.
  - Manual "Enregistrer les préférences" button at the bottom (flushes any
    pending debounced save immediately).
- Added a `GlobalToggleCard` helper component used by the 3 master toggles.

### 6. `src/components/fabricant/FabricantShell.tsx`
- Imported `NotificationsPage`.
- Added a `"notifications"` case in the `renderPage(page)` switch.

## Verification

- `bun run lint`: **0 errors, 0 warnings**.
- `bunx tsc --noEmit`: no errors in any of the files I created/modified
  (FabricantHeader, FabricantSidebar, NotificationsPage, ParametresPage,
  FabricantShell, fabricant-store). Pre-existing errors in unrelated files
  (admin pages, lib/auth, examples, scripts, skills, fabricant-server-data,
  ProduitDetailPage, ProduitsPage, lots/[id], qr-codes/* routes) are not
  caused by this task.
- Dev server log shows `GET /api/notifications?limit=20 200 in 360ms` —
  the bell is already successfully fetching real data.

## Notes for downstream agents

- The `FabricantPage` type now includes `"notifications"` — any code that
  exhaustively switches on `FabricantPage` (the header `PAGE_TITLES` map,
  the sidebar `PAGE_TO_KEY` map, the shell `renderPage` switch) has been
  updated.
- A shared `formatRelativeTime` helper is now duplicated inline in both
  `FabricantHeader.tsx` and `NotificationsPage.tsx`. If you want to
  consolidate, move it to `@/lib/utils` (or a new `@/lib/time` module).
- The `TYPE_ICON` / `TYPE_META` map is also duplicated between the header
  and the page for the same reason — could be extracted to
  `@/components/fabricant/notifications-meta.ts` if needed.
- The new Notifications page is reachable via the sidebar `Notifications`
  item (ANALYTIQUE section), the bell dropdown's "Voir toutes les
  notifications" button, and the "Modifier mes préférences" button in the
  right-side summary card (which deep-links into the Parametres >
  Notifications section).
