-- CTG Craft Beer Inversión — participant order/checkout workflow
-- Bridges lot selection -> payment evidence -> verified allocation without
-- allowing a participant click to create funded capital directly.

create table public.investment_orders (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references auth.users(id) on delete cascade,
  lot_id uuid not null references public.investment_production_lots(id),
  case_equivalent_units int not null check (case_equivalent_units > 0),
  capital_required_cents bigint not null check (capital_required_cents > 0),
  status text not null default 'AWAITING_PAYMENT' check (status in (
    'AWAITING_PAYMENT','PAYMENT_SUBMITTED','PAYMENT_VERIFIED','ALLOCATED',
    'REJECTED','CANCELLED','EXPIRED'
  )),
  payment_method text check (payment_method in ('bank_transfer','pse','bre_b_qr','crypto')),
  payment_reference text,
  payment_proof_storage_path text,
  allocation_id uuid references public.investment_funding_allocations(id),
  admin_notes text,
  payment_submitted_at timestamptz,
  payment_verified_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investment_orders_participant_idx on public.investment_orders(participant_user_id, created_at desc);
create index investment_orders_lot_idx on public.investment_orders(lot_id, status);

comment on table public.investment_orders is
  'Participant checkout intent. An order does not become an economic allocation until an investment admin verifies payment and approve_investment_order() atomically creates the allocation and ledger entries.';

alter table public.investment_orders enable row level security;

create policy investment_orders_select_own_or_admin
  on public.investment_orders for select to authenticated
  using (participant_user_id = auth.uid() or public.is_investment_admin());

-- No direct INSERT/UPDATE/DELETE policies. All mutations go through RPCs.

create function public.create_investment_order(p_lot_id uuid, p_case_equivalent_units int)
returns public.investment_orders
language plpgsql security definer set search_path = public
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
  if p_case_equivalent_units is null or p_case_equivalent_units <= 0 then
    raise exception 'case quantity must be positive';
  end if;

  select kyc_status into v_kyc
    from public.investment_participant_profiles where user_id = auth.uid();
  if v_kyc is distinct from 'VERIFIED' then raise exception 'investment KYC not verified'; end if;

  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status <> 'FUNDING_OPEN' then raise exception 'lot is not open for funding'; end if;

  select coalesce(sum(case_equivalent_units), 0) into v_allocated
    from public.investment_funding_allocations where lot_id = p_lot_id;

  select coalesce(sum(case_equivalent_units), 0) into v_reserved
    from public.investment_orders
    where lot_id = p_lot_id and status in ('AWAITING_PAYMENT','PAYMENT_SUBMITTED','PAYMENT_VERIFIED');

  if v_allocated + v_reserved + p_case_equivalent_units > v_lot.total_cases then
    raise exception 'requested quantity exceeds available lot capacity';
  end if;

  -- Capital is derived only from the immutable per-lot production + label snapshot.
  -- This is not a projected sales value or promised return.
  v_capital_per_case := (v_lot.production_cost_unit_cents + v_lot.label_cost_unit_cents) * v_lot.case_size_units;
  if v_capital_per_case <= 0 then raise exception 'lot capital requirement is not configured'; end if;

  insert into public.investment_orders(
    participant_user_id, lot_id, case_equivalent_units, capital_required_cents
  ) values (
    auth.uid(), p_lot_id, p_case_equivalent_units, v_capital_per_case * p_case_equivalent_units
  ) returning * into v_order;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'create_investment_order', 'investment_orders', v_order.id,
      jsonb_build_object('lot_id', p_lot_id, 'cases', p_case_equivalent_units, 'capital_required_cents', v_order.capital_required_cents));

  return v_order;
end;
$$;

