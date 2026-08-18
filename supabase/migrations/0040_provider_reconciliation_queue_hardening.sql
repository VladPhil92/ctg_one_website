-- CTG Craft Beer Investment OS — Provider Reconciliation queue hardening
--
-- Fixes two review findings in the provider-neutral reconciliation engine:
-- 1) bounded batch scans must rotate fairly across every unresolved event;
-- 2) NO_MATCH/CONFLICT history must append whenever the latest nonterminal
--    outcome changes, not merely when that outcome has never existed historically.

-- ---------------------------------------------------------------------------
-- Internal retry scheduler state
-- ---------------------------------------------------------------------------
create table public.investment_financial_event_retry_state (
  provider_event_id uuid primary key
    references public.investment_financial_provider_events(id) on delete restrict,
  attempt_count bigint not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now()
);

create index investment_financial_event_retry_state_last_attempt_idx
  on public.investment_financial_event_retry_state(last_attempt_at, provider_event_id);

alter table public.investment_financial_event_retry_state enable row level security;
revoke all on public.investment_financial_event_retry_state from public, anon, authenticated;

comment on table public.investment_financial_event_retry_state is
  'Internal mutable scheduler metadata used only to rotate unresolved provider events fairly. Financial event and match history remain append-only.';

-- ---------------------------------------------------------------------------
-- Append a nonterminal decision only when the latest decision changed
-- ---------------------------------------------------------------------------
create or replace function public._append_investment_financial_nonterminal_match(
  p_event_id uuid,
  p_outcome text,
  p_match_method text,
  p_notes text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome text := upper(trim(p_outcome));
  v_method text := upper(trim(p_match_method));
  v_latest_outcome text;
begin
  if v_outcome not in ('NO_MATCH','CONFLICT') then
    raise exception 'nonterminal outcome must be NO_MATCH or CONFLICT';
  end if;
  if (v_outcome='NO_MATCH' and v_method<>'SYSTEM_NO_MATCH')
     or (v_outcome='CONFLICT' and v_method<>'SYSTEM_CONFLICT') then
    raise exception 'nonterminal match method does not correspond to outcome';
  end if;

  select m.outcome into v_latest_outcome
  from public.investment_financial_event_matches m
  where m.provider_event_id=p_event_id
  order by m.created_at desc,m.id desc
  limit 1;

  if found and v_latest_outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED') then
    raise exception 'provider event already has a terminal reconciliation outcome';
  end if;

  if found and v_latest_outcome=v_outcome then
    return false;
  end if;

  insert into public.investment_financial_event_matches(
    provider_event_id,match_method,target_type,outcome,actor_id,notes
  ) values (
    p_event_id,v_method,'NONE',v_outcome,auth.uid(),nullif(trim(p_notes),'')
  );

  return true;
end;
$$;

revoke all on function public._append_investment_financial_nonterminal_match(uuid,text,text,text)
  from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Auto-match: preserve authoritative rails, but fix nonterminal genealogy
-- ---------------------------------------------------------------------------
create or replace function public.auto_match_investment_financial_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.investment_financial_provider_events;
  v_terminal public.investment_financial_event_matches;
  v_candidate_count integer := 0;
  v_order_id uuid;
  v_payout_id uuid;
  v_receipt_id uuid;
  v_outcome text;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;

  select * into v_event from public.investment_financial_provider_events where id=p_event_id for share;
  if v_event.id is null then raise exception 'provider financial event not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-provider-match:'||v_event.id::text,0));
  select * into v_terminal
  from public.investment_financial_event_matches
  where provider_event_id=v_event.id and outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED')
  order by created_at desc,id desc limit 1;
  if found then
    return jsonb_build_object('event_id',v_event.id,'outcome',v_terminal.outcome,'target_type',v_terminal.target_type,
      'order_id',v_terminal.order_id,'payout_id',v_terminal.payout_id,'receipt_id',v_terminal.receipt_id,'idempotent',true);
  end if;

  if v_event.direction='INBOUND' then
    select count(*) into v_candidate_count
    from public.investment_orders o
    where o.status='PAYMENT_SUBMITTED'
      and o.payment_method=v_event.payment_rail
      and o.capital_required_cents=v_event.amount_cents
      and nullif(trim(o.payment_reference),'') is not null
      and upper(trim(o.payment_reference))=upper(trim(v_event.external_reference));

    if v_candidate_count=1 then
      select o.id into v_order_id
      from public.investment_orders o
      where o.status='PAYMENT_SUBMITTED'
        and o.payment_method=v_event.payment_rail
        and o.capital_required_cents=v_event.amount_cents
        and nullif(trim(o.payment_reference),'') is not null
        and upper(trim(o.payment_reference))=upper(trim(v_event.external_reference))
      limit 1;

      select r.receipt_id into v_receipt_id
      from public.reconcile_investment_order_payment(
        v_order_id,v_event.payment_rail,v_event.provider_code,v_event.external_reference,
        v_event.amount_cents,v_event.occurred_at,'PROVIDER_EVENT:'||v_event.id::text,
        'Auto-reconciled from normalized provider event '||v_event.id::text
      ) r;

      insert into public.investment_financial_event_matches(
        provider_event_id,match_method,target_type,order_id,receipt_id,outcome,actor_id,notes
      ) values(v_event.id,'AUTO_EXACT_REFERENCE','ORDER',v_order_id,v_receipt_id,'RECONCILED',auth.uid(),
        'Exact provider + rail + amount + external-reference match');
      v_outcome:='RECONCILED';
    elsif v_candidate_count=0 then
      perform public._append_investment_financial_nonterminal_match(
        v_event.id,'NO_MATCH','SYSTEM_NO_MATCH','No exact order reference candidate'
      );
      v_outcome:='NO_MATCH';
    else
      perform public._append_investment_financial_nonterminal_match(
        v_event.id,'CONFLICT','SYSTEM_CONFLICT','Multiple exact order reference candidates'
      );
      v_outcome:='CONFLICT';
    end if;

  else
    if v_event.merchant_reference is null then
      v_candidate_count:=0;
    else
      select count(*) into v_candidate_count
      from public.investment_payouts p
      join public.investment_withdrawal_requests w on w.id=p.withdrawal_request_id
      where p.provider_code=v_event.provider_code
        and p.payout_rail=v_event.payment_rail
        and p.amount_cents=v_event.amount_cents
        and (p.id::text=v_event.merchant_reference or p.idempotency_key=v_event.merchant_reference)
        and w.status='PAYMENT_PROCESSING'
        and (
          select e.event_type from public.investment_payout_events e
          where e.payout_id=p.id order by e.created_at desc,e.id desc limit 1
        )='PROCESSING';
    end if;

    if v_candidate_count=1 then
      select p.id into v_payout_id
      from public.investment_payouts p
      join public.investment_withdrawal_requests w on w.id=p.withdrawal_request_id
      where p.provider_code=v_event.provider_code
        and p.payout_rail=v_event.payment_rail
        and p.amount_cents=v_event.amount_cents
        and (p.id::text=v_event.merchant_reference or p.idempotency_key=v_event.merchant_reference)
        and w.status='PAYMENT_PROCESSING'
        and (
          select e.event_type from public.investment_payout_events e
          where e.payout_id=p.id order by e.created_at desc,e.id desc limit 1
        )='PROCESSING'
      limit 1;

      if v_event.event_type='CONFIRMED' then
        perform public.confirm_investment_payout(v_payout_id,v_event.external_reference,v_event.occurred_at,
          'Auto-confirmed from normalized provider event '||v_event.id::text);
        v_outcome:='CONFIRMED';
      else
        perform public.fail_investment_payout(v_payout_id,
          'Provider event reported payout failure: '||v_event.provider_event_key,v_event.external_reference);
        v_outcome:='FAILED';
      end if;

      insert into public.investment_financial_event_matches(
        provider_event_id,match_method,target_type,payout_id,outcome,actor_id,notes
      ) values(v_event.id,'AUTO_MERCHANT_REFERENCE','PAYOUT',v_payout_id,v_outcome,auth.uid(),
        'Exact provider + rail + amount + merchant-reference match');
    elsif v_candidate_count=0 then
      perform public._append_investment_financial_nonterminal_match(
        v_event.id,'NO_MATCH','SYSTEM_NO_MATCH','No exact processing payout merchant-reference candidate'
      );
      v_outcome:='NO_MATCH';
    else
      perform public._append_investment_financial_nonterminal_match(
        v_event.id,'CONFLICT','SYSTEM_CONFLICT','Multiple exact payout merchant-reference candidates'
      );
      v_outcome:='CONFLICT';
    end if;
  end if;

  return jsonb_build_object('event_id',v_event.id,'outcome',v_outcome,'candidate_count',v_candidate_count,
    'order_id',v_order_id,'payout_id',v_payout_id,'receipt_id',v_receipt_id,'idempotent',false);
