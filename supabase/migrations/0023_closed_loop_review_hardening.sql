-- CTG Craft Beer Investment OS — Closed Loop review hardening
--
-- Immutable follow-up to 0022. Addresses review findings discovered only after
-- 0022 had already been applied: Sales OS tax permission and CTG-internal
-- allocation compatibility.

-- Sales-backed REVENUE/TAX are created atomically by Sales OS. A SALES_MANAGER
-- must therefore be able to insert both rows when source_sale_id proves the
-- financial fact came from the authoritative sale document. Manual/unbacked
-- financial facts remain Finance-only.
create or replace function public.guard_investment_financial_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entry_type in ('REVENUE','TAX') then
    if new.source_sale_id is not null then
      if not (
        public.has_investment_permission('sales.manage')
        or public.has_investment_permission('finance.manage')
      ) then
        raise exception 'sales.manage or finance.manage required for sales-backed revenue/tax';
      end if;
    elsif not public.has_investment_permission('finance.manage') then
      raise exception 'finance.manage required for unbacked revenue/tax';
    end if;
  elsif not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required for financial entries';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_investment_financial_entry()
  from public, anon, authenticated;

-- Preserve the original funding-allocation contract: participant_user_id is
-- required for participant allocations and must be NULL for CTG-internal
-- allocations. All other 0022 checks remain intact.
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
  if p_is_ctg_internal is true then
    if p_participant is not null then
      raise exception 'CTG internal allocation must not have a participant user';
    end if;
  else
    if p_participant is null then
      raise exception 'participant is required for external allocation';
    end if;
  end if;

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
    lot_id,
    participant_user_id,
    is_ctg_internal,
    case_equivalent_units,
    capital_committed_cents,
    formula_version_id
  ) values (
    p_lot_id,
    p_participant,
    p_is_ctg_internal,
    p_case_equivalent_units,
    p_capital_committed_cents,
    v_formula_version_id
  ) returning id into v_allocation_id;

  return v_allocation_id;
end;
$$;

revoke all on function public._investment_create_allocation_checked(uuid,uuid,boolean,integer,bigint,uuid)
  from public, anon, authenticated;