create function public.submit_investment_order_payment(
  p_order_id uuid,
  p_payment_method text,
  p_payment_reference text default null,
  p_payment_proof_storage_path text default null
)
returns public.investment_orders
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.investment_orders;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_payment_method not in ('bank_transfer','pse','bre_b_qr','crypto') then raise exception 'invalid payment method'; end if;
  if coalesce(trim(p_payment_reference), '') = '' and coalesce(trim(p_payment_proof_storage_path), '') = '' then
    raise exception 'payment reference or proof is required';
  end if;

  select * into v_order from public.investment_orders where id = p_order_id for update;
  if v_order is null or v_order.participant_user_id <> auth.uid() then raise exception 'order not found'; end if;
  if v_order.status <> 'AWAITING_PAYMENT' then raise exception 'order is not awaiting payment'; end if;

  update public.investment_orders set
    status = 'PAYMENT_SUBMITTED', payment_method = p_payment_method,
    payment_reference = nullif(trim(p_payment_reference), ''),
    payment_proof_storage_path = nullif(trim(p_payment_proof_storage_path), ''),
    payment_submitted_at = now(), updated_at = now()
  where id = p_order_id returning * into v_order;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'submit_investment_order_payment', 'investment_orders', p_order_id,
      jsonb_build_object('payment_method', p_payment_method));

  return v_order;
end;
$$;

create function public.approve_investment_order(p_order_id uuid, p_admin_notes text default null)
returns public.investment_orders
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_allocation uuid;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;
  select * into v_order from public.investment_orders where id = p_order_id for update;
  if v_order is null then raise exception 'order not found'; end if;
  if v_order.status <> 'PAYMENT_SUBMITTED' then raise exception 'order payment is not awaiting verification'; end if;

  v_allocation := public._investment_create_allocation(
    v_order.lot_id, v_order.participant_user_id, false,
    v_order.case_equivalent_units, v_order.capital_required_cents
  );

  insert into public.investment_ledger_entries(participant_user_id, lot_id, allocation_id, entry_type, amount_cents, reference, actor_id)
  values
    (v_order.participant_user_id, v_order.lot_id, v_allocation, 'FUNDING_RECEIVED', v_order.capital_required_cents, 'ORDER:' || v_order.id::text, auth.uid()),
    (v_order.participant_user_id, v_order.lot_id, v_allocation, 'CAPITAL_COMMITTED', v_order.capital_required_cents, 'ORDER:' || v_order.id::text, auth.uid());

  update public.investment_orders set
    status = 'ALLOCATED', allocation_id = v_allocation,
    payment_verified_at = now(), reviewed_by = auth.uid(), admin_notes = p_admin_notes,
    updated_at = now()
  where id = p_order_id returning * into v_order;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'approve_investment_order', 'investment_orders', p_order_id,
      jsonb_build_object('allocation_id', v_allocation, 'capital_required_cents', v_order.capital_required_cents));

  return v_order;
end;
$$;

create function public.reject_investment_order(p_order_id uuid, p_admin_notes text)
returns public.investment_orders
language plpgsql security definer set search_path = public
as $$
declare v_order public.investment_orders;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;
  select * into v_order from public.investment_orders where id = p_order_id for update;
  if v_order is null then raise exception 'order not found'; end if;
  if v_order.status not in ('AWAITING_PAYMENT','PAYMENT_SUBMITTED') then raise exception 'order cannot be rejected in current state'; end if;
  update public.investment_orders set status='REJECTED', reviewed_by=auth.uid(), admin_notes=p_admin_notes, updated_at=now()
    where id=p_order_id returning * into v_order;
  return v_order;
end;
$$;

revoke all on function public.create_investment_order(uuid,int) from public;
revoke all on function public.submit_investment_order_payment(uuid,text,text,text) from public;
revoke all on function public.approve_investment_order(uuid,text) from public;
revoke all on function public.reject_investment_order(uuid,text) from public;
grant execute on function public.create_investment_order(uuid,int) to authenticated;
grant execute on function public.submit_investment_order_payment(uuid,text,text,text) to authenticated;
grant execute on function public.approve_investment_order(uuid,text) to authenticated;
grant execute on function public.reject_investment_order(uuid,text) to authenticated;