end;
$$;

revoke all on function public.auto_match_investment_financial_event(uuid) from public,anon;
grant execute on function public.auto_match_investment_financial_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Fair bounded batch processing
-- ---------------------------------------------------------------------------
create or replace function public.auto_match_pending_investment_financial_events(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_result jsonb;
  v_processed integer := 0;
  v_reconciled integer := 0;
  v_confirmed integer := 0;
  v_failed integer := 0;
  v_unmatched integer := 0;
  v_conflicts integer := 0;
  v_errors integer := 0;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'limit must be between 1 and 500'; end if;

  -- One batch scheduler at a time. Per-event matching remains separately locked.
  perform pg_advisory_xact_lock(hashtextextended('ctg-provider-batch-auto-match',0));

  for v_event in
    select e.id
    from public.investment_financial_provider_events e
    left join public.investment_financial_event_retry_state s on s.provider_event_id=e.id
    where not exists (
      select 1 from public.investment_financial_event_matches m
      where m.provider_event_id=e.id and m.outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED')
    )
    order by s.last_attempt_at asc nulls first,e.occurred_at,e.id
    limit p_limit
  loop
    begin
      v_result:=public.auto_match_investment_financial_event(v_event.id);
      case v_result->>'outcome'
        when 'RECONCILED' then v_reconciled:=v_reconciled+1;
        when 'CONFIRMED' then v_confirmed:=v_confirmed+1;
        when 'FAILED' then v_failed:=v_failed+1;
        when 'CONFLICT' then v_conflicts:=v_conflicts+1;
        else v_unmatched:=v_unmatched+1;
      end case;
    exception when others then
      -- A single event must never starve every later unresolved event. The event
      -- remains nonterminal and will rotate back after the rest of the queue.
      v_errors:=v_errors+1;
    end;

    insert into public.investment_financial_event_retry_state(
      provider_event_id,attempt_count,last_attempt_at,updated_at
    ) values(v_event.id,1,clock_timestamp(),clock_timestamp())
    on conflict (provider_event_id) do update
    set attempt_count=public.investment_financial_event_retry_state.attempt_count+1,
        last_attempt_at=excluded.last_attempt_at,
        updated_at=excluded.updated_at;

    v_processed:=v_processed+1;
  end loop;

  return jsonb_build_object('processed',v_processed,'reconciled',v_reconciled,'confirmed',v_confirmed,
    'failed',v_failed,'unmatched',v_unmatched,'conflicts',v_conflicts,'errors',v_errors);
end;
$$;

revoke all on function public.auto_match_pending_investment_financial_events(integer) from public,anon;
grant execute on function public.auto_match_pending_investment_financial_events(integer) to authenticated;
