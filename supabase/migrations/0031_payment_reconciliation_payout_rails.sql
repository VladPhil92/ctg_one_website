-- CTG Craft Beer Investment OS — Payment Reconciliation & Payout Rails
--
-- Closes the monetary loop for investment funding and participant payouts.
-- User-submitted payment evidence remains a claim; only an authoritative
-- reconciled receipt may create funding/allocation ledger facts. Withdrawals
-- become PAID only after an externally-referenced payout confirmation.

-- ---------------------------------------------------------------------------
-- Safe cutover
-- ---------------------------------------------------------------------------
-- Existing monetary history would require an explicit source-document backfill.
-- Production was audited empty before this migration was authored, so fail closed
-- if money-domain rows appear before the migration is applied.
do $$
declare
  v_orders bigint;
  v_allocations bigint;
  v_ledger bigint;
  v_withdrawals bigint;
  v_settlements bigint;
begin
  select count(*) into v_orders from public.investment_orders;
  select count(*) into v_allocations from public.investment_funding_allocations;
  select count(*) into v_ledger from public.investment_ledger_entries;
  select count(*) into v_withdrawals from public.investment_withdrawal_requests;
  select count(*) into v_settlements from public.investment_settlements;

  if v_orders > 0 or v_allocations > 0 or v_ledger > 0 or v_withdrawals > 0 or v_settlements > 0 then
    raise exception
      'payment rails cutover requires explicit monetary-history backfill first (orders=%, allocations=%, ledger=%, withdrawals=%, settlements=%)',
      v_orders,v_allocations,v_ledger,v_withdrawals,v_settlements;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Participant payout destination registration (non-sensitive snapshot only)
-- ---------------------------------------------------------------------------
alter table public.investment_participant_profiles
  add column payout_destination_fingerprint text;

comment on column public.investment_participant_profiles.bank_account_masked is
  'Human-readable masked payout destination only. Never stores full account credentials.';
comment on column public.investment_participant_profiles.payout_destination_fingerprint is
  'Non-secret stable fingerprint/token reference for payout destination matching. Never stores raw account credentials.';

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

  v_masked := nullif(trim(p_destination_masked),'');
  v_fingerprint := nullif(trim(p_destination_fingerprint),'');

  if v_masked is null or length(v_masked) < 4 then
    raise exception 'masked payout destination is required';
  end if;
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

-- ---------------------------------------------------------------------------
-- Inbound authoritative cash receipts
-- ---------------------------------------------------------------------------
create table public.investment_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.investment_orders(id) on delete restrict,
  participant_user_id uuid not null references auth.users(id) on delete restrict,
  payment_rail text not null check (payment_rail in ('bank_transfer','pse','bre_b_qr','crypto')),
  provider_code text not null check (length(trim(provider_code)) >= 2),
  external_reference text not null check (length(trim(external_reference)) >= 3),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'COP' check (currency = 'COP'),
  settled_at timestamptz not null,
  idempotency_key text not null unique check (length(trim(idempotency_key)) >= 8),
  notes text,
  reconciled_by uuid not null references auth.users(id),
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint investment_payment_receipts_provider_reference_unique
    unique(provider_code,external_reference)
);

create index investment_payment_receipts_participant_idx
  on public.investment_payment_receipts(participant_user_id,created_at desc);
create index investment_payment_receipts_reconciled_by_idx
  on public.investment_payment_receipts(reconciled_by);

alter table public.investment_payment_receipts enable row level security;

create policy investment_payment_receipts_read_authorized
  on public.investment_payment_receipts for select to authenticated
  using (
    participant_user_id = auth.uid()
    or public.has_investment_permission('finance.read')
    or public.has_investment_permission('funding.manage')
    or public.has_investment_permission('audit.read')
  );

revoke all on public.investment_payment_receipts from anon;
revoke insert,update,delete,truncate,references,trigger
  on public.investment_payment_receipts from authenticated;
grant select on public.investment_payment_receipts to authenticated;

