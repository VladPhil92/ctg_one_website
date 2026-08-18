-- CTG Craft Beer Investment OS — Sales Returns settlement closure
-- Prevents commercial facts from changing after settlement and makes physical
-- SALE_RETURNED genealogy a settlement-time invariant.

create or replace function public.guard_sales_credit_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_lot uuid;
  v_sale_status text;
  v_location_type text;
  v_location_active boolean;
begin
  if not public.has_investment_permission('sales.manage') then
    raise exception 'sales.manage required';
  end if;

  select lot_id,status into v_sale_lot,v_sale_status
  from public.investment_sales
  where id = new.sale_id;

  if v_sale_lot is null then raise exception 'sale not found'; end if;
  if v_sale_status <> 'CONFIRMED' then raise exception 'only confirmed sales can be credited'; end if;
  if new.lot_id <> v_sale_lot then raise exception 'credit note lot does not match sale lot'; end if;

  if exists (
    select 1 from public.investment_settlements st
    where st.lot_id = new.lot_id
  ) then
    raise exception 'settled lot cannot accept a new sales credit note';
  end if;

  select location_type,active into v_location_type,v_location_active
  from public.investment_inventory_locations
  where id = new.return_location_id;

  if v_location_type is null or not v_location_active then
    raise exception 'return location is missing or inactive';
  end if;
  if v_location_type not in ('WAREHOUSE','SALES_POINT','PARTNER','QUARANTINE','OTHER') then
    raise exception 'return location type % is not permitted',v_location_type;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_sales_credit_note()
  from public,anon,authenticated;

-- SALE_RETURNED must describe the exact commercial custody transition encoded by
-- the credit note, not merely reference a credit note from the same lot.
create or replace function public.guard_inventory_sale_genealogy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_lot uuid;
  v_credit_return_location uuid;
  v_customer_location uuid;
begin
  if new.source_sale_id is not null and not exists (
    select 1 from public.investment_sales s
    where s.id = new.source_sale_id
      and s.lot_id = new.lot_id
      and s.status = 'CONFIRMED'
  ) then
    raise exception 'inventory movement source sale must be a confirmed sale from the same lot';
  end if;

  if new.source_credit_note_id is not null then
    select lot_id,return_location_id
      into v_credit_lot,v_credit_return_location
    from public.investment_sales_credit_notes
    where id = new.source_credit_note_id;

    if v_credit_lot is null or v_credit_lot <> new.lot_id then
      raise exception 'inventory movement source credit note must belong to the same lot';
    end if;

    v_customer_location := public._resolve_inventory_location(
      'CUSTOMER_POSSESSION',array['CUSTOMER']::text[],true
    );

    if new.movement_type <> 'SALE_RETURNED'
       or new.from_location_id is distinct from v_customer_location
       or new.to_location_id is distinct from v_credit_return_location then
      raise exception 'SALE_RETURNED movement must match credit-note customer custody and return destination';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_inventory_sale_genealogy()
  from public,anon,authenticated;

-- Defense in depth at the settlement boundary. The finalizer already reconciles
-- document and financial totals; this trigger additionally proves every credited
-- bottle has the expected unit-linked physical return event.
create or replace function public.guard_settlement_sales_returns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_location uuid;
begin
  v_customer_location := public._resolve_inventory_location(
    'CUSTOMER_POSSESSION',array['CUSTOMER']::text[],true
  );

  if exists (
    select 1
    from public.investment_sales_credit_notes cn
    join public.investment_sales_credit_note_items cni
      on cni.credit_note_id = cn.id
    where cn.lot_id = new.lot_id
      and not exists (
        select 1
        from public.investment_inventory_movements m
        join public.investment_inventory_movement_units mu
          on mu.movement_id = m.id
        where m.lot_id = cn.lot_id
          and m.movement_type = 'SALE_RETURNED'
          and m.source_credit_note_id = cn.id
          and m.from_location_id = v_customer_location
          and m.to_location_id = cn.return_location_id
          and mu.bottle_unit_id = cni.bottle_unit_id
          and mu.lot_id = cn.lot_id
      )
  ) then
    raise exception 'settlement blocked: one or more credit-note units lack canonical SALE_RETURNED genealogy';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_settlement_sales_returns()
  from public,anon,authenticated;

drop trigger if exists investment_settlement_sales_returns_guard
  on public.investment_settlements;
create trigger investment_settlement_sales_returns_guard
before insert on public.investment_settlements
for each row execute function public.guard_settlement_sales_returns();
