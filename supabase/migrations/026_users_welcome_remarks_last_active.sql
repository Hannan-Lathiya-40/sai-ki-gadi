-- Admin welcome checklist, remarks, and last-active tracking on users.
alter table public.users
  add column if not exists welcome_completed boolean not null default false,
  add column if not exists admin_remarks text,
  add column if not exists last_active_at timestamptz;

comment on column public.users.welcome_completed is 'Admin welcome checklist complete';
comment on column public.users.admin_remarks is 'Admin-only remarks for the user';
comment on column public.users.last_active_at is 'Last known app activity timestamp';
