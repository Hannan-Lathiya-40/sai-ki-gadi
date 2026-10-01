-- Vehicle-wise minimum fares + user fare overrides.
-- Backward compatible: legacy route_minimum_fares rows (vehicle_category IS NULL) remain valid fallbacks.
-- Enforcement priority: active user override → vehicle-specific rule → legacy route rule → allow.

-- ---------------------------------------------------------------------------
-- 1) Extend route_minimum_fares with vehicle_category
-- ---------------------------------------------------------------------------

alter table public.route_minimum_fares
  add column if not exists vehicle_category text;

comment on column public.route_minimum_fares.vehicle_category is
  'Canonical vehicle label (e.g. Sedan). NULL = legacy route-level rule (fallback).';

update public.route_minimum_fares
set vehicle_category = null
where vehicle_category is not null
  and length(trim(vehicle_category)) = 0;

drop index if exists public.route_minimum_fares_route_uidx;

create unique index if not exists route_minimum_fares_route_vehicle_uidx
  on public.route_minimum_fares (
    (lower(trim(from_city))),
    (lower(trim(from_state))),
    (lower(trim(to_city))),
    (lower(trim(to_state))),
    (lower(trim(coalesce(vehicle_category, ''))))
  );

create index if not exists route_minimum_fares_vehicle_idx
  on public.route_minimum_fares (vehicle_category)
  where vehicle_category is not null;

create index if not exists route_minimum_fares_route_lookup_idx
  on public.route_minimum_fares (
    (lower(trim(from_city))),
    (lower(trim(to_city))),
    is_active
  );

-- ---------------------------------------------------------------------------
-- 2) Normalize vehicle category to app canonical labels
-- ---------------------------------------------------------------------------

