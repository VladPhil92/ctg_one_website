-- CTG Craft Beer Production & Traceability OS
-- Adds unit-level bottle traceability on top of the existing lot, inventory,
-- financial and audit architecture. No existing financial tables are rewritten.

create table public.investment_bottle_units (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.investment_production_lots(id) on delete cascade,
  unit_number int not null check (unit_number > 0),
  serial_code text not null unique,
  status text not null default 'GENERATED' check (status in (
    'GENERATED','PACKAGED','QC_APPROVED','WAREHOUSE','DISPATCHED','IN_MARKET',
    'SOLD','RETURNED','DAMAGED','LOST','EXPIRED','RECALLED'
  )),
  current_location text,
  packaged_at timestamptz,
  sold_at timestamptz,
  sale_price_cents bigint check (sale_price_cents is null or sale_price_cents >= 0),
  sale_reference text,
  last_actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lot_id, unit_number)
);

create index investment_bottle_units_lot_idx on public.investment_bottle_units(lot_id, unit_number);
create index investment_bottle_units_status_idx on public.investment_bottle_units(lot_id, status);

comment on table public.investment_bottle_units is
  'Physical unit traceability only. Funding allocations remain economic interests in a shared lot and never ownership of specific bottle units.';

alter table public.investment_bottle_units enable row level security;

create policy investment_bottle_units_read_operator
  on public.investment_bottle_units for select to authenticated
  using (
    public.is_investment_operator()
    or public.is_investment_admin()
    or exists (
      select 1 from public.investment_participant_profiles p
      where p.user_id = auth.uid() and p.investment_role in ('SALES_MANAGER','AUDITOR')
    )
  );

create function public.is_investment_sales_operator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.investment_participant_profiles
    where user_id = auth.uid()
      and investment_role in ('SUPER_ADMIN','FINANCE_ADMIN','SALES_MANAGER')
  );
$$;

revoke all on function public.is_investment_sales_operator() from public;
grant execute on function public.is_investment_sales_operator() to authenticated;

create function public.generate_bottle_units(p_lot_id uuid, p_quantity int)
returns table(first_serial text, last_serial text, generated_count int)
language plpgsql security definer set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_existing int;
  v_capacity int;
  v_start int;
  v_end int;
  v_i int;
  v_serial text;
begin
  if not public.is_investment_operator() then raise exception 'not authorized'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'quantity must be positive'; end if;

  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status not in ('BOTTLING','QUALITY_CONTROL','WAREHOUSE') then
    raise exception 'bottle units can only be generated during bottling, quality control or warehouse';
  end if;

  v_capacity := v_lot.total_cases * v_lot.case_size_units;
  select count(*) into v_existing from public.investment_bottle_units where lot_id = p_lot_id;
  if v_existing + p_quantity > v_capacity then
    raise exception 'generation exceeds lot unit capacity: % of % already generated, % requested', v_existing, v_capacity, p_quantity;
  end if;

  select coalesce(max(unit_number),0) + 1 into v_start from public.investment_bottle_units where lot_id = p_lot_id;
  v_end := v_start + p_quantity - 1;

  for v_i in v_start..v_end loop
    v_serial := upper(v_lot.code) || '-' || lpad(v_i::text, 6, '0');
    insert into public.investment_bottle_units(lot_id, unit_number, serial_code, status, packaged_at, last_actor_id)
      values (p_lot_id, v_i, v_serial, 'PACKAGED', now(), auth.uid());
  end loop;

  insert into public.investment_inventory_movements(lot_id, movement_type, quantity_units, actor_id)
    values (p_lot_id, 'PACKAGED', p_quantity, auth.uid());

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'generate_bottle_units', 'investment_production_lots', p_lot_id,
      jsonb_build_object('quantity', p_quantity, 'first_unit', v_start, 'last_unit', v_end));

  first_serial := upper(v_lot.code) || '-' || lpad(v_start::text, 6, '0');
  last_serial := upper(v_lot.code) || '-' || lpad(v_end::text, 6, '0');
  generated_count := p_quantity;
  return next;
end;
$$;

create function public.update_bottle_units_status(
  p_lot_id uuid,
  p_serial_codes text[],
  p_new_status text,
  p_location text default null
)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
  v_movement text;
