-- Birthday FCM notification settings + send logs.
-- Parallel to Lucky Draw (050) — does NOT modify lucky_draw_* or winners.
-- Edge function: send-birthday-notification (sai-ki-gadi-app).
-- Timezone for matching/scheduling: Asia/Kolkata (enforced in edge function).

create table if not exists public.birthday_notification_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  -- Single daily send time as HH:MM (24h). Admin-editable; no redeploy needed.
  send_time text not null default '09:00',
  updated_at timestamptz not null default now(),
  constraint birthday_notification_settings_send_time_format
    check (send_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')
);

insert into public.birthday_notification_settings (id, enabled, send_time)
values (1, true, '09:00')
on conflict (id) do nothing;

create or replace function public.birthday_notification_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists birthday_notification_settings_set_updated_at_trg
  on public.birthday_notification_settings;
create trigger birthday_notification_settings_set_updated_at_trg
before update on public.birthday_notification_settings
for each row execute procedure public.birthday_notification_settings_set_updated_at();

-- Idempotency: one scheduled send attempt per birthday person per IST calendar date.
-- scheduled_key is either 'scheduled' (cron) or manual_<hex> (admin test).
create table if not exists public.birthday_notification_logs (
  id uuid primary key default gen_random_uuid(),
  birthday_user_id uuid not null references public.users (id) on delete cascade,
  birthday_date date not null,
  scheduled_key text not null,
  sent_at timestamptz,
  status text not null
    check (status in ('pending', 'success', 'failure', 'skipped')),
  error_message text,
  devices_sent integer,
  devices_failed integer,
  created_at timestamptz not null default now(),
  constraint birthday_notification_logs_user_date_key_uniq
    unique (birthday_user_id, birthday_date, scheduled_key)
);

create index if not exists birthday_notification_logs_birthday_date_idx
  on public.birthday_notification_logs (birthday_date desc);

create index if not exists birthday_notification_logs_user_id_idx
  on public.birthday_notification_logs (birthday_user_id);

create index if not exists birthday_notification_logs_created_at_idx
  on public.birthday_notification_logs (created_at desc);

alter table public.birthday_notification_settings enable row level security;
alter table public.birthday_notification_logs enable row level security;

drop policy if exists "Authenticated can read birthday notification settings"
  on public.birthday_notification_settings;
create policy "Authenticated can read birthday notification settings"
on public.birthday_notification_settings
for select
to authenticated
using (true);

-- Efficient month/day match for Asia/Kolkata calendar date (year ignored).
create or replace function public.list_users_with_birthday_on(p_date date)
returns table (
  id uuid,
  first_name text,
  last_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.first_name, u.last_name
  from public.users u
  where u.birth_date is not null
    and extract(month from u.birth_date)::int = extract(month from p_date)::int
    and extract(day from u.birth_date)::int = extract(day from p_date)::int
  order by u.first_name nulls last, u.last_name nulls last, u.id;
$$;

revoke all on function public.list_users_with_birthday_on(date) from public;
grant execute on function public.list_users_with_birthday_on(date) to service_role;

-- ---------------------------------------------------------------------------
-- Ops (apply manually in Supabase SQL editor — same pattern as Lucky Draw):
--
-- select cron.schedule(
--   'birthday-notification-every-5-min',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url := '<SUPABASE_URL>/functions/v1/send-birthday-notification',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
-- ---------------------------------------------------------------------------
