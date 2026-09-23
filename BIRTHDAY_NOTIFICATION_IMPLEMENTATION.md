# Birthday Notification — Implementation Inventory

**Branch:** `admin-2.0`  
**Code status:** Implemented in repo.  
**Production:** Migration / edge deploy / cron are **manual after review** (not auto-run).

Winner Notification and Lucky Draw logic were **not** modified.

---

## A. Files created

| Path | Role |
|------|------|
| `supabase/migrations/051_birthday_notifications.sql` | Schema + RPC |
| `supabase/functions/send-birthday-notification/index.ts` | Edge function source |
| `supabase/ops/052_birthday_notification_cron.sql` | Separate 5-min cron SQL |
| `supabase/ops/birthday_notification_verification.sql` | Verification queries |
| `app/api/admin/birthday-notification-settings/route.ts` | Settings GET/PUT |
| `app/api/admin/birthday-notification-test/route.ts` | Safe test proxy |
| `app/api/admin/birthday-notification-status/route.ts` | Live admin status |
| `WINNER_NOTIFICATION_REFERENCE.md` | Winner architecture audit |

*(Mirrored edge + migration also in `sai-ki-gadi-app` for deploy.)*

## B. Files modified

| Path | Change |
|------|--------|
| `app/dashboard/page.tsx` | Load birthday settings |
| `app/dashboard/dashboard-tabs.tsx` | Birthday Notifications admin card |

## C. Database

- `birthday_notification_settings` — `enabled`, `send_time` (HH:MM), singleton `id=1`
- `birthday_notification_logs` — unique `(birthday_user_id, birthday_date, scheduled_key)`
- `list_users_with_birthday_on(date)` — month/day match (year ignored)

## D. Edge function

`send-birthday-notification`

- Asia/Kolkata date/time
- Reads admin `send_time` each run (no redeploy)
- 5-minute due window; same-day **failure/stale-pending retry** after window
- One FCM blast per birthday person (display name only)
- Same channel/sound as Winner: `merigadi-sound-v5` / `saikigadi_notification_new`
- Invalid token cleanup on permanent FCM errors
- Cap 25 birthdays per run

## E. Cron SQL

File: `supabase/ops/052_birthday_notification_cron.sql`  
Job: `birthday-notification-every-5-min` → POST `/functions/v1/send-birthday-notification`  
Does **not** change Lucky Draw cron.

## F. Admin UI

Birthday Date tab → Birthday Notifications card (enable, time, status, save, test).

## G. FCM reused

Lucky Draw pattern: Firebase JWT → FCM v1 → all APA91 tokens from `user_push_tokens`.

## H. Idempotency

Unique `(user, IST date, scheduled_key='scheduled')`.  
`success` never re-sent. Tests use `manual_*` keys.

## I. Retry

- Claim → send → finalize  
- `failure` / stale `pending` (>15m) reclaimable  
- Same-day retries continue after the 5-minute window until success  

## J. Deploy commands (manual — after your review)

```bash
# 1) Apply migration in Supabase SQL editor (paste 051_birthday_notifications.sql)

# 2) Deploy edge function (from sai-ki-gadi-app or website mirror)
supabase functions deploy send-birthday-notification --project-ref <PROJECT_REF>

# 3) Create Birthday cron only (edit placeholders first)
# paste supabase/ops/052_birthday_notification_cron.sql into SQL editor
```

## K. Verification

```bash
cd /var/www/html/merigaadiwebsite
npx tsc --noEmit
npm run lint
npm run build
```

SQL: `supabase/ops/birthday_notification_verification.sql`

## L. Limitations

- Edge must be deployed to Supabase; website repo holds source + admin UI.
- Mobile tap routing for `notification_type=birthday` is not required for delivery (system tray works); in-app Birthday Popup unchanged.
- Max 25 birthday people processed per cron tick.
- Test button sends to **all** devices for today's birthday people (same as Lucky Draw test blast) — only run when you intend a real device blast; uses `manual_*` so it does not block the scheduled daily send.
