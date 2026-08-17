-- CTG Craft Beer Investment OS — closed-loop integrity
--
-- Closes bypasses and concurrency gaps across funding, sales, settlement and
-- participant balance workflows. No historical transactional rows exist when
-- this migration is introduced, so the new invariants become the baseline
-- before live financial operations begin.

-- ---------------------------------------------------------------------------
-- Sales -> Finance traceability
-- ---------------------------------------------------------------------------

alter table public.investment_lot_financial_entries
  add column if not exists source_sale_id uuid
    references public.investment_sales(id) on delete restrict;

create unique index if not exists investment_lot_financial_entries_sale_type_unique
  on public.investment_lot_financial_entries(source_sale_id, entry_type)
  where source_sale_id is not null and entry_type in ('REVENUE','TAX');

comment on column public.investment_lot_financial_entries.source_sale_id is
  'Sales-backed REVENUE/TAX entries must reference their authoritative investment_sales document. Manual cost/adjustment entries leave this null.';

-- Legacy participant allocation and legacy unit-sale RPCs bypass the canonical
-- Order/Payment and Sales OS documents. They remain in the schema only for
-- migration compatibility and are no longer client-executable.
revoke execute on function public.create_funding_allocation(uuid,integer,bigint)
  from public, anon, authenticated;
