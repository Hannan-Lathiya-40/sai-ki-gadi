# Admin 2.0 — Phase 0 Full Audit Report

**Branch:** `admin-2.0`  
**Audit date:** 2026-03-23  
**Scope:** Existing Sai Ki Gadi / Merigaadi Admin Panel (Next.js App Router)  
**Rule for this phase:** Read-only inspection. No application code was modified for this report.

---

## Executive summary

The admin panel is a functional App Router application with real Supabase-backed modules (users, requirements, verification, fraud, cities, exchanges, content, membership settings). It is not production-grade yet.

**Highest-severity findings:**

1. **Critical security:** Hardcoded admin password (`admin` / `12345678`); cookie session is a boolean flag with no server-side identity; **15 of 34** admin API routes have **no** session check while using **service-role** Supabase.
2. **Critical performance:** Dashboard server page loads **all users** (and several other full/near-full tables), then recomputes stats in JS; `force-dynamic` disables caching; almost every mutation calls `router.refresh()` (full RSC refetch).
3. **Architecture:** Nearly all UI lives in one ~5.3k-line client component (`dashboard-tabs.tsx`) with tab state instead of routes — navigation feels like a full app reload.
4. **Realtime:** Only `admin_notifications` is subscribed; KPI cards do not update live; no Live/last-updated UX on the dashboard.
5. **Missing platform pieces:** No `loading.tsx` / `error.tsx`, no charts library, no admin audit log table/UI, no global search, limited a11y and responsive polish.

**Preserve:** All existing modules and RPCs listed in Phase 20 must remain. Modernization should be incremental, not a rewrite.

---

## Stack inventory (answers to audit checklist 1–10)

| # | Item | Finding |
|---|------|---------|
| 1 | Next.js version | **16.2.3** (`package.json`) |
| 2 | React version | **19.2.4** |
| 3 | Router | **App Router only** (`app/`). No `pages/` router. |
| 4 | Folder structure | `app/` (pages + API), `components/`, `lib/`, `hooks/`, `types/`, `supabase/migrations/`, `scripts/`. Admin UI concentrated under `app/dashboard/`. |
| 5 | Layouts | Root `app/layout.tsx` (Geist fonts, Toaster). Dashboard `app/dashboard/layout.tsx` wraps shell + `AdminNotificationsBell`. |
| 6 | Authentication | Cookie `merigaadi_admin_session=1` set by `/api/admin/login` after comparing body to hardcoded credentials. Not Supabase Auth for admins. |
| 7 | Supabase clients | `lib/supabase-admin.ts` — service role, server-only. `lib/supabase-browser.ts` — anon + `NEXT_PUBLIC_*`, used by notifications bell. |
| 8 | Middleware / proxy | **`proxy.ts`** (Next 16 convention; no `middleware.ts`). Guards `/` and `/dashboard` via cookie presence only. |
| 9 | Protected routes | Soft gate: missing cookie → redirect to `/`. Presence of cookie = “admin”. APIs inconsistently protected. |
| 10 | Admin role verification | **None.** No admin user table, no role claim, no Supabase JWT admin check. Single shared password. |

### Dashboard pages & modules (checklist 11)

| Surface | Implementation |
|---------|----------------|
| Login | `app/page.tsx` + `app/login-form.tsx` |
| Dashboard shell | `app/dashboard/page.tsx` (Server Component, `force-dynamic`) |
| All modules (tabs) | `app/dashboard/dashboard-tabs.tsx` (~5283 lines, `"use client"`) |
| Extra pages | `app/dashboard/priority-timeline/page.tsx`, `membership/page.tsx`, `profile-changes/page.tsx` (thin wrappers / related UIs) |
| Tab keys (in-panel) | Overview, Users, Requirements, Pending Verification, Car Verification, Fraud Reports, About Us, Birthday Date, Cities, Exchanges, In-App Popups, Not Started, Priority Timeline, Profile Changes, Rejected/Partial, Minimum Fare, Sliders, Winners |

### API routes (checklist 12)

**34** `app/api/admin/**/route.ts` files.

**Authenticated (19)** — call `hasAdminSession()` / similar:

