-- CTG Craft Beer Investment OS — Provider Integration & Automated Reconciliation
--
-- Provider-neutral financial event ingestion. External bank/provider payloads are
-- normalized before reaching Postgres; raw statements/credentials are never stored.
-- Only deterministic identity matches may automatically mutate authoritative rails.

-- ---------------------------------------------------------------------------
-- Immutable normalized provider event store
-- ---------------------------------------------------------------------------
create table public.investment_financial_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null check (length(trim(provider_code)) >= 2),
  provider_event_key text not null check (length(trim(provider_event_key)) >= 3),
  direction text not null check (direction in ('INBOUND','OUTBOUND')),
  event_type text not null check (event_type in ('SETTLED','CONFIRMED','FAILED')),
  payment_rail text not null check (payment_rail in ('bank_transfer','pse','bre_b_qr','bre_b','crypto','other')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'COP' check (currency = 'COP'),
  external_reference text,
  merchant_reference text,
  occurred_at timestamptz not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  source text not null default 'ADMIN_IMPORT' check (source = 'ADMIN_IMPORT'),
  ingested_by uuid not null references auth.users(id) on delete restrict,
  ingested_at timestamptz not null default now(),
  constraint investment_financial_provider_events_identity_unique
    unique(provider_code,provider_event_key),
  constraint investment_financial_provider_events_direction_type_check
    check (
      (direction='INBOUND' and event_type='SETTLED')
      or (direction='OUTBOUND' and event_type in ('CONFIRMED','FAILED'))
    ),
  constraint investment_financial_provider_events_direction_rail_check
    check (
      (direction='INBOUND' and payment_rail in ('bank_transfer','pse','bre_b_qr','crypto'))
      or (direction='OUTBOUND' and payment_rail in ('bank_transfer','bre_b','crypto','other'))
    ),
  constraint investment_financial_provider_events_reference_check
    check (
      (direction='INBOUND' and nullif(trim(external_reference),'') is not null)
      or (direction='OUTBOUND' and event_type='CONFIRMED' and nullif(trim(external_reference),'') is not null)
      or (direction='OUTBOUND' and event_type='FAILED')
    )
);

create index investment_financial_provider_events_ingested_idx
  on public.investment_financial_provider_events(ingested_at desc);
create index investment_financial_provider_events_unresolved_scan_idx
  on public.investment_financial_provider_events(direction,event_type,occurred_at,id);

comment on table public.investment_financial_provider_events is
  'Immutable normalized external financial event. Raw provider payloads and bank credentials are intentionally not stored; payload_sha256 preserves import identity.';

-- ---------------------------------------------------------------------------
-- Append-only matching/reconciliation decisions
-- ---------------------------------------------------------------------------
create table public.investment_financial_event_matches (
  id uuid primary key default gen_random_uuid(),
  provider_event_id uuid not null references public.investment_financial_provider_events(id) on delete restrict,
  match_method text not null check (match_method in (
    'AUTO_EXACT_REFERENCE','AUTO_MERCHANT_REFERENCE','MANUAL','SYSTEM_NO_MATCH','SYSTEM_CONFLICT','IGNORED'
  )),
  target_type text not null check (target_type in ('ORDER','PAYOUT','NONE')),
  order_id uuid references public.investment_orders(id) on delete restrict,
  payout_id uuid references public.investment_payouts(id) on delete restrict,
  receipt_id uuid references public.investment_payment_receipts(id) on delete restrict,
  outcome text not null check (outcome in ('RECONCILED','CONFIRMED','FAILED','NO_MATCH','CONFLICT','IGNORED')),
  notes text,
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint investment_financial_event_matches_target_check check (
    (target_type='ORDER' and order_id is not null and payout_id is null)
    or (target_type='PAYOUT' and payout_id is not null and order_id is null)
    or (target_type='NONE' and order_id is null and payout_id is null and receipt_id is null)
  ),
  constraint investment_financial_event_matches_outcome_check check (
    (outcome='RECONCILED' and target_type='ORDER' and receipt_id is not null)
    or (outcome in ('CONFIRMED','FAILED') and target_type='PAYOUT' and receipt_id is null)
    or (outcome in ('NO_MATCH','CONFLICT','IGNORED') and target_type='NONE')
  )
);

create index investment_financial_event_matches_event_idx
  on public.investment_financial_event_matches(provider_event_id,created_at desc,id desc);
create index investment_financial_event_matches_order_idx
  on public.investment_financial_event_matches(order_id)
  where order_id is not null;
