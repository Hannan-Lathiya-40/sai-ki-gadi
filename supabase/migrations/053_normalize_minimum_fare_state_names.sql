-- Fix minimum-fare matching when admin stores state typo "Gujrat" vs app "Gujarat".
-- Also backfill existing rule/override rows. Does not change fare amounts or business priority.

-- ---------------------------------------------------------------------------
-- 1) State name normalization (common spellings → canonical)
-- ---------------------------------------------------------------------------

create or replace function public.normalize_indian_state_name(p_raw text)
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

  -- Gujarat (app uses "Gujarat"; admin sometimes saved "Gujrat")
  if v in ('gujarat', 'gujrat', 'gujrāt', 'ગુજરાત') then
    return 'Gujarat';
  end if;

  -- Preserve original trimmed spelling for other states
  return trim(p_raw);
end;
$$;

revoke all on function public.normalize_indian_state_name(text) from public;
grant execute on function public.normalize_indian_state_name(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Backfill existing rows (typo → canonical)
-- ---------------------------------------------------------------------------

update public.route_minimum_fares
set
  from_state = public.normalize_indian_state_name(from_state),
  to_state = public.normalize_indian_state_name(to_state)
where
  public.normalize_indian_state_name(from_state) is distinct from from_state
  or public.normalize_indian_state_name(to_state) is distinct from to_state;

update public.fare_override_requests
set
  from_state = public.normalize_indian_state_name(from_state),
  to_state = public.normalize_indian_state_name(to_state)
where
  public.normalize_indian_state_name(from_state) is distinct from from_state
  or public.normalize_indian_state_name(to_state) is distinct from to_state;

update public.user_fare_overrides
set
  from_state = public.normalize_indian_state_name(from_state),
  to_state = public.normalize_indian_state_name(to_state)
where
  public.normalize_indian_state_name(from_state) is distinct from from_state
  or public.normalize_indian_state_name(to_state) is distinct from to_state;

-- ---------------------------------------------------------------------------
-- 3) Resolve applicable minimum with normalized states
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
  v_from_state text := public.normalize_indian_state_name(p_from_state);
  v_to_state text := public.normalize_indian_state_name(p_to_state);
  v_override public.user_fare_overrides%rowtype;
  v_rule_vehicle numeric;
  v_rule_legacy numeric;
  v_now timestamptz := now();
begin
  if p_user_id is not null and v_vehicle is not null then
    select * into v_override
    from public.user_fare_overrides o
    where o.user_id = p_user_id
      and o.status = 'approved'
      and (o.expires_at is null or o.expires_at > v_now)
      and o.starts_at <= v_now
      and lower(trim(o.from_city)) = lower(trim(coalesce(p_from_city, '')))
      and lower(trim(public.normalize_indian_state_name(o.from_state))) =
            lower(trim(coalesce(v_from_state, '')))
      and lower(trim(o.to_city)) = lower(trim(coalesce(p_to_city, '')))
      and lower(trim(public.normalize_indian_state_name(o.to_state))) =
            lower(trim(coalesce(v_to_state, '')))
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
      and lower(trim(public.normalize_indian_state_name(r.from_state))) =
            lower(trim(coalesce(v_from_state, '')))
      and lower(trim(r.to_city)) = lower(trim(coalesce(p_to_city, '')))
      and lower(trim(public.normalize_indian_state_name(r.to_state))) =
            lower(trim(coalesce(v_to_state, '')))
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
    and lower(trim(public.normalize_indian_state_name(r.from_state))) =
          lower(trim(coalesce(v_from_state, '')))
    and lower(trim(r.to_city)) = lower(trim(coalesce(p_to_city, '')))
    and lower(trim(public.normalize_indian_state_name(r.to_state))) =
          lower(trim(coalesce(v_to_state, '')))
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

-- ---------------------------------------------------------------------------
-- 4) Store normalized states on new override requests
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
  v_from_state text;
  v_to_state text;
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

  v_from_state := coalesce(
    public.normalize_indian_state_name(p_from_state),
    trim(p_from_state)
  );
  v_to_state := coalesce(
    public.normalize_indian_state_name(p_to_state),
    trim(p_to_state)
  );

  if p_requested_fare is null or p_requested_fare <= 0 then
    raise exception 'Requested fare must be greater than 0' using errcode = 'P0001';
  end if;

  v_resolved := public.resolve_applicable_minimum_fare(
    p_from_city, v_from_state, p_to_city, v_to_state,
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
    trim(p_from_city), v_from_state, trim(p_to_city), v_to_state,
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