- login, logout, session  
- announcements (+ `[id]`, analytics, upload)  
- birthday-settings  
- car-verifications  
- minimum-fare (+ `[id]`)  
- not-started  
- notifications (+ `[id]`)  
- pending-verifications  
- profile-change-requests (+ `[id]`)  
- requirements  
- special-users (+ `[id]`)  
- upload/winner-images  
- users/verification  

**Unauthenticated (15)** — no session gate (service-role still used server-side):

- `about-us`  
- `cities`, `cities/[id]`  
- `fraud-reports`, `fraud-reports/[id]`  
- `priority-settings`  
- `reject-user`  
- `sliders`, `sliders/[id]`, `sliders/reorder`  
- `upload`  
- `users`, `users/[id]`  
- `winners`, `winners/[id]`  

### Supabase / RPC / realtime / fetching (checklist 13–20)

| Area | Finding |
|------|---------|
| Queries | Heavy use of `supabaseAdmin.from(...).select('*')` with large limits or no pagination on dashboard bootstrap. |
| RPCs | Used for some domains (e.g. priority/membership-related); dashboard overview mostly table scans + JS aggregation. |
| Realtime | `components/admin-notifications-bell.tsx` — `postgres_changes` on `admin_notifications`. Not used for KPI cards. |
| Data strategy | Server fetch everything on `/dashboard` → pass large props to client → client mutates via `fetch` → `router.refresh()`. |
| Loading | Inline spinners / empty UI; **no** `app/dashboard/loading.tsx`. |
| Caching | `export const dynamic = "force-dynamic"` on dashboard; no ISR/tag revalidation strategy for admin KPIs. |
| Duplicated queries | Multiple full/partial user scans for different counters; requirements + cities overlap with later client fetches. |
| Full reloads | Tab switches stay client-side, but **mutations** trigger full RSC refresh; opening heavy tabs after refresh feels like full reload. |
| Client components | Entire module surface is one client tree; little Server Component streaming per section. |
| Heavy deps | No chart library yet. Next/React/Supabase dominate. Image uploads via FormData to API. |

### Charts, images, errors, toasts, env, RLS (checklist 23–30)

