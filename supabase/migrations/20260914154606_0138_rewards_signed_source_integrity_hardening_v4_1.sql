-- CTG Rewards Signed Source Integrity Hardening v4.1
--
-- Closes post-merge review findings from Signed Source Connectors v4:
-- - connector-independent public/requester rate limiting before connector lookup;
-- - database-wide subject/day reservation ordinals for every original shadow-event writer;
-- - no Rewards balance or ledger authority is introduced.

create or replace function public.consume_service_api_rate_limit(
  p_scope text,
  p_actor_key text
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_started_at timestamptz;
  v_request_count integer;
  v_limit integer;
  v_retry integer;
begin
  if p_scope = 'federation.vertice.exchange' then
    if p_actor_key is distinct from 'vertice' then
      raise exception 'SERVICE_RATE_LIMIT_ACTOR_INVALID';
    end if;
    v_limit := 120;
  elsif p_scope = 'rewards.source.public' then
    if p_actor_key is distinct from 'public' then
      raise exception 'SERVICE_RATE_LIMIT_ACTOR_INVALID';
    end if;
    v_limit := 1200;
  elsif p_scope = 'rewards.source.preverify' then
    if p_actor_key !~ '^r_[0-9a-f]{40}$' then
      raise exception 'SERVICE_RATE_LIMIT_ACTOR_INVALID';
    end if;
    v_limit := 60;
  elsif p_scope = 'rewards.source.connector' then
    if p_actor_key !~ '^c_[a-z0-9][a-z0-9_-]{1,47}$' then
      raise exception 'SERVICE_RATE_LIMIT_ACTOR_INVALID';
    end if;
    v_limit := 600;
  else
    raise exception 'SERVICE_RATE_LIMIT_SCOPE_INVALID';
  end if;

  insert into private.service_api_rate_limit_windows(
    scope, actor_key, window_started_at, request_count, updated_at
  ) values (
    p_scope, p_actor_key, v_now, 0, v_now
  )
  on conflict (scope, actor_key) do nothing;

  select window_started_at, request_count
    into v_started_at, v_request_count
  from private.service_api_rate_limit_windows
  where scope = p_scope and actor_key = p_actor_key
  for update;

  if v_started_at + interval '60 seconds' <= v_now then
    update private.service_api_rate_limit_windows
    set window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    where scope = p_scope and actor_key = p_actor_key;
    return query select true, v_limit - 1, 0;
    return;
  end if;

  if v_request_count >= v_limit then
    v_retry := greatest(1, ceil(extract(epoch from ((v_started_at + interval '60 seconds') - v_now)))::integer);
    return query select false, 0, v_retry;
    return;
  end if;

  v_request_count := v_request_count + 1;
  update private.service_api_rate_limit_windows
  set request_count = v_request_count,
      updated_at = v_now
  where scope = p_scope and actor_key = p_actor_key;

  return query select true, greatest(0, v_limit - v_request_count), 0;
end;
$$;

revoke all on function public.consume_service_api_rate_limit(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_service_api_rate_limit(text, text)
  to service_role;

comment on function public.consume_service_api_rate_limit(text, text) is
  'Service-role-only durable limiter for federation and Rewards signed-source public/requester/connector boundaries.';

alter table public.reward_shadow_events
  add column subject_utc_day date,
  add column subject_daily_ordinal bigint;

with ranked as (
  select
    id,
    (occurred_at at time zone 'utc')::date as utc_day,
    row_number() over (
      partition by subject_user_id, (occurred_at at time zone 'utc')::date
      order by occurred_at, created_at, id
    )::bigint as daily_ordinal
  from public.reward_shadow_events
  where event_kind = 'original'
)
update public.reward_shadow_events e
set subject_utc_day = ranked.utc_day,
    subject_daily_ordinal = ranked.daily_ordinal
from ranked
where e.id = ranked.id;

alter table public.reward_shadow_events
  add constraint reward_shadow_event_subject_day_shape_check check (
    (event_kind = 'original'
      and subject_utc_day is not null
      and subject_daily_ordinal is not null
      and subject_daily_ordinal > 0)
    or
    (event_kind = 'reversal'
      and subject_utc_day is null
      and subject_daily_ordinal is null)
  );

create unique index reward_shadow_events_subject_day_ordinal_uidx
  on public.reward_shadow_events (subject_user_id, subject_utc_day, subject_daily_ordinal)
  where event_kind = 'original';

create index reward_shadow_events_subject_day_idx
  on public.reward_shadow_events (subject_user_id, subject_utc_day, subject_daily_ordinal desc)
  where event_kind = 'original';

create or replace function private.assign_reward_shadow_subject_daily_ordinal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_day date;
  v_next bigint;
begin
  if new.event_kind <> 'original' then
    new.subject_utc_day := null;
    new.subject_daily_ordinal := null;
    return new;
  end if;

  v_day := (new.occurred_at at time zone 'utc')::date;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.subject_user_id::text || ':' || v_day::text, 0)
  );

  select coalesce(max(e.subject_daily_ordinal), 0) + 1
    into v_next
  from public.reward_shadow_events e
  where e.subject_user_id = new.subject_user_id
    and e.event_kind = 'original'
    and e.subject_utc_day = v_day;

  new.subject_utc_day := v_day;
  new.subject_daily_ordinal := v_next;
  return new;
end;
$$;

revoke all on function private.assign_reward_shadow_subject_daily_ordinal()
  from public, anon, authenticated, service_role;

create trigger reward_shadow_events_subject_daily_ordinal_trg
before insert on public.reward_shadow_events
for each row execute function private.assign_reward_shadow_subject_daily_ordinal();

comment on column public.reward_shadow_events.subject_utc_day is
  'UTC day reserved at original-event insertion time for deterministic daily-limit evaluation.';
comment on column public.reward_shadow_events.subject_daily_ordinal is
  'Database-wide serialized ordinal for an original shadow event within subject + UTC day. Stable after insertion.';

-- v4.1 remains shadow-only: no grants or writes to reward_accounts / reward_ledger_entries.