create or replace function public.normalize_vehicle_category(p_raw text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := lower(trim(coalesce(p_raw, '')));
begin
  if v = '' then
    return null;
  end if;

  if v in ('sedan') then return 'Sedan'; end if;
  if v in ('suv') then return 'SUV'; end if;
  if v in ('hatchback') then return 'Hatchback'; end if;
  if v in ('traveller tempo', 'traveller_tempo', 'tempo', 'travellertempo') then
    return 'Traveller Tempo';
  end if;
  if v in ('bus') then return 'Bus'; end if;
  if v in ('mini bus', 'minibus', 'mini_bus') then return 'Mini Bus'; end if;
  if v in ('innova crysta', 'innova_crysta', 'crysta', 'innovacrysta') then
    return 'Innova Crysta';
  end if;
  if v in ('innova') then return 'Innova'; end if;
  if v in ('eeco') then return 'EECO'; end if;
  if v in ('premium car', 'premium_car', 'premiumcar') then return 'Premium Car'; end if;
  if v in ('only parcel', 'only_parcel', 'onlyparcel', 'parcel') then
    return 'Only Parcel';
  end if;

  return trim(p_raw);
end;
$$;

revoke all on function public.normalize_vehicle_category(text) from public;
grant execute on function public.normalize_vehicle_category(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Fare override requests
-- ---------------------------------------------------------------------------

create table if not exists public.fare_override_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  from_city text not null,
  from_state text not null,
  to_city text not null,
  to_state text not null,
  vehicle_category text not null,
  normal_min_fare numeric(12,2) not null check (normal_min_fare > 0),
  requested_fare numeric(12,2) not null check (requested_fare > 0),
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fare_override_requests_cities_not_blank
    check (
      length(trim(from_city)) > 0
      and length(trim(from_state)) > 0
      and length(trim(to_city)) > 0
      and length(trim(to_state)) > 0
      and length(trim(vehicle_category)) > 0
    ),
  constraint fare_override_requests_requested_below_normal
    check (requested_fare < normal_min_fare)
);

create index if not exists fare_override_requests_status_created_idx
  on public.fare_override_requests (status, created_at desc);

create index if not exists fare_override_requests_user_id_idx
  on public.fare_override_requests (user_id);

create index if not exists fare_override_requests_route_vehicle_idx
  on public.fare_override_requests (
    (lower(trim(from_city))),
    (lower(trim(to_city))),
    (lower(trim(vehicle_category))),
    status
  );

create unique index if not exists fare_override_requests_one_pending_uidx
  on public.fare_override_requests (
    user_id,
    (lower(trim(from_city))),
    (lower(trim(from_state))),
    (lower(trim(to_city))),
    (lower(trim(to_state))),
    (lower(trim(vehicle_category)))
  )
  where status = 'pending';

drop trigger if exists fare_override_requests_set_updated_at
  on public.fare_override_requests;
create trigger fare_override_requests_set_updated_at
before update on public.fare_override_requests
for each row execute procedure public.update_updated_at_column();

alter table public.fare_override_requests enable row level security;

drop policy if exists "Users select own fare override requests"
  on public.fare_override_requests;
create policy "Users select own fare override requests"
on public.fare_override_requests
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = fare_override_requests.user_id
      and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "Users insert own pending fare override requests"
  on public.fare_override_requests;
create policy "Users insert own pending fare override requests"
on public.fare_override_requests
for insert
to authenticated
with check (
  status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
  and rejection_reason is null
  and exists (
    select 1 from public.users u
    where u.id = fare_override_requests.user_id
      and u.auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 4) User-specific approved overrides
-- ---------------------------------------------------------------------------

create table if not exists public.user_fare_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  from_city text not null,
  from_state text not null,
  to_city text not null,
  to_state text not null,
  vehicle_category text not null,
  allowed_min_fare numeric(12,2) not null check (allowed_min_fare > 0),
  status text not null default 'approved'
    check (status in ('approved', 'revoked', 'expired')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  approved_by text,
  approved_at timestamptz not null default now(),
  request_id uuid references public.fare_override_requests (id) on delete set null,
  revoked_at timestamptz,
  revoked_by text,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_fare_overrides_cities_not_blank
    check (
      length(trim(from_city)) > 0
      and length(trim(from_state)) > 0
      and length(trim(to_city)) > 0
      and length(trim(to_state)) > 0
      and length(trim(vehicle_category)) > 0
    )
);

create index if not exists user_fare_overrides_user_status_idx
  on public.user_fare_overrides (user_id, status);

create index if not exists user_fare_overrides_lookup_idx
  on public.user_fare_overrides (
    user_id,
    (lower(trim(from_city))),
    (lower(trim(from_state))),
    (lower(trim(to_city))),
    (lower(trim(to_state))),
    (lower(trim(vehicle_category))),
    status
  );

create index if not exists user_fare_overrides_expires_at_idx
  on public.user_fare_overrides (expires_at)
  where status = 'approved' and expires_at is not null;

create unique index if not exists user_fare_overrides_one_active_uidx
  on public.user_fare_overrides (
    user_id,
    (lower(trim(from_city))),
    (lower(trim(from_state))),
    (lower(trim(to_city))),
    (lower(trim(to_state))),
    (lower(trim(vehicle_category)))
  )
  where status = 'approved';

drop trigger if exists user_fare_overrides_set_updated_at
  on public.user_fare_overrides;
create trigger user_fare_overrides_set_updated_at
before update on public.user_fare_overrides
for each row execute procedure public.update_updated_at_column();

alter table public.user_fare_overrides enable row level security;

drop policy if exists "Users select own fare overrides"
  on public.user_fare_overrides;
create policy "Users select own fare overrides"
on public.user_fare_overrides
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = user_fare_overrides.user_id
      and u.auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 5) Audit log
-- ---------------------------------------------------------------------------

create table if not exists public.fare_override_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null
    check (action in ('approve', 'reject', 'revoke', 'expire', 'request_created')),
  actor text,
  user_id uuid references public.users (id) on delete set null,
  request_id uuid references public.fare_override_requests (id) on delete set null,
  override_id uuid references public.user_fare_overrides (id) on delete set null,
  from_city text,
  from_state text,
  to_city text,
  to_state text,
  vehicle_category text,
  old_minimum numeric(12,2),
  new_allowed_minimum numeric(12,2),
  reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fare_override_audit_log_created_idx
  on public.fare_override_audit_log (created_at desc);

create index if not exists fare_override_audit_log_user_idx
  on public.fare_override_audit_log (user_id, created_at desc);

alter table public.fare_override_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- 6) Expand admin_notifications types
-- ---------------------------------------------------------------------------

