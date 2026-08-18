-- CTG Craft Beer Investment OS — Payment Rails hardening
-- Follow-up to 0031 before production cutover: server-side masked-destination
-- enforcement, retry recovery by withdrawal identity, append-order lifecycle
-- semantics and idempotent payout confirmation.

-- ---------------------------------------------------------------------------
-- Masked payout destination is an enforced server invariant, not UI guidance.
-- Accept common masking characters but reject any value without a mask or with
-- a long contiguous digit run that could contain a raw account credential.
-- ---------------------------------------------------------------------------
create or replace function public._assert_masked_payout_destination(p_value text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_value text := nullif(trim(p_value),'');
begin
  if v_value is null or length(v_value) < 4 then
    raise exception 'masked payout destination is required';
  end if;
  if v_value !~ '[*•xX]{3,}' then
    raise exception 'payout destination must contain at least three masking characters';
  end if;
  if v_value ~ '[0-9]{5,}' then
    raise exception 'payout destination must not contain an unmasked account-number sequence';
  end if;
  return v_value;
end;
$$;
revoke all on function public._assert_masked_payout_destination(text) from public,anon,authenticated;

create or replace function public.set_investment_payout_destination(
  p_destination_masked text,
  p_destination_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_masked text;
  v_fingerprint text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  v_masked := public._assert_masked_payout_destination(p_destination_masked);
  v_fingerprint := nullif(trim(p_destination_fingerprint),'');
  if v_fingerprint is null or length(v_fingerprint) < 8 then
    raise exception 'payout destination fingerprint is required';
  end if;

  if exists (
    select 1 from public.investment_withdrawal_requests
    where participant_user_id = auth.uid()
      and status in ('REQUESTED','UNDER_REVIEW','APPROVED','PAYMENT_PROCESSING')
  ) then
    raise exception 'payout destination cannot change while a withdrawal is active';
  end if;

  update public.investment_participant_profiles
  set bank_account_masked = v_masked,
      payout_destination_fingerprint = v_fingerprint
  where user_id = auth.uid();
  if not found then raise exception 'investment participant profile not found'; end if;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  select auth.uid(),'set_investment_payout_destination','investment_participant_profiles',id,
    jsonb_build_object('destination_masked',v_masked,'destination_fingerprint',v_fingerprint)
  from public.investment_participant_profiles where user_id=auth.uid();
end;
$$;
revoke all on function public.set_investment_payout_destination(text,text) from public,anon;
grant execute on function public.set_investment_payout_destination(text,text) to authenticated;

-- Normalize privileged receipt writes and reject implausible future settlement
-- timestamps. The authoritative RPC already supplies normalized values, but the
-- trigger remains the ultimate invariant boundary.
create or replace function public.guard_investment_payment_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
begin
  if not (
    public.has_investment_permission('funding.manage')
    or public.has_investment_permission('finance.manage')
  ) then
    raise exception 'funding.manage or finance.manage required';
  end if;

  new.payment_rail := lower(trim(new.payment_rail));
  new.provider_code := upper(trim(new.provider_code));
  new.external_reference := trim(new.external_reference);
  new.idempotency_key := trim(new.idempotency_key);

  if new.settled_at > now() + interval '5 minutes' then
    raise exception 'receipt settlement timestamp cannot be materially in the future';
  end if;

  select * into v_order from public.investment_orders where id=new.order_id;
  if v_order.id is null then raise exception 'investment order not found'; end if;
  if v_order.status <> 'PAYMENT_SUBMITTED' then
    raise exception 'authoritative receipt requires PAYMENT_SUBMITTED order';
  end if;
  if v_order.allocation_id is not null then raise exception 'order is already allocated'; end if;
  if new.participant_user_id <> v_order.participant_user_id then raise exception 'receipt participant does not match order'; end if;
  if new.amount_cents <> v_order.capital_required_cents then raise exception 'receipt must equal exact order capital requirement'; end if;
  if new.payment_rail <> v_order.payment_method then raise exception 'reconciled rail must match participant payment claim'; end if;
  if new.reconciled_by <> auth.uid() then raise exception 'reconciled_by must be current actor'; end if;
  return new;
end;
$$;
revoke all on function public.guard_investment_payment_receipt() from public,anon,authenticated;

-- Payout documents also enforce masking and normalized provider identity.
create or replace function public.guard_investment_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.investment_withdrawal_requests;
  v_masked text;
  v_fingerprint text;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;

  new.payout_rail := lower(trim(new.payout_rail));
  new.provider_code := upper(trim(new.provider_code));
  new.destination_masked := public._assert_masked_payout_destination(new.destination_masked);
  new.destination_fingerprint := trim(new.destination_fingerprint);
  new.idempotency_key := trim(new.idempotency_key);

  select * into v_req from public.investment_withdrawal_requests where id=new.withdrawal_request_id;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;
  if v_req.status <> 'APPROVED' then raise exception 'payout requires APPROVED withdrawal'; end if;
  if new.participant_user_id <> v_req.participant_user_id then raise exception 'payout participant does not match withdrawal'; end if;
  if new.amount_cents <> v_req.amount_cents then raise exception 'payout amount must equal approved withdrawal'; end if;

  select bank_account_masked,payout_destination_fingerprint into v_masked,v_fingerprint
  from public.investment_participant_profiles where user_id=v_req.participant_user_id;
  v_masked := public._assert_masked_payout_destination(v_masked);
  if nullif(trim(v_fingerprint),'') is null then raise exception 'participant payout destination is not registered'; end if;
  if new.destination_masked <> v_masked or new.destination_fingerprint <> v_fingerprint then
    raise exception 'payout destination does not match registered participant destination';
  end if;
  if new.created_by <> auth.uid() then raise exception 'created_by must be current actor'; end if;
  return new;
end;
$$;
revoke all on function public.guard_investment_payout() from public,anon,authenticated;

-- Lifecycle state is the append sequence, not the provider's business timestamp.
-- A CONFIRMED event is terminal regardless of occurred_at.
create or replace function public.guard_investment_payout_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.investment_payouts;
  v_last_type text;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;

  select * into v_payout from public.investment_payouts where id=new.payout_id;
  if v_payout.id is null then raise exception 'payout not found'; end if;

  new.provider_code := upper(trim(new.provider_code));
  new.external_reference := nullif(trim(new.external_reference),'');
  if new.provider_code <> v_payout.provider_code then raise exception 'payout event provider must match payout document'; end if;
  if new.actor_id <> auth.uid() then raise exception 'actor_id must be current actor'; end if;
  if new.occurred_at > now() + interval '5 minutes' then raise exception 'payout event timestamp cannot be materially in the future'; end if;

  if exists (
    select 1 from public.investment_payout_events
    where payout_id=new.payout_id and event_type='CONFIRMED'
  ) then
    raise exception 'confirmed payout is terminal';
  end if;

  select event_type into v_last_type
  from public.investment_payout_events
  where payout_id=new.payout_id
  order by created_at desc,id desc
  limit 1;

  if v_last_type is null and new.event_type <> 'PROCESSING' then
    raise exception 'first payout event must be PROCESSING';
  elsif v_last_type='PROCESSING' and new.event_type not in ('CONFIRMED','FAILED') then
    raise exception 'PROCESSING payout may only become CONFIRMED or FAILED';
  elsif v_last_type='FAILED' and new.event_type <> 'PROCESSING' then
    raise exception 'FAILED payout may only retry as PROCESSING';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_investment_payout_event() from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Retry-safe payout initiation keyed by the immutable withdrawal document.
-- A browser refresh may generate a new operation idempotency key; the existing
-- payout is recovered by withdrawal_request_id and its append-only event stream.
-- ---------------------------------------------------------------------------
create or replace function public.initiate_investment_payout(
  p_request_id uuid,
  p_payout_rail text,
  p_provider_code text,
  p_destination_masked text,
  p_destination_fingerprint text,
  p_idempotency_key text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.investment_withdrawal_requests;
  v_existing public.investment_payouts;
  v_payout_id uuid;
  v_last_type text;
  v_available bigint;
  v_reserved_other bigint;
  v_rail text;
  v_provider text;
  v_masked text;
  v_fingerprint text;
  v_key text;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;

  v_rail:=lower(trim(p_payout_rail));
  v_provider:=upper(trim(p_provider_code));
  v_masked:=public._assert_masked_payout_destination(p_destination_masked);
  v_fingerprint:=trim(p_destination_fingerprint);
  v_key:=trim(p_idempotency_key);

  if v_rail not in ('bank_transfer','bre_b','crypto','other') then raise exception 'invalid payout rail'; end if;
  if length(v_provider)<2 then raise exception 'provider code is required'; end if;
  if length(v_fingerprint)<8 then raise exception 'destination fingerprint is required'; end if;
  if length(v_key)<8 then raise exception 'idempotency key is required'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-payout-withdrawal:'||p_request_id::text,0));

  select * into v_req from public.investment_withdrawal_requests where id=p_request_id for update;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;

  select * into v_existing from public.investment_payouts where withdrawal_request_id=p_request_id for update;
  if found then
    if v_existing.payout_rail<>v_rail
       or v_existing.provider_code<>v_provider
       or v_existing.destination_masked<>v_masked
       or v_existing.destination_fingerprint<>v_fingerprint then
      raise exception 'existing payout document has a different immutable payout payload';
    end if;

    select event_type into v_last_type from public.investment_payout_events
    where payout_id=v_existing.id order by created_at desc,id desc limit 1;

    if v_last_type='CONFIRMED' then
      if v_req.status<>'PAID' then raise exception 'confirmed payout has inconsistent withdrawal status'; end if;
      return v_existing.id;
    elsif v_last_type='PROCESSING' then
      if v_req.status<>'PAYMENT_PROCESSING' then raise exception 'processing payout has inconsistent withdrawal status'; end if;
      return v_existing.id;
    elsif v_last_type<>'FAILED' then
      raise exception 'existing payout has invalid retry state %',coalesce(v_last_type,'NONE');
    end if;

    if v_req.status<>'APPROVED' then raise exception 'failed payout cannot retry while withdrawal is %',v_req.status; end if;

    perform pg_advisory_xact_lock(hashtextextended('ctg-investment-spend:'||v_req.participant_user_id::text,0));
    v_available:=public.get_investment_available_balance(v_req.participant_user_id);
    v_reserved_other:=public._investment_reserved_spend(v_req.participant_user_id,v_req.id,null);
    if v_req.amount_cents>greatest(v_available-v_reserved_other,0) then
      raise exception 'approved withdrawal is no longer covered after other reservations';
    end if;

    insert into public.investment_payout_events(payout_id,event_type,provider_code,notes,actor_id)
    values(v_existing.id,'PROCESSING',v_existing.provider_code,'Retry: '||coalesce(nullif(trim(p_notes),''),'manual retry'),auth.uid());

    update public.investment_withdrawal_requests set status='PAYMENT_PROCESSING' where id=v_req.id;
    insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
    values(auth.uid(),'retry_investment_payout','investment_payouts',v_existing.id,
      jsonb_build_object('withdrawal_request_id',v_req.id,'amount_cents',v_req.amount_cents));
    return v_existing.id;
  end if;

  if exists(select 1 from public.investment_payouts where idempotency_key=v_key) then
    raise exception 'idempotency key already belongs to another payout';
  end if;
  if v_req.status<>'APPROVED' then raise exception 'withdrawal must be APPROVED before payout initiation'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-investment-spend:'||v_req.participant_user_id::text,0));
  v_available:=public.get_investment_available_balance(v_req.participant_user_id);
  v_reserved_other:=public._investment_reserved_spend(v_req.participant_user_id,v_req.id,null);
  if v_req.amount_cents>greatest(v_available-v_reserved_other,0) then
    raise exception 'approved withdrawal is no longer covered after other reservations';
  end if;

  insert into public.investment_payouts(
    withdrawal_request_id,participant_user_id,amount_cents,payout_rail,provider_code,
    destination_masked,destination_fingerprint,idempotency_key,notes,created_by
  ) values(
    v_req.id,v_req.participant_user_id,v_req.amount_cents,v_rail,v_provider,
    v_masked,v_fingerprint,v_key,nullif(trim(p_notes),''),auth.uid()
  ) returning id into v_payout_id;

  insert into public.investment_payout_events(payout_id,event_type,provider_code,notes,actor_id)
  values(v_payout_id,'PROCESSING',v_provider,nullif(trim(p_notes),''),auth.uid());
  update public.investment_withdrawal_requests set status='PAYMENT_PROCESSING' where id=v_req.id;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'initiate_investment_payout','investment_payouts',v_payout_id,
    jsonb_build_object('withdrawal_request_id',v_req.id,'amount_cents',v_req.amount_cents,
      'payout_rail',v_rail,'provider_code',v_provider,'destination_masked',v_masked));
  return v_payout_id;
end;
$$;
revoke all on function public.initiate_investment_payout(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.initiate_investment_payout(uuid,text,text,text,text,text,text) to authenticated;

-- Idempotent confirmation: a client retry with the same external reference returns
-- success once PAID + debit already reconcile. Lifecycle lookup uses append time.
create or replace function public.confirm_investment_payout(
  p_payout_id uuid,
  p_external_reference text,
  p_paid_at timestamptz,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.investment_payouts;
  v_req public.investment_withdrawal_requests;
  v_last_type text;
  v_reference text;
  v_confirmed_reference text;
  v_available bigint;
  v_debit bigint;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  v_reference:=trim(p_external_reference);
  if length(v_reference)<3 then raise exception 'external payout reference is required'; end if;
  if p_paid_at is null then raise exception 'paid_at is required'; end if;
  if p_paid_at > now() + interval '5 minutes' then raise exception 'paid_at cannot be materially in the future'; end if;

  select * into v_payout from public.investment_payouts where id=p_payout_id for update;
  if v_payout.id is null then raise exception 'payout not found'; end if;
  select * into v_req from public.investment_withdrawal_requests where id=v_payout.withdrawal_request_id for update;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;

  select external_reference into v_confirmed_reference
  from public.investment_payout_events
  where payout_id=v_payout.id and event_type='CONFIRMED'
  limit 1;

  if v_confirmed_reference is not null then
    select coalesce(sum(amount_cents),0) into v_debit
    from public.investment_ledger_entries
    where source_payout_id=v_payout.id and entry_type='WITHDRAWAL_DEBIT';
    if v_confirmed_reference=v_reference and v_req.status='PAID' and v_debit=-v_payout.amount_cents then return; end if;
    raise exception 'payout was already confirmed with different or unreconciled facts';
  end if;

  if v_req.status<>'PAYMENT_PROCESSING' then raise exception 'withdrawal is not processing'; end if;
  select event_type into v_last_type from public.investment_payout_events
  where payout_id=v_payout.id order by created_at desc,id desc limit 1;
  if v_last_type<>'PROCESSING' then raise exception 'payout must be PROCESSING before confirmation'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-investment-spend:'||v_payout.participant_user_id::text,0));
  v_available:=public.get_investment_available_balance(v_payout.participant_user_id);
  if v_payout.amount_cents>v_available then raise exception 'payout is no longer covered by participant ledger balance'; end if;

  insert into public.investment_payout_events(
    payout_id,event_type,provider_code,external_reference,occurred_at,notes,actor_id
  ) values(v_payout.id,'CONFIRMED',v_payout.provider_code,v_reference,p_paid_at,nullif(trim(p_notes),''),auth.uid());

  update public.investment_withdrawal_requests set status='PAID',reviewed_at=now() where id=v_req.id;
  insert into public.investment_ledger_entries(
    participant_user_id,entry_type,amount_cents,reference,metadata,actor_id,source_payout_id
  ) values(
    v_payout.participant_user_id,'WITHDRAWAL_DEBIT',-v_payout.amount_cents,
    'PAYOUT:'||v_payout.id::text,
    jsonb_build_object('withdrawal_request_id',v_req.id,'provider_code',v_payout.provider_code,'external_reference',v_reference),
    auth.uid(),v_payout.id
  );

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'confirm_investment_payout','investment_payouts',v_payout.id,
    jsonb_build_object('withdrawal_request_id',v_req.id,'amount_cents',v_payout.amount_cents,
      'external_reference',v_reference,'paid_at',p_paid_at));
end;
$$;
revoke all on function public.confirm_investment_payout(uuid,text,timestamptz,text) from public,anon;
grant execute on function public.confirm_investment_payout(uuid,text,timestamptz,text) to authenticated;

create or replace function public.fail_investment_payout(
  p_payout_id uuid,
  p_reason text,
  p_external_reference text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.investment_payouts;
  v_req public.investment_withdrawal_requests;
  v_last_type text;
  v_reason text;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  v_reason:=nullif(trim(p_reason),'');
  if v_reason is null then raise exception 'failure reason is required'; end if;

  select * into v_payout from public.investment_payouts where id=p_payout_id for update;
  if v_payout.id is null then raise exception 'payout not found'; end if;
  select * into v_req from public.investment_withdrawal_requests where id=v_payout.withdrawal_request_id for update;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;

  if exists(select 1 from public.investment_payout_events where payout_id=v_payout.id and event_type='CONFIRMED') then
    raise exception 'confirmed payout is terminal';
  end if;
  select event_type into v_last_type from public.investment_payout_events
  where payout_id=v_payout.id order by created_at desc,id desc limit 1;
  if v_last_type<>'PROCESSING' then raise exception 'only PROCESSING payout can fail'; end if;

  insert into public.investment_payout_events(payout_id,event_type,provider_code,external_reference,notes,actor_id)
  values(v_payout.id,'FAILED',v_payout.provider_code,nullif(trim(p_external_reference),''),v_reason,auth.uid());
  update public.investment_withdrawal_requests set status='APPROVED',admin_notes=v_reason where id=v_req.id;
  insert into public.investment_audit_log(actor_id,action,entity,entity_id,reason)
  values(auth.uid(),'fail_investment_payout','investment_payouts',v_payout.id,v_reason);
end;
$$;
revoke all on function public.fail_investment_payout(uuid,text,text) from public,anon;
grant execute on function public.fail_investment_payout(uuid,text,text) to authenticated;

-- Read model uses append order for current lifecycle state while preserving the
-- provider occurred_at value as business evidence.
create or replace function public.get_investment_payout_reconciliation(p_withdrawal_id uuid default null)
returns table(
  withdrawal_request_id uuid,
  participant_user_id uuid,
  withdrawal_status text,
  amount_cents bigint,
  payout_id uuid,
  payout_rail text,
  provider_code text,
  destination_masked text,
  payout_state text,
  external_reference text,
  withdrawal_debit_cents bigint,
  is_reconciled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  return query
  with latest_event as (
    select distinct on (e.payout_id)
      e.payout_id,e.event_type,e.external_reference,e.occurred_at,e.created_at,e.id
    from public.investment_payout_events e
    order by e.payout_id,e.created_at desc,e.id desc
  ), debits as (
    select source_payout_id,coalesce(sum(amount_cents),0)::bigint debit
    from public.investment_ledger_entries
    where source_payout_id is not null and entry_type='WITHDRAWAL_DEBIT'
    group by source_payout_id
  )
  select
    w.id,w.participant_user_id,w.status,w.amount_cents,
    p.id,p.payout_rail,p.provider_code,p.destination_masked,
    coalesce(le.event_type,'NOT_INITIATED'),le.external_reference,
    coalesce(d.debit,0),
    (w.status='PAID' and p.id is not null and le.event_type='CONFIRMED' and coalesce(d.debit,0)=-w.amount_cents)
  from public.investment_withdrawal_requests w
  left join public.investment_payouts p on p.withdrawal_request_id=w.id
  left join latest_event le on le.payout_id=p.id
  left join debits d on d.source_payout_id=p.id
  where (p_withdrawal_id is null or w.id=p_withdrawal_id)
    and (
      w.participant_user_id=auth.uid()
      or public.has_investment_permission('finance.read')
      or public.has_investment_permission('finance.manage')
      or public.has_investment_permission('audit.read')
    )
  order by w.created_at desc;
end;
$$;
revoke all on function public.get_investment_payout_reconciliation(uuid) from public,anon;
grant execute on function public.get_investment_payout_reconciliation(uuid) to authenticated;
