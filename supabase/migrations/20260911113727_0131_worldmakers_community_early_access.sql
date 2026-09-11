-- World Makers Phase 4: adult community and early-access interest infrastructure.
-- This schema deliberately excludes child identities, IP addresses, user-agent strings,
-- gameplay telemetry, and payment data. Public browser roles receive no direct table access.

create table if not exists public.worldmakers_interest_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  audience text not null,
  wants_product_updates boolean not null default false,
  wants_playtesting boolean not null default false,
  wants_educator_pilot boolean not null default false,
  wants_family_research boolean not null default false,
  source_path text not null default '/community',
  consent_version text not null,
  privacy_consent_at timestamptz not null,
  adult_attested_at timestamptz not null,
  status text not null default 'registered',
  admin_notes text,
  submission_count integer not null default 1,
  first_registered_at timestamptz not null default timezone('utc', now()),
  last_registered_at timestamptz not null default timezone('utc', now()),
  last_status_changed_at timestamptz not null default timezone('utc', now()),
  last_status_changed_by uuid references auth.users(id) on delete set null,
  shortlisted_at timestamptz,
  ready_to_invite_at timestamptz,
  contacted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint worldmakers_interest_profiles_email_normalized_check
    check (email = lower(btrim(email)) and char_length(email) between 3 and 254 and position('@' in email) > 1),
  constraint worldmakers_interest_profiles_display_name_check
    check (display_name is null or char_length(display_name) between 2 and 80),
  constraint worldmakers_interest_profiles_audience_check
    check (audience in ('family','educator','tester','developer','researcher','other')),
  constraint worldmakers_interest_profiles_preferences_check
    check (wants_product_updates or wants_playtesting or wants_educator_pilot or wants_family_research),
  constraint worldmakers_interest_profiles_source_path_check
    check (source_path in ('/community','/families','/educators','/adventures','/')),
  constraint worldmakers_interest_profiles_consent_version_check
    check (char_length(consent_version) between 8 and 100),
  constraint worldmakers_interest_profiles_status_check
    check (status in ('registered','reviewing','shortlisted','ready_to_invite','contacted','paused','declined','withdrawn')),
  constraint worldmakers_interest_profiles_admin_notes_check
    check (admin_notes is null or char_length(admin_notes) <= 1200),
  constraint worldmakers_interest_profiles_submission_count_check
    check (submission_count >= 1)
);

create unique index if not exists worldmakers_interest_profiles_email_uidx
  on public.worldmakers_interest_profiles (email);
create index if not exists worldmakers_interest_profiles_status_created_idx
  on public.worldmakers_interest_profiles (status, created_at desc);
create index if not exists worldmakers_interest_profiles_audience_created_idx
  on public.worldmakers_interest_profiles (audience, created_at desc);

create table if not exists public.worldmakers_interest_status_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.worldmakers_interest_profiles(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default timezone('utc', now()),
  constraint worldmakers_interest_status_events_from_check
    check (from_status is null or from_status in ('registered','reviewing','shortlisted','ready_to_invite','contacted','paused','declined','withdrawn')),
  constraint worldmakers_interest_status_events_to_check
    check (to_status in ('registered','reviewing','shortlisted','ready_to_invite','contacted','paused','declined','withdrawn'))
);

create index if not exists worldmakers_interest_status_events_profile_changed_idx
  on public.worldmakers_interest_status_events (profile_id, changed_at desc);

create or replace function public.worldmakers_interest_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.worldmakers_interest_audit_status_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.worldmakers_interest_status_events (
      profile_id,
      from_status,
      to_status,
      changed_by,
      changed_at
    ) values (
      new.id,
      old.status,
      new.status,
      new.last_status_changed_by,
      timezone('utc', now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists worldmakers_interest_touch_updated_at_trg on public.worldmakers_interest_profiles;
create trigger worldmakers_interest_touch_updated_at_trg
before update on public.worldmakers_interest_profiles
for each row execute function public.worldmakers_interest_touch_updated_at();

drop trigger if exists worldmakers_interest_audit_status_change_trg on public.worldmakers_interest_profiles;
create trigger worldmakers_interest_audit_status_change_trg
after update of status on public.worldmakers_interest_profiles
for each row execute function public.worldmakers_interest_audit_status_change();

alter table public.worldmakers_interest_profiles enable row level security;
alter table public.worldmakers_interest_status_events enable row level security;

revoke all on table public.worldmakers_interest_profiles from public, anon, authenticated;
revoke all on table public.worldmakers_interest_status_events from public, anon, authenticated;
revoke execute on function public.worldmakers_interest_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.worldmakers_interest_audit_status_change() from public, anon, authenticated;

grant select, insert, update, delete on table public.worldmakers_interest_profiles to service_role;
grant select, insert, update, delete on table public.worldmakers_interest_status_events to service_role;
grant usage, select on sequence public.worldmakers_interest_status_events_id_seq to service_role;

comment on table public.worldmakers_interest_profiles is
  'Adult-only World Makers community interest profiles. Child identity and gameplay data are intentionally excluded.';
comment on table public.worldmakers_interest_status_events is
  'Audit history for operational changes in the adult World Makers interest-selection pipeline.';
comment on column public.worldmakers_interest_profiles.status is
  'Operational pipeline state; registration, selection readiness and actual contact remain distinct states.';