| Area | Finding |
|------|---------|
| Charts | **None** in admin today. |
| Images | Winner / slider / announcement uploads; Nginx body-size (413) is an ops concern historically. |
| Errors | Inconsistent; many `alert()` paths; little route-level `error.tsx`. |
| Toasts | `sonner` at root layout; not consistently used vs `alert()`. |
| Env | Server: `SUPABASE_SERVICE_ROLE_KEY`. Client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Risk:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` observed in local env naming patterns — must never ship to browser. |
| RLS | Admin APIs use **service role** (bypass RLS). Security therefore depends entirely on API auth — currently incomplete. |
| service_role in browser | Library code paths reviewed: browser client uses anon. Still verify no `NEXT_PUBLIC_*SERVICE*` in client imports. |

### Query / realtime / nav quality (checklist 31–46)

| Area | Finding |
|------|---------|
| N+1 | Some list→detail patterns; dashboard itself is “fetch huge sets once” rather than classic N+1. |
| Sequential fetches | Dashboard `page.tsx`: parallel batch then **sequential** follow-up queries (waterfall). |
| Refetch on click | Many actions end in `router.refresh()`. |
| useEffect chains | Present in large client file (tabs, filters, local state sync). |
| Re-renders | Monolith client: any tab state change can re-render large subtrees. |
| Duplicate stats | User membership/verification counts derived by scanning loaded user arrays multiple times. |
| Slow RPCs | Document separately if profiling shows hot RPCs; none rewritten in this audit. |
| Unfiltered queries | Dashboard loads broad selects; some APIs return large lists without server pagination. |
| Pagination | Partial / missing for large admin tables (users, requirements, exchanges). |
| Realtime cleanup | Bell unsubscribes on unmount (good pattern to replicate). Risk of duplicate channels if remounted poorly. |
| Route loading | No route-level loading UI for `/dashboard`. |
| Navigation | **Tabs inside one route**, not App Router segments — no deep links per module, no parallel route loading. |

---

## A. Performance problems

### A1. Full-table dashboard bootstrap

- **Current:** `app/dashboard/page.tsx` loads large collections (notably all/near-all users) and derives KPI counts in memory; `dynamic = "force-dynamic"`.
- **Why:** O(n) payload + O(n) CPU on every visit; blocks TTFB.
- **Impact:** Slow first paint; worse as user count grows (already hundreds of users).
- **Recommended:** Aggregate via SQL/RPC or `count`/`head` queries; fetch only overview KPIs for first paint; paginate module data per tab/route.
- **Change scope:** Frontend + backend (API/RPC) + possibly database (indexes/aggregates).

### A2. Sequential query waterfall after parallel batch

- **Current:** Initial `Promise.all` then additional awaits in series for related datasets.
- **Why:** Adds latency even when queries are independent.
- **Impact:** Extra hundreds of ms–seconds on each dashboard load.
- **Recommended:** Single parallel wave; or one multi-metric RPC.
- **Change scope:** Frontend (server page) / backend.

### A3. `router.refresh()` after nearly every mutation (~19 call sites)

- **Current:** Client actions call `router.refresh()` to reload the Server Component tree.
- **Why:** Refetches the entire expensive dashboard payload to update one row.
- **Impact:** “Every button feels like a full reload.”
- **Recommended:** Local/cache updates, SWR/React Query or server actions with targeted revalidateTag; reserve full refresh for rare cases.
- **Change scope:** Frontend (primary).

### A4. Monolithic client bundle (`dashboard-tabs.tsx` ~5.3k lines)

- **Current:** All modules in one client component.
- **Why:** Large JS parse/eval; poor code-splitting; any interaction can re-render large UI.
- **Impact:** Slow tab switches; hard to lazy-load heavy panels (tables, future charts).
- **Recommended:** Route-per-module or lazy `dynamic()` panels; shared shell as Server Component.
- **Change scope:** Frontend architecture.

### A5. No route-level `loading.tsx` / Suspense streaming for dashboard sections

- **Current:** User waits on full server render before meaningful UI.
- **Why:** No progressive disclosure of shell vs data.
- **Impact:** Blank/slow perceived load.
- **Recommended:** Instant shell + section skeletons + Suspense boundaries per KPI/table.
- **Change scope:** Frontend.

### A6. Duplicate / overlapping data scans for statistics

- **Current:** Multiple filters over the same loaded user/requirement arrays for membership, verification, pending counts, etc.
- **Why:** Redundant work and easy drift between cards.
- **Impact:** CPU on server; inconsistent numbers if sources diverge.
- **Recommended:** One aggregation source of truth (SQL view/RPC).
- **Change scope:** Backend/database + frontend.

### A7. Missing server-side pagination on large lists

- **Current:** Some admin lists fetch far more rows than displayed.
- **Why:** Network + render cost scales with table size.
- **Impact:** Slow Users / Requirements / Exchanges modules.
- **Recommended:** Page size + cursor/offset on API; URL query state.
- **Change scope:** Frontend + backend.

### A8. Debug logging on hot path

- **Current:** `console.log` of requirements payload size/content patterns observed in dashboard server page.
- **Why:** I/O and possible PII in logs.
- **Impact:** Noise, slight latency, privacy risk.
- **Recommended:** Remove or gate behind debug flag; never log full row sets.
- **Change scope:** Frontend/server.

### A9. No client cache for frequent admin reads

- **Current:** After refresh, everything is re-fetched; little stale-while-revalidate.
- **Why:** No shared cache layer for list/KPI queries.
- **Impact:** Repeat navigations pay full cost.
- **Recommended:** Tagged server cache + light client cache for filters within a session.
- **Change scope:** Frontend.

### A10. Charts not present (future risk)

- **Current:** No chart library.
- **Why:** When added, naive import can bloat main bundle.
- **Impact:** Future regression of load time.
- **Recommended:** `dynamic(() => import(...), { ssr: false })` for chart modules only.
- **Change scope:** Frontend (Phase 5).

---

## B. UI/UX problems

### B1. Tab-based navigation instead of routes

- **Current:** Modules are `TabKey` switches inside `/dashboard`.
- **Why:** No deep links, browser back is weak, cannot stream per-route UI.
- **Impact:** Feels like one heavy page; poor shareability; hard loading UX.
- **Recommended:** App Router segments under `/dashboard/...` mapped to existing modules; keep all features.
- **Change scope:** Frontend.

### B2. Basic visual design / low information hierarchy

- **Current:** Functional cards/buttons; limited SaaS density and typography system.
- **Why:** Grew feature-first without a design system.
- **Impact:** Harder operational scanning; looks non-production.
- **Recommended:** Design tokens + reusable KPI/Card/Table/PageHeader (Phase 16) without removing features.
- **Change scope:** Frontend.

### B3. Heavy use of `alert()` (~9+ in dashboard-tabs)

- **Current:** Browser dialogs for success/errors/confirmations.
- **Why:** Blocks UI thread; inconsistent with `sonner`.
- **Impact:** Poor admin UX; no undo patterns.
- **Recommended:** Toasts + accessible confirm dialogs.
- **Change scope:** Frontend.

### B4. Inconsistent loading / empty / error states

- **Current:** Ad-hoc spinners; many panels lack skeletons and retry.
- **Why:** No shared EmptyState/ErrorState/Skeleton.
- **Impact:** “Giant spinner” perception on module open.
- **Recommended:** Instant page chrome + skeleton table/cards (Phase 13).
- **Change scope:** Frontend.

### B5. No global search

- **Current:** Per-tab filters only (where present).
- **Why:** Operators cannot jump across entities quickly.
- **Impact:** Slower ops workflows.
- **Recommended:** Server-side global search API (users, requirements, etc.) with debounce (Phase 8).
- **Change scope:** Frontend + backend.

### B6. No unified notification center UX beyond bell

- **Current:** Bell for `admin_notifications`; dashboard KPIs do not reflect live ops.
- **Why:** Incomplete control-center feel.
- **Impact:** Missed pending work unless manually refreshing.
- **Recommended:** Notification drawer + Live indicator + deep links (Phases 3, 12).
- **Change scope:** Frontend (+ existing table).

### B7. Module organization flat

- **Current:** Long horizontal/vertical tab list mixing ops, content, and settings.
- **Why:** No grouped IA (Overview / Operations / Membership / Content / System).
- **Impact:** Cognitive load.
- **Recommended:** Collapsible grouped sidebar mapping existing tabs/routes (Phase 17).
- **Change scope:** Frontend.

### B8. Confirmations for destructive actions inconsistent

- **Current:** Some paths use `confirm`/`alert`; not standardized.
- **Why:** Risk of accidental destructive ops.
- **Impact:** Data integrity / trust.
- **Recommended:** Shared ConfirmDialog; disable double-submit.
- **Change scope:** Frontend.

---

## C. Security problems

### C1. Hardcoded admin credentials (CRITICAL)

- **Current:** Login compares to fixed username/password in server login route (e.g. `admin` / `12345678`).
- **Why:** Credential stuffing / insider leak = full admin.
- **Impact:** Full data exfiltration and mutation of production data.
- **Recommended:** Supabase Auth (or IdP) + server session; hashed secrets at minimum; rotate immediately.
- **Change scope:** Backend + auth architecture (+ possibly DB admin users).

### C2. Session is a boolean cookie (CRITICAL)

- **Current:** `merigaadi_admin_session=1`; `hasAdminSession()` checks presence; proxy checks presence.
- **Why:** Forgeable if cookie not hardened; no admin identity; no expiry tied to identity; no CSRF binding to user.
- **Impact:** Anyone who can set/obtain cookie shape may access admin APIs that check it; no audit actor ID.
- **Recommended:** Signed httpOnly session (JWT/sealed cookie) with expiry, secure/sameSite, server verification of claims.
- **Change scope:** Backend + frontend login.

### C3. Unauthenticated admin APIs with service role (CRITICAL)

- **Current:** 15 routes (users, winners, sliders, cities, fraud-reports, about-us, upload, reject-user, priority-settings, etc.) skip `hasAdminSession`.
- **Why:** Service role bypasses RLS; endpoints are publicly callable if deployed.
- **Impact:** Unauthenticated read/write of core admin data.
- **Recommended:** Require auth on **all** `/api/admin/*` except login; shared `requireAdminApi()` helper; add integration tests.
- **Change scope:** Backend (immediate).

### C4. Proxy only covers `/` and `/dashboard`

- **Current:** `proxy.ts` matcher limited; API protection left to each route.
- **Why:** Incomplete defense in depth.
- **Impact:** Combined with C3, APIs are exposed.
- **Recommended:** Central API auth helper + optional proxy checks for `/api/admin/*` (careful with login).
- **Change scope:** Backend.

### C5. Frontend-only trust is insufficient

- **Current:** UI hides controls when “logged in”; APIs must enforce.
- **Why:** UI is not a security boundary.
- **Impact:** Direct HTTP calls bypass UI.
- **Recommended:** Server-side authz on every mutation/read admin API.
- **Change scope:** Backend.

### C6. Environment variable / service_role exposure risk

- **Current:** Correct pattern is server-only `SUPABASE_SERVICE_ROLE_KEY`. Local/env history may include `NEXT_PUBLIC_` variants.
- **Why:** Anything `NEXT_PUBLIC_` is bundled to the browser.
- **Impact:** Full database compromise if service role leaks to client.
- **Recommended:** Audit env templates; fail build if service role is public-prefixed; never import admin client in client components.
- **Change scope:** Config + CI + backend.

### C7. RLS bypass dependency

- **Current:** Admin panel relies on service role.
- **Why:** Correct only if APIs are locked down; today they are not fully.
- **Impact:** RLS does not protect against open admin APIs.
- **Recommended:** Do **not** weaken RLS; fix API auth; optionally add admin JWT claims for least privilege later.
- **Change scope:** Backend (auth), not RLS teardown.

### C8. XSS / unsafe HTML

- **Current:** User-generated content (about us, announcements, profiles) rendered in admin; need audit for `dangerouslySetInnerHTML` / unsanitized HTML.
- **Why:** Stored XSS can attack admins.
- **Impact:** Session theft / malicious actions as admin.
- **Recommended:** Prefer text; sanitize if HTML required; CSP where feasible.
- **Change scope:** Frontend.

### C9. Error message leakage

- **Current:** Some handlers may return raw Supabase/DB errors.
- **Why:** Schema/policy details aid attackers.
- **Impact:** Information disclosure.
- **Recommended:** Normalize errors for clients; log details server-side only.
- **Change scope:** Backend.

### C10. No admin audit log

- **Current:** No first-class admin audit log module/table identified for admin panel actions.
- **Why:** Cannot forensically attribute verification/rejection/settings changes.
- **Impact:** Compliance and incident response gap.
- **Recommended:** Document schema requirement first (Phase 11); do not migrate blindly in app code without approval.
- **Change scope:** Database (future) + backend.

### C11. Open redirect / session fixation

- **Current:** Simple cookie set on login; review redirect params if added later.
- **Why:** Common footguns during auth upgrades.
- **Impact:** Phishing / session issues.
- **Recommended:** Allowlist redirects; regenerate session on login.
- **Change scope:** Backend.

### C12. Double-submit / lack of idempotency on destructive POSTs

- **Current:** Buttons may not disable during in-flight requests consistently.
- **Why:** Duplicate rejects/verifies/uploads.
- **Impact:** Inconsistent state.
- **Recommended:** Pending state + idempotency keys where needed.
- **Change scope:** Frontend (+ backend where critical).

---

## D. Architecture problems

### D1. God-component admin UI

- **Current:** `dashboard-tabs.tsx` owns nearly all modules.
- **Why:** Violates separation of concerns; blocks incremental adoption of RSC.
- **Impact:** High regression risk; slow delivery.
- **Recommended:** Extract module panels + data hooks; thin route files.
- **Change scope:** Frontend.

### D2. Props-drilling entire datasets into client

- **Current:** Server page passes large arrays into client tabs.
- **Why:** Forces serialization of huge RSC payload.
- **Impact:** Slow navigation and hydration.
- **Recommended:** Pass KPI summaries only; fetch table pages via authenticated APIs or server components per route.
- **Change scope:** Frontend.

### D3. Inconsistent API auth and response shapes

- **Current:** Some routes authed, some not; varied error formats.
- **Why:** Organic growth.
- **Impact:** Security holes; harder client error handling.
- **Recommended:** Shared `requireAdminApi`, error helper, types.
- **Change scope:** Backend.

### D4. Mixed auth model (custom cookie vs Supabase user auth)

- **Current:** Mobile/users use Supabase; admin uses custom cookie.
- **Why:** No shared identity/roles.
- **Impact:** Cannot reuse RLS admin policies cleanly; weak audit identity.
- **Recommended:** Incremental move to real admin identities without breaking mobile.
- **Change scope:** Backend + possibly DB.

### D5. Duplicate dashboard-adjacent routes

- **Current:** Some features also have `/dashboard/priority-timeline`, `membership`, `profile-changes` alongside tabs.
- **Why:** Parallel entry points.
- **Impact:** Confusion; duplicated fetch logic risk.
- **Recommended:** Single navigation IA; redirects from old paths.
- **Change scope:** Frontend.

### D6. No shared design-system / data-table primitives

- **Current:** Repeated table markup and filters per tab.
- **Why:** Inconsistent UX and harder performance fixes.
- **Impact:** Every module re-implements pagination/search poorly.
- **Recommended:** `DataTable`, `FilterBar`, `KPICard`, etc. (Phase 16).
- **Change scope:** Frontend.

### D7. Caching strategy absent

- **Current:** Force-dynamic everywhere for dashboard.
- **Why:** Correct for highly volatile admin data only if paired with targeted fetches; currently used as blunt instrument.
- **Impact:** No benefit from Next cache / React `cache()`.
- **Recommended:** Per-resource tags; short TTL for KPIs; mutate-time invalidation.
- **Change scope:** Frontend/backend.

### D8. Mobile app / admin boundary

- **Current:** Repo may contain mobile-related announcement work; admin must not break mobile contracts.
- **Why:** Shared Supabase schema.
- **Impact:** Cross-product regressions.
- **Recommended:** Admin 2.0 must not modify mobile code or production RPCs without approval (per Phase 20).
- **Change scope:** Process / docs.

---

## E. Realtime problems

### E1. KPI dashboard is not realtime

- **Current:** Counts computed on server render; update only after refresh.
- **Why:** No subscriptions for users/requirements/fraud/etc.
- **Impact:** Stale control center.
- **Recommended:** Selective channels for high-value events; patch local KPI state (Phase 3).
- **Change scope:** Frontend (+ Supabase publication config if needed).

### E2. Single realtime consumer (notifications bell)

- **Current:** `admin_notifications` only.
- **Why:** Narrow scope.
- **Impact:** Missed operational awareness unless rows are inserted into that table.
- **Recommended:** Either write notification rows from triggers/API for key events, or subscribe to specific tables with filters.
- **Change scope:** Frontend + backend/DB (careful).

### E3. Duplicate subscription / remount risk

- **Current:** Channel created in client effect; cleanup exists but layout remounts can recreate.
- **Why:** Strict mode / layout shifts.
- **Impact:** Duplicate toasts/events.
- **Recommended:** Singleton channel manager / ref guard.
- **Change scope:** Frontend.

### E4. No Live / last-updated / reconnect UX

- **Current:** No dashboard “Live” indicator or offline handling.
- **Why:** Incomplete realtime productization.
- **Impact:** Admins distrust numbers.
- **Recommended:** Connection status + last updated timestamp.
- **Change scope:** Frontend.

### E5. Do not subscribe to every table

- **Current:** N/A (under-subscribed).
- **Why:** Blind subscriptions cause noise, cost, leaks.
- **Impact:** Performance and security.
- **Recommended:** Explicit allowlist of events only.
- **Change scope:** Architecture.

---

## F. Database / query problems

### F1. Application-side aggregation instead of SQL aggregates

- **Current:** Load rows → count in JS.
- **Why:** Extra IO; no index-only counts.
- **Impact:** Scales poorly.
- **Recommended:** `select('*', { count: 'exact', head: true })` with filters, or single RPC returning KPI JSON.
- **Change scope:** Backend/database (document RPC in `ADMIN_2_0_DB_RECOMMENDATIONS.md` before applying).

### F2. Broad `select('*')` on admin lists

- **Current:** Many queries pull all columns.
- **Why:** Over-fetch PII and large JSON fields.
- **Impact:** Payload bloat; privacy.
- **Recommended:** Explicit column lists per view.
- **Change scope:** Backend/frontend.

### F3. Missing indexes for admin filters (likely)

- **Current:** Filters on verification status, created_at, city, membership likely need indexes (confirm in DB recommendations after EXPLAIN).
- **Why:** Seq scans on growth.
- **Impact:** Slow list endpoints.
- **Recommended:** Measure with EXPLAIN; propose indexes in DB recommendations doc — do not auto-migrate.
- **Change scope:** Database (proposed only).

### F4. Pagination inconsistency

- **Current:** Limits vary; some UIs assume full lists.
- **Why:** Incomplete server pagination contract.
- **Impact:** Incorrect totals; timeouts.
- **Recommended:** Standard `{ data, page, pageSize, total }` API shape.
- **Change scope:** Backend + frontend.

### F5. Possible N+1 in nested admin views

- **Current:** Some detail panels may re-query related entities per row/action.
- **Why:** Convenience fetches in loops.
- **Impact:** Latency spikes on open.
- **Recommended:** Batch IDs; join/select embedded resources carefully.
- **Change scope:** Backend/frontend.

### F6. Announcement / new feature migrations may not be applied everywhere

- **Current:** In-app announcements migration work exists in repo history; live DB apply status may differ per environment.
- **Why:** Schema drift between local and production.
- **Impact:** Feature errors if admin UI expects tables missing in an env.
- **Recommended:** Document required migrations; never assume live apply from repo alone.
- **Change scope:** Ops / database process.

### F7. No admin_audit_events (or equivalent) confirmed for panel actions

- **Current:** Audit requirement unmet for admin actor actions.
- **Why:** See C10.
- **Impact:** Forensics gap.
- **Recommended:** Spec in Phase 11 / DB recommendations; approve before migrate.
- **Change scope:** Database (future).

---

## G. Accessibility problems

### G1. Tab list / custom controls may lack keyboard semantics

- **Current:** Custom tab buttons; focus rings inconsistent.
- **Why:** Not using disclosed tabs pattern / aria-selected.
- **Impact:** Keyboard users blocked.
- **Recommended:** `role="tablist"`, arrow-key nav, visible focus (Phase 15).
- **Change scope:** Frontend.

### G2. Modals / dialogs not standardized

- **Current:** Mixed custom overlays / `alert`.
- **Why:** Focus trap / Escape / aria-modal often missing.
- **Impact:** Screen reader and keyboard regressions.
- **Recommended:** Accessible Dialog primitive.
- **Change scope:** Frontend.

### G3. Tables without proper headers / captions

- **Current:** HTML tables vary in labeling.
- **Why:** Hard for AT to map cells.
- **Impact:** A11y failure on core ops screens.
- **Recommended:** `<th scope>`, captions, sort button labels.
- **Change scope:** Frontend.

### G4. Contrast and status color reliance

- **Current:** Status communicated mainly by color in places.
- **Why:** Not color-blind safe.
- **Impact:** Misread verification/fraud states.
- **Recommended:** Icons + text labels + sufficient contrast.
- **Change scope:** Frontend.

### G5. Form labels

- **Current:** Some inputs rely on placeholders.
- **Why:** Placeholders are not labels.
- **Impact:** AT and cognitive accessibility gaps.
- **Recommended:** Explicit `<label htmlFor>`.
- **Change scope:** Frontend.

---

## H. Mobile / responsive problems

### H1. Admin shell not mobile-drawer based

- **Current:** Tab/nav layout oriented to desktop width.
- **Why:** Many modules; limited responsive nav pattern.
- **Impact:** Hard to use on tablet/phone for on-call admins.
- **Recommended:** Collapsible sidebar + mobile drawer (Phase 7).
- **Change scope:** Frontend.

### H2. Wide tables overflow poorly

- **Current:** Large column sets in users/requirements.
- **Why:** No responsive table strategy (priority columns / horizontal scroll region / card rows).
- **Impact:** Unusable small screens.
- **Recommended:** Sticky first column + horizontal scroll; hide low-priority columns.
- **Change scope:** Frontend.

### H3. Touch targets

- **Current:** Dense icon/button clusters.
- **Why:** Desktop-first spacing.
- **Impact:** Mis-taps on destructive actions.
- **Recommended:** Min 44px targets on mobile; confirm dialogs.
- **Change scope:** Frontend.

### H4. Upload / media flows on constrained networks

- **Current:** Large winner/announcement uploads; historical Nginx 413.
- **Why:** Body size limits + no resilient progress UX.
- **Impact:** Failed uploads look like app breakage.
- **Recommended:** Client validation, compression guidance, clear error mapping for 413.
- **Change scope:** Frontend + ops (Nginx), not mobile app code.

---

## Cross-cutting map: checklist → section

| Checklist themes | Primary sections |
|------------------|------------------|
| Versions, router, folders, layouts | Stack inventory |
| Auth, middleware, roles, protected routes | C, D, Stack |
| Pages, APIs, queries, RPC, realtime | Stack, A, E, F |
| Fetching, loading, caching, duplicates, reloads | A, B, D |
| Client components, bundles, charts, images | A, B |
| Errors, toasts | B, C |
| Security, env, RLS, service_role | C |
| N+1, parallelization, refetch, effects, rerenders | A, F |
| Pagination, filters, slow RPCs | A, F |
| Realtime cleanup / leaks | E |
| Route loading, navigation architecture | A, B, D |
| A11y / responsive | G, H |

---

## Recommended Admin 2.0 architecture (Phase 1 preview — design only)

Incremental target (do **not** rewrite blindly):

```
app/dashboard/layout.tsx          → auth gate + shell (sidebar, header, live status)
app/dashboard/page.tsx            → overview KPIs only (server, parallel aggregates)
app/dashboard/(ops)/users/        → server table page + client interactive table
app/dashboard/(ops)/requirements/
... map each existing TabKey to a route ...
components/admin/ui/*             → Button, Card, KPI, DataTable, skeletons...
components/admin/charts/*         → dynamic imported
lib/admin/session.ts              → signed session helpers
lib/admin/api.ts                  → requireAdminApi()
hooks/admin/*                     → debounced search, realtime KPI patches
```

**Data rule:** Server Components + server Supabase for reads; client only for interaction; reuse existing queries/RPCs; document any new RPC in `ADMIN_2_0_DB_RECOMMENDATIONS.md` before executing DB changes.

---

## Implementation priority (aligned with Phase 21)

1. **Security hotfix:** Auth all admin APIs; replace hardcoded credentials/session (C1–C3).  
2. **Performance:** Stop full user download for KPIs; remove refresh waterfalls; add loading UX (A1–A5).  
3. **Shell/navigation:** Routed modules + grouped sidebar (B1, B7, D1).  
4. **KPI + analytics + realtime** using real data only.  
5. **Tables, search, notifications, a11y, responsive polish.**

---

## Explicit non-actions from this audit

- No application code was changed for Phase 0.  
- No database migrations were applied.  
- No production RPCs were modified.  
- No mobile application code was modified.  
- No features were removed.

---

## Deliverables status

| Deliverable | Status |
|-------------|--------|
| `ADMIN_2_0_AUDIT.md` | **This document** |
| `ADMIN_2_0_PERFORMANCE.md` | Pending (fill BEFORE metrics during Phase 2+; AFTER after optimizations) |
| `ADMIN_2_0_DB_RECOMMENDATIONS.md` | Pending when a concrete RPC/index change is required |

---

## Appendix: key files inspected

- `package.json` — Next 16.2.3, React 19.2.4  
- `proxy.ts` — cookie gate for `/`, `/dashboard`  
- `lib/admin-auth.ts` — cookie presence helper  
- `lib/supabase-admin.ts` / `lib/supabase-browser.ts`  
- `app/page.tsx`, `app/login-form.tsx`  
- `app/dashboard/page.tsx` (~605 lines, force-dynamic)  
- `app/dashboard/dashboard-tabs.tsx` (~5283 lines)  
- `app/dashboard/layout.tsx`  
- `components/admin-notifications-bell.tsx`  
- `app/api/admin/**` — 34 routes (19 authed / 15 unauthed)  

---

*End of Phase 0 audit.*
