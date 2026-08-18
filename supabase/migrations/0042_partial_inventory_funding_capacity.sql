-- CTG Craft Beer Inversión — physical production vs. fundable capacity
-- A lot may contain more physically produced cases than are still eligible
-- for new investment (for example, inventory already sold before funding opens).

alter table public.investment_production_lots
  add constraint investment_production_lots_eligible_cases_lte_total
  check (total_eligible_units <= total_cases) not valid;

alter table public.investment_production_lots
  validate constraint investment_production_lots_eligible_cases_lte_total;

create or replace function public.create_investment_order(
  p_lot_id uuid,
  p_case_equivalent_units integer
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
  v_capital_per_case bigint;
  v_order public.investment_orders;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_case_equivalent_units is null or p_case_equivalent_units < 2 then
    raise exception 'minimum investment is 2 cases';
  end if;

  select kyc_status into v_kyc
  from public.investment_participant_profiles where user_id = auth.uid();
  if v_kyc is distinct from 'VERIFIED' then raise exception 'investment KYC not verified'; end if;

  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot.id is null then raise exception 'lot not found'; end if;
  if v_lot.status <> 'FUNDING_OPEN' then raise exception 'lot is not open for funding'; end if;

  select coalesce(sum(case_equivalent_units), 0) into v_allocated
  from public.investment_funding_allocations where lot_id = p_lot_id;

  select coalesce(sum(case_equivalent_units), 0) into v_reserved
  from public.investment_orders
  where lot_id = p_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED');

  if v_allocated + v_reserved + p_case_equivalent_units > v_lot.total_eligible_units then
    raise exception 'requested quantity exceeds available fundable capacity';
  end if;

  v_capital_per_case := (v_lot.production_cost_unit_cents + v_lot.label_cost_unit_cents) * v_lot.case_size_units;
  if v_capital_per_case <= 0 then raise exception 'lot capital requirement is not configured'; end if;

  insert into public.investment_orders(participant_user_id, lot_id, case_equivalent_units, capital_required_cents)
  values(auth.uid(), p_lot_id, p_case_equivalent_units, v_capital_per_case * p_case_equivalent_units)
  returning * into v_order;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values(auth.uid(), 'create_investment_order', 'investment_orders', v_order.id,
    jsonb_build_object('lot_id', p_lot_id, 'cases', p_case_equivalent_units, 'capital_required_cents', v_order.capital_required_cents));

  return v_order;
end;
$$;

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

  v_expected_capital := (v_lot.production_cost_unit_cents + v_lot.label_cost_unit_cents)
    * v_lot.case_size_units * p_case_equivalent_units;
  if v_expected_capital <= 0 then raise exception 'lot capital requirement is not configured'; end if;
  if p_capital_committed_cents <> v_expected_capital then
    raise exception 'capital committed does not match lot snapshot: % expected, % supplied', v_expected_capital, p_capital_committed_cents;
  end if;

  select coalesce(sum(case_equivalent_units), 0)::integer into v_allocated
  from public.investment_funding_allocations where lot_id = p_lot_id;

  select coalesce(sum(case_equivalent_units), 0)::integer into v_reserved
  from public.investment_orders
  where lot_id = p_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
    and allocation_id is null
    and (p_exclude_order_id is null or id <> p_exclude_order_id);

  if v_allocated + v_reserved + p_case_equivalent_units > v_lot.total_eligible_units then
    raise exception 'allocation would consume reserved capacity: % allocated, % reserved, % requested, % fundable',
      v_allocated, v_reserved, p_case_equivalent_units, v_lot.total_eligible_units;
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

create or replace function public.transition_lot_status(
  p_lot_id uuid,
  p_new_status text,
  p_notes text default null,
  p_evidence_document_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
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

  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
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
    when 'SETTLEMENT_PENDING' then array[]::text[]
    when 'SETTLED' then array['CLOSED']
    else array[]::text[]
  end;

  if not (p_new_status = any(v_legal_next) or p_new_status = any(v_exceptional)) then
    raise exception 'illegal transition: % -> %', v_lot.status, p_new_status;
  end if;

  if v_lot.status = 'FUNDING_OPEN' and p_new_status = 'FUNDED' then
    select coalesce(sum(case_equivalent_units),0)::integer into v_allocated
    from public.investment_funding_allocations where lot_id = p_lot_id;

    select count(*)::integer into v_active_orders
    from public.investment_orders
    where lot_id = p_lot_id
      and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
      and allocation_id is null;

    if v_allocated <> v_lot.total_eligible_units then
      raise exception 'lot cannot be FUNDED until allocations cover all eligible cases: % of % allocated',
        v_allocated, v_lot.total_eligible_units;
    end if;
    if v_active_orders <> 0 then raise exception 'lot cannot be FUNDED while active funding orders remain'; end if;
  end if;

  if v_lot.status = 'SELLING' and p_new_status = 'SOLD_OUT' then
    select count(*)::integer,
           count(*) filter (where status not in ('SOLD','DAMAGED','LOST','EXPIRED','RECALLED'))::integer
      into v_bottle_count, v_nonterminal_bottles
    from public.investment_bottle_units where lot_id = p_lot_id;

    if v_bottle_count = 0 then raise exception 'lot cannot be SOLD_OUT without serialized bottle units'; end if;
    if v_nonterminal_bottles > 0 then raise exception 'lot cannot be SOLD_OUT while % bottle units remain non-terminal', v_nonterminal_bottles; end if;

    select count(*)::integer into v_unbacked_sold
    from public.investment_bottle_units b
    where b.lot_id = p_lot_id and b.status = 'SOLD'
      and not exists (select 1 from public.investment_sale_items si where si.bottle_unit_id = b.id);
    if v_unbacked_sold > 0 then raise exception 'lot has % SOLD bottle units without authoritative sale documents', v_unbacked_sold; end if;
  end if;

  if v_lot.status = 'SOLD_OUT' and p_new_status = 'SETTLEMENT_PENDING' then
    if exists (
      select 1 from public.investment_lot_financial_entries
      where lot_id = p_lot_id and entry_type in ('REVENUE','TAX') and source_sale_id is null
    ) then raise exception 'lot has unbacked REVENUE/TAX entries and cannot enter settlement'; end if;
  end if;

  perform public._investment_write_production_event(p_lot_id, v_lot.status, p_new_status, auth.uid(), p_notes);

  if p_evidence_document_id is not null then
    update public.investment_production_events
    set evidence_document_id = p_evidence_document_id
    where id = (
      select id from public.investment_production_events
      where lot_id = p_lot_id and new_status = p_new_status
      order by occurred_at desc limit 1
    );
  end if;
end;
$$;

-- Replace legacy lot creation with an explicit fundable-case capacity.
drop function if exists public.create_production_lot(text,text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric);
create function public.create_production_lot(
  p_code text,
  p_beer_style text,
  p_destination text,
  p_total_cases integer,
  p_case_size_units integer default 24,
  p_production_cost_unit_cents bigint default null,
  p_label_cost_unit_cents bigint default null,
  p_own_point_price_unit_cents bigint default null,
  p_b2b_price_unit_cents bigint default null,
  p_inc_rate numeric default null,
  p_advertising_rate_on_pre_inc numeric default null,
  p_total_eligible_units integer default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_lot_id uuid;
  v_eligible integer := coalesce(p_total_eligible_units, p_total_cases);
begin
  if not public.is_investment_operator() then raise exception 'not authorized'; end if;
  if p_total_cases is null or p_total_cases <= 0 then raise exception 'total cases must be positive'; end if;
  if v_eligible <= 0 or v_eligible > p_total_cases then raise exception 'eligible cases must be between 1 and total cases'; end if;
  if p_production_cost_unit_cents is null or p_label_cost_unit_cents is null
     or p_own_point_price_unit_cents is null or p_b2b_price_unit_cents is null
     or p_inc_rate is null or p_advertising_rate_on_pre_inc is null then
    raise exception 'authoritative lot economics are required';
  end if;

  insert into public.investment_production_lots (
    code, beer_style, destination, total_cases, case_size_units, total_eligible_units, created_by,
    production_cost_unit_cents, label_cost_unit_cents, own_point_price_unit_cents,
    b2b_price_unit_cents, inc_rate, advertising_rate_on_pre_inc
  ) values (
    p_code, p_beer_style, p_destination, p_total_cases, p_case_size_units, v_eligible, auth.uid(),
    p_production_cost_unit_cents, p_label_cost_unit_cents, p_own_point_price_unit_cents,
    p_b2b_price_unit_cents, p_inc_rate, p_advertising_rate_on_pre_inc
  ) returning id into v_lot_id;

  return v_lot_id;
end;
$$;

-- Canonical style-based lot creation keeps the same rule.
drop function if exists public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric);
create function public.create_production_lot_from_style(
  p_style_code text,
  p_destination text,
  p_total_cases integer,
  p_case_size_units integer default null,
  p_production_cost_unit_cents bigint default null,
  p_label_cost_unit_cents bigint default null,
  p_own_point_price_unit_cents bigint default null,
  p_b2b_price_unit_cents bigint default null,
  p_inc_rate numeric default null,
  p_advertising_rate_on_pre_inc numeric default null,
  p_total_eligible_units integer default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_style public.investment_beer_styles;
  v_year int := extract(year from current_date)::int;
  v_sequence int;
  v_code text;
  v_case_size int;
  v_eligible int := coalesce(p_total_eligible_units, p_total_cases);
  v_production_cost_unit_cents bigint;
  v_label_cost_unit_cents bigint;
  v_own_point_price_unit_cents bigint;
  v_b2b_price_unit_cents bigint;
  v_inc_rate numeric;
  v_advertising_rate_on_pre_inc numeric;
  v_lot_id uuid;
begin
  if not public.has_investment_permission('production.manage') then raise exception 'not authorized'; end if;
  if p_destination is null or trim(p_destination) = '' then raise exception 'destination is required'; end if;
  if p_total_cases is null or p_total_cases <= 0 then raise exception 'total cases must be positive'; end if;
  if v_eligible <= 0 or v_eligible > p_total_cases then raise exception 'eligible cases must be between 1 and total cases'; end if;

  select * into v_style from public.investment_beer_styles
  where code = upper(trim(p_style_code)) and active = true;
  if v_style is null then raise exception 'active beer style not found: %', p_style_code; end if;

  v_case_size := coalesce(p_case_size_units, v_style.units_per_case);
  v_production_cost_unit_cents := coalesce(p_production_cost_unit_cents, v_style.standard_production_cost_unit_cents);
  v_label_cost_unit_cents := coalesce(p_label_cost_unit_cents, v_style.standard_label_cost_unit_cents);
  v_own_point_price_unit_cents := coalesce(p_own_point_price_unit_cents, v_style.standard_own_point_price_unit_cents);
  v_b2b_price_unit_cents := coalesce(p_b2b_price_unit_cents, v_style.standard_b2b_price_unit_cents);
  v_inc_rate := coalesce(p_inc_rate, v_style.standard_inc_rate);
  v_advertising_rate_on_pre_inc := coalesce(p_advertising_rate_on_pre_inc, v_style.standard_advertising_rate_on_pre_inc);

  if v_case_size is null or v_case_size <= 0 then raise exception 'case size must be configured and positive'; end if;
  if v_production_cost_unit_cents is null or v_production_cost_unit_cents < 0 then raise exception 'production cost must be configured before lot creation'; end if;
  if v_label_cost_unit_cents is null or v_label_cost_unit_cents < 0 then raise exception 'label cost must be configured before lot creation'; end if;
  if v_own_point_price_unit_cents is null or v_own_point_price_unit_cents <= 0 then raise exception 'own-point price must be configured before lot creation'; end if;
  if v_b2b_price_unit_cents is null or v_b2b_price_unit_cents <= 0 then raise exception 'B2B price must be configured before lot creation'; end if;
  if v_inc_rate is null or v_inc_rate < 0 or v_inc_rate > 1 then raise exception 'INC rate must be configured between 0 and 1'; end if;
  if v_advertising_rate_on_pre_inc is null or v_advertising_rate_on_pre_inc < 0 or v_advertising_rate_on_pre_inc > 1 then raise exception 'advertising rate must be configured between 0 and 1'; end if;
  if v_production_cost_unit_cents + v_label_cost_unit_cents <= 0 then raise exception 'total unit capital cost must be positive'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-production-lot:' || v_style.code || ':' || v_year::text, 0));
  select coalesce(max(substring(code from '([0-9]{3})$')::int), 0) + 1 into v_sequence
  from public.investment_production_lots
  where code like ('CTG-' || v_style.code || '-' || v_year::text || '-%')
    and code ~ ('^CTG-' || v_style.code || '-' || v_year::text || '-[0-9]{3}$');
  if v_sequence > 999 then raise exception 'annual lot sequence exhausted for style % in %', v_style.code, v_year; end if;
  v_code := 'CTG-' || v_style.code || '-' || v_year::text || '-' || lpad(v_sequence::text, 3, '0');

  insert into public.investment_production_lots (
    code, beer_style, beer_style_id, destination, total_cases, case_size_units,
    total_eligible_units, created_by, production_cost_unit_cents,
    label_cost_unit_cents, own_point_price_unit_cents, b2b_price_unit_cents,
    inc_rate, advertising_rate_on_pre_inc
  ) values (
    v_code, v_style.name, v_style.id, trim(p_destination), p_total_cases,
    v_case_size, v_eligible, auth.uid(), v_production_cost_unit_cents,
    v_label_cost_unit_cents, v_own_point_price_unit_cents,
    v_b2b_price_unit_cents, v_inc_rate, v_advertising_rate_on_pre_inc
  ) returning id into v_lot_id;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values (
    auth.uid(), 'create_production_lot_from_style', 'investment_production_lots', v_lot_id,
    jsonb_build_object(
      'code', v_code, 'style_code', v_style.code, 'beer_style', v_style.name,
      'total_cases', p_total_cases, 'total_eligible_units', v_eligible,
      'case_size_units', v_case_size, 'destination', trim(p_destination),
      'production_cost_unit_cents', v_production_cost_unit_cents,
      'label_cost_unit_cents', v_label_cost_unit_cents,
      'own_point_price_unit_cents', v_own_point_price_unit_cents,
      'b2b_price_unit_cents', v_b2b_price_unit_cents,
      'inc_rate', v_inc_rate,
      'advertising_rate_on_pre_inc', v_advertising_rate_on_pre_inc
    )
  );

  return v_lot_id;
end;
$$;

revoke execute on function public.create_investment_order(uuid, integer) from public, anon;
grant execute on function public.create_investment_order(uuid, integer) to authenticated;

revoke execute on function public.create_production_lot(text,text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric,integer) from public, anon;
grant execute on function public.create_production_lot(text,text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric,integer) to authenticated;

revoke execute on function public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric,integer) from public, anon;
grant execute on function public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric,integer) to authenticated;