-- ---------------------------------------------------------------------------
-- Outbound payout document + append-only provider events
-- ---------------------------------------------------------------------------
create table public.investment_payouts (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null unique
    references public.investment_withdrawal_requests(id) on delete restrict,
  participant_user_id uuid not null references auth.users(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'COP' check (currency = 'COP'),
  payout_rail text not null check (payout_rail in ('bank_transfer','bre_b','crypto','other')),
  provider_code text not null check (length(trim(provider_code)) >= 2),
  destination_masked text not null check (length(trim(destination_masked)) >= 4),
  destination_fingerprint text not null check (length(trim(destination_fingerprint)) >= 8),
  idempotency_key text not null unique check (length(trim(idempotency_key)) >= 8),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index investment_payouts_participant_idx
  on public.investment_payouts(participant_user_id,created_at desc);
create index investment_payouts_created_by_idx
  on public.investment_payouts(created_by);

create table public.investment_payout_events (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.investment_payouts(id) on delete restrict,
  event_type text not null check (event_type in ('PROCESSING','CONFIRMED','FAILED')),
  provider_code text not null check (length(trim(provider_code)) >= 2),
  external_reference text,
  occurred_at timestamptz not null default now(),
  notes text,
  metadata jsonb,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint investment_payout_events_confirmed_reference_required
    check (event_type <> 'CONFIRMED' or nullif(trim(external_reference),'') is not null)
);

create index investment_payout_events_payout_idx
  on public.investment_payout_events(payout_id,occurred_at,id);
create index investment_payout_events_actor_idx
  on public.investment_payout_events(actor_id);
create unique index investment_payout_events_one_confirmation
  on public.investment_payout_events(payout_id)
  where event_type='CONFIRMED';
create unique index investment_payout_events_provider_reference_unique
  on public.investment_payout_events(provider_code,external_reference)
  where event_type='CONFIRMED' and external_reference is not null;

alter table public.investment_payouts enable row level security;
alter table public.investment_payout_events enable row level security;

create policy investment_payouts_read_authorized
  on public.investment_payouts for select to authenticated
  using (
    participant_user_id = auth.uid()
    or public.has_investment_permission('finance.read')
    or public.has_investment_permission('finance.manage')
    or public.has_investment_permission('audit.read')
  );

create policy investment_payout_events_read_authorized
  on public.investment_payout_events for select to authenticated
  using (
    exists (
      select 1 from public.investment_payouts p
      where p.id=investment_payout_events.payout_id
        and (
          p.participant_user_id=auth.uid()
          or public.has_investment_permission('finance.read')
          or public.has_investment_permission('finance.manage')
          or public.has_investment_permission('audit.read')
        )
    )
  );

revoke all on public.investment_payouts from anon;
revoke all on public.investment_payout_events from anon;
revoke insert,update,delete,truncate,references,trigger on public.investment_payouts from authenticated;
revoke insert,update,delete,truncate,references,trigger on public.investment_payout_events from authenticated;
grant select on public.investment_payouts to authenticated;
grant select on public.investment_payout_events to authenticated;

-- ---------------------------------------------------------------------------
-- Append-only / source-document guards
-- ---------------------------------------------------------------------------
create or replace function public._reject_money_rail_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'payment receipt / payout history is append-only';
end;
$$;
revoke all on function public._reject_money_rail_history_mutation() from public,anon,authenticated;

create trigger investment_payment_receipts_immutable
before update or delete on public.investment_payment_receipts
for each row execute function public._reject_money_rail_history_mutation();

create trigger investment_payouts_immutable
before update or delete on public.investment_payouts
for each row execute function public._reject_money_rail_history_mutation();

create trigger investment_payout_events_immutable
before update or delete on public.investment_payout_events
for each row execute function public._reject_money_rail_history_mutation();

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

  select * into v_order from public.investment_orders where id=new.order_id;
  if v_order.id is null then raise exception 'investment order not found'; end if;
  if v_order.status <> 'PAYMENT_SUBMITTED' then
    raise exception 'authoritative receipt requires PAYMENT_SUBMITTED order';
  end if;
  if v_order.allocation_id is not null then raise exception 'order is already allocated'; end if;
  if new.participant_user_id <> v_order.participant_user_id then
    raise exception 'receipt participant does not match order';
  end if;
  if new.amount_cents <> v_order.capital_required_cents then
    raise exception 'receipt must equal exact order capital requirement';
  end if;
  if new.payment_rail <> v_order.payment_method then
    raise exception 'reconciled rail must match participant payment claim';
  end if;
  if new.reconciled_by <> auth.uid() then raise exception 'reconciled_by must be current actor'; end if;

  return new;
end;
$$;
revoke all on function public.guard_investment_payment_receipt() from public,anon,authenticated;

create trigger investment_payment_receipts_guard
before insert on public.investment_payment_receipts
for each row execute function public.guard_investment_payment_receipt();

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
  if not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required';
  end if;

  select * into v_req from public.investment_withdrawal_requests
  where id=new.withdrawal_request_id;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;
  if v_req.status <> 'APPROVED' then raise exception 'payout requires APPROVED withdrawal'; end if;
  if new.participant_user_id <> v_req.participant_user_id then
    raise exception 'payout participant does not match withdrawal';
  end if;
  if new.amount_cents <> v_req.amount_cents then
    raise exception 'payout amount must equal approved withdrawal';
  end if;

  select bank_account_masked,payout_destination_fingerprint
    into v_masked,v_fingerprint
  from public.investment_participant_profiles
  where user_id=v_req.participant_user_id;

  if nullif(trim(v_masked),'') is null or nullif(trim(v_fingerprint),'') is null then
    raise exception 'participant payout destination is not registered';
  end if;
  if new.destination_masked <> v_masked
     or new.destination_fingerprint <> v_fingerprint then
    raise exception 'payout destination does not match registered participant destination';
  end if;
  if new.created_by <> auth.uid() then raise exception 'created_by must be current actor'; end if;

  return new;
end;
$$;
revoke all on function public.guard_investment_payout() from public,anon,authenticated;

create trigger investment_payouts_guard
before insert on public.investment_payouts
for each row execute function public.guard_investment_payout();

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
  if not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required';
  end if;

  select * into v_payout from public.investment_payouts where id=new.payout_id;
  if v_payout.id is null then raise exception 'payout not found'; end if;
  if new.provider_code <> v_payout.provider_code then
    raise exception 'payout event provider must match payout document';
  end if;
  if new.actor_id <> auth.uid() then raise exception 'actor_id must be current actor'; end if;

  select event_type into v_last_type
  from public.investment_payout_events
  where payout_id=new.payout_id
  order by occurred_at desc,id desc
  limit 1;

  if v_last_type is null and new.event_type <> 'PROCESSING' then
    raise exception 'first payout event must be PROCESSING';
  elsif v_last_type='PROCESSING' and new.event_type not in ('CONFIRMED','FAILED') then
    raise exception 'PROCESSING payout may only become CONFIRMED or FAILED';
  elsif v_last_type='FAILED' and new.event_type <> 'PROCESSING' then
    raise exception 'FAILED payout may only retry as PROCESSING';
  elsif v_last_type='CONFIRMED' then
    raise exception 'confirmed payout is terminal';
  end if;

  return new;
end;
$$;
revoke all on function public.guard_investment_payout_event() from public,anon,authenticated;

create trigger investment_payout_events_guard
before insert on public.investment_payout_events
for each row execute function public.guard_investment_payout_event();

-- ---------------------------------------------------------------------------
-- Ledger genealogy for inbound receipts and outbound payouts
-- ---------------------------------------------------------------------------
alter table public.investment_ledger_entries
  add column source_payment_receipt_id uuid
    references public.investment_payment_receipts(id) on delete restrict,
  add column source_payout_id uuid
    references public.investment_payouts(id) on delete restrict;

create index investment_ledger_entries_source_payment_receipt_idx
  on public.investment_ledger_entries(source_payment_receipt_id);
create index investment_ledger_entries_source_payout_idx
  on public.investment_ledger_entries(source_payout_id);

create unique index investment_ledger_entries_receipt_type_unique
  on public.investment_ledger_entries(source_payment_receipt_id,entry_type)
  where source_payment_receipt_id is not null
    and entry_type in ('FUNDING_RECEIVED','CAPITAL_COMMITTED');

create unique index investment_ledger_entries_payout_debit_unique
  on public.investment_ledger_entries(source_payout_id)
  where source_payout_id is not null and entry_type='WITHDRAWAL_DEBIT';

create or replace function public.guard_investment_money_rail_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.investment_payment_receipts;
  v_order public.investment_orders;
  v_payout public.investment_payouts;
begin
  if new.entry_type in ('FUNDING_RECEIVED','CAPITAL_COMMITTED') then
    if new.source_payment_receipt_id is null or new.source_payout_id is not null then
      raise exception '% requires authoritative payment receipt source',new.entry_type;
    end if;

    select * into v_receipt from public.investment_payment_receipts
    where id=new.source_payment_receipt_id;
    if v_receipt.id is null then raise exception 'payment receipt source not found'; end if;

    select * into v_order from public.investment_orders where id=v_receipt.order_id;
    if v_order.id is null then raise exception 'receipt order not found'; end if;

    if new.participant_user_id <> v_receipt.participant_user_id
       or new.lot_id <> v_order.lot_id
       or new.amount_cents <> v_receipt.amount_cents then
      raise exception 'funding ledger fact does not match authoritative receipt/order';
    end if;

  elsif new.entry_type='WITHDRAWAL_DEBIT' then
    if new.source_payout_id is null or new.source_payment_receipt_id is not null then
      raise exception 'WITHDRAWAL_DEBIT requires authoritative payout source';
    end if;

    select * into v_payout from public.investment_payouts where id=new.source_payout_id;
    if v_payout.id is null then raise exception 'payout source not found'; end if;
    if not exists (
      select 1 from public.investment_payout_events
      where payout_id=v_payout.id and event_type='CONFIRMED'
    ) then
      raise exception 'WITHDRAWAL_DEBIT requires confirmed payout';
    end if;
    if new.participant_user_id <> v_payout.participant_user_id
       or new.amount_cents <> -v_payout.amount_cents then
      raise exception 'withdrawal ledger debit does not match authoritative payout';
    end if;

  elsif new.source_payment_receipt_id is not null or new.source_payout_id is not null then
    raise exception 'only funding and withdrawal ledger facts may reference money-rail documents';
  end if;

  return new;
end;
$$;
revoke all on function public.guard_investment_money_rail_ledger() from public,anon,authenticated;

create trigger investment_money_rail_ledger_guard
before insert on public.investment_ledger_entries
for each row execute function public.guard_investment_money_rail_ledger();

-- ---------------------------------------------------------------------------
-- Authoritative inbound reconciliation
-- ---------------------------------------------------------------------------
create or replace function public.reconcile_investment_order_payment(
  p_order_id uuid,
  p_payment_rail text,
  p_provider_code text,
  p_external_reference text,
  p_amount_cents bigint,
  p_settled_at timestamptz,
  p_idempotency_key text,
  p_notes text default null
)
returns table(
  receipt_id uuid,
  allocation_id uuid,
  order_id uuid,
  amount_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_existing public.investment_payment_receipts;
  v_kyc text;
  v_receipt_id uuid;
  v_allocation_id uuid;
  v_rail text;
  v_provider text;
  v_reference text;
  v_key text;
begin
  if not (
    public.has_investment_permission('funding.manage')
    or public.has_investment_permission('finance.manage')
  ) then
    raise exception 'funding.manage or finance.manage required';
  end if;

  v_rail := lower(trim(p_payment_rail));
  v_provider := upper(trim(p_provider_code));
  v_reference := trim(p_external_reference);
  v_key := trim(p_idempotency_key);

  if v_rail not in ('bank_transfer','pse','bre_b_qr','crypto') then raise exception 'invalid payment rail'; end if;
  if length(v_provider)<2 then raise exception 'provider code is required'; end if;
  if length(v_reference)<3 then raise exception 'external reference is required'; end if;
  if p_amount_cents is null or p_amount_cents<=0 then raise exception 'receipt amount must be positive'; end if;
  if p_settled_at is null then raise exception 'settled_at is required'; end if;
  if length(v_key)<8 then raise exception 'idempotency key is required'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-payment-receipt:'||v_key,0));

  select * into v_existing from public.investment_payment_receipts
  where idempotency_key=v_key;
  if found then
    if v_existing.order_id<>p_order_id
       or v_existing.payment_rail<>v_rail
       or v_existing.provider_code<>v_provider
       or v_existing.external_reference<>v_reference
       or v_existing.amount_cents<>p_amount_cents
       or v_existing.settled_at<>p_settled_at then
      raise exception 'idempotency key already used with different receipt payload';
    end if;

    select o.allocation_id into v_allocation_id
    from public.investment_orders o where o.id=v_existing.order_id;

    receipt_id:=v_existing.id;
    allocation_id:=v_allocation_id;
    order_id:=v_existing.order_id;
    amount_cents:=v_existing.amount_cents;
    return next;
    return;
  end if;

  select * into v_order from public.investment_orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'investment order not found'; end if;
  if v_order.status<>'PAYMENT_SUBMITTED' then raise exception 'order is not awaiting authoritative payment reconciliation'; end if;
  if v_order.allocation_id is not null then raise exception 'order is already allocated'; end if;
  if v_order.payment_method is distinct from v_rail then raise exception 'reconciled rail differs from participant payment claim'; end if;
  if v_order.capital_required_cents<>p_amount_cents then raise exception 'receipt amount must equal exact order capital requirement'; end if;

  select kyc_status into v_kyc from public.investment_participant_profiles
  where user_id=v_order.participant_user_id;
  if v_kyc is distinct from 'VERIFIED' then raise exception 'participant investment KYC is no longer verified'; end if;

  insert into public.investment_payment_receipts(
    order_id,participant_user_id,payment_rail,provider_code,external_reference,
    amount_cents,settled_at,idempotency_key,notes,reconciled_by
  ) values (
    v_order.id,v_order.participant_user_id,v_rail,v_provider,v_reference,
    p_amount_cents,p_settled_at,v_key,nullif(trim(p_notes),''),auth.uid()
  ) returning id into v_receipt_id;

  v_allocation_id := public._investment_create_allocation_checked(
    v_order.lot_id,v_order.participant_user_id,false,
    v_order.case_equivalent_units,v_order.capital_required_cents,v_order.id
  );

  insert into public.investment_ledger_entries(
    participant_user_id,lot_id,allocation_id,entry_type,amount_cents,
    reference,metadata,actor_id,source_payment_receipt_id
  ) values
    (
      v_order.participant_user_id,v_order.lot_id,v_allocation_id,
      'FUNDING_RECEIVED',v_order.capital_required_cents,
      'RECEIPT:'||v_receipt_id::text,
      jsonb_build_object('order_id',v_order.id,'provider_code',v_provider,'external_reference',v_reference),
      auth.uid(),v_receipt_id
    ),
    (
      v_order.participant_user_id,v_order.lot_id,v_allocation_id,
      'CAPITAL_COMMITTED',v_order.capital_required_cents,
      'RECEIPT:'||v_receipt_id::text,
      jsonb_build_object('order_id',v_order.id),auth.uid(),v_receipt_id
    );

  update public.investment_orders
  set status='ALLOCATED',allocation_id=v_allocation_id,payment_verified_at=now(),
      reviewed_by=auth.uid(),admin_notes=nullif(trim(p_notes),''),updated_at=now()
  where id=v_order.id;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'reconcile_investment_order_payment','investment_payment_receipts',v_receipt_id,
    jsonb_build_object(
      'order_id',v_order.id,'allocation_id',v_allocation_id,'amount_cents',p_amount_cents,
      'payment_rail',v_rail,'provider_code',v_provider,'external_reference',v_reference
    )
  );

  receipt_id:=v_receipt_id;
  allocation_id:=v_allocation_id;
  order_id:=v_order.id;
  amount_cents:=p_amount_cents;
  return next;
end;
$$;

revoke all on function public.reconcile_investment_order_payment(uuid,text,text,text,bigint,timestamptz,text,text)
  from public,anon;
grant execute on function public.reconcile_investment_order_payment(uuid,text,text,text,bigint,timestamptz,text,text)
  to authenticated;

-- Legacy paths are intentionally fail-closed. Evidence review alone is no longer
-- sufficient to produce funding facts.
create or replace function public.approve_investment_order(
  p_order_id uuid,
  p_admin_notes text default null
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'legacy manual payment approval disabled; use reconcile_investment_order_payment()';
end;
$$;
revoke all on function public.approve_investment_order(uuid,text) from public,anon;
grant execute on function public.approve_investment_order(uuid,text) to authenticated;

create or replace function public.create_funding_allocation(
  p_lot_id uuid,
  p_case_equivalent_units integer,
  p_capital_committed_cents bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'direct participant funding allocation disabled; use investment order + reconciled payment receipt';
end;
$$;
revoke all on function public.create_funding_allocation(uuid,integer,bigint) from public,anon;
grant execute on function public.create_funding_allocation(uuid,integer,bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Withdrawal request hardening: a payout destination must exist first
-- ---------------------------------------------------------------------------
create or replace function public.request_withdrawal(p_amount_cents bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spendable bigint;
  v_request_id uuid;
  v_masked text;
  v_fingerprint text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_amount_cents is null or p_amount_cents<=0 then raise exception 'withdrawal amount must be positive'; end if;

  select bank_account_masked,payout_destination_fingerprint into v_masked,v_fingerprint
  from public.investment_participant_profiles where user_id=auth.uid();
  if nullif(trim(v_masked),'') is null or nullif(trim(v_fingerprint),'') is null then
    raise exception 'register a payout destination before requesting withdrawal';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-investment-spend:'||auth.uid()::text,0));
  v_spendable:=public.get_investment_spendable_balance(auth.uid());
  if p_amount_cents>v_spendable then
    raise exception 'amount exceeds spendable balance: % requested, % spendable',p_amount_cents,v_spendable;
  end if;

  insert into public.investment_withdrawal_requests(participant_user_id,amount_cents)
  values(auth.uid(),p_amount_cents) returning id into v_request_id;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'request_withdrawal','investment_withdrawal_requests',v_request_id,
    jsonb_build_object('amount_cents',p_amount_cents,'destination_masked',v_masked,'destination_fingerprint',v_fingerprint));

  return v_request_id;
end;
$$;
revoke all on function public.request_withdrawal(bigint) from public,anon;
grant execute on function public.request_withdrawal(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Authoritative outbound payout lifecycle
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
  v_masked:=trim(p_destination_masked);
  v_fingerprint:=trim(p_destination_fingerprint);
  v_key:=trim(p_idempotency_key);

  if v_rail not in ('bank_transfer','bre_b','crypto','other') then raise exception 'invalid payout rail'; end if;
  if length(v_provider)<2 then raise exception 'provider code is required'; end if;
  if length(v_masked)<4 then raise exception 'masked payout destination is required'; end if;
  if length(v_fingerprint)<8 then raise exception 'destination fingerprint is required'; end if;
  if length(v_key)<8 then raise exception 'idempotency key is required'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-payout:'||v_key,0));

  select * into v_existing from public.investment_payouts where idempotency_key=v_key;
  if found then
    if v_existing.withdrawal_request_id<>p_request_id
       or v_existing.payout_rail<>v_rail
       or v_existing.provider_code<>v_provider
       or v_existing.destination_masked<>v_masked
       or v_existing.destination_fingerprint<>v_fingerprint then
      raise exception 'idempotency key already used with different payout payload';
    end if;

    select event_type into v_last_type from public.investment_payout_events
    where payout_id=v_existing.id order by occurred_at desc,id desc limit 1;

    if v_last_type='FAILED' then
      select * into v_req from public.investment_withdrawal_requests
      where id=v_existing.withdrawal_request_id for update;
      if v_req.status<>'APPROVED' then raise exception 'failed payout cannot retry while withdrawal is %',v_req.status; end if;

      insert into public.investment_payout_events(
        payout_id,event_type,provider_code,notes,actor_id
      ) values(v_existing.id,'PROCESSING',v_provider,'Retry: '||coalesce(nullif(trim(p_notes),''),'manual retry'),auth.uid());

      update public.investment_withdrawal_requests set status='PAYMENT_PROCESSING'
      where id=v_req.id;
    end if;

    return v_existing.id;
  end if;

  select * into v_req from public.investment_withdrawal_requests
  where id=p_request_id for update;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;
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

  insert into public.investment_payout_events(
    payout_id,event_type,provider_code,notes,actor_id
  ) values(v_payout_id,'PROCESSING',v_provider,nullif(trim(p_notes),''),auth.uid());

  update public.investment_withdrawal_requests set status='PAYMENT_PROCESSING'
  where id=v_req.id;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'initiate_investment_payout','investment_payouts',v_payout_id,
    jsonb_build_object('withdrawal_request_id',v_req.id,'amount_cents',v_req.amount_cents,
      'payout_rail',v_rail,'provider_code',v_provider,'destination_masked',v_masked));

  return v_payout_id;
end;
$$;
revoke all on function public.initiate_investment_payout(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.initiate_investment_payout(uuid,text,text,text,text,text,text) to authenticated;

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
  v_available bigint;
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  v_reference:=trim(p_external_reference);
  if length(v_reference)<3 then raise exception 'external payout reference is required'; end if;
  if p_paid_at is null then raise exception 'paid_at is required'; end if;

  select * into v_payout from public.investment_payouts where id=p_payout_id for update;
  if v_payout.id is null then raise exception 'payout not found'; end if;

  select * into v_req from public.investment_withdrawal_requests
  where id=v_payout.withdrawal_request_id for update;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;
  if v_req.status<>'PAYMENT_PROCESSING' then raise exception 'withdrawal is not processing'; end if;

  select event_type into v_last_type from public.investment_payout_events
  where payout_id=v_payout.id order by occurred_at desc,id desc limit 1;
  if v_last_type<>'PROCESSING' then raise exception 'payout must be PROCESSING before confirmation'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-investment-spend:'||v_payout.participant_user_id::text,0));
  v_available:=public.get_investment_available_balance(v_payout.participant_user_id);
  if v_payout.amount_cents>v_available then
    raise exception 'payout is no longer covered by participant ledger balance';
  end if;

  insert into public.investment_payout_events(
    payout_id,event_type,provider_code,external_reference,occurred_at,notes,actor_id
  ) values(
    v_payout.id,'CONFIRMED',v_payout.provider_code,v_reference,p_paid_at,
    nullif(trim(p_notes),''),auth.uid()
  );

  update public.investment_withdrawal_requests
  set status='PAID',reviewed_at=now()
  where id=v_req.id;

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
  select * into v_req from public.investment_withdrawal_requests
  where id=v_payout.withdrawal_request_id for update;
  if v_req.id is null then raise exception 'withdrawal request not found'; end if;

  select event_type into v_last_type from public.investment_payout_events
  where payout_id=v_payout.id order by occurred_at desc,id desc limit 1;
  if v_last_type<>'PROCESSING' then raise exception 'only PROCESSING payout can fail'; end if;

  insert into public.investment_payout_events(
    payout_id,event_type,provider_code,external_reference,notes,actor_id
  ) values(
    v_payout.id,'FAILED',v_payout.provider_code,nullif(trim(p_external_reference),''),v_reason,auth.uid()
  );

  update public.investment_withdrawal_requests set status='APPROVED',admin_notes=v_reason
  where id=v_req.id;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,reason)
  values(auth.uid(),'fail_investment_payout','investment_payouts',v_payout.id,v_reason);
end;
$$;
revoke all on function public.fail_investment_payout(uuid,text,text) from public,anon;
grant execute on function public.fail_investment_payout(uuid,text,text) to authenticated;

create or replace function public.mark_withdrawal_paid(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'legacy mark_withdrawal_paid disabled; use initiate_investment_payout() + confirm_investment_payout()';
end;
$$;
revoke all on function public.mark_withdrawal_paid(uuid) from public,anon;
grant execute on function public.mark_withdrawal_paid(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reconciliation read models
-- ---------------------------------------------------------------------------
create or replace function public.get_investment_inbound_reconciliation(p_order_id uuid default null)
returns table(
  order_id uuid,
  participant_user_id uuid,
  order_status text,
  capital_required_cents bigint,
  receipt_id uuid,
  receipt_amount_cents bigint,
  provider_code text,
  external_reference text,
  allocation_id uuid,
  funding_received_cents bigint,
  capital_committed_cents bigint,
  rail_state text,
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
  with ledger as (
    select
      le.source_payment_receipt_id,
      coalesce(sum(le.amount_cents) filter(where le.entry_type='FUNDING_RECEIVED'),0)::bigint funding_received,
      coalesce(sum(le.amount_cents) filter(where le.entry_type='CAPITAL_COMMITTED'),0)::bigint capital_committed
    from public.investment_ledger_entries le
    where le.source_payment_receipt_id is not null
    group by le.source_payment_receipt_id
  )
  select
    o.id,o.participant_user_id,o.status,o.capital_required_cents,
    r.id,r.amount_cents,r.provider_code,r.external_reference,o.allocation_id,
    coalesce(l.funding_received,0),coalesce(l.capital_committed,0),
    case
      when o.status='ALLOCATED' and r.id is not null
       and r.amount_cents=o.capital_required_cents
       and o.allocation_id is not null
       and coalesce(l.funding_received,0)=o.capital_required_cents
       and coalesce(l.capital_committed,0)=o.capital_required_cents then 'RECONCILED'
      when r.id is null and o.status in ('AWAITING_PAYMENT','PAYMENT_SUBMITTED','REJECTED','CANCELLED','EXPIRED') then 'AWAITING_RECEIPT'
      else 'MISMATCH'
    end,
    (
      o.status='ALLOCATED' and r.id is not null
      and r.amount_cents=o.capital_required_cents
      and o.allocation_id is not null
      and coalesce(l.funding_received,0)=o.capital_required_cents
      and coalesce(l.capital_committed,0)=o.capital_required_cents
    )
  from public.investment_orders o
  left join public.investment_payment_receipts r on r.order_id=o.id
  left join ledger l on l.source_payment_receipt_id=r.id
  where (p_order_id is null or o.id=p_order_id)
    and (
      o.participant_user_id=auth.uid()
      or public.has_investment_permission('finance.read')
      or public.has_investment_permission('funding.manage')
      or public.has_investment_permission('audit.read')
    )
  order by o.created_at desc;
end;
$$;
revoke all on function public.get_investment_inbound_reconciliation(uuid) from public,anon;
grant execute on function public.get_investment_inbound_reconciliation(uuid) to authenticated;

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
      e.payout_id,e.event_type,e.external_reference,e.occurred_at,e.id
    from public.investment_payout_events e
    order by e.payout_id,e.occurred_at desc,e.id desc
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
    (
      w.status='PAID'
      and p.id is not null
      and le.event_type='CONFIRMED'
      and coalesce(d.debit,0)=-w.amount_cents
    )
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

create or replace function public.get_investment_money_rail_health()
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
  ) then
    raise exception 'finance.read or audit.read required';
  end if;

  select jsonb_build_object(
    'allocated_orders_without_receipt',(
      select count(*) from public.investment_orders o
      where o.status='ALLOCATED' and not exists(
        select 1 from public.investment_payment_receipts r where r.order_id=o.id
      )
    ),
    'receipt_funding_ledger_mismatches',(
      select count(*) from public.investment_payment_receipts r
      where (
        select coalesce(sum(le.amount_cents),0) from public.investment_ledger_entries le
        where le.source_payment_receipt_id=r.id and le.entry_type='FUNDING_RECEIVED'
      )<>r.amount_cents
      or (
        select coalesce(sum(le.amount_cents),0) from public.investment_ledger_entries le
        where le.source_payment_receipt_id=r.id and le.entry_type='CAPITAL_COMMITTED'
      )<>r.amount_cents
    ),
    'paid_withdrawals_without_confirmed_payout',(
      select count(*) from public.investment_withdrawal_requests w
      where w.status='PAID' and not exists(
        select 1 from public.investment_payouts p
        join public.investment_payout_events e on e.payout_id=p.id and e.event_type='CONFIRMED'
        where p.withdrawal_request_id=w.id
      )
    ),
    'confirmed_payout_ledger_mismatches',(
      select count(*) from public.investment_payouts p
      where exists(select 1 from public.investment_payout_events e where e.payout_id=p.id and e.event_type='CONFIRMED')
        and (
          select coalesce(sum(le.amount_cents),0) from public.investment_ledger_entries le
          where le.source_payout_id=p.id and le.entry_type='WITHDRAWAL_DEBIT'
        )<>-p.amount_cents
    )
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.get_investment_money_rail_health() from public,anon;
grant execute on function public.get_investment_money_rail_health() to authenticated;

comment on table public.investment_payment_receipts is
  'Immutable authoritative inbound cash receipt. Participant-uploaded order payment evidence is a claim, not a reconciled receipt.';
comment on table public.investment_payouts is
  'Immutable outbound payout instruction/document linked one-to-one to an approved withdrawal request.';
comment on table public.investment_payout_events is
  'Append-only payout provider lifecycle. CONFIRMED is terminal and is required before WITHDRAWAL_DEBIT/PAID.';
comment on column public.investment_ledger_entries.source_payment_receipt_id is
  'Authoritative inbound receipt genealogy for FUNDING_RECEIVED/CAPITAL_COMMITTED.';
comment on column public.investment_ledger_entries.source_payout_id is
  'Authoritative outbound payout genealogy for WITHDRAWAL_DEBIT.';
