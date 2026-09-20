# Admin 2.0 — Performance Notes

**Branch:** `admin-2.0`  
**Updated:** 2026-03-23

Measurements below mix code-path analysis with build/tooling checks. Where browser Lab numbers were not collected in this session, that is stated explicitly.

---

## BEFORE (baseline from Phase 0 audit)

### Load behavior
- `/dashboard` used `force-dynamic` and blocked on a large Server Component fetch.
- First wave loaded **all users** (+ identity docs + paged owner IDs for four listing tables).
- Second wave fetched winners, cities, sliders, priority settings, lucky-draw settings, **all requirements**, **all exchanges**, fraud reports, profile changes, vehicles, minimum fares **sequentially**.
- Debug `console.log` dumped full requirements payloads on every load.
- Client shell was a ~5.3k-line `dashboard-tabs.tsx`; module switches were in-memory tabs but most mutations called `router.refresh()` (~19 sites), re-running the full server fetch.
- No `loading.tsx` / `error.tsx` on dashboard — navigation felt like a blank wait.

### Major bottlenecks
1. Full-table / unbounded list hydration into RSC props.
2. Sequential secondary query waterfall.
3. Full RSC refresh after small mutations.
4. Monolithic client component (parse + re-render cost).
5. Unauthenticated APIs were a security issue (not perf), but forced distrust of caching strategies.

### Request counts (architectural)
On each dashboard load (approximate):
- 1 users select (wide columns)
- 1 identity docs select
- 4× paged owner-id scans (requirements / exchanges / availability / drivers)
- Then ~11 more table reads in series

Mutations: 1 API call + **full dashboard refetch**.

---

## AFTER (changes in this milestone)

### Load behavior
- Secondary module datasets now load in **one parallel `Promise.all`** wave.
- Requirements / exchanges / fraud / winners capped with explicit `.limit(...)` for initial admin view (500 / 500 / 300 / 200).
- Removed hot-path `console.log` of requirements.
- Added `app/dashboard/loading.tsx` skeleton and `error.tsx` with retry.
- Overview redesigned with KPI cards + real charts derived from loaded `users` / `requirements` (no fake metrics).
- Grouped sidebar navigation + URL `?tab=` sync (`router.replace`, `scroll: false`) so module switches do not feel like full document navigation.
- Live status indicator for realtime channel health (does not reload page).

### Security-related (enables safe caching later)
- Signed admin session cookie (HMAC) replaces forgeable `"1"` value.
- Credentials readable from `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` env.
- **All 34** `/api/admin/*` routes now go through session checks (`requireAdminApi` or `hasAdminSession`).

### Improvements (evidence type)

| Change | Evidence |
|--------|----------|
| Parallel secondary fetches | Code: single `Promise.all` in `app/dashboard/page.tsx` vs prior sequential awaits |
| Bounded list payloads | Code: `.limit(200|300|500)` on heavy selects |
| Instant route feedback | Code: `loading.tsx` skeletons |
| Tab navigation without full reload | Code: client `selectTab` + `router.replace`; no `router.refresh` on tab change |
| Removed requirements console dump | Code: logs deleted |

### Remaining bottlenecks
1. **Still loads all users** on dashboard for Users tab + derived KPIs — largest remaining cost. Needs KPI RPC + paginated users API (see `ADMIN_2_0_DB_RECOMMENDATIONS.md`).
2. **`router.refresh()` still used after many mutations** — should move to local state / tagged revalidation.
3. **`dashboard-tabs.tsx` monolith** remains; further split + lazy panels needed.
4. **Owner-id pagination loops** (`fetchAllUserIds`) still run for per-user post counts.
5. Browser Lighthouse / Network waterfall numbers not yet recorded in this environment — capture on staging after deploy.

---

## Suggested measurement commands

```bash
# Typecheck / lint / build
npx tsc --noEmit
npm run lint
npm run build

# Manual: Chrome DevTools Network on /dashboard
# - Document request duration
# - Count Supabase REST calls (via server logs / Next server timing)
```

---

## Next performance targets
1. Server-only KPI endpoint/RPC; overview without full users array.
2. Users / requirements tables: server pagination + search APIs.
3. Replace mutation `router.refresh()` with optimistic UI + selective invalidation.
4. Dynamic import heavy panels (winners media, announcements, DnD sliders).
