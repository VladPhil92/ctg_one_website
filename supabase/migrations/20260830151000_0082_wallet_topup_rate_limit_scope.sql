-- CTG One Wallet — durable rate limit for COP top-up evidence.
-- Replaces the allow-list from 0049 without widening direct table access.

create or replace function public.consume_api_rate_limit(p_scope text)
returns table(
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer;
  v_row public.api_rate_limit_windows;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  case p_scope
    when 'knowledge.query' then
      v_limit := 30;
      v_window_seconds := 300;
    when 'investment.payment-proof' then
      v_limit := 8;
      v_window_seconds := 600;
    when 'wallet.topup-proof' then
      v_limit := 8;
      v_window_seconds := 600;
    else
      raise exception 'unsupported rate-limit scope';
  end case;

  insert into public.api_rate_limit_windows(
    user_id,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (v_user_id, p_scope, v_now, 0, v_now)
  on conflict (user_id, scope) do nothing;

  select * into v_row
  from public.api_rate_limit_windows
  where user_id = v_user_id and scope = p_scope
  for update;

  if v_row.window_started_at + make_interval(secs => v_window_seconds) <= v_now then
    update public.api_rate_limit_windows
    set window_started_at = v_now, request_count = 1, updated_at = v_now
    where user_id = v_user_id and scope = p_scope;

    allowed := true;
    remaining := v_limit - 1;
    retry_after_seconds := 0;
    return next;
    return;
  end if;

  if v_row.request_count >= v_limit then
    allowed := false;
    remaining := 0;
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (
        v_row.window_started_at + make_interval(secs => v_window_seconds) - v_now
      )))::integer
    );
    return next;
    return;
  end if;

  update public.api_rate_limit_windows
  set request_count = request_count + 1, updated_at = v_now
  where user_id = v_user_id and scope = p_scope;

  allowed := true;
  remaining := v_limit - (v_row.request_count + 1);
  retry_after_seconds := 0;
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(text) from public, anon;
grant execute on function public.consume_api_rate_limit(text) to authenticated, service_role;
