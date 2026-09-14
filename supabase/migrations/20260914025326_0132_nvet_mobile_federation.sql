-- Phase 34 — CTG One -> Nvet Care mobile federation.
-- Reuse the existing server-only authorization-code store and fixed-window
-- service limiter. This migration only expands explicit allow-lists; it does
-- not grant browser/client access or weaken RLS.

alter table public.identity_federation_authorization_codes
  drop constraint if exists identity_federation_authorization_codes_provider_check;

alter table public.identity_federation_authorization_codes
  add constraint identity_federation_authorization_codes_provider_check
  check (provider in ('vertice', 'pisao', 'nvet'));

comment on column public.identity_federation_authorization_codes.provider is
  'Explicitly allow-listed CTG One federation relying party: vertice, pisao, or nvet.';

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
  v_limit constant integer := 120;
  v_retry integer;
begin
  if not (
    (p_scope = 'federation.vertice.exchange' and p_actor_key = 'vertice')
    or (p_scope = 'federation.nvet.mobile.exchange' and p_actor_key = 'nvet')
  ) then
    raise exception 'SERVICE_RATE_LIMIT_SCOPE_INVALID';
  end if;

  insert into private.service_api_rate_limit_windows(
    scope,
    actor_key,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_scope,
    p_actor_key,
    v_now,
    0,
    v_now
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
    v_retry := greatest(
      1,
      ceil(extract(epoch from ((v_started_at + interval '60 seconds') - v_now)))::integer
    );
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
  'Service-role-only fixed-window limiter for explicitly allow-listed federation exchange boundaries: VERTICE and Nvet mobile.';
