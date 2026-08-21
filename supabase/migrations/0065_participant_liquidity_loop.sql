-- CTG Craft Beer Investment — participant liquidity loop
--
-- Closes the participant-side settlement -> reinvestment loop without weakening
-- the existing ledger, KYC, funding-capacity or payout controls.
--
-- Invariants:
--   1. a new reinvestment request is expressed in cases, never in a caller-priced amount;
--   2. PostgreSQL derives capital from the target lot's frozen production + label + transport snapshot;
--   3. REQUESTED reinvestments reserve both participant spendable balance and target-lot capacity;
--   4. checkout orders, allocations and reinvestments share one target-capacity boundary;
--   5. an approver cannot change the case quantity chosen by a participant;
--   6. historical amount-only requests remain recoverable, but browser sessions can no longer create them.

alter table public.investment_reinvestment_requests
  add column if not exists case_equivalent_units integer,
  add column if not exists client_idempotency_key text,
  add column if not exists review_notes text;

alter table public.investment_reinvestment_requests
  drop constraint if exists investment_reinvestment_requests_case_quantity_check;
alter table public.investment_reinvestment_requests
  add constraint investment_reinvestment_requests_case_quantity_check
  check (case_equivalent_units is null or case_equivalent_units >= 2) not valid;
alter table public.investment_reinvestment_requests
  validate constraint investment_reinvestment_requests_case_quantity_check;

alter table public.investment_reinvestment_requests
  drop constraint if exists investment_reinvestment_requests_idempotency_key_format;
alter table public.investment_reinvestment_requests
  add constraint investment_reinvestment_requests_idempotency_key_format
  check (
    client_idempotency_key is null
    or (
      length(client_idempotency_key) between 16 and 128
      and client_idempotency_key ~ '^[A-Za-z0-9._:-]+$'
    )
  ) not valid;
alter table public.investment_reinvestment_requests
  validate constraint investment_reinvestment_requests_idempotency_key_format;

alter table public.investment_reinvestment_requests
  drop constraint if exists investment_reinvestment_requests_review_notes_length;
alter table public.investment_reinvestment_requests
  add constraint investment_reinvestment_requests_review_notes_length
  check (review_notes is null or length(review_notes) <= 500) not valid;
alter table public.investment_reinvestment_requests
  validate constraint investment_reinvestment_requests_review_notes_length;

create unique index if not exists investment_reinvestment_requests_participant_idempotency_uidx
  on public.investment_reinvestment_requests(participant_user_id, client_idempotency_key)
  where client_idempotency_key is not null;

create index if not exists investment_reinvestment_requests_target_status_idx
  on public.investment_reinvestment_requests(target_lot_id, status);

-- Best-effort migration of legacy REQUESTED rows. Only infer quantity when the
-- historical amount is an exact multiple of the target lot's current frozen
-- capital-per-case snapshot. Ambiguous rows deliberately stay NULL and block new
-- capacity commitments on their target lot until an operator reviews them.
with priced as (
  select
    r.id,
    (
      (l.production_cost_unit_cents + l.label_cost_unit_cents + l.transport_cost_unit_cents)
      * l.case_size_units
    )::bigint as capital_per_case
  from public.investment_reinvestment_requests r
  join public.investment_production_lots l on l.id = r.target_lot_id
  where r.status = 'REQUESTED'
    and r.case_equivalent_units is null
    and l.transport_cost_unit_cents is not null
)
update public.investment_reinvestment_requests r
set case_equivalent_units = (r.amount_cents / p.capital_per_case)::integer
from priced p
where r.id = p.id
  and p.capital_per_case > 0
  and r.amount_cents % p.capital_per_case = 0
  and r.amount_cents / p.capital_per_case >= 2;

-- Internal helper: REQUESTED reinvestments reserve fundable case capacity.
create or replace function public._investment_reserved_reinvestment_cases(p_lot_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(case_equivalent_units), 0)::integer
  from public.investment_reinvestment_requests
  where target_lot_id = p_lot_id
    and status = 'REQUESTED'
    and case_equivalent_units is not null;
$$;

revoke all on function public._investment_reserved_reinvestment_cases(uuid)
  from public, anon, authenticated;