create index investment_financial_event_matches_payout_idx
  on public.investment_financial_event_matches(payout_id)
  where payout_id is not null;
create unique index investment_financial_event_matches_terminal_unique
  on public.investment_financial_event_matches(provider_event_id)
  where outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED');

comment on table public.investment_financial_event_matches is
  'Append-only decision genealogy linking normalized provider events to authoritative investment receipts or payouts.';

-- ---------------------------------------------------------------------------
-- RLS / client privileges
-- ---------------------------------------------------------------------------
alter table public.investment_financial_provider_events enable row level security;
alter table public.investment_financial_event_matches enable row level security;

create policy investment_financial_provider_events_read_finance
  on public.investment_financial_provider_events for select to authenticated
  using (
    (select public.has_investment_permission('finance.read'))
    or (select public.has_investment_permission('finance.manage'))
    or (select public.has_investment_permission('audit.read'))
  );

create policy investment_financial_event_matches_read_finance
  on public.investment_financial_event_matches for select to authenticated
  using (
    (select public.has_investment_permission('finance.read'))
    or (select public.has_investment_permission('finance.manage'))
    or (select public.has_investment_permission('audit.read'))
  );

revoke all on public.investment_financial_provider_events from anon;
revoke all on public.investment_financial_event_matches from anon;
revoke insert,update,delete,truncate,references,trigger on public.investment_financial_provider_events from authenticated;
revoke insert,update,delete,truncate,references,trigger on public.investment_financial_event_matches from authenticated;
grant select on public.investment_financial_provider_events to authenticated;
grant select on public.investment_financial_event_matches to authenticated;

-- ---------------------------------------------------------------------------
-- Append-only protection
-- ---------------------------------------------------------------------------
create or replace function public._reject_provider_reconciliation_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'provider financial event and reconciliation history is append-only';
end;
$$;
revoke all on function public._reject_provider_reconciliation_history_mutation() from public,anon,authenticated;

create trigger investment_financial_provider_events_immutable
before update or delete on public.investment_financial_provider_events
for each row execute function public._reject_provider_reconciliation_history_mutation();

create trigger investment_financial_event_matches_immutable
before update or delete on public.investment_financial_event_matches
for each row execute function public._reject_provider_reconciliation_history_mutation();

-- ---------------------------------------------------------------------------
-- Idempotent normalized event ingestion
-- ---------------------------------------------------------------------------
create or replace function public.ingest_investment_financial_event(
  p_provider_code text,
  p_provider_event_key text,
  p_direction text,
  p_event_type text,
  p_payment_rail text,
  p_amount_cents bigint,
  p_external_reference text,
  p_merchant_reference text,
  p_occurred_at timestamptz,
  p_payload_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := upper(trim(p_provider_code));
  v_event_key text := trim(p_provider_event_key);
  v_direction text := upper(trim(p_direction));
  v_event_type text := upper(trim(p_event_type));
  v_rail text := lower(trim(p_payment_rail));
  v_external_reference text := nullif(trim(p_external_reference),'');
  v_merchant_reference text := nullif(trim(p_merchant_reference),'');
  v_hash text := lower(trim(p_payload_sha256));
  v_existing public.investment_financial_provider_events;
  v_id uuid;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(v_provider)<2 then raise exception 'provider code is required'; end if;
  if length(v_event_key)<3 then raise exception 'provider event key is required'; end if;
  if v_direction not in ('INBOUND','OUTBOUND') then raise exception 'invalid event direction'; end if;
  if v_event_type not in ('SETTLED','CONFIRMED','FAILED') then raise exception 'invalid event type'; end if;
  if p_amount_cents is null or p_amount_cents<=0 then raise exception 'event amount must be positive'; end if;
  if p_occurred_at is null then raise exception 'occurred_at is required'; end if;
  if p_occurred_at > now() + interval '5 minutes' then raise exception 'provider event timestamp cannot be materially in the future'; end if;
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception 'payload_sha256 must be a lowercase SHA-256 hex digest'; end if;

  if v_direction='INBOUND' then
    if v_event_type<>'SETTLED' then raise exception 'inbound provider event must be SETTLED'; end if;
    if v_rail not in ('bank_transfer','pse','bre_b_qr','crypto') then raise exception 'invalid inbound payment rail'; end if;
    if v_external_reference is null then raise exception 'inbound external reference is required'; end if;
  else
    if v_event_type not in ('CONFIRMED','FAILED') then raise exception 'outbound provider event must be CONFIRMED or FAILED'; end if;
    if v_rail not in ('bank_transfer','bre_b','crypto','other') then raise exception 'invalid outbound payout rail'; end if;
    if v_event_type='CONFIRMED' and v_external_reference is null then raise exception 'confirmed payout external reference is required'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-provider-event:'||v_provider||':'||v_event_key,0));
  select * into v_existing
  from public.investment_financial_provider_events
  where provider_code=v_provider and provider_event_key=v_event_key;

  if found then
    if v_existing.direction<>v_direction
       or v_existing.event_type<>v_event_type
       or v_existing.payment_rail<>v_rail
       or v_existing.amount_cents<>p_amount_cents
       or v_existing.external_reference is distinct from v_external_reference
       or v_existing.merchant_reference is distinct from v_merchant_reference
       or v_existing.occurred_at<>p_occurred_at
       or v_existing.payload_sha256<>v_hash then
      raise exception 'provider event identity already exists with different normalized payload';
    end if;
    return v_existing.id;
  end if;

  insert into public.investment_financial_provider_events(
    provider_code,provider_event_key,direction,event_type,payment_rail,amount_cents,
    external_reference,merchant_reference,occurred_at,payload_sha256,ingested_by
  ) values (
    v_provider,v_event_key,v_direction,v_event_type,v_rail,p_amount_cents,
    v_external_reference,v_merchant_reference,p_occurred_at,v_hash,auth.uid()
  ) returning id into v_id;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'ingest_investment_financial_event','investment_financial_provider_events',v_id,
    jsonb_build_object('provider_code',v_provider,'provider_event_key',v_event_key,'direction',v_direction,
      'event_type',v_event_type,'payment_rail',v_rail,'amount_cents',p_amount_cents,
      'external_reference',v_external_reference,'merchant_reference',v_merchant_reference));

  return v_id;
