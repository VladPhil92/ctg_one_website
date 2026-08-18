-- CTG Craft Beer Investment OS — minimum entry of two cases
--
-- Business rule: every new investment order requires at least two cases.
-- Transactional capital remains derived exclusively from the selected lot snapshot.

alter table public.investment_orders
  drop constraint if exists investment_orders_case_equivalent_units_check;

alter table public.investment_orders
  add constraint investment_orders_case_equivalent_units_check
  check (case_equivalent_units >= 2);

create or replace function public.create_investment_order(
  p_lot_id uuid,
  p_case_equivalent_units integer
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
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
  from public.investment_participant_profiles where user_id=auth.uid();
  if v_kyc is distinct from 'VERIFIED' then raise exception 'investment KYC not verified'; end if;

  select * into v_lot from public.investment_production_lots where id=p_lot_id for update;
  if v_lot.id is null then raise exception 'lot not found'; end if;
  if v_lot.status<>'FUNDING_OPEN' then raise exception 'lot is not open for funding'; end if;

  select coalesce(sum(case_equivalent_units),0) into v_allocated
  from public.investment_funding_allocations where lot_id=p_lot_id;

  select coalesce(sum(case_equivalent_units),0) into v_reserved
  from public.investment_orders
  where lot_id=p_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED');

  if v_allocated+v_reserved+p_case_equivalent_units>v_lot.total_cases then
    raise exception 'requested quantity exceeds available lot capacity';
  end if;

  v_capital_per_case := (v_lot.production_cost_unit_cents+v_lot.label_cost_unit_cents)*v_lot.case_size_units;
  if v_capital_per_case<=0 then raise exception 'lot capital requirement is not configured'; end if;

  insert into public.investment_orders(participant_user_id,lot_id,case_equivalent_units,capital_required_cents)
  values(auth.uid(),p_lot_id,p_case_equivalent_units,v_capital_per_case*p_case_equivalent_units)
  returning * into v_order;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'create_investment_order','investment_orders',v_order.id,
    jsonb_build_object(
      'lot_id',p_lot_id,
      'cases',p_case_equivalent_units,
      'minimum_cases',2,
      'capital_required_cents',v_order.capital_required_cents
    ));

  return v_order;
end;
$$;

revoke all on function public.create_investment_order(uuid,integer) from public,anon;
grant execute on function public.create_investment_order(uuid,integer) to authenticated;