-- The canonical allocation guard now respects pending reinvestment reservations.
create or replace function public._investment_create_allocation_checked(
  p_lot_id uuid,
  p_participant uuid,
  p_is_ctg_internal boolean,
  p_case_equivalent_units integer,
  p_capital_committed_cents bigint,
  p_exclude_order_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lot public.investment_production_lots;
  v_allocated integer;
  v_reserved integer;
  v_reinvestment_reserved integer;
  v_formula_version_id uuid;
  v_formula_count integer;
  v_allocation_id uuid;
  v_expected_capital bigint;
begin
  if p_is_ctg_internal is true then
    if p_participant is not null then raise exception 'CTG internal allocation must not have a participant user'; end if;
  else
    if p_participant is null then raise exception 'participant is required for external allocation'; end if;
  end if;

  if p_case_equivalent_units is null or p_case_equivalent_units <= 0 then raise exception 'case quantity must be positive'; end if;
  if p_capital_committed_cents is null or p_capital_committed_cents <= 0 then raise exception 'capital committed must be positive'; end if;

  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status <> 'FUNDING_OPEN' then raise exception 'lot is not open for funding (status: %)', v_lot.status; end if;
  if v_lot.transport_cost_unit_cents is null then raise exception 'lot transport cost is not configured'; end if;

  if exists (
    select 1
    from public.investment_reinvestment_requests
    where target_lot_id = p_lot_id
      and status = 'REQUESTED'
      and case_equivalent_units is null
  ) then
    raise exception 'target lot has an unresolved legacy reinvestment reservation';
  end if;

  v_expected_capital := (
    v_lot.production_cost_unit_cents + v_lot.label_cost_unit_cents + v_lot.transport_cost_unit_cents
  ) * v_lot.case_size_units * p_case_equivalent_units;
  if v_expected_capital <= 0 then raise exception 'lot capital requirement is not configured'; end if;
  if p_capital_committed_cents <> v_expected_capital then
    raise exception 'capital committed does not match lot snapshot: % expected, % supplied',
      v_expected_capital, p_capital_committed_cents;
  end if;

  select coalesce(sum(case_equivalent_units), 0)::integer into v_allocated
  from public.investment_funding_allocations where lot_id = p_lot_id;

  select coalesce(sum(case_equivalent_units), 0)::integer into v_reserved
  from public.investment_orders
  where lot_id = p_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
    and allocation_id is null
    and (p_exclude_order_id is null or id <> p_exclude_order_id);

  v_reinvestment_reserved := public._investment_reserved_reinvestment_cases(p_lot_id);

  if v_allocated + v_reserved + v_reinvestment_reserved + p_case_equivalent_units > v_lot.total_eligible_units then
    raise exception 'allocation would consume reserved capacity: % allocated, % order-reserved, % reinvestment-reserved, % requested, % fundable',
      v_allocated, v_reserved, v_reinvestment_reserved, p_case_equivalent_units, v_lot.total_eligible_units;
  end if;

  select count(distinct formula_version_id)::integer, min(formula_version_id::text)::uuid
    into v_formula_count, v_formula_version_id
  from public.investment_funding_allocations where lot_id = p_lot_id;

  if v_formula_count > 1 then raise exception 'lot has mixed formula versions and cannot accept more allocations'; end if;
  if v_formula_count = 0 then
    select id into v_formula_version_id from public.investment_formula_versions where status = 'ACTIVE';
  end if;
  if v_formula_version_id is null then raise exception 'no active formula version configured'; end if;

  insert into public.investment_funding_allocations(
    lot_id, participant_user_id, is_ctg_internal, case_equivalent_units, capital_committed_cents, formula_version_id
  ) values (
    p_lot_id, p_participant, p_is_ctg_internal, p_case_equivalent_units, p_capital_committed_cents, v_formula_version_id
  ) returning id into v_allocation_id;

  return v_allocation_id;
end;
$$;

revoke all on function public._investment_create_allocation_checked(uuid,uuid,boolean,integer,bigint,uuid)
  from public, anon, authenticated;

-- Idempotent checkout must see reinvestment reservations as consumed capacity.
create or replace function public.create_investment_order(
  p_lot_id uuid,
  p_case_equivalent_units integer,
  p_idempotency_key text
)
returns public.investment_orders
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lot public.investment_production_lots;
  v_kyc text;
  v_allocated int;
  v_reserved int;
  v_reinvestment_reserved int;
  v_capital_per_case bigint;
  v_order public.investment_orders;
  v_key text := trim(coalesce(p_idempotency_key, ''));
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_case_equivalent_units is null or p_case_equivalent_units < 2 then
    raise exception 'minimum investment is 2 cases';
  end if;
  if length(v_key) < 16 or length(v_key) > 128 or v_key !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'invalid idempotency key';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('investment-order:' || auth.uid()::text || ':' || v_key, 0)
  );

  select * into v_order
  from public.investment_orders
  where participant_user_id = auth.uid()
    and client_idempotency_key = v_key;

  if v_order.id is not null then
    if v_order.lot_id <> p_lot_id
       or v_order.case_equivalent_units <> p_case_equivalent_units then
      raise exception 'idempotency key already used with different order payload';
    end if;
    return v_order;
  end if;

  select kyc_status into v_kyc
  from public.investment_participant_profiles where user_id = auth.uid();
  if v_kyc is distinct from 'VERIFIED' then raise exception 'investment KYC not verified'; end if;

  select * into v_lot
  from public.investment_production_lots
  where id = p_lot_id
  for update;
  if v_lot.id is null then raise exception 'lot not found'; end if;
  if v_lot.status <> 'FUNDING_OPEN' then raise exception 'lot is not open for funding'; end if;
  if v_lot.transport_cost_unit_cents is null then raise exception 'lot transport cost is not configured'; end if;

  if exists (
    select 1
    from public.investment_reinvestment_requests
    where target_lot_id = p_lot_id
      and status = 'REQUESTED'
      and case_equivalent_units is null
  ) then
    raise exception 'target lot has an unresolved legacy reinvestment reservation';
  end if;

  select coalesce(sum(case_equivalent_units), 0) into v_allocated
  from public.investment_funding_allocations
  where lot_id = p_lot_id;

  select coalesce(sum(case_equivalent_units), 0) into v_reserved
  from public.investment_orders
  where lot_id = p_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED');

  v_reinvestment_reserved := public._investment_reserved_reinvestment_cases(p_lot_id);

  if v_allocated + v_reserved + v_reinvestment_reserved + p_case_equivalent_units > v_lot.total_eligible_units then
    raise exception 'requested quantity exceeds available fundable capacity';
  end if;

  v_capital_per_case := (
    v_lot.production_cost_unit_cents
    + v_lot.label_cost_unit_cents
    + v_lot.transport_cost_unit_cents
  ) * v_lot.case_size_units;
  if v_capital_per_case <= 0 then raise exception 'lot capital requirement is not configured'; end if;

  insert into public.investment_orders(
    participant_user_id,
    lot_id,
    case_equivalent_units,
    capital_required_cents,
    client_idempotency_key
  ) values (
    auth.uid(),
    p_lot_id,
    p_case_equivalent_units,
    v_capital_per_case * p_case_equivalent_units,
    v_key
  )
  returning * into v_order;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values(
    auth.uid(),
    'create_investment_order',
    'investment_orders',
    v_order.id,
    jsonb_build_object(
      'lot_id', p_lot_id,
      'cases', p_case_equivalent_units,
      'capital_required_cents', v_order.capital_required_cents,
      'idempotency_key', v_key
    )
  );

  return v_order;
