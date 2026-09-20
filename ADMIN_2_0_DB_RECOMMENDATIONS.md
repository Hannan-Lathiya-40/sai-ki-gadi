# Admin 2.0 — Database Recommendations

**Status:** Proposals only. Do **not** apply automatically.  
**Branch:** `admin-2.0`  
**Date:** 2026-03-23

---

## 1. KPI aggregation RPC (high value)

### Current
`app/dashboard/page.tsx` loads all (or most) `users` rows and derives membership / verified counts in JavaScript. It also pages through owner IDs for requirements/exchanges/availability/drivers to attach per-user post counts.

### Problem
Payload and CPU scale linearly with user growth. Initial dashboard TTFB stays high.

### Expected benefit
Single round-trip returning KPI JSON; dashboard shell can render in tens of ms of query time instead of full table transfer.

### Proposed change (draft SQL — not applied)

```sql
-- PROPOSAL ONLY — do not execute without review
create or replace function admin_dashboard_kpis()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_users', (select count(*) from users),
    'verified', (select count(*) from users where verified is true),
    'unverified', (select count(*) from users where verified is not true),
    'membership', (
      select jsonb_object_agg(coalesce(membership_type, 'regular'), cnt)
      from (
        select membership_type, count(*)::int as cnt
        from users
        group by membership_type
      ) s
    ),
    'pending_verification', (
      select count(*) from users u
      where u.verification_status = 'pending'
    ),
    'requirements_total', (select count(*) from requirements),
    'exchanges_total', (select count(*) from exchange_listings),
    'fraud_open', (select count(*) from fraud_reports),
    'profile_changes_pending', (
      select count(*) from profile_change_requests where status = 'pending'
    )
  );
$$;
```

Restrict execute to service role / admin only. Prefer keeping `security definer` tightly locked.

### Risk
Misconfigured `security definer` could leak aggregates to anon. Must revoke public execute.

---

## 2. Indexes for admin list filters

### Current
Admin filters on `verification_status`, `created_at`, `membership_type`, fraud/report status, profile change status.

### Problem
As tables grow, sequential scans slow list pages.

### Proposed (measure with EXPLAIN first)

```sql
-- PROPOSAL ONLY
create index concurrently if not exists users_verification_status_idx
  on users (verification_status);
create index concurrently if not exists users_created_at_idx
  on users (created_at desc);
create index concurrently if not exists users_membership_type_idx
  on users (membership_type);
create index concurrently if not exists profile_change_requests_status_requested_at_idx
  on profile_change_requests (status, requested_at desc);
create index concurrently if not exists fraud_reports_created_at_idx
  on fraud_reports (created_at desc);
create index concurrently if not exists requirements_created_at_idx
  on requirements (created_at desc);
```

### Risk
Extra write overhead; validate unused indexes later.

---

## 3. Admin audit log table

### Current
No first-class admin action audit log for panel mutations.

### Problem
Cannot attribute who verified/rejected/changed settings.

### Proposed (document only until approved)

```sql
-- PROPOSAL ONLY
create table if not exists admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  success boolean not null default true,
  created_at timestamptz not null default now()
);
create index on admin_audit_events (created_at desc);
create index on admin_audit_events (action, created_at desc);
```

Never store passwords, OTPs, tokens, or service keys in `metadata`.

### Risk
PII in metadata if callers are careless — enforce allowlisted fields in app code.

---

## 4. Do not change production mobile RPCs

Existing mobile RPCs/functions must remain unchanged unless explicitly approved. Prefer new `admin_*` functions over altering shared ones.

---

## Decision log

| Proposal | Applied? | Notes |
|----------|----------|-------|
| `admin_dashboard_kpis` | No | Waiting approval |
| Admin filter indexes | No | Waiting EXPLAIN + approval |
| `admin_audit_events` | No | Waiting approval |
