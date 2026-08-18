-- CTG Craft Beer Inversión — idempotent participant order creation
--
-- A browser retry, double click or ambiguous network timeout must never reserve
-- the same investment capacity twice. The participant supplies one opaque key
-- per intended order. PostgreSQL serializes concurrent attempts for that key,
-- returns the existing order for an exact replay, and fails closed if the key
-- is reused with different economic intent.

alter table public.investment_orders
  add column if not exists client_idempotency_key text;

alter table public.investment_orders
  drop constraint if exists investment_orders_client_idempotency_key_format;

alter table public.investment_orders
  add constraint investment_orders_client_idempotency_key_format
  check (
    client_idempotency_key is null
    or (
      length(client_idempotency_key) between 16 and 128
      and client_idempotency_key ~ '^[A-Za-z0-9._:-]+$'
    )
  ) not valid;

alter table public.investment_orders
  validate constraint investment_orders_client_idempotency_key_format;

create unique index if not exists investment_orders_participant_idempotency_uidx
  on public.investment_orders(participant_user_id, client_idempotency_key)
  where client_idempotency_key is not null;

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

  -- Serialize exact replays, including concurrent double submissions.
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

  select coalesce(sum(case_equivalent_units), 0) into v_allocated
  from public.investment_funding_allocations
  where lot_id = p_lot_id;

  select coalesce(sum(case_equivalent_units), 0) into v_reserved
  from public.investment_orders
  where lot_id = p_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED');

  if v_allocated + v_reserved + p_case_equivalent_units > v_lot.total_eligible_units then
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

-- The historical two-argument command cannot provide retry identity and must no
-- longer be reachable from browser sessions. It remains present for migration
-- history / trusted diagnostic compatibility only.
revoke execute on function public.create_investment_order(uuid, integer) from public, anon, authenticated;