end;
$$;

revoke all on function public.create_investment_order(uuid, integer, text) from public;
revoke execute on function public.create_investment_order(uuid, integer, text) from anon;
grant execute on function public.create_investment_order(uuid, integer, text) to authenticated;

-- New participant command. Amount is derived only after locking the target lot.
create or replace function public.request_reinvestment_cases(
  p_source_settlement_id uuid,
  p_target_lot_id uuid,
  p_case_equivalent_units integer,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kyc text;
  v_lot public.investment_production_lots;
  v_source_credit bigint;
  v_source_reserved bigint;
  v_spendable bigint;
  v_allocated integer;
  v_order_reserved integer;
  v_reinvestment_reserved integer;
  v_capital_per_case bigint;
  v_amount bigint;
  v_request public.investment_reinvestment_requests;
  v_key text := trim(coalesce(p_idempotency_key, ''));
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_case_equivalent_units is null or p_case_equivalent_units < 2 then
    raise exception 'minimum reinvestment is 2 cases';
  end if;
  if length(v_key) < 16 or length(v_key) > 128 or v_key !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'invalid idempotency key';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('investment-reinvestment:' || auth.uid()::text || ':' || v_key, 0)
  );

  select * into v_request
  from public.investment_reinvestment_requests
  where participant_user_id = auth.uid()
    and client_idempotency_key = v_key;

  if v_request.id is not null then
    if v_request.source_settlement_id <> p_source_settlement_id
       or v_request.target_lot_id <> p_target_lot_id
       or v_request.case_equivalent_units is distinct from p_case_equivalent_units then
      raise exception 'idempotency key already used with different reinvestment payload';
    end if;
    return v_request.id;
  end if;

  select kyc_status into v_kyc
  from public.investment_participant_profiles
  where user_id = auth.uid();
  if v_kyc is distinct from 'VERIFIED' then raise exception 'investment KYC not verified'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-investment-spend:' || auth.uid()::text, 0)
  );

  select * into v_lot
  from public.investment_production_lots
  where id = p_target_lot_id
  for update;
  if v_lot.id is null then raise exception 'target lot not found'; end if;
  if v_lot.status <> 'FUNDING_OPEN' then raise exception 'target lot is not open for funding'; end if;
  if v_lot.transport_cost_unit_cents is null then raise exception 'target lot transport cost is not configured'; end if;

  if exists (
    select 1
    from public.investment_reinvestment_requests
    where target_lot_id = p_target_lot_id
      and status = 'REQUESTED'
      and case_equivalent_units is null
  ) then
    raise exception 'target lot has an unresolved legacy reinvestment reservation';
  end if;

  v_capital_per_case := (
    v_lot.production_cost_unit_cents
    + v_lot.label_cost_unit_cents
    + v_lot.transport_cost_unit_cents
  ) * v_lot.case_size_units;
  if v_capital_per_case <= 0 then raise exception 'target lot capital requirement is not configured'; end if;
  v_amount := v_capital_per_case * p_case_equivalent_units;

  select coalesce(sum(amount_cents), 0)
    into v_source_credit
  from public.investment_ledger_entries
  where participant_user_id = auth.uid()
    and entry_type = 'SETTLEMENT_CREDIT'
    and reference = p_source_settlement_id::text;

  if v_source_credit <= 0 then
    raise exception 'source settlement does not contain an eligible participant credit';
  end if;

  select coalesce(sum(amount_cents), 0)
    into v_source_reserved
  from public.investment_reinvestment_requests
  where participant_user_id = auth.uid()
    and source_settlement_id = p_source_settlement_id
    and status in ('REQUESTED','APPROVED');

  if v_amount > greatest(v_source_credit - v_source_reserved, 0) then
    raise exception 'reinvestment exceeds remaining credit attributable to source settlement';
  end if;

  v_spendable := public.get_investment_spendable_balance(auth.uid());
  if v_amount > v_spendable then
    raise exception 'amount exceeds spendable balance: % required, % spendable', v_amount, v_spendable;
  end if;

  select coalesce(sum(case_equivalent_units), 0)::integer into v_allocated
  from public.investment_funding_allocations
  where lot_id = p_target_lot_id;

  select coalesce(sum(case_equivalent_units), 0)::integer into v_order_reserved
  from public.investment_orders
  where lot_id = p_target_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
    and allocation_id is null;

  v_reinvestment_reserved := public._investment_reserved_reinvestment_cases(p_target_lot_id);

  if v_allocated + v_order_reserved + v_reinvestment_reserved + p_case_equivalent_units > v_lot.total_eligible_units then
    raise exception 'requested reinvestment exceeds available fundable capacity';
  end if;

  insert into public.investment_reinvestment_requests(
    participant_user_id,
    source_settlement_id,
    target_lot_id,
    amount_cents,
    case_equivalent_units,
    client_idempotency_key
  ) values (
    auth.uid(),
    p_source_settlement_id,
    p_target_lot_id,
    v_amount,
    p_case_equivalent_units,
    v_key
  ) returning * into v_request;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values (
    auth.uid(),
    'request_reinvestment_cases',
    'investment_reinvestment_requests',
    v_request.id,
    jsonb_build_object(
      'source_settlement_id', p_source_settlement_id,
      'target_lot_id', p_target_lot_id,
      'case_equivalent_units', p_case_equivalent_units,
      'capital_per_case_cents', v_capital_per_case,
      'amount_cents', v_amount,
      'idempotency_key', v_key
    )
  );

  return v_request.id;
