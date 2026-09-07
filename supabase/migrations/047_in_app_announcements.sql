-- In-app Dynamic Audio Pop-up Announcements
-- Apply to TESTING Supabase only. Do NOT apply to production without approval.
--
-- Does not modify admin_notifications, FCM, or booking notification tables.

-- ---------------------------------------------------------------------------
-- Storage bucket for announcement images / audio
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('announcement-assets', 'announcement-assets', true)
on conflict (id) do update set public = excluded.public;

-- ---------------------------------------------------------------------------
-- Main announcement definition
-- ---------------------------------------------------------------------------
create table if not exists public.in_app_announcements (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null,
  category text not null
    check (category in (
      'offer',
      'birthday',
      'important_announcement',
      'feature_information',
      'mandatory_notice',
      'other'
    )),
  internal_description text,
  priority integer not null default 100,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'expired', 'unpublished')),

  -- Visual
  image_url text,
  image_fit text not null default 'contain'
    check (image_fit in ('contain', 'cover')),
  background_color text not null default '#000000',

  -- Buttons (JSON config; validated in app/admin)
  primary_button jsonb,
  secondary_button jsonb,
  close_button jsonb,

  -- Dismissal / behaviour
  dismissal_type text not null default 'close_button'
    check (dismissal_type in (
      'close_button',
      'accept_required',
      'submit_required',
      'auto_dismiss',
      'action_button',
      'close_and_action',
      'audio_ends_delay'
    )),
  show_close boolean not null default true,
  outside_tap_closes boolean not null default false,
  back_button_closes boolean not null default true,
  auto_dismiss boolean not null default false,
  auto_dismiss_seconds integer,
  close_after_audio_ends boolean not null default false,
  delay_after_audio_seconds integer not null default 0,
  is_mandatory boolean not null default false,
  record_acceptance boolean not null default false,
  content_version text not null default '1',
  is_legal_consent boolean not null default false,

  -- Audio
  audio_enabled boolean not null default false,
  audio_source text not null default 'upload'
    check (audio_source in ('upload', 'tts')),
  audio_url text,
  tts_text text,
  tts_language text
    check (tts_language is null or tts_language in ('gu', 'hi', 'en')),
  audio_autoplay boolean not null default true,
  show_replay_button boolean not null default false,
  show_mute_button boolean not null default true,

  -- Audience
  audience_type text not null default 'all_users'
    check (audience_type in (
      'all_users',
      'active_users',
      'custom_users',
      'free_non_members',
      'gold_members',
      'gold_plus_members',
      'diamond_members',
      'expired_members'
    )),
  active_within_days integer,

  -- Trigger
  trigger_type text not null default 'app_open'
    check (trigger_type in ('app_open', 'feature_open')),
  trigger_feature_key text,
  trigger_delay_seconds integer not null default 0,
  show_once_per_session boolean not null default true,

  -- Schedule (UTC storage; business TZ Asia/Kolkata)
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  frequency text not null default 'once_per_user'
    check (frequency in (
      'once_per_user',
      'once_per_day',
      'every_app_open',
      'once_per_session',
      'custom_interval',
      'once_per_birthday'
    )),
  max_displays_per_user integer,
  re_show_after_dismissal boolean not null default false,
  custom_interval_hours integer,

  -- Birthday template
  is_birthday_template boolean not null default false,
  birthday_personalize_name boolean not null default false,

  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists in_app_announcements_status_idx
  on public.in_app_announcements (status);
create index if not exists in_app_announcements_priority_idx
  on public.in_app_announcements (priority asc, created_at desc);
create index if not exists in_app_announcements_schedule_idx
  on public.in_app_announcements (starts_at, ends_at)
  where status = 'active';
create index if not exists in_app_announcements_birthday_idx
  on public.in_app_announcements (is_birthday_template)
  where is_birthday_template = true;

