-- Winner media: support image or video.
-- Reuses existing `image` column as the public media URL for both types.
--
-- DO NOT apply automatically from the app. Run manually against the target
-- Supabase project after approval.
--
-- Source of truth also lives in bhadagaadi:
--   supabase/migrations/043_winners_media_type.sql

alter table public.winners
  add column if not exists media_type text not null default 'image';

update public.winners
set media_type = 'image'
where media_type is null or media_type = '';

alter table public.winners
  drop constraint if exists winners_media_type_check;

alter table public.winners
  add constraint winners_media_type_check
  check (media_type in ('image', 'video'));

comment on column public.winners.media_type is
  'Winner media kind: image or video. The image column stores the public URL for either type.';