end;
$$;

revoke all on function public.request_reinvestment_cases(uuid,uuid,integer,text) from public;
revoke execute on function public.request_reinvestment_cases(uuid,uuid,integer,text) from anon;
grant execute on function public.request_reinvestment_cases(uuid,uuid,integer,text) to authenticated;

-- Browser sessions must no longer create amount-only requests.
revoke execute on function public.request_reinvestment(uuid,uuid,bigint) from public, anon, authenticated;

-- Backward-compatible admin approval for historical rows. For new rows the case
-- count is immutable: the supplied value must equal the participant's stored intent.
create or replace function public.approve_reinvestment(
  p_request_id uuid,
  p_case_equivalent_units integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.investment_reinvestment_requests;
  v_available bigint;
  v_reserved_other bigint;
  v_source_credit bigint;
  v_source_used_other bigint;
  v_allocation_id uuid;
  v_kyc text;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;
  if p_case_equivalent_units is null or p_case_equivalent_units < 2 then
    raise exception 'minimum reinvestment is 2 cases';
  end if;

  select * into v_req
  from public.investment_reinvestment_requests
  where id = p_request_id
  for update;
  if v_req is null then raise exception 'request not found'; end if;
  if v_req.status <> 'REQUESTED' then raise exception 'request already %', v_req.status; end if;
  if v_req.case_equivalent_units is not null
     and v_req.case_equivalent_units <> p_case_equivalent_units then
    raise exception 'participant reinvestment case quantity is immutable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-investment-spend:' || v_req.participant_user_id::text, 0)
  );

  select kyc_status into v_kyc
  from public.investment_participant_profiles
  where user_id = v_req.participant_user_id;
  if v_kyc is distinct from 'VERIFIED' then
    raise exception 'participant investment KYC is no longer verified';
  end if;

  select coalesce(sum(amount_cents), 0)
    into v_source_credit
  from public.investment_ledger_entries
  where participant_user_id = v_req.participant_user_id
    and entry_type = 'SETTLEMENT_CREDIT'
    and reference = v_req.source_settlement_id::text;

  select coalesce(sum(amount_cents), 0)
    into v_source_used_other
  from public.investment_reinvestment_requests
  where participant_user_id = v_req.participant_user_id
    and source_settlement_id = v_req.source_settlement_id
    and id <> v_req.id
    and status in ('REQUESTED','APPROVED');

  if v_req.amount_cents > greatest(v_source_credit - v_source_used_other, 0) then
    raise exception 'reinvestment is no longer covered by its source settlement credit';
  end if;

  v_available := public.get_investment_available_balance(v_req.participant_user_id);
  v_reserved_other := public._investment_reserved_spend(
    v_req.participant_user_id, null, v_req.id
  );
  if v_req.amount_cents > greatest(v_available - v_reserved_other, 0) then
    raise exception 'reinvestment is no longer covered after other reservations';
  end if;

  -- Mark APPROVED inside the transaction before allocation so this request is no
  -- longer counted as a pending case reservation by the shared allocation guard.
  update public.investment_reinvestment_requests
  set case_equivalent_units = p_case_equivalent_units,
      status = 'APPROVED',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = coalesce(review_notes, 'Approved')
  where id = p_request_id;

  v_allocation_id := public._investment_create_allocation_checked(
    v_req.target_lot_id,
    v_req.participant_user_id,
    false,
    p_case_equivalent_units,
    v_req.amount_cents,
    null
  );

  insert into public.investment_ledger_entries(
    participant_user_id, lot_id, allocation_id, entry_type,
    amount_cents, reference, metadata, actor_id
  ) values (
    v_req.participant_user_id,
    v_req.target_lot_id,
    v_allocation_id,
    'REINVESTMENT_DEBIT',
    -v_req.amount_cents,
    p_request_id::text,
    jsonb_build_object(
      'source_settlement_id', v_req.source_settlement_id,
      'case_equivalent_units', p_case_equivalent_units
    ),
    auth.uid()
  );

  insert into public.investment_audit_log(
    actor_id, action, entity, entity_id, new_value
  ) values (
    auth.uid(), 'approve_reinvestment', 'investment_reinvestment_requests', p_request_id,
    jsonb_build_object(
      'target_lot_id', v_req.target_lot_id,
      'case_equivalent_units', p_case_equivalent_units,
      'amount_cents', v_req.amount_cents,
      'source_settlement_id', v_req.source_settlement_id,
      'allocation_id', v_allocation_id
    )
  );

  return v_allocation_id;