alter table public.admin_notifications
  drop constraint if exists admin_notifications_type_check;

alter table public.admin_notifications
  add constraint admin_notifications_type_check
  check (type in ('new_member', 'fare_override_request'));

-- ---------------------------------------------------------------------------
-- 7) Resolve applicable minimum
-- ---------------------------------------------------------------------------

create or replace function public.resolve_applicable_minimum_fare(
  p_from_city text,
  p_from_state text,
  p_to_city text,
  p_to_state text,
  p_vehicle_category text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vehicle text := public.normalize_vehicle_category(p_vehicle_category);
  v_override public.user_fare_overrides%rowtype;
  v_rule_vehicle numeric;
  v_rule_legacy numeric;
  v_now timestamptz := now();
begin
  -- Expiry is enforced by expires_at > now() (no cron required).

  if p_user_id is not null and v_vehicle is not null then
    select * into v_override
    from public.user_fare_overrides o
    where o.user_id = p_user_id
      and o.status = 'approved'
      and (o.expires_at is null or o.expires_at > v_now)
      and o.starts_at <= v_now
      and lower(trim(o.from_city)) = lower(trim(coalesce(p_from_city, '')))
      and lower(trim(o.from_state)) = lower(trim(coalesce(p_from_state, '')))
      and lower(trim(o.to_city)) = lower(trim(coalesce(p_to_city, '')))
      and lower(trim(o.to_state)) = lower(trim(coalesce(p_to_state, '')))
      and lower(trim(o.vehicle_category)) = lower(trim(v_vehicle))
    order by o.approved_at desc
    limit 1;

    if found then
      return jsonb_build_object(
        'minimum_fare', v_override.allowed_min_fare,
        'source', 'user_override',
        'override_id', v_override.id,
        'vehicle_category', v_vehicle
      );
    end if;
  end if;

  if v_vehicle is not null then
    select r.minimum_fare into v_rule_vehicle
    from public.route_minimum_fares r
    where r.is_active = true
      and r.vehicle_category is not null
      and lower(trim(r.from_city)) = lower(trim(coalesce(p_from_city, '')))
      and lower(trim(r.from_state)) = lower(trim(coalesce(p_from_state, '')))
      and lower(trim(r.to_city)) = lower(trim(coalesce(p_to_city, '')))
      and lower(trim(r.to_state)) = lower(trim(coalesce(p_to_state, '')))
      and lower(trim(r.vehicle_category)) = lower(trim(v_vehicle))
    limit 1;

    if v_rule_vehicle is not null then
      return jsonb_build_object(
        'minimum_fare', v_rule_vehicle,
        'source', 'vehicle_rule',
        'vehicle_category', v_vehicle
      );
    end if;
  end if;

  select r.minimum_fare into v_rule_legacy
  from public.route_minimum_fares r
  where r.is_active = true
    and r.vehicle_category is null
    and lower(trim(r.from_city)) = lower(trim(coalesce(p_from_city, '')))
    and lower(trim(r.from_state)) = lower(trim(coalesce(p_from_state, '')))
    and lower(trim(r.to_city)) = lower(trim(coalesce(p_to_city, '')))
    and lower(trim(r.to_state)) = lower(trim(coalesce(p_to_state, '')))
  limit 1;

  if v_rule_legacy is not null then
    return jsonb_build_object(
      'minimum_fare', v_rule_legacy,
      'source', 'legacy_route_rule',
      'vehicle_category', v_vehicle
    );
  end if;

  return jsonb_build_object(
    'minimum_fare', null,
    'source', 'none',
    'vehicle_category', v_vehicle
  );
end;
$$;

revoke all on function public.resolve_applicable_minimum_fare(text, text, text, text, text, uuid)
  from public;
grant execute on function public.resolve_applicable_minimum_fare(text, text, text, text, text, uuid)
  to authenticated, service_role;

create or replace function public.get_active_route_minimum_fare(
  p_from_city text,
  p_from_state text,
  p_to_city text,
  p_to_state text
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  v := public.resolve_applicable_minimum_fare(
    p_from_city, p_from_state, p_to_city, p_to_state, null, null
  );
  if v ? 'minimum_fare' and (v->>'minimum_fare') is not null then
    return (v->>'minimum_fare')::numeric;
  end if;
  return null;
end;
$$;

create or replace function public.get_active_route_minimum_fare(
  p_from_city text,
  p_from_state text,
  p_to_city text,
  p_to_state text,
  p_vehicle_category text,
  p_user_id uuid default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  v := public.resolve_applicable_minimum_fare(
    p_from_city, p_from_state, p_to_city, p_to_state,
    p_vehicle_category, p_user_id
  );
  if v ? 'minimum_fare' and (v->>'minimum_fare') is not null then
    return (v->>'minimum_fare')::numeric;
  end if;
  return null;
end;
$$;

revoke all on function public.get_active_route_minimum_fare(text, text, text, text)
  from public;
grant execute on function public.get_active_route_minimum_fare(text, text, text, text)
  to authenticated, service_role;

revoke all on function public.get_active_route_minimum_fare(text, text, text, text, text, uuid)
  from public;
grant execute on function public.get_active_route_minimum_fare(text, text, text, text, text, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Structured validation RPC
-- ---------------------------------------------------------------------------

create or replace function public.validate_requirement_price(
  p_from_city text,
  p_from_state text,
  p_to_city text,
  p_to_state text,
  p_vehicle_category text,
  p_offered_price numeric,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_auth uuid := auth.uid();
  v_user_id uuid;
  v_resolved jsonb;
  v_min numeric;
  v_source text;
begin
  if v_auth is not null then
    select u.id into v_user_id
    from public.users u
    where u.auth_user_id = v_auth
    limit 1;
  elsif p_user_id is not null then
    v_user_id := p_user_id;
  end if;

  v_resolved := public.resolve_applicable_minimum_fare(
    p_from_city, p_from_state, p_to_city, p_to_state,
    p_vehicle_category, v_user_id
  );

  v_min := nullif(v_resolved->>'minimum_fare', '')::numeric;
  v_source := coalesce(v_resolved->>'source', 'none');

  if v_min is null then
    return jsonb_build_object(
      'allowed', true,
      'minimum_fare', null,
      'offered_fare', p_offered_price,
      'source', v_source,
      'reason', 'NO_MINIMUM'
    );
  end if;

  if p_offered_price is null or p_offered_price < v_min then
    return jsonb_build_object(
      'allowed', false,
      'minimum_fare', v_min,
      'offered_fare', p_offered_price,
      'source', v_source,
      'reason', 'PRICE_BELOW_MINIMUM'
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'minimum_fare', v_min,
    'offered_fare', p_offered_price,
    'source', v_source,
    'reason', 'OK'
  );
end;
$$;

revoke all on function public.validate_requirement_price(text, text, text, text, text, numeric, uuid)
  from public;
grant execute on function public.validate_requirement_price(text, text, text, text, text, numeric, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Enforce (triggers) — replace 5-arg with 7-arg
-- ---------------------------------------------------------------------------

drop function if exists public.enforce_route_minimum_fare(text, text, text, text, numeric);

create or replace function public.enforce_route_minimum_fare(
  p_from_city text,
  p_from_state text,
  p_to_city text,
  p_to_state text,
  p_price numeric,
  p_vehicle_category text default null,
  p_user_id uuid default null
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_min numeric;
begin
  v := public.resolve_applicable_minimum_fare(
    p_from_city, p_from_state, p_to_city, p_to_state,
    p_vehicle_category, p_user_id
  );
  v_min := nullif(v->>'minimum_fare', '')::numeric;

  if v_min is null then
    return;
  end if;

  if p_price is null or p_price < v_min then
    raise exception 'MINIMUM_FARE_VIOLATION:%', v_min
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.enforce_route_minimum_fare(text, text, text, text, numeric, text, uuid)
  from public;
grant execute on function public.enforce_route_minimum_fare(text, text, text, text, numeric, text, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10) Update triggers
-- ---------------------------------------------------------------------------

create or replace function public.requirements_enforce_minimum_fare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.enforce_route_minimum_fare(
      new.source_city,
      new.source_state,
      new.destination_city,
      new.destination_state,
      new.price,
      new.car_type,
      new.user_id
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.price is not distinct from old.price
       and new.source_city is not distinct from old.source_city
       and new.source_state is not distinct from old.source_state
       and new.destination_city is not distinct from old.destination_city
       and new.destination_state is not distinct from old.destination_state
       and new.car_type is not distinct from old.car_type
       and new.user_id is not distinct from old.user_id
    then
      return new;
    end if;

    perform public.enforce_route_minimum_fare(
      new.source_city,
      new.source_state,
      new.destination_city,
      new.destination_state,
      new.price,
      new.car_type,
      new.user_id
    );
    return new;
  end if;

  return new;
end;
$$;

create or replace function public.exchange_listings_enforce_minimum_fare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.enforce_route_minimum_fare(
      new.available_source_city,
      new.available_source_state,
      new.available_destination_city,
      new.available_destination_state,
      new.price,
      new.available_car_type,
      new.user_id
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.price is not distinct from old.price
       and new.available_source_city is not distinct from old.available_source_city
       and new.available_source_state is not distinct from old.available_source_state
       and new.available_destination_city is not distinct from old.available_destination_city
       and new.available_destination_state is not distinct from old.available_destination_state
       and new.available_car_type is not distinct from old.available_car_type
       and new.user_id is not distinct from old.user_id
    then
      return new;
    end if;

    perform public.enforce_route_minimum_fare(
      new.available_source_city,
      new.available_source_state,
      new.available_destination_city,
      new.available_destination_state,
      new.price,
      new.available_car_type,
      new.user_id
    );
    return new;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) create_fare_override_request
-- ---------------------------------------------------------------------------

create or replace function public.create_fare_override_request(
  p_from_city text,
  p_from_state text,
  p_to_city text,
  p_to_state text,
  p_vehicle_category text,
  p_requested_fare numeric,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth uuid := auth.uid();
  v_user public.users%rowtype;
  v_vehicle text;
  v_resolved jsonb;
  v_normal numeric;
  v_source text;
  v_row public.fare_override_requests%rowtype;
  v_name text;
begin
  if v_auth is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_user
  from public.users u
  where u.auth_user_id = v_auth
  limit 1;

  if not found then
    raise exception 'User profile not found' using errcode = 'P0001';
  end if;

  v_vehicle := public.normalize_vehicle_category(p_vehicle_category);
  if v_vehicle is null then
    raise exception 'Vehicle category is required' using errcode = 'P0001';
  end if;

  if p_requested_fare is null or p_requested_fare <= 0 then
    raise exception 'Requested fare must be greater than 0' using errcode = 'P0001';
  end if;

  -- Normal minimum without user override
  v_resolved := public.resolve_applicable_minimum_fare(
    p_from_city, p_from_state, p_to_city, p_to_state,
    v_vehicle, null
  );
  v_normal := nullif(v_resolved->>'minimum_fare', '')::numeric;
  v_source := coalesce(v_resolved->>'source', 'none');

  if v_normal is null then
    raise exception 'No minimum fare is configured for this route' using errcode = 'P0001';
  end if;

  if p_requested_fare >= v_normal then
    raise exception 'Requested fare must be below the normal minimum' using errcode = 'P0001';
  end if;

  insert into public.fare_override_requests (
    user_id, from_city, from_state, to_city, to_state,
    vehicle_category, normal_min_fare, requested_fare, reason, status
  ) values (
    v_user.id,
    trim(p_from_city), trim(p_from_state), trim(p_to_city), trim(p_to_state),
    v_vehicle, v_normal, p_requested_fare,
    nullif(trim(coalesce(p_reason, '')), ''),
    'pending'
  )
  returning * into v_row;

  v_name := trim(both from concat_ws(
    ' ',
    nullif(trim(both from coalesce(v_user.first_name, '')), ''),
    nullif(trim(both from coalesce(v_user.last_name, '')), '')
  ));
  if v_name is null or length(v_name) = 0 then
    v_name := coalesce(nullif(trim(both from coalesce(v_user.phone, '')), ''), 'A user');
  end if;

  insert into public.admin_notifications (type, title, message, user_id)
  values (
    'fare_override_request',
    'Fare Override Request',
    v_name || ' requested lower fare for '
      || trim(p_from_city) || ' → ' || trim(p_to_city)
      || ' (' || v_vehicle || ').',
    v_user.id
  );

  insert into public.fare_override_audit_log (
    action, actor, user_id, request_id,
    from_city, from_state, to_city, to_state, vehicle_category,
    old_minimum, new_allowed_minimum, reason
  ) values (
    'request_created', 'user', v_user.id, v_row.id,
    v_row.from_city, v_row.from_state, v_row.to_city, v_row.to_state, v_row.vehicle_category,
    v_normal, p_requested_fare, p_reason
  );

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'status', v_row.status,
    'normal_min_fare', v_normal,
    'source', v_source
  );
exception
  when unique_violation then
    raise exception 'You already have a pending request for this route and vehicle'
      using errcode = 'P0001';
end;
$$;

revoke all on function public.create_fare_override_request(text, text, text, text, text, numeric, text)
  from public;
grant execute on function public.create_fare_override_request(text, text, text, text, text, numeric, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 12) Admin approve / reject / revoke
-- ---------------------------------------------------------------------------

create or replace function public.approve_fare_override_request(
  p_request_id uuid,
  p_allowed_min_fare numeric,
  p_reviewed_by text,
  p_expires_at timestamptz default null,
  p_permanent boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.fare_override_requests%rowtype;
  v_override public.user_fare_overrides%rowtype;
  v_expires timestamptz;
begin
  if p_request_id is null then
    raise exception 'request id required' using errcode = 'P0001';
  end if;
  if p_allowed_min_fare is null or p_allowed_min_fare <= 0 then
    raise exception 'Allowed minimum must be greater than 0' using errcode = 'P0001';
  end if;

  select * into v_req
  from public.fare_override_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0001';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = 'P0001';
  end if;

  if p_permanent then
    v_expires := null;
  else
    v_expires := p_expires_at;
    if v_expires is null or v_expires <= now() then
      raise exception 'Temporary override requires a future expiry date'
        using errcode = 'P0001';
    end if;
  end if;

  update public.user_fare_overrides o
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = coalesce(nullif(trim(p_reviewed_by), ''), 'admin'),
      revoke_reason = 'Replaced by new approval',
      updated_at = now()
  where o.user_id = v_req.user_id
    and o.status = 'approved'
    and lower(trim(o.from_city)) = lower(trim(v_req.from_city))
    and lower(trim(o.from_state)) = lower(trim(v_req.from_state))
    and lower(trim(o.to_city)) = lower(trim(v_req.to_city))
    and lower(trim(o.to_state)) = lower(trim(v_req.to_state))
    and lower(trim(o.vehicle_category)) = lower(trim(v_req.vehicle_category));

  insert into public.user_fare_overrides (
    user_id, from_city, from_state, to_city, to_state,
    vehicle_category, allowed_min_fare, status,
    starts_at, expires_at, approved_by, approved_at, request_id
  ) values (
    v_req.user_id, v_req.from_city, v_req.from_state, v_req.to_city, v_req.to_state,
    v_req.vehicle_category, p_allowed_min_fare, 'approved',
    now(), v_expires,
    coalesce(nullif(trim(p_reviewed_by), ''), 'admin'),
    now(), v_req.id
  )
  returning * into v_override;

  update public.fare_override_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = coalesce(nullif(trim(p_reviewed_by), ''), 'admin'),
      updated_at = now()
  where id = v_req.id;

  insert into public.fare_override_audit_log (
    action, actor, user_id, request_id, override_id,
    from_city, from_state, to_city, to_state, vehicle_category,
    old_minimum, new_allowed_minimum, reason, meta
  ) values (
    'approve',
    coalesce(nullif(trim(p_reviewed_by), ''), 'admin'),
    v_req.user_id, v_req.id, v_override.id,
    v_req.from_city, v_req.from_state, v_req.to_city, v_req.to_state, v_req.vehicle_category,
    v_req.normal_min_fare, p_allowed_min_fare, null,
    jsonb_build_object(
      'permanent', p_permanent,
      'expires_at', v_expires
    )
  );

  return jsonb_build_object(
    'ok', true,
    'override_id', v_override.id,
    'request_id', v_req.id
  );
end;
$$;

revoke all on function public.approve_fare_override_request(uuid, numeric, text, timestamptz, boolean)
  from public;
grant execute on function public.approve_fare_override_request(uuid, numeric, text, timestamptz, boolean)
  to service_role;

create or replace function public.reject_fare_override_request(
  p_request_id uuid,
  p_reviewed_by text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.fare_override_requests%rowtype;
begin
  select * into v_req
  from public.fare_override_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0001';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = 'P0001';
  end if;

  update public.fare_override_requests
  set status = 'rejected',
      rejection_reason = nullif(trim(coalesce(p_rejection_reason, '')), ''),
      reviewed_at = now(),
      reviewed_by = coalesce(nullif(trim(p_reviewed_by), ''), 'admin'),
      updated_at = now()
  where id = v_req.id;

  insert into public.fare_override_audit_log (
    action, actor, user_id, request_id,
    from_city, from_state, to_city, to_state, vehicle_category,
    old_minimum, new_allowed_minimum, reason
  ) values (
    'reject',
    coalesce(nullif(trim(p_reviewed_by), ''), 'admin'),
    v_req.user_id, v_req.id,
    v_req.from_city, v_req.from_state, v_req.to_city, v_req.to_state, v_req.vehicle_category,
    v_req.normal_min_fare, v_req.requested_fare,
    p_rejection_reason
  );

  return jsonb_build_object('ok', true, 'request_id', v_req.id);
end;
$$;

revoke all on function public.reject_fare_override_request(uuid, text, text)
  from public;
grant execute on function public.reject_fare_override_request(uuid, text, text)
  to service_role;

create or replace function public.revoke_user_fare_override(
  p_override_id uuid,
  p_revoked_by text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ov public.user_fare_overrides%rowtype;
begin
  select * into v_ov
  from public.user_fare_overrides
  where id = p_override_id
  for update;

  if not found then
    raise exception 'Override not found' using errcode = 'P0001';
  end if;

  if v_ov.status <> 'approved' then
    raise exception 'Override is not active' using errcode = 'P0001';
  end if;

  update public.user_fare_overrides
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = coalesce(nullif(trim(p_revoked_by), ''), 'admin'),
      revoke_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = v_ov.id;

  insert into public.fare_override_audit_log (
    action, actor, user_id, request_id, override_id,
    from_city, from_state, to_city, to_state, vehicle_category,
    old_minimum, new_allowed_minimum, reason
  ) values (
    'revoke',
    coalesce(nullif(trim(p_revoked_by), ''), 'admin'),
    v_ov.user_id, v_ov.request_id, v_ov.id,
    v_ov.from_city, v_ov.from_state, v_ov.to_city, v_ov.to_state, v_ov.vehicle_category,
    null, v_ov.allowed_min_fare, p_reason
  );

  return jsonb_build_object('ok', true, 'override_id', v_ov.id);
end;
$$;

revoke all on function public.revoke_user_fare_override(uuid, text, text)
  from public;
grant execute on function public.revoke_user_fare_override(uuid, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 13) Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.fare_override_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.user_fare_overrides;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
