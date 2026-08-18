-- CTG Craft Beer Investment OS — Provider Reconciliation target hardening
-- Manual outbound resolution must prove that the operator-selected payout is the
-- same financial obligation described by the normalized provider event.

create or replace function public.resolve_investment_financial_event(
  p_event_id uuid,
  p_action text,
  p_order_id uuid default null,
  p_payout_id uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.investment_financial_provider_events;
  v_terminal public.investment_financial_event_matches;
  v_payout public.investment_payouts;
  v_action text := upper(trim(p_action));
  v_receipt_id uuid;
  v_outcome text;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  select * into v_event from public.investment_financial_provider_events where id=p_event_id for share;
  if v_event.id is null then raise exception 'provider financial event not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-provider-match:'||v_event.id::text,0));
  select * into v_terminal from public.investment_financial_event_matches
  where provider_event_id=v_event.id and outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED')
  order by created_at desc,id desc limit 1;
  if found then
    return jsonb_build_object('event_id',v_event.id,'outcome',v_terminal.outcome,'idempotent',true,
      'order_id',v_terminal.order_id,'payout_id',v_terminal.payout_id,'receipt_id',v_terminal.receipt_id);
  end if;

  if v_action='IGNORE' then
    if p_order_id is not null or p_payout_id is not null then raise exception 'IGNORE does not accept a target'; end if;
    insert into public.investment_financial_event_matches(provider_event_id,match_method,target_type,outcome,notes,actor_id)
    values(v_event.id,'IGNORED','NONE','IGNORED',nullif(trim(p_notes),''),auth.uid());
    return jsonb_build_object('event_id',v_event.id,'outcome','IGNORED','idempotent',false);
  end if;

  if v_event.direction='INBOUND' then
    if v_action<>'RECONCILE' then raise exception 'inbound event only supports RECONCILE or IGNORE'; end if;
    if p_order_id is null or p_payout_id is not null then raise exception 'RECONCILE requires exactly one order target'; end if;

    select r.receipt_id into v_receipt_id
    from public.reconcile_investment_order_payment(
      p_order_id,v_event.payment_rail,v_event.provider_code,v_event.external_reference,
      v_event.amount_cents,v_event.occurred_at,'PROVIDER_EVENT:'||v_event.id::text,
      coalesce(nullif(trim(p_notes),''),'Manually reconciled provider event '||v_event.id::text)
    ) r;

    insert into public.investment_financial_event_matches(
      provider_event_id,match_method,target_type,order_id,receipt_id,outcome,notes,actor_id
    ) values(v_event.id,'MANUAL','ORDER',p_order_id,v_receipt_id,'RECONCILED',nullif(trim(p_notes),''),auth.uid());
    v_outcome:='RECONCILED';
  else
    if p_payout_id is null or p_order_id is not null then raise exception 'outbound resolution requires exactly one payout target'; end if;

    select * into v_payout from public.investment_payouts where id=p_payout_id for share;
    if v_payout.id is null then raise exception 'selected payout not found'; end if;
    if v_payout.provider_code<>v_event.provider_code then
      raise exception 'selected payout provider does not match provider event';
    end if;
    if v_payout.payout_rail<>v_event.payment_rail then
      raise exception 'selected payout rail does not match provider event';
    end if;
    if v_payout.amount_cents<>v_event.amount_cents then
      raise exception 'selected payout amount does not match provider event';
    end if;

    if v_event.event_type='CONFIRMED' then
      if v_action<>'CONFIRM' then raise exception 'confirmed outbound event only supports CONFIRM or IGNORE'; end if;
      perform public.confirm_investment_payout(p_payout_id,v_event.external_reference,v_event.occurred_at,
        coalesce(nullif(trim(p_notes),''),'Manually confirmed provider event '||v_event.id::text));
      v_outcome:='CONFIRMED';
    elsif v_event.event_type='FAILED' then
      if v_action<>'FAIL' then raise exception 'failed outbound event only supports FAIL or IGNORE'; end if;
      perform public.fail_investment_payout(p_payout_id,
        coalesce(nullif(trim(p_notes),''),'Provider event reported payout failure: '||v_event.provider_event_key),v_event.external_reference);
      v_outcome:='FAILED';
    end if;

    insert into public.investment_financial_event_matches(
      provider_event_id,match_method,target_type,payout_id,outcome,notes,actor_id
    ) values(v_event.id,'MANUAL','PAYOUT',p_payout_id,v_outcome,nullif(trim(p_notes),''),auth.uid());
  end if;

  return jsonb_build_object('event_id',v_event.id,'outcome',v_outcome,'idempotent',false,
    'order_id',p_order_id,'payout_id',p_payout_id,'receipt_id',v_receipt_id);
end;
$$;

revoke all on function public.resolve_investment_financial_event(uuid,text,uuid,uuid,text) from public,anon;
grant execute on function public.resolve_investment_financial_event(uuid,text,uuid,uuid,text) to authenticated;