end;
$$;

revoke all on function public.approve_reinvestment(uuid,integer) from public, anon;
grant execute on function public.approve_reinvestment(uuid,integer) to authenticated;

create or replace function public.approve_reinvestment_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cases integer;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  select case_equivalent_units into v_cases
  from public.investment_reinvestment_requests
  where id = p_request_id;

  if v_cases is null then
    raise exception 'legacy reinvestment request has no fixed case quantity and requires explicit legacy review';
  end if;

  return public.approve_reinvestment(p_request_id, v_cases);
end;
$$;

revoke all on function public.approve_reinvestment_request(uuid) from public;
revoke execute on function public.approve_reinvestment_request(uuid) from anon;
grant execute on function public.approve_reinvestment_request(uuid) to authenticated;

create or replace function public.cancel_reinvestment_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.investment_reinvestment_requests;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_req
  from public.investment_reinvestment_requests
  where id = p_request_id
  for update;

  if v_req is null then raise exception 'request not found'; end if;
  if v_req.participant_user_id <> auth.uid() then raise exception 'not authorized'; end if;
  if v_req.status <> 'REQUESTED' then raise exception 'only REQUESTED reinvestments can be cancelled'; end if;

  update public.investment_reinvestment_requests
  set status = 'CANCELLED',
      reviewed_at = now(),
      review_notes = 'Cancelled by participant'
  where id = p_request_id;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id)
  values (auth.uid(), 'cancel_reinvestment_request', 'investment_reinvestment_requests', p_request_id);