end;
$$;
revoke all on function public.ingest_investment_financial_event(text,text,text,text,text,bigint,text,text,timestamptz,text) from public,anon;
grant execute on function public.ingest_investment_financial_event(text,text,text,text,text,bigint,text,text,timestamptz,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Deterministic auto-matching
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
      if not exists(select 1 from public.investment_financial_event_matches where provider_event_id=v_event.id and outcome='NO_MATCH') then
        insert into public.investment_financial_event_matches(provider_event_id,match_method,target_type,outcome,actor_id,notes)
        values(v_event.id,'SYSTEM_NO_MATCH','NONE','NO_MATCH',auth.uid(),'No exact order reference candidate');
      end if;
      v_outcome:='NO_MATCH';
    else
      if not exists(select 1 from public.investment_financial_event_matches where provider_event_id=v_event.id and outcome='CONFLICT') then
        insert into public.investment_financial_event_matches(provider_event_id,match_method,target_type,outcome,actor_id,notes)
        values(v_event.id,'SYSTEM_CONFLICT','NONE','CONFLICT',auth.uid(),'Multiple exact order reference candidates');
      end if;
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
      if not exists(select 1 from public.investment_financial_event_matches where provider_event_id=v_event.id and outcome='NO_MATCH') then
        insert into public.investment_financial_event_matches(provider_event_id,match_method,target_type,outcome,actor_id,notes)
        values(v_event.id,'SYSTEM_NO_MATCH','NONE','NO_MATCH',auth.uid(),'No exact processing payout merchant-reference candidate');
      end if;
      v_outcome:='NO_MATCH';
    else
      if not exists(select 1 from public.investment_financial_event_matches where provider_event_id=v_event.id and outcome='CONFLICT') then
        insert into public.investment_financial_event_matches(provider_event_id,match_method,target_type,outcome,actor_id,notes)
        values(v_event.id,'SYSTEM_CONFLICT','NONE','CONFLICT',auth.uid(),'Multiple exact payout merchant-reference candidates');
      end if;
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
-- Manual resolution for unmatched/conflicted events
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Batch auto-processing for imported pending events
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
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'limit must be between 1 and 500'; end if;

  for v_event in
    select e.id
    from public.investment_financial_provider_events e
    where not exists (
      select 1 from public.investment_financial_event_matches m
      where m.provider_event_id=e.id and m.outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED')
    )
    order by e.occurred_at,e.id
    limit p_limit
  loop
    v_result:=public.auto_match_investment_financial_event(v_event.id);
    v_processed:=v_processed+1;
    case v_result->>'outcome'
      when 'RECONCILED' then v_reconciled:=v_reconciled+1;
      when 'CONFIRMED' then v_confirmed:=v_confirmed+1;
      when 'FAILED' then v_failed:=v_failed+1;
      when 'CONFLICT' then v_conflicts:=v_conflicts+1;
      else v_unmatched:=v_unmatched+1;
    end case;
  end loop;

  return jsonb_build_object('processed',v_processed,'reconciled',v_reconciled,'confirmed',v_confirmed,
    'failed',v_failed,'unmatched',v_unmatched,'conflicts',v_conflicts);
end;
$$;
revoke all on function public.auto_match_pending_investment_financial_events(integer) from public,anon;
grant execute on function public.auto_match_pending_investment_financial_events(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Finance reconciliation inbox + health
-- ---------------------------------------------------------------------------
create or replace function public.get_investment_financial_reconciliation_inbox(p_limit integer default 100)
returns table(
  event_id uuid,
  provider_code text,
  provider_event_key text,
  direction text,
  event_type text,
  payment_rail text,
  amount_cents bigint,
  external_reference text,
  merchant_reference text,
  occurred_at timestamptz,
  ingested_at timestamptz,
  match_outcome text,
  match_method text,
  target_type text,
  order_id uuid,
  payout_id uuid,
  receipt_id uuid,
  match_notes text,
  match_created_at timestamptz,
  is_terminal boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.has_investment_permission('finance.read')
    or public.has_investment_permission('finance.manage')
    or public.has_investment_permission('audit.read')
  ) then raise exception 'finance.read, finance.manage or audit.read required'; end if;
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'limit must be between 1 and 500'; end if;

  return query
  select e.id,e.provider_code,e.provider_event_key,e.direction,e.event_type,e.payment_rail,e.amount_cents,
    e.external_reference,e.merchant_reference,e.occurred_at,e.ingested_at,
    lm.outcome,lm.match_method,lm.target_type,lm.order_id,lm.payout_id,lm.receipt_id,lm.notes,lm.created_at,
    coalesce(lm.outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED'),false)
  from public.investment_financial_provider_events e
  left join lateral (
    select m.* from public.investment_financial_event_matches m
    where m.provider_event_id=e.id order by m.created_at desc,m.id desc limit 1
  ) lm on true
  order by (coalesce(lm.outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED'),false)) asc,
    e.occurred_at desc,e.id desc
  limit p_limit;
end;
$$;
revoke all on function public.get_investment_financial_reconciliation_inbox(integer) from public,anon;
grant execute on function public.get_investment_financial_reconciliation_inbox(integer) to authenticated;

create or replace function public.get_investment_provider_reconciliation_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (
    public.has_investment_permission('finance.read')
    or public.has_investment_permission('audit.read')
  ) then raise exception 'finance.read or audit.read required'; end if;

  with latest as (
    select distinct on (m.provider_event_id) m.provider_event_id,m.outcome,m.payout_id,m.receipt_id
    from public.investment_financial_event_matches m
    order by m.provider_event_id,m.created_at desc,m.id desc
  )
  select jsonb_build_object(
    'total_events',(select count(*) from public.investment_financial_provider_events),
    'unresolved_events',(
      select count(*) from public.investment_financial_provider_events e
      where not exists(select 1 from public.investment_financial_event_matches m where m.provider_event_id=e.id and m.outcome in ('RECONCILED','CONFIRMED','FAILED','IGNORED'))
    ),
    'latest_no_match',(select count(*) from latest where outcome='NO_MATCH'),
    'latest_conflict',(select count(*) from latest where outcome='CONFLICT'),
    'reconciled_receipt_mismatches',(
      select count(*) from latest l where l.outcome='RECONCILED'
        and (l.receipt_id is null or not exists(select 1 from public.investment_payment_receipts r where r.id=l.receipt_id))
    ),
    'confirmed_payout_mismatches',(
      select count(*) from latest l where l.outcome='CONFIRMED'
        and (l.payout_id is null or not exists(select 1 from public.investment_payout_events pe where pe.payout_id=l.payout_id and pe.event_type='CONFIRMED'))
    ),
    'failed_payout_mismatches',(
      select count(*) from latest l where l.outcome='FAILED'
        and (l.payout_id is null or not exists(select 1 from public.investment_payout_events pe where pe.payout_id=l.payout_id and pe.event_type='FAILED'))
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_investment_provider_reconciliation_health() from public,anon;
grant execute on function public.get_investment_provider_reconciliation_health() to authenticated;
