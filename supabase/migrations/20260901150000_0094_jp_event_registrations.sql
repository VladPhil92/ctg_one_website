-- JP Valderrama Content Platform V1 — durable event registrations.
-- Public browsers never receive direct table privileges. Registration writes
-- cross the Next.js server trust boundary and use the service role only after
-- application-level validation and durable abuse throttling.

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
    check (
      char_length(event_slug) between 3 and 80
      and event_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
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
    check (
      source_path = '/jpvalderrama/talks'
      or source_path like '/jpvalderrama/talks/%'
    ),
  constraint jp_event_registrations_event_email_key
    unique (event_slug, email)
);

create index jp_event_registrations_event_created_idx
  on public.jp_event_registrations(event_slug, created_at desc);

alter table public.jp_event_registrations enable row level security;
revoke all on table public.jp_event_registrations from public, anon, authenticated;
grant select, insert, update, delete on table public.jp_event_registrations to service_role;

create table public.jp_registration_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint jp_registration_rate_limits_key_hash_check
    check (char_length(key_hash) = 64 and key_hash ~ '^[0-9a-f]{64}$'),
  constraint jp_registration_rate_limits_attempt_count_check
    check (attempt_count > 0)
);

alter table public.jp_registration_rate_limits enable row level security;
revoke all on table public.jp_registration_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.jp_registration_rate_limits to service_role;

create or replace function public.consume_jp_registration_rate_limit(
  p_key_hash text,
  p_limit integer default 8,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_attempt_count integer;
begin
  if p_key_hash is null
     or char_length(p_key_hash) <> 64
     or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid registration rate-limit key';
  end if;

  if p_limit < 1 or p_limit > 100 then
    raise exception 'invalid registration rate-limit limit';
  end if;

  if p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'invalid registration rate-limit window';
  end if;

  insert into public.jp_registration_rate_limits (
    key_hash,
    window_started_at,
    attempt_count,
    updated_at
  ) values (
    p_key_hash,
    v_now,
    1,
    v_now
  )
  on conflict (key_hash) do update
  set
    attempt_count = case
      when public.jp_registration_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else public.jp_registration_rate_limits.attempt_count + 1
    end,
    window_started_at = case
      when public.jp_registration_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else public.jp_registration_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning attempt_count into v_attempt_count;

  delete from public.jp_registration_rate_limits
  where updated_at < v_now - interval '2 days'
    and key_hash <> p_key_hash;

  return v_attempt_count <= p_limit;
end;
$$;

revoke all on function public.consume_jp_registration_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_jp_registration_rate_limit(text, integer, integer) to service_role;

comment on table public.jp_event_registrations is
  'Server-ingested registrations for confirmed JP Valderrama events. Browser roles have no direct access.';
comment on column public.jp_event_registrations.event_slug is
  'Validated canonical event slug. The public API separately allow-lists events that currently accept registrations.';
comment on column public.jp_event_registrations.consent_at is
  'Timestamp at which the registrant explicitly accepted event-registration data processing.';
comment on table public.jp_registration_rate_limits is
  'Short-lived HMAC-keyed abuse counters for public JP event registration. Raw network addresses are not persisted.';
comment on function public.consume_jp_registration_rate_limit(text, integer, integer) is
  'Atomically consumes one anonymous registration attempt and returns whether the configured window still permits the request.';