end;
$$;

revoke all on function public.cancel_reinvestment_request(uuid) from public;
revoke execute on function public.cancel_reinvestment_request(uuid) from anon;
grant execute on function public.cancel_reinvestment_request(uuid) to authenticated;

create or replace function public.reject_reinvestment_request(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.investment_reinvestment_requests;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;
  if length(v_reason) < 3 or length(v_reason) > 500 then raise exception 'rejection reason must be 3 to 500 characters'; end if;

  select * into v_req
  from public.investment_reinvestment_requests
  where id = p_request_id
  for update;
  if v_req is null then raise exception 'request not found'; end if;
  if v_req.status <> 'REQUESTED' then raise exception 'only REQUESTED reinvestments can be rejected'; end if;

  update public.investment_reinvestment_requests
  set status = 'REJECTED',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = v_reason
  where id = p_request_id;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, reason)
  values (auth.uid(), 'reject_reinvestment_request', 'investment_reinvestment_requests', p_request_id, v_reason);
end;
$$;

revoke all on function public.reject_reinvestment_request(uuid,text) from public;
revoke execute on function public.reject_reinvestment_request(uuid,text) from anon;
grant execute on function public.reject_reinvestment_request(uuid,text) to authenticated;

-- Authenticated participant read model. It exposes only the current user's
-- settlement-credit sources and reinvestment requests plus aggregate target-lot
-- capacity. No other participant identity or payment evidence is returned.
create or replace function public.get_participant_reinvestment_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_spendable bigint;
  v_sources jsonb;
  v_targets jsonb;
  v_requests jsonb;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  v_spendable := public.get_investment_spendable_balance(v_user);

  with credits as (
    select
      s.id as settlement_id,
      s.lot_id,
      l.code as lot_code,
      l.beer_style,
      coalesce(sum(le.amount_cents), 0)::bigint as credited_amount_cents
    from public.investment_settlements s
    join public.investment_production_lots l on l.id = s.lot_id
    join public.investment_ledger_entries le
      on le.participant_user_id = v_user
     and le.entry_type = 'SETTLEMENT_CREDIT'
     and le.reference = s.id::text
    group by s.id, s.lot_id, l.code, l.beer_style
  ), used as (
    select
      source_settlement_id,
      coalesce(sum(amount_cents), 0)::bigint as used_amount_cents
    from public.investment_reinvestment_requests
    where participant_user_id = v_user
      and status in ('REQUESTED','APPROVED')
    group by source_settlement_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'settlementId', c.settlement_id,
      'sourceLotId', c.lot_id,
      'sourceLotCode', c.lot_code,
      'beerStyle', c.beer_style,
      'creditedAmountCents', c.credited_amount_cents,
      'usedOrReservedAmountCents', coalesce(u.used_amount_cents, 0),
      'remainingCreditCents', greatest(c.credited_amount_cents - coalesce(u.used_amount_cents, 0), 0)
    ) order by c.lot_code, c.settlement_id
  ), '[]'::jsonb)
  into v_sources
  from credits c
  left join used u on u.source_settlement_id = c.settlement_id
  where c.credited_amount_cents > 0;

  with allocation_totals as (
    select lot_id, coalesce(sum(case_equivalent_units), 0)::integer as allocated_cases
    from public.investment_funding_allocations
    group by lot_id
  ), order_totals as (
    select lot_id, coalesce(sum(case_equivalent_units), 0)::integer as order_reserved_cases
    from public.investment_orders
    where status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
      and allocation_id is null
    group by lot_id
  ), reinvestment_totals as (
    select
      target_lot_id as lot_id,
      coalesce(sum(case_equivalent_units) filter (where case_equivalent_units is not null), 0)::integer as reinvestment_reserved_cases,
      count(*) filter (where case_equivalent_units is null)::integer as unresolved_legacy_requests
    from public.investment_reinvestment_requests
    where status = 'REQUESTED'
    group by target_lot_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'lotId', l.id,
      'lotCode', l.code,
      'beerStyle', l.beer_style,
      'caseSizeUnits', l.case_size_units,
      'capitalPerCaseCents',
        (l.production_cost_unit_cents + l.label_cost_unit_cents + l.transport_cost_unit_cents) * l.case_size_units,
      'totalEligibleCases', l.total_eligible_units,
      'allocatedCases', coalesce(a.allocated_cases, 0),
      'orderReservedCases', coalesce(o.order_reserved_cases, 0),
      'reinvestmentReservedCases', coalesce(r.reinvestment_reserved_cases, 0),
      'availableFundableCases',
        case
          when coalesce(r.unresolved_legacy_requests, 0) > 0 then 0
          else greatest(
            l.total_eligible_units
            - coalesce(a.allocated_cases, 0)
            - coalesce(o.order_reserved_cases, 0)
            - coalesce(r.reinvestment_reserved_cases, 0),
            0
          )
        end,
      'legacyReservationBlocked', coalesce(r.unresolved_legacy_requests, 0) > 0
    ) order by l.code
  ), '[]'::jsonb)
  into v_targets
  from public.investment_production_lots l
  left join allocation_totals a on a.lot_id = l.id
  left join order_totals o on o.lot_id = l.id
  left join reinvestment_totals r on r.lot_id = l.id
  where l.status = 'FUNDING_OPEN'
    and l.transport_cost_unit_cents is not null
    and (l.production_cost_unit_cents + l.label_cost_unit_cents + l.transport_cost_unit_cents) * l.case_size_units > 0;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'sourceSettlementId', r.source_settlement_id,
      'targetLotId', r.target_lot_id,
      'targetLotCode', l.code,
      'caseEquivalentUnits', r.case_equivalent_units,
      'amountCents', r.amount_cents,
      'status', r.status,
      'reviewNotes', r.review_notes,
      'createdAt', r.created_at,
      'reviewedAt', r.reviewed_at
    ) order by r.created_at desc, r.id
  ), '[]'::jsonb)
  into v_requests
  from public.investment_reinvestment_requests r
  join public.investment_production_lots l on l.id = r.target_lot_id
  where r.participant_user_id = v_user;

  return jsonb_build_object(
    'spendableBalanceCents', v_spendable,
    'sources', v_sources,
    'targets', v_targets,
    'requests', v_requests
  );