-- ---------------------------------------------------------------------------
-- Custom audience recipients (admin-only readable)
-- ---------------------------------------------------------------------------
create table if not exists public.in_app_announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null
    references public.in_app_announcements (id) on delete cascade,
  user_id uuid not null
    references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create index if not exists in_app_announcement_recipients_user_idx
  on public.in_app_announcement_recipients (user_id);

-- ---------------------------------------------------------------------------
-- Display / interaction analytics (append-friendly)
-- ---------------------------------------------------------------------------
create table if not exists public.in_app_announcement_interactions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null
    references public.in_app_announcements (id) on delete cascade,
  user_id uuid not null
    references public.users (id) on delete cascade,
  event_type text not null
    check (event_type in (
      'displayed',
      'dismissed',
      'primary_click',
      'secondary_click',
      'close_click',
      'audio_play',
      'audio_complete'
    )),
  content_version text,
  session_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists in_app_announcement_interactions_ann_user_idx
  on public.in_app_announcement_interactions (announcement_id, user_id, event_type, created_at desc);
create index if not exists in_app_announcement_interactions_user_idx
  on public.in_app_announcement_interactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Acceptance / acknowledgement records (append-only intent)
-- ---------------------------------------------------------------------------
create table if not exists public.in_app_announcement_acceptances (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null
    references public.in_app_announcements (id) on delete cascade,
  user_id uuid not null
    references public.users (id) on delete cascade,
  content_version text not null,
  acceptance_status text not null default 'accepted'
    check (acceptance_status in ('accepted', 'rejected', 'pending')),
  is_legal_consent boolean not null default false,
  content_reference text,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists in_app_announcement_acceptances_unique_version
  on public.in_app_announcement_acceptances (
    announcement_id, user_id, content_version, acceptance_status
  )
  where acceptance_status = 'accepted';

create index if not exists in_app_announcement_acceptances_user_idx
  on public.in_app_announcement_acceptances (user_id, announcement_id);

-- ---------------------------------------------------------------------------
-- Birthday delivery dedupe (user + birthday year)
-- ---------------------------------------------------------------------------
create table if not exists public.in_app_announcement_birthday_deliveries (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null
    references public.in_app_announcements (id) on delete cascade,
  user_id uuid not null
    references public.users (id) on delete cascade,
  birthday_year integer not null,
  displayed_at timestamptz not null default now(),
  unique (announcement_id, user_id, birthday_year)
);

-- ---------------------------------------------------------------------------
-- User preference: announcement audio on/off (separate from booking FCM sound)
-- ---------------------------------------------------------------------------
create table if not exists public.user_announcement_preferences (
  user_id uuid primary key
    references public.users (id) on delete cascade,
  announcement_audio_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_in_app_announcement_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_in_app_announcements_updated_at
  on public.in_app_announcements;
create trigger trg_in_app_announcements_updated_at
  before update on public.in_app_announcements
  for each row
  execute function public.set_in_app_announcement_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers: membership / audience (server-side; mirrors app paid-gold logic)
-- ---------------------------------------------------------------------------
create or replace function public.in_app_is_paid_gold(p_membership text)
returns boolean
language sql
immutable
as $$
  select lower(trim(coalesce(p_membership, ''))) in ('gold', 'pro', 'pro_plus', 'gold_plus');
$$;

create or replace function public.in_app_is_gold_plus(p_membership text)
returns boolean
language sql
immutable
as $$
  select lower(trim(coalesce(p_membership, ''))) in ('gold_plus', 'pro_plus');
$$;

create or replace function public.in_app_is_diamond(
  p_membership text,
  p_trip_points integer
)
returns boolean
language sql
immutable
as $$
  select public.in_app_is_paid_gold(p_membership)
    and coalesce(p_trip_points, 0) > 0;
$$;

create or replace function public.in_app_is_free_non_member(p_membership text)
returns boolean
language sql
immutable
as $$
  select not public.in_app_is_paid_gold(p_membership);
$$;

-- Feb 29 rule: on non-leap years, treat as March 1
create or replace function public.in_app_is_birthday_today(p_birth_date date)
returns boolean
language plpgsql
stable
as $$
declare
  v_today date := (timezone('Asia/Kolkata', now()))::date;
  v_month int;
  v_day int;
begin
  if p_birth_date is null then
    return false;
  end if;

  v_month := extract(month from p_birth_date)::int;
  v_day := extract(day from p_birth_date)::int;

  if v_month = 2 and v_day = 29 then
    if (
      extract(month from v_today)::int = 2
      and extract(day from v_today)::int = 29
    ) then
      return true;
    end if;
    -- Non-leap year fallback: March 1
    if (
      extract(month from v_today)::int = 3
      and extract(day from v_today)::int = 1
      and not (
        (extract(year from v_today)::int % 4 = 0)
        and (
          (extract(year from v_today)::int % 100 <> 0)
          or (extract(year from v_today)::int % 400 = 0)
        )
      )
    ) then
      return true;
    end if;
    return false;
  end if;

  return (
    extract(month from v_today)::int = v_month
    and extract(day from v_today)::int = v_day
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Eligibility RPC — mobile calls this; never trusts client membership claims
-- ---------------------------------------------------------------------------
create or replace function public.get_eligible_in_app_announcements(
  p_trigger_type text default 'app_open',
  p_feature_key text default null,
  p_session_key text default null
)
returns setof public.in_app_announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth uuid := auth.uid();
  v_user public.users%rowtype;
  v_now timestamptz := now();
  v_today_kolkata date := (timezone('Asia/Kolkata', now()))::date;
  v_year int := extract(year from v_today_kolkata)::int;
begin
  if v_auth is null then
    return;
  end if;

  select * into v_user
  from public.users u
  where u.auth_user_id = v_auth
  limit 1;

  if not found then
    return;
  end if;

  -- Block inactive accounts when status column exists and is false
  if to_jsonb(v_user) ? 'status'
     and coalesce((to_jsonb(v_user)->>'status')::boolean, true) is false then
    return;
  end if;

  return query
  select a.*
  from public.in_app_announcements a
  where a.status = 'active'
    and a.archived_at is null
    and (a.starts_at is null or a.starts_at <= v_now)
    and (a.ends_at is null or a.ends_at >= v_now)
    and (
      (p_trigger_type = 'app_open' and a.trigger_type = 'app_open')
      or (
        p_trigger_type = 'feature_open'
        and a.trigger_type = 'feature_open'
        and a.trigger_feature_key is not null
        and a.trigger_feature_key = p_feature_key
      )
    )
    -- Audience
    and (
      a.audience_type = 'all_users'
      or (
        a.audience_type = 'active_users'
        and v_user.last_active_at is not null
        and v_user.last_active_at >= (
          v_now - make_interval(days => greatest(coalesce(a.active_within_days, 30), 1))
        )
      )
      or (
        a.audience_type = 'custom_users'
        and exists (
          select 1
          from public.in_app_announcement_recipients r
          where r.announcement_id = a.id
            and r.user_id = v_user.id
        )
      )
      or (
        a.audience_type = 'free_non_members'
        and public.in_app_is_free_non_member(v_user.membership_type::text)
      )
      or (
        a.audience_type = 'gold_members'
        and public.in_app_is_paid_gold(v_user.membership_type::text)
      )
      or (
        a.audience_type = 'gold_plus_members'
        and public.in_app_is_gold_plus(v_user.membership_type::text)
      )
      or (
        a.audience_type = 'diamond_members'
        and public.in_app_is_diamond(
          v_user.membership_type::text,
          coalesce(v_user.trip_points, 0)
        )
      )
      or (
        a.audience_type = 'expired_members'
        and (
          case
            when to_jsonb(v_user) ? 'membership_expires_at'
              and nullif(to_jsonb(v_user)->>'membership_expires_at', '') is not null
            then (to_jsonb(v_user)->>'membership_expires_at')::timestamptz < v_now
              and public.in_app_is_paid_gold(v_user.membership_type::text) is false
            else false
          end
        )
      )
    )
    -- Birthday template gate
    and (
      a.is_birthday_template is false
      or (
        a.is_birthday_template is true
        and public.in_app_is_birthday_today(v_user.birth_date)
        and not exists (
          select 1
          from public.in_app_announcement_birthday_deliveries d
          where d.announcement_id = a.id
            and d.user_id = v_user.id
            and d.birthday_year = v_year
        )
      )
    )
    -- Mandatory: require fresh acceptance for current content_version
    and (
      a.is_mandatory is false
      or a.record_acceptance is false
      or not exists (
        select 1
        from public.in_app_announcement_acceptances acc
        where acc.announcement_id = a.id
          and acc.user_id = v_user.id
          and acc.content_version = a.content_version
          and acc.acceptance_status = 'accepted'
      )
    )
    -- Frequency: once_per_user
    and (
      a.frequency <> 'once_per_user'
      or a.is_mandatory
      or not exists (
        select 1
        from public.in_app_announcement_interactions i
        where i.announcement_id = a.id
          and i.user_id = v_user.id
          and i.event_type = 'displayed'
      )
    )
    -- Frequency: once_per_day
    and (
      a.frequency <> 'once_per_day'
      or not exists (
        select 1
        from public.in_app_announcement_interactions i
        where i.announcement_id = a.id
          and i.user_id = v_user.id
          and i.event_type = 'displayed'
          and (timezone('Asia/Kolkata', i.created_at))::date = v_today_kolkata
      )
    )
    -- Frequency: once_per_session
    and (
      a.frequency <> 'once_per_session'
      or p_session_key is null
      or not exists (
        select 1
        from public.in_app_announcement_interactions i
        where i.announcement_id = a.id
          and i.user_id = v_user.id
          and i.event_type = 'displayed'
          and i.session_key = p_session_key
      )
    )
    -- Frequency: once_per_birthday handled via birthday_deliveries above
    and (
      a.frequency <> 'custom_interval'
      or a.custom_interval_hours is null
      or not exists (
        select 1
        from public.in_app_announcement_interactions i
        where i.announcement_id = a.id
          and i.user_id = v_user.id
          and i.event_type = 'displayed'
          and i.created_at > (
            v_now - make_interval(hours => greatest(a.custom_interval_hours, 1))
          )
      )
    )
    -- Max displays
    and (
      a.max_displays_per_user is null
      or (
        select count(*)::int
        from public.in_app_announcement_interactions i
        where i.announcement_id = a.id
          and i.user_id = v_user.id
          and i.event_type = 'displayed'
      ) < a.max_displays_per_user
    )
  order by
    case a.category
      when 'mandatory_notice' then 1
      when 'important_announcement' then 2
      when 'birthday' then 3
      when 'offer' then 4
      else 5
    end,
    a.priority asc,
    a.created_at desc
  limit 10;
end;
$$;

revoke all on function public.get_eligible_in_app_announcements(text, text, text)
  from public;
grant execute on function public.get_eligible_in_app_announcements(text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Record interaction (own user only)
-- ---------------------------------------------------------------------------
create or replace function public.record_in_app_announcement_interaction(
  p_announcement_id uuid,
  p_event_type text,
  p_session_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth uuid := auth.uid();
  v_user_id uuid;
  v_version text;
  v_id uuid;
  v_year int := extract(year from (timezone('Asia/Kolkata', now()))::date)::int;
  v_is_birthday boolean;
begin
  if v_auth is null then
    raise exception 'not authenticated';
  end if;

  select u.id into v_user_id
  from public.users u
  where u.auth_user_id = v_auth
  limit 1;

  if v_user_id is null then
    raise exception 'user not found';
  end if;

  if p_event_type not in (
    'displayed', 'dismissed', 'primary_click', 'secondary_click',
    'close_click', 'audio_play', 'audio_complete'
  ) then
    raise exception 'invalid event_type';
  end if;

  select a.content_version, a.is_birthday_template
    into v_version, v_is_birthday
  from public.in_app_announcements a
  where a.id = p_announcement_id;

  if v_version is null then
    raise exception 'announcement not found';
  end if;

  insert into public.in_app_announcement_interactions (
    announcement_id, user_id, event_type, content_version, session_key, metadata
  ) values (
    p_announcement_id, v_user_id, p_event_type, v_version, p_session_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  if p_event_type = 'displayed' and v_is_birthday is true then
    insert into public.in_app_announcement_birthday_deliveries (
      announcement_id, user_id, birthday_year
    ) values (
      p_announcement_id, v_user_id, v_year
    )
    on conflict (announcement_id, user_id, birthday_year) do nothing;
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_in_app_announcement_interaction(uuid, text, text, jsonb)
  from public;
grant execute on function public.record_in_app_announcement_interaction(uuid, text, text, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Record acceptance (cannot forge for another user)
-- ---------------------------------------------------------------------------
create or replace function public.record_in_app_announcement_acceptance(
  p_announcement_id uuid,
  p_content_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth uuid := auth.uid();
  v_user_id uuid;
  v_ann public.in_app_announcements%rowtype;
  v_id uuid;
  v_version text;
begin
  if v_auth is null then
    raise exception 'not authenticated';
  end if;

  select u.id into v_user_id
  from public.users u
  where u.auth_user_id = v_auth
  limit 1;

  if v_user_id is null then
    raise exception 'user not found';
  end if;

  select * into v_ann
  from public.in_app_announcements a
  where a.id = p_announcement_id;

  if not found then
    raise exception 'announcement not found';
  end if;

  if v_ann.record_acceptance is not true and v_ann.is_mandatory is not true then
    raise exception 'acceptance not required for this announcement';
  end if;

  v_version := coalesce(nullif(trim(p_content_version), ''), v_ann.content_version);

  insert into public.in_app_announcement_acceptances (
    announcement_id,
    user_id,
    content_version,
    acceptance_status,
    is_legal_consent,
    content_reference
  ) values (
    p_announcement_id,
    v_user_id,
    v_version,
    'accepted',
    coalesce(v_ann.is_legal_consent, false),
    coalesce(v_ann.image_url, v_ann.internal_name)
  )
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    select acc.id into v_id
    from public.in_app_announcement_acceptances acc
    where acc.announcement_id = p_announcement_id
      and acc.user_id = v_user_id
      and acc.content_version = v_version
      and acc.acceptance_status = 'accepted'
    limit 1;
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_in_app_announcement_acceptance(uuid, text)
  from public;
grant execute on function public.record_in_app_announcement_acceptance(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.in_app_announcements enable row level security;
alter table public.in_app_announcement_recipients enable row level security;
alter table public.in_app_announcement_interactions enable row level security;
alter table public.in_app_announcement_acceptances enable row level security;
alter table public.in_app_announcement_birthday_deliveries enable row level security;
alter table public.user_announcement_preferences enable row level security;

-- Announcements: no direct client SELECT of full table (use RPC).
-- Authenticated may read own preference; service role (admin) bypasses RLS.

drop policy if exists user_announcement_prefs_select on public.user_announcement_preferences;
create policy user_announcement_prefs_select
  on public.user_announcement_preferences
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = user_announcement_preferences.user_id
        and u.auth_user_id = auth.uid()
    )
  );

drop policy if exists user_announcement_prefs_upsert on public.user_announcement_preferences;
create policy user_announcement_prefs_upsert
  on public.user_announcement_preferences
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = user_announcement_preferences.user_id
        and u.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = user_announcement_preferences.user_id
        and u.auth_user_id = auth.uid()
    )
  );

-- Interactions / acceptances / recipients: no direct client access (RPCs only)
-- Intentionally no policies for ordinary roles → service role / SECURITY DEFINER only.

comment on table public.in_app_announcements is
  'Admin-managed in-app pop-up announcements (image + overlay buttons + optional audio).';
comment on table public.in_app_announcement_recipients is
  'Custom audience user IDs for announcements; admin-only via service role.';
comment on table public.user_announcement_preferences is
  'Per-user announcement audio preference; separate from booking FCM sound.';
