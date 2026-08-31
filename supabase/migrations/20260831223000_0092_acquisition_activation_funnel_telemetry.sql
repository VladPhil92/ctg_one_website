-- CTG One — acquisition and activation funnel telemetry.
-- First-party, pseudonymous product analytics for the public-to-authenticated journey.
-- Raw events are server-write-only; authenticated clients cannot read or mutate them.

create table if not exists public.product_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'home_viewed',
    'create_account_clicked',
    'signup_started',
    'email_verified',
    'first_login',
    'dashboard_viewed',
    'first_service_used'
  )),
  anonymous_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  source_path text not null check (
    char_length(source_path) between 1 and 180
    and source_path like '/%'
  ),
  service_key text check (
    service_key is null
    or service_key in ('investment', 'wallet', 'identity', 'knowledge', 'nvet')
  ),
  occurred_at timestamptz not null default now(),
  constraint product_analytics_service_event_ck check (
    (event_name = 'first_service_used' and service_key is not null)
    or (event_name <> 'first_service_used' and service_key is null)
  ),
  constraint product_analytics_authenticated_milestone_ck check (
    event_name not in ('email_verified', 'first_login', 'dashboard_viewed', 'first_service_used')
    or user_id is not null
  )
);

comment on table public.product_analytics_events is
  'Server-write-only pseudonymous acquisition/activation telemetry. Contains no email, phone, name, password, payment data, IP address or free-form client metadata.';
comment on column public.product_analytics_events.anonymous_id is
  'Random first-party UUID used to correlate the acquisition cohort before and after authentication.';
comment on column public.product_analytics_events.service_key is
  'Bounded service identifier populated only for the first_service_used milestone.';

create index if not exists product_analytics_event_time_idx
  on public.product_analytics_events (event_name, occurred_at desc);
create index if not exists product_analytics_anonymous_time_idx
  on public.product_analytics_events (anonymous_id, occurred_at desc);
create index if not exists product_analytics_user_time_idx
  on public.product_analytics_events (user_id, occurred_at desc)
  where user_id is not null;

-- Post-authentication stages are milestones, not page-view counters. The first
-- successful occurrence wins and subsequent retries become harmless no-ops at
-- the server boundary.
create unique index if not exists product_analytics_user_milestone_uidx
  on public.product_analytics_events (user_id, event_name)
  where user_id is not null
    and event_name in ('email_verified', 'first_login', 'dashboard_viewed', 'first_service_used');

alter table public.product_analytics_events enable row level security;

-- No direct browser access. Writes cross the Next.js server trust boundary,
-- where event names, actor identity and bounded context are validated first.
revoke all on table public.product_analytics_events from public, anon, authenticated;
grant select, insert on table public.product_analytics_events to service_role;

create or replace function public.get_acquisition_funnel_snapshot(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'analytics window must be between 1 and 365 days';
  end if;

  with scoped as (
    select event_name, anonymous_id, user_id, service_key, occurred_at
    from public.product_analytics_events
    where occurred_at >= now() - make_interval(days => p_days)
  ),
  stages as (
    select
      count(distinct anonymous_id) filter (where event_name = 'home_viewed')::bigint as home_viewed,
      count(distinct anonymous_id) filter (where event_name = 'create_account_clicked')::bigint as create_account_clicked,
      count(distinct anonymous_id) filter (where event_name = 'signup_started')::bigint as signup_started,
      count(distinct anonymous_id) filter (where event_name = 'email_verified')::bigint as email_verified,
      count(distinct anonymous_id) filter (where event_name = 'first_login')::bigint as first_login,
      count(distinct anonymous_id) filter (where event_name = 'dashboard_viewed')::bigint as dashboard_viewed,
      count(distinct anonymous_id) filter (where event_name = 'first_service_used')::bigint as first_service_used
    from scoped
  ),
  services as (
    select coalesce(
      jsonb_object_agg(service_key, actor_count order by service_key),
      '{}'::jsonb
    ) as breakdown
    from (
      select service_key, count(distinct anonymous_id)::bigint as actor_count
      from scoped
      where event_name = 'first_service_used' and service_key is not null
      group by service_key
    ) s
  )
  select jsonb_build_object(
    'generated_at', now(),
    'window_days', p_days,
    'stages', jsonb_build_object(
      'home_viewed', st.home_viewed,
      'create_account_clicked', st.create_account_clicked,
      'signup_started', st.signup_started,
      'email_verified', st.email_verified,
      'first_login', st.first_login,
      'dashboard_viewed', st.dashboard_viewed,
      'first_service_used', st.first_service_used
    ),
    'conversion_pct', jsonb_build_object(
      'home_to_create_account', case when st.home_viewed = 0 then 0 else round(st.create_account_clicked::numeric * 100 / st.home_viewed, 2) end,
      'create_account_to_signup', case when st.create_account_clicked = 0 then 0 else round(st.signup_started::numeric * 100 / st.create_account_clicked, 2) end,
      'signup_to_verified', case when st.signup_started = 0 then 0 else round(st.email_verified::numeric * 100 / st.signup_started, 2) end,
      'verified_to_first_login', case when st.email_verified = 0 then 0 else round(st.first_login::numeric * 100 / st.email_verified, 2) end,
      'first_login_to_dashboard', case when st.first_login = 0 then 0 else round(st.dashboard_viewed::numeric * 100 / st.first_login, 2) end,
      'dashboard_to_first_service', case when st.dashboard_viewed = 0 then 0 else round(st.first_service_used::numeric * 100 / st.dashboard_viewed, 2) end,
      'home_to_first_service', case when st.home_viewed = 0 then 0 else round(st.first_service_used::numeric * 100 / st.home_viewed, 2) end
    ),
    'first_service_breakdown', sv.breakdown
  )
  into v_snapshot
  from stages st
  cross join services sv;

  return v_snapshot;
end;
$$;

comment on function public.get_acquisition_funnel_snapshot(integer) is
  'Admin-only aggregate acquisition/activation funnel snapshot. Returns cohort counts and conversion percentages without raw events or PII.';

revoke all on function public.get_acquisition_funnel_snapshot(integer) from public, anon;
grant execute on function public.get_acquisition_funnel_snapshot(integer) to authenticated;
