-- =============================================================================
-- Birthday Notification cron (SEPARATE from Lucky Draw)
-- =============================================================================
-- DO NOT run automatically in production until reviewed.
-- DO NOT modify or remove the Lucky Draw cron job.
--
-- Prerequisites:
--   1. Migration 051_birthday_notifications.sql applied
--   2. Edge Function `send-birthday-notification` deployed
--   3. Extensions: pg_cron, pg_net enabled
--
-- Replace placeholders:
--   <SUPABASE_URL>           e.g. https://xxxx.supabase.co
--   <SERVICE_ROLE_KEY>       server-only service_role secret
-- =============================================================================

-- Optional: inspect existing jobs first
-- select jobid, jobname, schedule, command from cron.job order by jobid;

select cron.schedule(
  'birthday-notification-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '<SUPABASE_URL>/functions/v1/send-birthday-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify Birthday cron exists (Lucky Draw job must still be listed separately)
-- select jobid, jobname, schedule from cron.job
-- where jobname in (
--   'birthday-notification-every-5-min',
--   'lucky-draw-notification-every-5-min'
-- );

-- Unschedule ONLY Birthday (emergency):
-- select cron.unschedule('birthday-notification-every-5-min');