revoke execute on function public.record_bottle_sales(uuid,text[],bigint,text,text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reservation-aware, lot-pinned allocation helper
-- ---------------------------------------------------------------------------

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
set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_allocated integer;
  v_reserved integer;
  v_formula_version_id uuid;
  v_formula_count integer;
  v_allocation_id uuid;
  v_expected_capital bigint;
begin
  if p_participant is null then raise exception 'participant is required'; end if;
  if p_case_equivalent_units is null or p_case_equivalent_units <= 0 then
    raise exception 'case quantity must be positive';
  end if;
  if p_capital_committed_cents is null or p_capital_committed_cents <= 0 then
    raise exception 'capital committed must be positive';
  end if;

  select * into v_lot
  from public.investment_production_lots
  where id = p_lot_id
  for update;

  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status <> 'FUNDING_OPEN' then
    raise exception 'lot is not open for funding (status: %)', v_lot.status;
  end if;

  v_expected_capital :=
    (v_lot.production_cost_unit_cents + v_lot.label_cost_unit_cents)
    * v_lot.case_size_units
    * p_case_equivalent_units;

  if v_expected_capital <= 0 then
    raise exception 'lot capital requirement is not configured';
  end if;
  if p_capital_committed_cents <> v_expected_capital then
    raise exception 'capital committed does not match lot snapshot: % expected, % supplied',
      v_expected_capital, p_capital_committed_cents;
  end if;

  select coalesce(sum(case_equivalent_units), 0)::integer
    into v_allocated
  from public.investment_funding_allocations
  where lot_id = p_lot_id;

  select coalesce(sum(case_equivalent_units), 0)::integer
    into v_reserved
  from public.investment_orders
  where lot_id = p_lot_id
    and status in ('AWAITING_PAYMENT','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
    and allocation_id is null
    and (p_exclude_order_id is null or id <> p_exclude_order_id);

  if v_allocated + v_reserved + p_case_equivalent_units > v_lot.total_cases then
    raise exception 'allocation would consume reserved capacity: % allocated, % reserved, % requested, % total',
      v_allocated, v_reserved, p_case_equivalent_units, v_lot.total_cases;
  end if;

  select count(distinct formula_version_id)::integer,
         min(formula_version_id::text)::uuid
    into v_formula_count, v_formula_version_id
  from public.investment_funding_allocations
  where lot_id = p_lot_id;

  if v_formula_count > 1 then
    raise exception 'lot has mixed formula versions and cannot accept more allocations';
  end if;

  if v_formula_count = 0 then
    select id into v_formula_version_id
    from public.investment_formula_versions
    where status = 'ACTIVE';
  end if;

  if v_formula_version_id is null then
    raise exception 'no active formula version configured';
  end if;

  insert into public.investment_funding_allocations(
    lot_id, participant_user_id, is_ctg_internal, case_equivalent_units,
    capital_committed_cents, formula_version_id
  ) values (
    p_lot_id, p_participant, p_is_ctg_internal, p_case_equivalent_units,
    p_capital_committed_cents, v_formula_version_id
  ) returning id into v_allocation_id;

  return v_allocation_id;
end;
$$;

revoke all on function public._investment_create_allocation_checked(uuid,uuid,boolean,integer,bigint,uuid)
  from public, anon, authenticated;

-- Keep the historical private helper safe for any owner-side legacy call by
-- routing it through the checked implementation. It intentionally cannot exclude
-- an order reservation; canonical order approval uses the checked helper directly.
create or replace function public._investment_create_allocation(
  p_lot_id uuid,
  p_participant uuid,
  p_is_ctg_internal boolean,
  p_case_equivalent_units integer,
  p_capital_committed_cents bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._investment_create_allocation_checked(
    p_lot_id, p_participant, p_is_ctg_internal,
    p_case_equivalent_units, p_capital_committed_cents, null
  );
end;
$$;

revoke all on function public._investment_create_allocation(uuid,uuid,boolean,integer,bigint)
  from public, anon, authenticated;

create or replace function public.approve_investment_order(
  p_order_id uuid,
  p_admin_notes text default null
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_allocation uuid;
  v_kyc text;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  select * into v_order
  from public.investment_orders
  where id = p_order_id
  for update;

  if v_order is null then raise exception 'order not found'; end if;
  if v_order.status <> 'PAYMENT_SUBMITTED' then
    raise exception 'order payment is not awaiting verification';
  end if;

  select kyc_status into v_kyc
  from public.investment_participant_profiles
  where user_id = v_order.participant_user_id;
  if v_kyc is distinct from 'VERIFIED' then
    raise exception 'participant investment KYC is no longer verified';
  end if;

  v_allocation := public._investment_create_allocation_checked(
    v_order.lot_id,
    v_order.participant_user_id,
    false,
    v_order.case_equivalent_units,
    v_order.capital_required_cents,
    v_order.id
  );

  insert into public.investment_ledger_entries(
    participant_user_id, lot_id, allocation_id, entry_type,
    amount_cents, reference, actor_id
  ) values
    (v_order.participant_user_id, v_order.lot_id, v_allocation,
      'FUNDING_RECEIVED', v_order.capital_required_cents,
      'ORDER:' || v_order.id::text, auth.uid()),
    (v_order.participant_user_id, v_order.lot_id, v_allocation,
      'CAPITAL_COMMITTED', v_order.capital_required_cents,
      'ORDER:' || v_order.id::text, auth.uid());

  update public.investment_orders
  set status = 'ALLOCATED',
      allocation_id = v_allocation,
      payment_verified_at = now(),
      reviewed_by = auth.uid(),
      admin_notes = p_admin_notes,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  insert into public.investment_audit_log(
    actor_id, action, entity, entity_id, new_value
  ) values (
    auth.uid(), 'approve_investment_order', 'investment_orders', p_order_id,
    jsonb_build_object(
      'allocation_id', v_allocation,
      'capital_required_cents', v_order.capital_required_cents
    )
  );

  return v_order;
end;
$$;

revoke all on function public.approve_investment_order(uuid,text) from public, anon;
grant execute on function public.approve_investment_order(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Canonical Sales OS with serialized idempotency and request equivalence
-- ---------------------------------------------------------------------------

create or replace function public.record_bottle_sale_document(
  p_lot_id uuid,
  p_serial_codes text[],
  p_unit_price_cents bigint,
  p_channel_code text,
  p_idempotency_key text,
  p_sale_reference text default null,
  p_location text default null,
  p_tax_cents bigint default 0
)
returns table(
  sale_id uuid,
  sold_count integer,
  gross_revenue_cents bigint,
  tax_recognized_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel_id uuid;
  v_channel_active boolean;
  v_existing public.investment_sales;
  v_existing_serials text[];
  v_serials text[];
  v_requested integer;
  v_count integer;
  v_gross bigint;
  v_sale_id uuid;
  v_existing_item_prices_match boolean;
begin
  if not public.has_investment_permission('sales.manage') then
    raise exception 'not authorized';
  end if;
  if p_lot_id is null then raise exception 'lot is required'; end if;
  if p_unit_price_cents is null or p_unit_price_cents <= 0 then
    raise exception 'unit price must be positive';
  end if;
  if p_tax_cents is null or p_tax_cents < 0 then
    raise exception 'tax must be non-negative';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'idempotency key is required';
  end if;
  if coalesce(array_length(p_serial_codes,1),0) = 0 then
    raise exception 'at least one serial is required';
  end if;

  select array_agg(distinct upper(trim(serial)) order by upper(trim(serial)))
    into v_serials
  from unnest(p_serial_codes) as serial
  where nullif(trim(serial),'') is not null;

  v_requested := coalesce(cardinality(v_serials), 0);
  if v_requested <= 0 then raise exception 'at least one valid serial is required'; end if;

  v_gross := v_requested::bigint * p_unit_price_cents;
  if p_tax_cents > v_gross then raise exception 'tax cannot exceed gross revenue'; end if;

  select id, active into v_channel_id, v_channel_active
  from public.investment_sales_channels
  where code = upper(trim(p_channel_code));
  if v_channel_id is null then
    raise exception 'sales channel not found: %', p_channel_code;
  end if;

  -- Serialize all callers sharing an idempotency key before checking whether the
  -- sale already exists. Concurrent retries now deterministically return the same
  -- sale instead of racing into a unique violation or stale bottle-state error.
  perform pg_advisory_xact_lock(
    hashtextextended('ctg-sale-idempotency:' || trim(p_idempotency_key), 0)
  );

  select * into v_existing
  from public.investment_sales
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then
    select array_agg(serial_code order by serial_code),
           bool_and(unit_price_cents = p_unit_price_cents)
      into v_existing_serials, v_existing_item_prices_match
    from public.investment_sale_items
    where sale_id = v_existing.id;

    if v_existing.lot_id <> p_lot_id
       or v_existing.channel_id <> v_channel_id
       or v_existing.gross_revenue_cents <> v_gross
       or v_existing.tax_recognized_cents <> p_tax_cents
       or coalesce(v_existing.sale_reference,'') <> coalesce(nullif(trim(p_sale_reference),''),'')
       or coalesce(v_existing.location,'') <> coalesce(nullif(trim(p_location),''),'')
       or v_existing_serials is distinct from v_serials
       or coalesce(v_existing_item_prices_match,false) is not true then
      raise exception 'idempotency key already used with a different sale payload';
    end if;

    sale_id := v_existing.id;
    sold_count := cardinality(v_existing_serials);
    gross_revenue_cents := v_existing.gross_revenue_cents;
    tax_recognized_cents := v_existing.tax_recognized_cents;
    return next;
    return;
  end if;

  if not v_channel_active then
    raise exception 'sales channel is inactive: %', p_channel_code;
  end if;

  perform 1
  from public.investment_bottle_units
  where lot_id = p_lot_id
    and serial_code = any(v_serials)
  for update;

  select count(*)::integer into v_count
  from public.investment_bottle_units
  where lot_id = p_lot_id
    and serial_code = any(v_serials)
    and status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED');

  if v_count <> v_requested then
    raise exception 'one or more requested bottle units are missing or not sellable';
  end if;

  insert into public.investment_sales(
    lot_id, channel_id, sale_reference, idempotency_key, location,
    gross_revenue_cents, tax_recognized_cents, created_by
  ) values (
    p_lot_id,
    v_channel_id,
    nullif(trim(p_sale_reference),''),
    trim(p_idempotency_key),
    nullif(trim(p_location),''),
    v_gross,
    p_tax_cents,
    auth.uid()
  ) returning id into v_sale_id;

  insert into public.investment_sale_items(
    sale_id, lot_id, bottle_unit_id, serial_code,
    unit_price_cents, line_total_cents
  )
  select v_sale_id, p_lot_id, b.id, b.serial_code,
         p_unit_price_cents, p_unit_price_cents
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id
    and b.serial_code = any(v_serials);

  update public.investment_bottle_units
  set status = 'SOLD',
      sold_at = now(),
      sale_price_cents = p_unit_price_cents,
      sale_reference = coalesce(nullif(trim(p_sale_reference),''), v_sale_id::text),
      current_location = coalesce(nullif(trim(p_location),''), current_location),
      last_actor_id = auth.uid(),
      updated_at = now()
  where lot_id = p_lot_id
    and serial_code = any(v_serials);

  insert into public.investment_inventory_movements(
    lot_id, movement_type, quantity_units, actor_id
  ) values (p_lot_id, 'SOLD', v_count, auth.uid());

  insert into public.investment_lot_financial_entries(
    lot_id, entry_type, amount_cents, description, actor_id, source_sale_id
  ) values (
    p_lot_id, 'REVENUE', v_gross,
    'Sales OS · sale ' || v_sale_id::text,
    auth.uid(), v_sale_id
  );

  if p_tax_cents > 0 then
    insert into public.investment_lot_financial_entries(
      lot_id, entry_type, amount_cents, description, actor_id, source_sale_id
    ) values (
      p_lot_id, 'TAX', p_tax_cents,
      'Sales OS · sale ' || v_sale_id::text,
      auth.uid(), v_sale_id
    );
  end if;

  insert into public.investment_audit_log(
    actor_id, action, entity, entity_id, new_value
  ) values (
    auth.uid(), 'record_bottle_sale_document', 'investment_sales', v_sale_id,
    jsonb_build_object(
      'lot_id', p_lot_id,
      'channel_code', upper(trim(p_channel_code)),
      'sold_count', v_count,
      'unit_price_cents', p_unit_price_cents,
      'gross_revenue_cents', v_gross,
      'tax_recognized_cents', p_tax_cents,
      'sale_reference', p_sale_reference,
      'idempotency_key', trim(p_idempotency_key)
    )
  );

  sale_id := v_sale_id;
  sold_count := v_count;
  gross_revenue_cents := v_gross;
  tax_recognized_cents := p_tax_cents;
  return next;
end;
$$;

revoke all on function public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint)
  from public, anon;
grant execute on function public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint)
  to authenticated;

-- Manual financial facts are reserved for non-sales costs/adjustments. Revenue
-- and tax must be generated atomically by Sales OS so every amount has a source.
create or replace function public.record_lot_financial_entry(
  p_lot_id uuid,
  p_entry_type text,
  p_amount_cents bigint,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;
  if p_entry_type not in ('PRODUCTION_COST','COMMERCIAL_COST','ADJUSTMENT') then
    raise exception 'manual REVENUE/TAX is prohibited; use Sales OS';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'financial amount must be positive';
  end if;

  perform 1 from public.investment_production_lots where id = p_lot_id;
  if not found then raise exception 'lot not found'; end if;

  insert into public.investment_lot_financial_entries(
    lot_id, entry_type, amount_cents, description, actor_id
  ) values (
    p_lot_id, p_entry_type, p_amount_cents, p_description, auth.uid()
  ) returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.record_lot_financial_entry(uuid,text,bigint,text) from public, anon;
grant execute on function public.record_lot_financial_entry(uuid,text,bigint,text) to authenticated;

-- ---------------------------------------------------------------------------
-- State-machine guards: funding coverage, physical close and settlement-only
-- transition to SETTLED.
-- ---------------------------------------------------------------------------

create or replace function public.transition_lot_status(
  p_lot_id uuid,
  p_new_status text,
  p_notes text default null,
  p_evidence_document_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_legal_next text[];
  v_exceptional text[] := array['PAUSED','CANCELLED','PRODUCTION_LOSS','PARTIAL_LOSS','RECALLED','EXPIRED'];
  v_allocated integer;
  v_active_orders integer;
  v_bottle_count integer;
  v_nonterminal_bottles integer;
  v_unbacked_sold integer;
begin
  if not public.is_investment_operator() then raise exception 'not authorized'; end if;

  select * into v_lot
  from public.investment_production_lots
  where id = p_lot_id
  for update;
  if v_lot is null then raise exception 'lot not found'; end if;

  v_legal_next := case v_lot.status
    when 'DRAFT' then array['FUNDING_PENDING']
    when 'FUNDING_PENDING' then array['FUNDING_OPEN']
    when 'FUNDING_OPEN' then array['FUNDED']
    when 'FUNDED' then array['PROCUREMENT']
    when 'PROCUREMENT' then array['BREWING']
    when 'BREWING' then array['FERMENTATION']
    when 'FERMENTATION' then array['CONDITIONING']
    when 'CONDITIONING' then array['BOTTLING']
    when 'BOTTLING' then array['QUALITY_CONTROL']
    when 'QUALITY_CONTROL' then array['WAREHOUSE']
    when 'WAREHOUSE' then array['DISPATCHED']
    when 'DISPATCHED' then array['IN_MARKET']
    when 'IN_MARKET' then array['SELLING']
    when 'SELLING' then array['SOLD_OUT']
    when 'SOLD_OUT' then array['SETTLEMENT_PENDING']
    -- SETTLED is intentionally not available here. finalize_settlement() is the
    -- only legal path from SETTLEMENT_PENDING to SETTLED.
    when 'SETTLEMENT_PENDING' then array[]::text[]
    when 'SETTLED' then array['CLOSED']
    else array[]::text[]
  end;

  if not (p_new_status = any(v_legal_next) or p_new_status = any(v_exceptional)) then
    raise exception 'illegal transition: % -> %', v_lot.status, p_new_status;
  end if;

  if v_lot.status = 'FUNDING_OPEN' and p_new_status = 'FUNDED' then
    select coalesce(sum(case_equivalent_units),0)::integer
      into v_allocated
    from public.investment_funding_allocations
    where lot_id = p_lot_id;

    select count(*)::integer into v_active_orders
    from public.investment_orders
    where lot_id = p_lot_id
      and status in ('AWAITING_PAYMENT','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
      and allocation_id is null;

    if v_allocated <> v_lot.total_cases then
      raise exception 'lot cannot be FUNDED until allocations cover all cases: % of % allocated',
        v_allocated, v_lot.total_cases;
    end if;
    if v_active_orders <> 0 then
      raise exception 'lot cannot be FUNDED while active funding orders remain';
    end if;
  end if;

  if v_lot.status = 'SELLING' and p_new_status = 'SOLD_OUT' then
    select count(*)::integer,
           count(*) filter (where status not in ('SOLD','DAMAGED','LOST','EXPIRED','RECALLED'))::integer
      into v_bottle_count, v_nonterminal_bottles
    from public.investment_bottle_units
    where lot_id = p_lot_id;

    if v_bottle_count = 0 then
      raise exception 'lot cannot be SOLD_OUT without serialized bottle units';
    end if;
    if v_nonterminal_bottles > 0 then
      raise exception 'lot cannot be SOLD_OUT while % bottle units remain non-terminal', v_nonterminal_bottles;
    end if;

    select count(*)::integer into v_unbacked_sold
    from public.investment_bottle_units b
    where b.lot_id = p_lot_id
      and b.status = 'SOLD'
      and not exists (
        select 1 from public.investment_sale_items si
        where si.bottle_unit_id = b.id
      );

    if v_unbacked_sold > 0 then
      raise exception 'lot has % SOLD bottle units without authoritative sale documents', v_unbacked_sold;
    end if;
  end if;

  if v_lot.status = 'SOLD_OUT' and p_new_status = 'SETTLEMENT_PENDING' then
    if exists (
      select 1
      from public.investment_lot_financial_entries
      where lot_id = p_lot_id
        and entry_type in ('REVENUE','TAX')
        and source_sale_id is null
    ) then
      raise exception 'lot has unbacked REVENUE/TAX entries and cannot enter settlement';
    end if;
  end if;

  perform public._investment_write_production_event(
    p_lot_id, v_lot.status, p_new_status, auth.uid(), p_notes
  );

  if p_evidence_document_id is not null then
    update public.investment_production_events
    set evidence_document_id = p_evidence_document_id
    where id = (
      select id
      from public.investment_production_events
      where lot_id = p_lot_id and new_status = p_new_status
      order by occurred_at desc
      limit 1
    );
  end if;
end;
$$;

revoke all on function public.transition_lot_status(uuid,text,text,uuid) from public, anon;
grant execute on function public.transition_lot_status(uuid,text,text,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Settlement conservation and Sales OS reconciliation
-- ---------------------------------------------------------------------------

create or replace function public.finalize_settlement(p_lot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_ndlp bigint;
  v_settlement_id uuid;
  v_snapshot jsonb;
  v_allocated integer;
  v_formula_count integer;
  v_formula_version_id uuid;
  v_sales_gross bigint;
  v_sales_tax bigint;
  v_financial_revenue bigint;
  v_financial_tax bigint;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  select * into v_lot
  from public.investment_production_lots
  where id = p_lot_id
  for update;

  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status <> 'SETTLEMENT_PENDING' then
    raise exception 'lot is not in SETTLEMENT_PENDING (status: %)', v_lot.status;
  end if;
  if exists (select 1 from public.investment_settlements where lot_id = p_lot_id) then
    raise exception 'lot already settled';
  end if;

  select coalesce(sum(case_equivalent_units),0)::integer,
         count(distinct formula_version_id)::integer,
         min(formula_version_id::text)::uuid
    into v_allocated, v_formula_count, v_formula_version_id
  from public.investment_funding_allocations
  where lot_id = p_lot_id;

  if v_allocated <> v_lot.total_eligible_units then
    raise exception 'settlement allocation coverage mismatch: % allocated vs % eligible',
      v_allocated, v_lot.total_eligible_units;
  end if;
  if v_formula_count <> 1 or v_formula_version_id is null then
    raise exception 'settlement requires exactly one formula version across the lot';
  end if;

  if exists (
    select 1
    from public.investment_lot_financial_entries
    where lot_id = p_lot_id
      and entry_type in ('REVENUE','TAX')
      and source_sale_id is null
  ) then
    raise exception 'settlement contains unbacked REVENUE/TAX entries';
  end if;

  select coalesce(sum(gross_revenue_cents),0),
         coalesce(sum(tax_recognized_cents),0)
    into v_sales_gross, v_sales_tax
  from public.investment_sales
  where lot_id = p_lot_id and status = 'CONFIRMED';

  select coalesce(sum(amount_cents) filter (where entry_type='REVENUE'),0),
         coalesce(sum(amount_cents) filter (where entry_type='TAX'),0)
    into v_financial_revenue, v_financial_tax
  from public.investment_lot_financial_entries
  where lot_id = p_lot_id;

  if v_sales_gross <> v_financial_revenue then
    raise exception 'sales/finance revenue mismatch: % sales vs % financial',
      v_sales_gross, v_financial_revenue;
  end if;
  if v_sales_tax <> v_financial_tax then
    raise exception 'sales/finance tax mismatch: % sales vs % financial',
      v_sales_tax, v_financial_tax;
  end if;

  select
    coalesce(sum(amount_cents) filter (where entry_type = 'REVENUE'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'TAX'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'PRODUCTION_COST'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'COMMERCIAL_COST'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'ADJUSTMENT'), 0)
  into v_ndlp
  from public.investment_lot_financial_entries
  where lot_id = p_lot_id;

  -- floor(numeric) works for both positive and negative NDLP. The fractional
  -- remainder is always in [0,1), so the final +1-cent distribution conserves
  -- the exact lot NDLP even when the lot closes at a loss.
  with exact as (
    select
      fa.id as allocation_id,
      fa.participant_user_id,
      fa.is_ctg_internal,
      fa.case_equivalent_units,
      fa.capital_committed_cents,
      fa.formula_version_id,
      fv.participant_profit_share,
      (v_ndlp::numeric * fa.case_equivalent_units::numeric / v_lot.total_eligible_units::numeric) as exact_ndlp
    from public.investment_funding_allocations fa
    join public.investment_formula_versions fv on fv.id = fa.formula_version_id
    where fa.lot_id = p_lot_id
  ),
  base as (
    select *,
      floor(exact_ndlp)::bigint as attributable_ndlp_floor,
      exact_ndlp - floor(exact_ndlp) as fractional_remainder
    from exact
  ),
  remainder_total as (
    select (v_ndlp - coalesce(sum(attributable_ndlp_floor),0))::integer as cents_to_distribute
    from base
  ),
  ranked as (
    select base.*,
      row_number() over (order by fractional_remainder desc, allocation_id asc) as rnk
    from base
  ),
  distributed as (
    select ranked.*,
      attributable_ndlp_floor
        + case when rnk <= (select cents_to_distribute from remainder_total) then 1 else 0 end
        as attributable_ndlp_cents
    from ranked
  ),
  final as (
    select *,
      round(attributable_ndlp_cents * participant_profit_share)::bigint as participant_profit_cents,
      attributable_ndlp_cents - round(attributable_ndlp_cents * participant_profit_share)::bigint as ctg_profit_cents
    from distributed
  )
  select jsonb_agg(
    jsonb_build_object(
      'allocation_id', allocation_id,
      'participant_user_id', participant_user_id,
      'is_ctg_internal', is_ctg_internal,
      'case_equivalent_units', case_equivalent_units,
      'capital_committed_cents', capital_committed_cents,
      'formula_version_id', formula_version_id,
      'attributable_ndlp_cents', attributable_ndlp_cents,
      'participant_profit_cents', participant_profit_cents,
      'ctg_profit_cents', ctg_profit_cents,
      'capital_recovery_cents', capital_committed_cents,
      'settlement_amount_cents', capital_committed_cents + participant_profit_cents
    ) order by allocation_id
  ) into v_snapshot
  from final;

  if v_snapshot is null then raise exception 'settlement has no allocations'; end if;

  insert into public.investment_settlements(
    lot_id, formula_version_id, net_distributable_profit_cents,
    total_eligible_units, snapshot, finalized_by
  ) values (
    p_lot_id, v_formula_version_id, v_ndlp,
    v_lot.total_eligible_units, v_snapshot, auth.uid()
  ) returning id into v_settlement_id;

  insert into public.investment_ledger_entries(
    participant_user_id, lot_id, allocation_id, entry_type,
    amount_cents, reference, metadata, actor_id
  )
  select
    (elem ->> 'participant_user_id')::uuid,
    p_lot_id,
    (elem ->> 'allocation_id')::uuid,
    'SETTLEMENT_CREDIT',
    (elem ->> 'settlement_amount_cents')::bigint,
    v_settlement_id::text,
    jsonb_build_object(
      'capital_recovery_cents', elem ->> 'capital_recovery_cents',
      'participant_profit_cents', elem ->> 'participant_profit_cents'
    ),
    auth.uid()
  from jsonb_array_elements(v_snapshot) elem
  where not (elem ->> 'is_ctg_internal')::boolean
    and (elem ->> 'settlement_amount_cents')::bigint > 0;

  perform public._investment_write_production_event(
    p_lot_id, v_lot.status, 'SETTLED', auth.uid(), 'Settlement finalized'
  );

  insert into public.investment_audit_log(
    actor_id, action, entity, entity_id, new_value
  ) values (
    auth.uid(), 'finalize_settlement', 'investment_settlements', v_settlement_id,
    jsonb_build_object(
      'lot_id', p_lot_id,
      'ndlp_cents', v_ndlp,
      'formula_version_id', v_formula_version_id,
      'sales_gross_cents', v_sales_gross,
      'sales_tax_cents', v_sales_tax
    )
  );

  return v_settlement_id;
end;
$$;

revoke all on function public.finalize_settlement(uuid) from public, anon;
grant execute on function public.finalize_settlement(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Spendable balance reservations: withdrawals and reinvestment share one pool
-- ---------------------------------------------------------------------------

create or replace function public._investment_reserved_spend(
  p_user uuid,
  p_exclude_withdrawal_id uuid default null,
  p_exclude_reinvestment_id uuid default null
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(amount_cents)
      from public.investment_withdrawal_requests
      where participant_user_id = p_user
        and status in ('REQUESTED','UNDER_REVIEW','APPROVED','PAYMENT_PROCESSING')
        and (p_exclude_withdrawal_id is null or id <> p_exclude_withdrawal_id)
    ),0)
    +
    coalesce((
      select sum(amount_cents)
      from public.investment_reinvestment_requests
      where participant_user_id = p_user
        and status = 'REQUESTED'
        and (p_exclude_reinvestment_id is null or id <> p_exclude_reinvestment_id)
    ),0);
$$;

revoke all on function public._investment_reserved_spend(uuid,uuid,uuid)
  from public, anon, authenticated;

create or replace function public.get_investment_spendable_balance(p_user uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_available bigint;
  v_reserved bigint;
begin
  if p_user is distinct from auth.uid() and not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  v_available := public.get_investment_available_balance(p_user);
  v_reserved := public._investment_reserved_spend(p_user, null, null);
  return greatest(v_available - v_reserved, 0);
end;
$$;

revoke all on function public.get_investment_spendable_balance(uuid) from public, anon;
grant execute on function public.get_investment_spendable_balance(uuid) to authenticated;

create or replace function public.request_withdrawal(p_amount_cents bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spendable bigint;
  v_request_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'withdrawal amount must be positive';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-investment-spend:' || auth.uid()::text, 0)
  );

  v_spendable := public.get_investment_spendable_balance(auth.uid());
  if p_amount_cents > v_spendable then
    raise exception 'amount exceeds spendable balance: % requested, % spendable',
      p_amount_cents, v_spendable;
  end if;

  insert into public.investment_withdrawal_requests(
    participant_user_id, amount_cents
  ) values (
    auth.uid(), p_amount_cents
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.approve_withdrawal(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.investment_withdrawal_requests;
  v_available bigint;
  v_reserved_other bigint;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  select * into v_req
  from public.investment_withdrawal_requests
  where id = p_request_id
  for update;
  if v_req is null then raise exception 'request not found'; end if;
  if v_req.status <> 'REQUESTED' then raise exception 'request already %', v_req.status; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-investment-spend:' || v_req.participant_user_id::text, 0)
  );

  v_available := public.get_investment_available_balance(v_req.participant_user_id);
  v_reserved_other := public._investment_reserved_spend(
    v_req.participant_user_id, v_req.id, null
  );

  if v_req.amount_cents > greatest(v_available - v_reserved_other,0) then
    raise exception 'withdrawal is no longer covered after other reservations';
  end if;

  update public.investment_withdrawal_requests
  set status = 'APPROVED',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id)
  values (auth.uid(), 'approve_withdrawal', 'investment_withdrawal_requests', p_request_id);
end;
$$;

create or replace function public.mark_withdrawal_paid(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.investment_withdrawal_requests;
  v_available bigint;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  select * into v_req
  from public.investment_withdrawal_requests
  where id = p_request_id
  for update;
  if v_req is null then raise exception 'request not found'; end if;
  if v_req.status <> 'APPROVED' then
    raise exception 'request must be APPROVED first (currently %)', v_req.status;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-investment-spend:' || v_req.participant_user_id::text, 0)
  );

  v_available := public.get_investment_available_balance(v_req.participant_user_id);
  if v_req.amount_cents > v_available then
    raise exception 'approved withdrawal is no longer covered by ledger balance';
  end if;

  update public.investment_withdrawal_requests
  set status = 'PAID', reviewed_at = now()
  where id = p_request_id;

  insert into public.investment_ledger_entries(
    participant_user_id, entry_type, amount_cents, reference, actor_id
  ) values (
    v_req.participant_user_id,
    'WITHDRAWAL_DEBIT',
    -v_req.amount_cents,
    p_request_id::text,
    auth.uid()
  );

  insert into public.investment_audit_log(
    actor_id, action, entity, entity_id, new_value
  ) values (
    auth.uid(), 'mark_withdrawal_paid', 'investment_withdrawal_requests', p_request_id,
    jsonb_build_object('amount_cents', v_req.amount_cents)
  );
end;
$$;

create or replace function public.request_reinvestment(
  p_source_settlement_id uuid,
  p_target_lot_id uuid,
  p_amount_cents bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spendable bigint;
  v_source_credit bigint;
  v_source_reserved bigint;
  v_request_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'reinvestment amount must be positive';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-investment-spend:' || auth.uid()::text, 0)
  );

  select coalesce(sum(amount_cents),0)
    into v_source_credit
  from public.investment_ledger_entries
  where participant_user_id = auth.uid()
    and entry_type = 'SETTLEMENT_CREDIT'
    and reference = p_source_settlement_id::text;

  if v_source_credit <= 0 then
    raise exception 'source settlement does not contain an eligible participant credit';
  end if;

  select coalesce(sum(amount_cents),0)
    into v_source_reserved
  from public.investment_reinvestment_requests
  where participant_user_id = auth.uid()
    and source_settlement_id = p_source_settlement_id
    and status in ('REQUESTED','APPROVED');

  if p_amount_cents > greatest(v_source_credit - v_source_reserved,0) then
    raise exception 'reinvestment exceeds remaining credit attributable to source settlement';
  end if;

  v_spendable := public.get_investment_spendable_balance(auth.uid());
  if p_amount_cents > v_spendable then
    raise exception 'amount exceeds spendable balance: % requested, % spendable',
      p_amount_cents, v_spendable;
  end if;

  insert into public.investment_reinvestment_requests(
    participant_user_id, source_settlement_id, target_lot_id, amount_cents
  ) values (
    auth.uid(), p_source_settlement_id, p_target_lot_id, p_amount_cents
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

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
  v_allocation_id uuid;
  v_kyc text;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  select * into v_req
  from public.investment_reinvestment_requests
  where id = p_request_id
  for update;
  if v_req is null then raise exception 'request not found'; end if;
  if v_req.status <> 'REQUESTED' then raise exception 'request already %', v_req.status; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-investment-spend:' || v_req.participant_user_id::text, 0)
  );

  select kyc_status into v_kyc
  from public.investment_participant_profiles
  where user_id = v_req.participant_user_id;
  if v_kyc is distinct from 'VERIFIED' then
    raise exception 'participant investment KYC is no longer verified';
  end if;

  v_available := public.get_investment_available_balance(v_req.participant_user_id);
  v_reserved_other := public._investment_reserved_spend(
    v_req.participant_user_id, null, v_req.id
  );

  if v_req.amount_cents > greatest(v_available - v_reserved_other,0) then
    raise exception 'reinvestment is no longer covered after other reservations';
  end if;

  v_allocation_id := public._investment_create_allocation_checked(
    v_req.target_lot_id,
    v_req.participant_user_id,
    false,
    p_case_equivalent_units,
    v_req.amount_cents,
    null
  );

  update public.investment_reinvestment_requests
  set status = 'APPROVED',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

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
    jsonb_build_object('source_settlement_id', v_req.source_settlement_id),
    auth.uid()
  );

  insert into public.investment_audit_log(
    actor_id, action, entity, entity_id, new_value
  ) values (
    auth.uid(), 'approve_reinvestment', 'investment_reinvestment_requests', p_request_id,
    jsonb_build_object(
      'target_lot_id', v_req.target_lot_id,
      'amount_cents', v_req.amount_cents,
      'source_settlement_id', v_req.source_settlement_id,
      'allocation_id', v_allocation_id
    )
  );

  return v_allocation_id;
end;
$$;

revoke all on function public.request_withdrawal(bigint) from public, anon;
revoke all on function public.approve_withdrawal(uuid) from public, anon;
revoke all on function public.mark_withdrawal_paid(uuid) from public, anon;
revoke all on function public.request_reinvestment(uuid,uuid,bigint) from public, anon;
revoke all on function public.approve_reinvestment(uuid,integer) from public, anon;

grant execute on function public.request_withdrawal(bigint) to authenticated;
grant execute on function public.approve_withdrawal(uuid) to authenticated;
grant execute on function public.mark_withdrawal_paid(uuid) to authenticated;
grant execute on function public.request_reinvestment(uuid,uuid,bigint) to authenticated;
grant execute on function public.approve_reinvestment(uuid,integer) to authenticated;
