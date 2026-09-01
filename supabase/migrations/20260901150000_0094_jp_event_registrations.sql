-- JP Valderrama Content Platform V1 — durable event registrations.
-- Public browsers never receive direct table privileges. Registration writes
-- cross the Next.js server trust boundary and use the service role only after
-- application-level validation.

create table public.jp_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  full_name text not null,
  email text not null,
  phone text,
  status text not null default 'registered',
  consent_at timestamptz not null,
  source_path text not null default '/jpvalderrama/talks',
  created_at timestamptz not null default now(),
  constraint jp_event_registrations_event_slug_check
    check (event_slug = 'filosofia-o-dinero'),
  constraint jp_event_registrations_full_name_check
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint jp_event_registrations_email_check
    check (
      email = lower(btrim(email))
      and char_length(email) between 3 and 254
      and position('@' in email) > 1
    ),
  constraint jp_event_registrations_phone_check
    check (phone is null or char_length(btrim(phone)) between 7 and 32),
  constraint jp_event_registrations_status_check
    check (status in ('registered', 'cancelled')),
  constraint jp_event_registrations_source_path_check
    check (source_path = '/jpvalderrama/talks'),
  constraint jp_event_registrations_event_email_key
    unique (event_slug, email)
);

create index jp_event_registrations_event_created_idx
  on public.jp_event_registrations(event_slug, created_at desc);

alter table public.jp_event_registrations enable row level security;

revoke all on table public.jp_event_registrations from public, anon, authenticated;
grant select, insert, update, delete on table public.jp_event_registrations to service_role;

comment on table public.jp_event_registrations is
  'Server-ingested registrations for confirmed JP Valderrama events. Browser roles have no direct access.';
comment on column public.jp_event_registrations.consent_at is
  'Timestamp at which the registrant explicitly accepted event-registration data processing.';