end;
$$;

revoke all on function public.get_participant_reinvestment_context() from public;
revoke execute on function public.get_participant_reinvestment_context() from anon;
grant execute on function public.get_participant_reinvestment_context() to authenticated;

-- Public funding availability now subtracts both payment orders and reinvestment
-- reservations. An unresolved legacy amount-only request conservatively blocks
-- the remaining public capacity of its target lot until reviewed.
create or replace function public.get_public_investment_lot_funding(p_lot_id uuid default null)
returns table(
  lot_id uuid,
  total_cases integer,
  allocated_cases integer,
  reserved_cases integer,
  funded_percent integer,
  available_cases_equivalent integer
)
language sql
stable
security definer
set search_path = public
as $$
  with allocation_totals as (
    select
      a.lot_id,
      coalesce(sum(a.case_equivalent_units), 0)::integer as allocated_cases_raw
    from public.investment_funding_allocations a
    where p_lot_id is null or a.lot_id = p_lot_id
    group by a.lot_id
  ),
  order_reservations as (
    select
      o.lot_id,
      coalesce(sum(o.case_equivalent_units), 0)::integer as reserved_cases_raw
    from public.investment_orders o
    where o.status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
      and o.allocation_id is null
      and (p_lot_id is null or o.lot_id = p_lot_id)
    group by o.lot_id
  ),
  reinvestment_reservations as (
    select
      r.target_lot_id as lot_id,
      coalesce(sum(r.case_equivalent_units) filter (where r.case_equivalent_units is not null), 0)::integer as reserved_cases_raw,
      count(*) filter (where r.case_equivalent_units is null)::integer as unresolved_legacy_requests
    from public.investment_reinvestment_requests r
    where r.status = 'REQUESTED'
      and (p_lot_id is null or r.target_lot_id = p_lot_id)
    group by r.target_lot_id
  ),
  normalized as (
    select
      l.id,
      greatest(l.total_eligible_units, 0)::integer as total_cases,
      least(
        greatest(coalesce(a.allocated_cases_raw, 0), 0),
        greatest(l.total_eligible_units, 0)
      )::integer as allocated_cases,
      greatest(coalesce(o.reserved_cases_raw, 0), 0)::integer as order_reserved_cases,
      greatest(coalesce(r.reserved_cases_raw, 0), 0)::integer as reinvestment_reserved_cases,
      coalesce(r.unresolved_legacy_requests, 0)::integer as unresolved_legacy_requests
    from public.investment_production_lots l
    left join allocation_totals a on a.lot_id = l.id
    left join order_reservations o on o.lot_id = l.id
    left join reinvestment_reservations r on r.lot_id = l.id
    where l.status <> 'DRAFT'
      and (p_lot_id is null or l.id = p_lot_id)
  ),
  published as (
    select
      n.id,
      n.total_cases,
      n.allocated_cases,
      case
        when n.unresolved_legacy_requests > 0 then greatest(n.total_cases - n.allocated_cases, 0)
        else least(
          n.order_reserved_cases + n.reinvestment_reserved_cases,
          greatest(n.total_cases - n.allocated_cases, 0)
        )
      end::integer as reserved_cases
    from normalized n
  )
  select
    p.id as lot_id,
    p.total_cases,
    p.allocated_cases,
    p.reserved_cases,
    case
      when p.total_cases <= 0 then 0
      else round((p.allocated_cases::numeric / p.total_cases::numeric) * 100)::integer
    end as funded_percent,
    greatest(p.total_cases - p.allocated_cases - p.reserved_cases, 0)::integer as available_cases_equivalent
  from published p
  order by p.id;
$$;

comment on function public.get_public_investment_lot_funding(uuid) is
  'Aggregate public funding progress for published investment lots. Funded percent reflects completed allocations; availability subtracts active payment-order and reinvestment reservations and fails closed on ambiguous legacy reinvestments. Exposes no participant, payment-evidence, KYC or bank identifiers.';

revoke all on function public.get_public_investment_lot_funding(uuid) from public;
grant execute on function public.get_public_investment_lot_funding(uuid) to anon, authenticated;