begin
  if not (public.is_investment_operator() or public.is_investment_sales_operator()) then
    raise exception 'not authorized';
  end if;

  if p_new_status not in ('QC_APPROVED','WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED','DAMAGED','LOST','EXPIRED','RECALLED') then
    raise exception 'unsupported unit status';
  end if;
  if coalesce(array_length(p_serial_codes,1),0) = 0 then raise exception 'at least one serial is required'; end if;

  update public.investment_bottle_units
    set status = p_new_status,
        current_location = coalesce(nullif(trim(p_location),''), current_location),
        last_actor_id = auth.uid(), updated_at = now()
    where lot_id = p_lot_id and serial_code = any(p_serial_codes)
      and status <> 'SOLD';
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'no eligible bottle units found'; end if;

  v_movement := case p_new_status
    when 'WAREHOUSE' then 'WAREHOUSE_RECEIPT'
    when 'DISPATCHED' then 'DISPATCHED'
    when 'IN_MARKET' then 'RECEIVED_AT_DESTINATION'
    when 'RETURNED' then 'RETURNED'
    when 'DAMAGED' then 'DAMAGED'
    when 'LOST' then 'LOST'
    when 'EXPIRED' then 'EXPIRED'
    else null
  end;
  if v_movement is not null then
    insert into public.investment_inventory_movements(lot_id, movement_type, quantity_units, actor_id)
      values (p_lot_id, v_movement, v_count, auth.uid());
  end if;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'update_bottle_units_status', 'investment_production_lots', p_lot_id,
      jsonb_build_object('status', p_new_status, 'count', v_count, 'location', p_location));
  return v_count;
end;
$$;

create function public.record_bottle_sales(
  p_lot_id uuid,
  p_serial_codes text[],
  p_unit_price_cents bigint,
  p_sale_reference text default null,
  p_location text default null
)
returns table(sold_count int, revenue_cents bigint)
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
  v_revenue bigint;
begin
  if not public.is_investment_sales_operator() then raise exception 'not authorized'; end if;
  if p_unit_price_cents is null or p_unit_price_cents <= 0 then raise exception 'unit price must be positive'; end if;
  if coalesce(array_length(p_serial_codes,1),0) = 0 then raise exception 'at least one serial is required'; end if;

  update public.investment_bottle_units
    set status = 'SOLD', sold_at = now(), sale_price_cents = p_unit_price_cents,
        sale_reference = nullif(trim(p_sale_reference),''),
        current_location = coalesce(nullif(trim(p_location),''), current_location),
        last_actor_id = auth.uid(), updated_at = now()
    where lot_id = p_lot_id and serial_code = any(p_serial_codes)
      and status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED');
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'no sellable bottle units found'; end if;

  v_revenue := v_count::bigint * p_unit_price_cents;
  insert into public.investment_inventory_movements(lot_id, movement_type, quantity_units, actor_id)
    values (p_lot_id, 'SOLD', v_count, auth.uid());

  insert into public.investment_lot_financial_entries(lot_id, entry_type, amount_cents, description, actor_id)
    values (p_lot_id, 'REVENUE', v_revenue,
      concat('Unit sales', case when nullif(trim(p_sale_reference),'') is not null then ' · ' || trim(p_sale_reference) else '' end), auth.uid());

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'record_bottle_sales', 'investment_production_lots', p_lot_id,
      jsonb_build_object('sold_count', v_count, 'unit_price_cents', p_unit_price_cents, 'revenue_cents', v_revenue, 'reference', p_sale_reference));

  sold_count := v_count; revenue_cents := v_revenue; return next;
end;
$$;

create function public.get_public_bottle_trace(p_serial_code text)
returns table(
  serial_code text,
  unit_number int,
  bottle_status text,
  current_location text,
  packaged_at timestamptz,
  sold_at timestamptz,
  lot_code text,
  beer_style text,
  destination text,
  lot_status text,
  case_size_units int
)
language sql stable security definer set search_path = public
as $$
  select b.serial_code, b.unit_number, b.status, b.current_location, b.packaged_at, b.sold_at,
         l.code, l.beer_style, l.destination, l.status, l.case_size_units
  from public.investment_bottle_units b
  join public.investment_production_lots l on l.id = b.lot_id
  where b.serial_code = upper(trim(p_serial_code))
  limit 1;
$$;

revoke all on function public.generate_bottle_units(uuid,int) from public;
revoke all on function public.update_bottle_units_status(uuid,text[],text,text) from public;
revoke all on function public.record_bottle_sales(uuid,text[],bigint,text,text) from public;
revoke all on function public.get_public_bottle_trace(text) from public;
grant execute on function public.generate_bottle_units(uuid,int) to authenticated;
grant execute on function public.update_bottle_units_status(uuid,text[],text,text) to authenticated;
grant execute on function public.record_bottle_sales(uuid,text[],bigint,text,text) to authenticated;
grant execute on function public.get_public_bottle_trace(text) to anon, authenticated;
