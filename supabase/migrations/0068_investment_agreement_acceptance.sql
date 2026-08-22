-- Investment agreement acceptance.
--
-- investment_participant_profiles.agreement_accepted_at has existed since
-- 0004_investment_schema.sql, but nothing in the product ever set it — a
-- participant could complete an order without ever explicitly accepting
-- anything (docs/investment/ROADMAP.md, "Listo para desarrollar" section).
--
-- This does not invent contract terms or an agreementType taxonomy
-- (PRODUCT_CONSTITUTION.md Stop conditions) — it only captures that the
-- participant explicitly acknowledged /inversion/legal's current content
-- before committing capital. Idempotent: the timestamp is set once and
-- never overwritten, mirroring ensure_investment_participant_profile()'s
-- SECURITY DEFINER pattern.

create or replace function public.accept_investment_agreement()
returns public.investment_participant_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.investment_participant_profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_row
  from public.investment_participant_profiles
  where user_id = auth.uid()
  for update;

  if v_row is null then
    insert into public.investment_participant_profiles (user_id, agreement_accepted_at)
      values (auth.uid(), now())
      returning * into v_row;
  elsif v_row.agreement_accepted_at is null then
    update public.investment_participant_profiles
      set agreement_accepted_at = now()
      where user_id = auth.uid()
      returning * into v_row;
  end if;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values (
    auth.uid(),
    'accept_investment_agreement',
    'investment_participant_profiles',
    v_row.id,
    jsonb_build_object('agreement_accepted_at', v_row.agreement_accepted_at)
  );

  return v_row;
end;
$$;

revoke all on function public.accept_investment_agreement() from public;
grant execute on function public.accept_investment_agreement() to authenticated;

-- Gate order creation on explicit agreement acceptance, mirroring the
-- existing KYC gate. Full create-or-replace of the 0065 body plus one new
-- check — existing applied migrations are immutable, so the complete
-- function is restated here rather than patched in place.
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
  v_agreement_accepted_at timestamptz;
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

  select kyc_status, agreement_accepted_at into v_kyc, v_agreement_accepted_at
  from public.investment_participant_profiles where user_id = auth.uid();
  if v_kyc is distinct from 'VERIFIED' then raise exception 'investment KYC not verified'; end if;
  if v_agreement_accepted_at is null then raise exception 'investment agreement not accepted'; end if;

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
