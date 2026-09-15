-- Lucky Draw Winner FCM notification settings + send logs.
-- Mirror of sai-ki-gadi-app/supabase/migrations/050_lucky_draw_notifications.sql
-- Does NOT modify winners schema, booking tables, or send-fcm-all.

create table if not exists public.lucky_draw_notification_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  slots text[] not null default array['10:00', '14:00', '18:00', '21:00'],
  updated_at timestamptz not null default now(),
  constraint lucky_draw_notification_settings_slots_len
    check (cardinality(slots) >= 3 and cardinality(slots) <= 4),
  constraint lucky_draw_notification_settings_slots_allowed
    check (slots <@ array['10:00', '14:00', '18:00', '21:00']::text[])
);

insert into public.lucky_draw_notification_settings (id, enabled, slots)
values (1, true, array['10:00', '14:00', '18:00', '21:00'])
on conflict (id) do nothing;

create or replace function public.lucky_draw_notification_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists lucky_draw_notification_settings_set_updated_at_trg
  on public.lucky_draw_notification_settings;
create trigger lucky_draw_notification_settings_set_updated_at_trg
before update on public.lucky_draw_notification_settings
for each row execute procedure public.lucky_draw_notification_settings_set_updated_at();

create table if not exists public.lucky_draw_notification_logs (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null references public.winners (id) on delete cascade,
  scheduled_slot text not null,
  sent_at timestamptz,
  status text not null
    check (status in ('pending', 'success', 'failure', 'skipped')),
  error_message text,
  created_at timestamptz not null default now(),
  constraint lucky_draw_notification_logs_winner_slot_key
    unique (winner_id, scheduled_slot)
);

create index if not exists lucky_draw_notification_logs_winner_id_idx
  on public.lucky_draw_notification_logs (winner_id);

create index if not exists lucky_draw_notification_logs_created_at_idx
  on public.lucky_draw_notification_logs (created_at desc);

alter table public.lucky_draw_notification_settings enable row level security;
alter table public.lucky_draw_notification_logs enable row level security;

drop policy if exists "Authenticated can read lucky draw notification settings"
  on public.lucky_draw_notification_settings;
create policy "Authenticated can read lucky draw notification settings"
on public.lucky_draw_notification_settings
for select
to authenticated
using (true);
