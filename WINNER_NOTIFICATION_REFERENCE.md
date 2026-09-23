# Winner / Lucky Draw Notification — Reference Architecture

**Source of truth for Birthday Notification.**  
**Audit date:** 2026-09-23  
**Repos:** `merigaadiwebsite` (admin) + `sai-ki-gadi-app` (edge/FCM/mobile)

Do **not** modify Lucky Draw behavior when implementing Birthday.

---

## 1. Admin UI flow

| Step | Location |
|------|----------|
| Load | `app/dashboard/page.tsx` reads `lucky_draw_notification_settings` (`id=1`) |
| UI | Winners tab in `dashboard-tabs.tsx` — enable toggle + 3–4 fixed slots |
| Save | `PUT /api/admin/lucky-draw-notification-settings` |
| Test | `POST /api/admin/lucky-draw-notification-test` → edge `{ force: true }` |

Auth: admin session cookie + server service role. Service role never sent to browser.

---

## 2. Supabase tables / settings

### `lucky_draw_notification_settings` (singleton `id=1`)

- `enabled` boolean  
- `slots` text[] (allowed: `10:00`, `14:00`, `18:00`, `21:00`; length 3–4)  
- `updated_at`

### `lucky_draw_notification_logs`

- `winner_id` → `winners.id`  
- `scheduled_slot` text (slot HH:MM **or** `manual_<hex>` for tests)  
- `status`: `pending` | `success` | `failure` | `skipped`  
- **Unique:** `(winner_id, scheduled_slot)`

Migration: `050_lucky_draw_notifications.sql` (mirrored in both repos).

---

## 3. Edge Function

| Item | Value |
|------|--------|
| Name | `send-lucky-draw-notification` |
| Path | `sai-ki-gadi-app/supabase/functions/send-lucky-draw-notification/index.ts` |
| Auth | `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` only |
| Body | `{}` (cron) or `{ force: true }` (admin test) |

Flow: authorize → Kolkata now → load settings → find today’s winner → for due slots claim log → FCM blast → finalize log.

---

## 4. Scheduler / cron

- Intended: `pg_cron` every **5 minutes** → HTTP POST edge function  
- Recipe documented in app migration `050` (not auto-applied)  
- Time is **not** hardcoded in cron: cron only wakes the function; function reads `slots` from DB and Asia/Kolkata clock  
- Admin changing slots/enabled applies on next tick without redeploy

---

## 5. FCM logic

- Firebase service account JWT → FCM HTTP v1  
- Tokens from `user_push_tokens.expo_push_token` (native FCM = contains `APA91`)  
- Broadcast to **all** devices  
- No invalid-token cleanup in Lucky Draw  
- Partial success → log `success` with optional failure note; all fail → `failure`

---

## 6. Payload structure

```json
{
  "notification": {
    "title": "🏆 Lucky Draw Winner",
    "body": "<Name> is today's Lucky Draw winner in Sai Ki Gadi!"
  },
  "data": {
    "title": "...",
    "body": "...",
    "notification_type": "lucky_draw",
    "route": "/(app)/winners"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channel_id": "merigadi-sound-v5",
      "sound": "saikigadi_notification_new"
    }
  }
}
```

---

## 7. Sound / channel

- Channel: `merigadi-sound-v5`  
- Sound: `saikigadi_notification_new`  
- Same as booking FCM — **not** in-app birthday popup music (`happy_birthday.mp3`)

---

## 8. Duplicate prevention

1. `INSERT` log row `status=pending` for `(winner_id, scheduled_slot)`  
2. Unique violation → skip (`duplicate_prevented`)  
3. After FCM → update to `success` / `failure`  

**Known gap:** crash after claim leaves `pending` and blocks that slot forever. Birthday should reclaim stale `pending` / retry `failure`.

---

## 9. Timezone

Hard-coded `Asia/Kolkata` via `Intl.DateTimeFormat` inside the edge function. Winner matched on Kolkata `YYYY-MM-DD`.

---

## 10. Mobile receive path

- System tray via FCM (channel/sound above)  
- Tap: `notification_type === "lucky_draw"` → `/(app)/winners` (`lib/lucky-draw-notification-nav.ts`, `app/_layout.tsx`)  
- In-app birthday **popup** is separate (`BirthdayWishHost`) — not FCM

---

## Proposed Birthday mapping (implementation)

| Lucky Draw | Birthday |
|------------|----------|
| `lucky_draw_notification_settings` | `birthday_notification_settings` (`enabled`, `send_time` HH:MM) |
| `lucky_draw_notification_logs (winner_id, scheduled_slot)` | `birthday_notification_logs (birthday_user_id, birthday_date)` |
| Edge `send-lucky-draw-notification` | **New** `send-birthday-notification` (do not edit Lucky Draw) |
| Slot window 5 min | Same: due if Kolkata time in `[send_time, send_time+5)` |
| One winner / day | Many users: one FCM blast **per** birthday person / IST date |
| Test `force` + `manual_*` | Same pattern |
| Channel/sound | **Reuse** `merigadi-sound-v5` / `saikigadi_notification_new` |

**Out of scope for Birthday:** changing Winner edge function, booking FCM, or birthday popup music/UI behavior.

---

## Birthday implementation (delivered)

| Piece | Location |
|-------|----------|
| Migration | `merigaadiwebsite/supabase/migrations/051_birthday_notifications.sql` (+ mirrored in `sai-ki-gadi-app`) |
| Edge function | `sai-ki-gadi-app/supabase/functions/send-birthday-notification/index.ts` |
| Admin settings API | `PUT/GET /api/admin/birthday-notification-settings` |
| Admin test API | `POST /api/admin/birthday-notification-test` |
| Admin status API | `GET /api/admin/birthday-notification-status` |
| Admin UI | Birthday Date tab — settings card |

### Ops to enable in production

1. Apply migration `051_birthday_notifications.sql`
2. Deploy edge function `send-birthday-notification` (same Firebase/Supabase secrets as Lucky Draw)
3. Schedule `pg_cron` / Dashboard cron every 5 minutes → POST that function with service role (do **not** remove Lucky Draw cron)
4. Do **not** redeploy when changing admin send time — DB `send_time` is read each run

Winner Notification remains untouched.
