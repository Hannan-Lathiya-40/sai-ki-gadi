-- Birthday Notification verification queries (read-only)
-- Run in Supabase SQL editor AFTER/AFTER enabling cron.
-- Timezone for business logic: Asia/Kolkata

-- 1) Settings
select id, enabled, send_time, updated_at
from public.birthday_notification_settings
where id = 1;

-- 2) Today's birthdays (IST calendar date)
select *
from public.list_users_with_birthday_on(
  (timezone('Asia/Kolkata', now()))::date
);

-- 3) Idempotency / today's scheduled logs
select
  birthday_user_id,
  birthday_date,
  scheduled_key,
  status,
  devices_sent,
  devices_failed,
  sent_at,
  error_message,
  created_at
from public.birthday_notification_logs
where birthday_date = (timezone('Asia/Kolkata', now()))::date
  and scheduled_key = 'scheduled'
order by created_at desc;

-- 4) Last run (any scheduled success today)
select
  max(sent_at) filter (where status = 'success') as last_success_at,
  max(sent_at) filter (where status = 'failure') as last_failure_at,
  count(*) filter (where status = 'success') as success_count,
  count(*) filter (where status = 'failure') as failure_count,
  count(*) filter (where status = 'pending') as pending_count
from public.birthday_notification_logs
where birthday_date = (timezone('Asia/Kolkata', now()))::date
  and scheduled_key = 'scheduled';

-- 5) Duplicate prevention check
-- Expect at most one row per (birthday_user_id, birthday_date, scheduled_key)
select
  birthday_user_id,
  birthday_date,
  scheduled_key,
  count(*) as row_count
from public.birthday_notification_logs
group by birthday_user_id, birthday_date, scheduled_key
having count(*) > 1;

-- 6) Stale pending (older than 15 minutes) — should be reclaimable by edge function
select id, birthday_user_id, status, created_at
from public.birthday_notification_logs
where status = 'pending'
  and created_at < now() - interval '15 minutes'
order by created_at asc
limit 50;
