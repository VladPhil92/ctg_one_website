-- CTG Craft Beer Investment OS — Inventory Reconciliation
--
-- Adds canonical locations, unit-linked physical movements, strict bottle
-- transition semantics and read models that reconcile bottle projection,
-- movement history and Sales OS. The legacy coarse inventory writer remains
-- in the schema only for historical compatibility and is no longer executable
-- by client roles.

-- ---------------------------------------------------------------------------
-- Canonical inventory location registry
-- ---------------------------------------------------------------------------

create table if not exists public.investment_inventory_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code = upper(code) and code ~ '^[A-Z0-9_]{2,48}$'),
  name text not null check (length(trim(name)) >= 2),
  location_type text not null check (location_type in (
    'PRODUCTION','WAREHOUSE','TRANSIT','SALES_POINT','PARTNER',
    'CUSTOMER','QUARANTINE','OTHER'
  )),
  address text,
  active boolean not null default true,
  is_system boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.investment_inventory_locations(code,name,location_type,is_system)
values
  ('CTG_PRODUCTION','CTG Craft Beer · Producción','PRODUCTION',true),
  ('CTG_WAREHOUSE','CTG Craft Beer · Bodega principal','WAREHOUSE',true),
  ('IN_TRANSIT','En tránsito','TRANSIT',true)
on conflict (code) do update
set name = excluded.name,
    location_type = excluded.location_type,
    is_system = true,
    active = true,
    updated_at = now();

alter table public.investment_inventory_locations enable row level security;

drop policy if exists investment_inventory_locations_read on public.investment_inventory_locations;
create policy investment_inventory_locations_read
  on public.investment_inventory_locations for select to authenticated
  using (public.has_investment_permission('ops.read'));

revoke all on public.investment_inventory_locations from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.investment_inventory_locations from authenticated;
grant select on public.investment_inventory_locations to authenticated;

-- ---------------------------------------------------------------------------
-- Canonical location references and unit-linked movement history
-- ---------------------------------------------------------------------------

alter table public.investment_bottle_units
  add column if not exists current_location_id uuid
    references public.investment_inventory_locations(id) on delete restrict;

alter table public.investment_sales
  add column if not exists location_id uuid
    references public.investment_inventory_locations(id) on delete restrict;

alter table public.investment_inventory_movements
  add column if not exists sequence_no bigint generated always as identity,
  add column if not exists from_location_id uuid
    references public.investment_inventory_locations(id) on delete restrict,
  add column if not exists to_location_id uuid
    references public.investment_inventory_locations(id) on delete restrict,
  add column if not exists source_sale_id uuid
    references public.investment_sales(id) on delete restrict,
  add column if not exists notes text;

create unique index if not exists investment_inventory_movements_sequence_uidx
  on public.investment_inventory_movements(sequence_no);
create index if not exists investment_inventory_movements_from_location_idx
  on public.investment_inventory_movements(from_location_id, sequence_no);
create index if not exists investment_inventory_movements_to_location_idx
  on public.investment_inventory_movements(to_location_id, sequence_no);
create index if not exists investment_inventory_movements_source_sale_idx
  on public.investment_inventory_movements(source_sale_id)
  where source_sale_id is not null;
create index if not exists investment_bottle_units_current_location_idx
  on public.investment_bottle_units(current_location_id, status);
create index if not exists investment_sales_location_idx
  on public.investment_sales(location_id, sold_at desc);

alter table public.investment_inventory_movements
  drop constraint if exists investment_inventory_movements_movement_type_check;
alter table public.investment_inventory_movements
  add constraint investment_inventory_movements_movement_type_check
  check (movement_type in (
    'PRODUCED','PACKAGED','QC_APPROVED','WAREHOUSE_RECEIPT','RESERVED','UNRESERVED',
    'DISPATCHED','RECEIVED_AT_DESTINATION','SOLD','RETURNED','DAMAGED','EXPIRED',
    'LOST','RECALLED','ADJUSTMENT_IN','ADJUSTMENT_OUT'
  ));

create table if not exists public.investment_inventory_movement_units (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null
    references public.investment_inventory_movements(id) on delete restrict,
  bottle_unit_id uuid not null
    references public.investment_bottle_units(id) on delete restrict,
  lot_id uuid not null
    references public.investment_production_lots(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(movement_id,bottle_unit_id)
);

create index if not exists investment_inventory_movement_units_bottle_idx
  on public.investment_inventory_movement_units(bottle_unit_id, movement_id);
create index if not exists investment_inventory_movement_units_lot_idx
  on public.investment_inventory_movement_units(lot_id, movement_id);

alter table public.investment_inventory_movement_units enable row level security;

drop policy if exists investment_inventory_movement_units_read
  on public.investment_inventory_movement_units;
create policy investment_inventory_movement_units_read
  on public.investment_inventory_movement_units for select to authenticated
  using (public.has_investment_permission('ops.read'));

revoke all on public.investment_inventory_movement_units from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.investment_inventory_movement_units from authenticated;
grant select on public.investment_inventory_movement_units to authenticated;

-- Historical migration 0004 exposed the coarse movement table publicly. Close
-- that surface before operational data exists.
drop policy if exists investment_inventory_movements_select
  on public.investment_inventory_movements;
drop policy if exists investment_inventory_movements_read_operator
  on public.investment_inventory_movements;
create policy investment_inventory_movements_read_operator
  on public.investment_inventory_movements for select to authenticated
  using (public.has_investment_permission('ops.read'));

revoke all on public.investment_inventory_movements from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.investment_inventory_movements from authenticated;
grant select on public.investment_inventory_movements to authenticated;

-- Bottle units are mutated only by domain RPCs. Keep read access for operations
-- roles but remove direct client writes and the obsolete anon table grant.
drop policy if exists investment_bottle_units_read_operator
  on public.investment_bottle_units;
create policy investment_bottle_units_read_operator
  on public.investment_bottle_units for select to authenticated
  using (public.has_investment_permission('ops.read'));

revoke all on public.investment_bottle_units from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.investment_bottle_units from authenticated;
grant select on public.investment_bottle_units to authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers and append-only guards
-- ---------------------------------------------------------------------------

create or replace function public._resolve_inventory_location(
  p_location text,
  p_allowed_types text[] default null,
  p_require_active boolean default true
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_type text;
  v_active boolean;
begin
  if nullif(trim(p_location),'') is null then
    return null;
  end if;

  select id, location_type, active
    into v_id, v_type, v_active
  from public.investment_inventory_locations
  where code = upper(trim(p_location))
     or lower(name) = lower(trim(p_location))
  order by case when code = upper(trim(p_location)) then 0 else 1 end, created_at
  limit 1;

  if v_id is null then
    raise exception 'inventory location not found: %', p_location;
  end if;
  if p_require_active and not v_active then
    raise exception 'inventory location is inactive: %', p_location;
  end if;
  if p_allowed_types is not null and not (v_type = any(p_allowed_types)) then
    raise exception 'inventory location % has incompatible type %', p_location, v_type;
  end if;

  return v_id;
end;
$$;

revoke all on function public._resolve_inventory_location(text,text[],boolean)
  from public, anon, authenticated;

create or replace function public.guard_investment_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  if new.movement_type in ('PRODUCED','PACKAGED','QC_APPROVED') then
    if not public.has_investment_permission('production.manage') then
      raise exception 'production.manage required';
    end if;
  elsif new.movement_type = 'SOLD' then
    if not public.has_investment_permission('sales.manage') then
      raise exception 'sales.manage required';
    end if;
  elsif new.movement_type in ('RECEIVED_AT_DESTINATION','RETURNED') then
    if not (
      public.has_investment_permission('inventory.manage')
      or public.has_investment_permission('sales.manage')
    ) then
      raise exception 'inventory.manage or sales.manage required';
    end if;
  elsif not public.has_investment_permission('inventory.manage') then
    raise exception 'inventory.manage required';
  end if;

  if new.to_location_id is null then
    raise exception 'canonical destination location is required';
  end if;
  if new.movement_type not in ('PRODUCED','PACKAGED')
     and new.from_location_id is null then
    raise exception 'canonical origin location is required';
  end if;
  if new.movement_type = 'SOLD' and new.source_sale_id is null then
    raise exception 'SOLD movement requires an authoritative Sales OS document';
  end if;
  if new.movement_type <> 'SOLD' and new.source_sale_id is not null then
    raise exception 'only SOLD movement may reference a sale document';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_investment_inventory_movement()
  from public, anon, authenticated;

create or replace function public._reject_inventory_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'inventory movement history is append-only';
end;
$$;

revoke all on function public._reject_inventory_history_mutation()
  from public, anon, authenticated;

drop trigger if exists investment_inventory_movements_immutable
  on public.investment_inventory_movements;
create trigger investment_inventory_movements_immutable
before update or delete on public.investment_inventory_movements
for each row execute function public._reject_inventory_history_mutation();

drop trigger if exists investment_inventory_movement_units_immutable
  on public.investment_inventory_movement_units;
create trigger investment_inventory_movement_units_immutable
before update or delete on public.investment_inventory_movement_units
for each row execute function public._reject_inventory_history_mutation();

create or replace function public.guard_inventory_movement_unit_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement_lot uuid;
  v_bottle_lot uuid;
begin
  select lot_id into v_movement_lot
  from public.investment_inventory_movements
  where id = new.movement_id;

  select lot_id into v_bottle_lot
  from public.investment_bottle_units
  where id = new.bottle_unit_id;

  if v_movement_lot is null or v_bottle_lot is null then
    raise exception 'movement or bottle unit not found';
  end if;
  if new.lot_id <> v_movement_lot or new.lot_id <> v_bottle_lot then
    raise exception 'movement unit lot mismatch';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_inventory_movement_unit_consistency()
  from public, anon, authenticated;

drop trigger if exists investment_inventory_movement_units_consistency
  on public.investment_inventory_movement_units;
create trigger investment_inventory_movement_units_consistency
before insert on public.investment_inventory_movement_units
for each row execute function public.guard_inventory_movement_unit_consistency();

create or replace function public._write_unit_inventory_movement(
  p_lot_id uuid,
  p_movement_type text,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_bottle_ids uuid[],
  p_source_sale_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_count integer;
  v_matching integer;
  v_movement_id uuid;
begin
  select array_agg(distinct id order by id)
    into v_ids
  from unnest(p_bottle_ids) as id
  where id is not null;

  v_count := coalesce(cardinality(v_ids),0);
  if v_count <= 0 then raise exception 'movement requires bottle units'; end if;

  select count(*)::integer into v_matching
  from public.investment_bottle_units
  where lot_id = p_lot_id and id = any(v_ids);

  if v_matching <> v_count then
    raise exception 'one or more movement bottle units do not belong to the lot';
  end if;

  insert into public.investment_inventory_movements(
    lot_id, movement_type, quantity_units, actor_id,
    from_location_id, to_location_id, source_sale_id, notes
  ) values (
    p_lot_id, p_movement_type, v_count, auth.uid(),
    p_from_location_id, p_to_location_id, p_source_sale_id,
    nullif(trim(p_notes),'')
  ) returning id into v_movement_id;

  insert into public.investment_inventory_movement_units(
    movement_id, bottle_unit_id, lot_id
  )
  select v_movement_id, id, p_lot_id
  from unnest(v_ids) as id;

  return v_movement_id;
end;
$$;

revoke all on function public._write_unit_inventory_movement(uuid,text,uuid,uuid,uuid[],uuid,text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Location administration
-- ---------------------------------------------------------------------------

create or replace function public.upsert_inventory_location(
  p_code text,
  p_name text,
  p_location_type text,
  p_address text default null,
  p_active boolean default true
)
returns public.investment_inventory_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_existing public.investment_inventory_locations;
  v_row public.investment_inventory_locations;
begin
  if not public.has_investment_permission('inventory.manage') then
    raise exception 'inventory.manage required';
  end if;

  v_code := upper(trim(p_code));
  if v_code !~ '^[A-Z0-9_]{2,48}$' then raise exception 'invalid location code'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'location name is required'; end if;
  if p_location_type not in (
    'PRODUCTION','WAREHOUSE','TRANSIT','SALES_POINT','PARTNER',
    'CUSTOMER','QUARANTINE','OTHER'
  ) then raise exception 'invalid location type'; end if;

  select * into v_existing
  from public.investment_inventory_locations
  where code = v_code
  for update;

  if found and v_existing.is_system and p_active is false then
    raise exception 'system inventory location cannot be deactivated';
  end if;

  insert into public.investment_inventory_locations(
    code,name,location_type,address,active,created_by
  ) values (
    v_code,trim(p_name),p_location_type,nullif(trim(p_address),''),p_active,auth.uid()
  )
  on conflict (code) do update
  set name = excluded.name,
      location_type = excluded.location_type,
      address = excluded.address,
      active = excluded.active,
      updated_at = now()
  returning * into v_row;

  insert into public.investment_audit_log(
    actor_id,action,entity,entity_id,previous_value,new_value
  ) values (
    auth.uid(),'upsert_inventory_location','investment_inventory_locations',v_row.id,
    case when v_existing.id is null then null else jsonb_build_object(
      'code',v_existing.code,'name',v_existing.name,'location_type',v_existing.location_type,
      'address',v_existing.address,'active',v_existing.active
    ) end,
    jsonb_build_object(
      'code',v_row.code,'name',v_row.name,'location_type',v_row.location_type,
      'address',v_row.address,'active',v_row.active
    )
  );

  return v_row;
end;
$$;

revoke all on function public.upsert_inventory_location(text,text,text,text,boolean)
  from public, anon;
grant execute on function public.upsert_inventory_location(text,text,text,text,boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Authoritative bottle generation and physical transitions
-- ---------------------------------------------------------------------------

create or replace function public.generate_bottle_units(p_lot_id uuid, p_quantity integer)
returns table(first_serial text, last_serial text, generated_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_existing integer;
  v_capacity integer;
  v_start integer;
  v_end integer;
  v_i integer;
  v_serial text;
  v_bottle_id uuid;
  v_bottle_ids uuid[] := array[]::uuid[];
  v_location_id uuid;
  v_location_name text;
begin
  if not public.has_investment_permission('production.manage') then
    raise exception 'not authorized';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'quantity must be positive'; end if;

  select * into v_lot
  from public.investment_production_lots
  where id = p_lot_id
  for update;
  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status not in ('BOTTLING','QUALITY_CONTROL','WAREHOUSE') then
    raise exception 'bottle units can only be generated during bottling, quality control or warehouse';
  end if;

  v_location_id := public._resolve_inventory_location(
    'CTG_PRODUCTION', array['PRODUCTION']::text[], true
  );
  select name into v_location_name
  from public.investment_inventory_locations where id = v_location_id;

  v_capacity := v_lot.total_cases * v_lot.case_size_units;
  select count(*)::integer into v_existing
  from public.investment_bottle_units where lot_id = p_lot_id;
  if v_existing + p_quantity > v_capacity then
    raise exception 'generation exceeds lot unit capacity: % of % already generated, % requested',
      v_existing, v_capacity, p_quantity;
  end if;

  select coalesce(max(unit_number),0) + 1 into v_start
  from public.investment_bottle_units where lot_id = p_lot_id;
  v_end := v_start + p_quantity - 1;

  for v_i in v_start..v_end loop
    v_serial := upper(v_lot.code) || '-' || lpad(v_i::text,6,'0');
    insert into public.investment_bottle_units(
      lot_id,unit_number,serial_code,status,current_location_id,current_location,
      packaged_at,last_actor_id
    ) values (
      p_lot_id,v_i,v_serial,'PACKAGED',v_location_id,v_location_name,
      now(),auth.uid()
    ) returning id into v_bottle_id;
    v_bottle_ids := array_append(v_bottle_ids,v_bottle_id);
  end loop;

  perform public._write_unit_inventory_movement(
    p_lot_id,'PACKAGED',null,v_location_id,v_bottle_ids,null,'Bottle serialization / packaging'
  );

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'generate_bottle_units','investment_production_lots',p_lot_id,
    jsonb_build_object(
      'quantity',p_quantity,'first_unit',v_start,'last_unit',v_end,
      'location_id',v_location_id,'location',v_location_name
    )
  );

  first_serial := upper(v_lot.code) || '-' || lpad(v_start::text,6,'0');
  last_serial := upper(v_lot.code) || '-' || lpad(v_end::text,6,'0');
  generated_count := p_quantity;
  return next;
end;
$$;

revoke all on function public.generate_bottle_units(uuid,integer) from public, anon;
grant execute on function public.generate_bottle_units(uuid,integer) to authenticated;

create or replace function public.update_bottle_units_status(
  p_lot_id uuid,
  p_serial_codes text[],
  p_new_status text,
  p_location text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_serials text[];
  v_requested integer;
  v_found integer;
  v_invalid integer;
  v_movement_type text;
  v_target_location_id uuid;
  v_target_location_name text;
  v_source_location_id uuid;
  v_group_target_id uuid;
  v_group_ids uuid[];
  v_group_target_name text;
  v_authorized boolean;
begin
  v_authorized := case
    when p_new_status = 'QC_APPROVED' then public.has_investment_permission('production.manage')
    when p_new_status in ('WAREHOUSE','DISPATCHED','DAMAGED','LOST','EXPIRED','RECALLED')
      then public.has_investment_permission('inventory.manage')
    when p_new_status in ('IN_MARKET','RETURNED')
      then public.has_investment_permission('inventory.manage')
        or public.has_investment_permission('sales.manage')
    else false
  end;
  if not v_authorized then raise exception 'not authorized for this bottle transition'; end if;

  if p_new_status not in (
    'QC_APPROVED','WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED',
    'DAMAGED','LOST','EXPIRED','RECALLED'
  ) then raise exception 'unsupported unit status'; end if;

  select array_agg(distinct upper(trim(serial)) order by upper(trim(serial)))
    into v_serials
  from unnest(p_serial_codes) as serial
  where nullif(trim(serial),'') is not null;
  v_requested := coalesce(cardinality(v_serials),0);
  if v_requested <= 0 then raise exception 'at least one serial is required'; end if;

  perform 1
  from public.investment_bottle_units
  where lot_id = p_lot_id and serial_code = any(v_serials)
  for update;

  select count(*)::integer into v_found
  from public.investment_bottle_units
  where lot_id = p_lot_id and serial_code = any(v_serials);
  if v_found <> v_requested then
    raise exception 'one or more requested bottle units do not belong to the lot';
  end if;

  select count(*)::integer into v_invalid
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id and b.serial_code = any(v_serials)
    and not (
      (p_new_status = 'QC_APPROVED' and b.status = 'PACKAGED')
      or (p_new_status = 'WAREHOUSE' and b.status in ('QC_APPROVED','RETURNED'))
      or (p_new_status = 'DISPATCHED' and b.status = 'WAREHOUSE')
      or (p_new_status = 'IN_MARKET' and b.status = 'DISPATCHED')
      or (p_new_status = 'RETURNED' and b.status in ('DISPATCHED','IN_MARKET'))
      or (p_new_status = 'DAMAGED' and b.status in ('QC_APPROVED','WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED'))
      or (p_new_status = 'LOST' and b.status in ('QC_APPROVED','WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED'))
      or (p_new_status = 'EXPIRED' and b.status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED'))
      or (p_new_status = 'RECALLED' and b.status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED'))
    );
  if v_invalid > 0 then
    raise exception 'illegal bottle state transition for % unit(s)', v_invalid;
  end if;

  if exists (
    select 1 from public.investment_bottle_units
    where lot_id = p_lot_id and serial_code = any(v_serials)
      and current_location_id is null
  ) then
    raise exception 'one or more bottle units lack a canonical inventory location';
  end if;

  v_target_location_id := case p_new_status
    when 'WAREHOUSE' then public._resolve_inventory_location(
      coalesce(nullif(trim(p_location),''),'CTG_WAREHOUSE'),
      array['WAREHOUSE']::text[],true
    )
    when 'DISPATCHED' then public._resolve_inventory_location(
      coalesce(nullif(trim(p_location),''),'IN_TRANSIT'),
      array['TRANSIT']::text[],true
    )
    when 'IN_MARKET' then public._resolve_inventory_location(
      p_location,array['SALES_POINT','PARTNER','OTHER']::text[],true
    )
    when 'RETURNED' then public._resolve_inventory_location(
      coalesce(nullif(trim(p_location),''),'CTG_WAREHOUSE'),
      array['WAREHOUSE','QUARANTINE']::text[],true
    )
    else case when nullif(trim(p_location),'') is null then null
      else public._resolve_inventory_location(p_location,null,true) end
  end;

  if p_new_status = 'IN_MARKET' and v_target_location_id is null then
    raise exception 'IN_MARKET requires a registered sales/partner location';
  end if;

  if v_target_location_id is not null then
    select name into v_target_location_name
    from public.investment_inventory_locations where id = v_target_location_id;
  end if;

  v_movement_type := case p_new_status
    when 'QC_APPROVED' then 'QC_APPROVED'
    when 'WAREHOUSE' then 'WAREHOUSE_RECEIPT'
    when 'DISPATCHED' then 'DISPATCHED'
    when 'IN_MARKET' then 'RECEIVED_AT_DESTINATION'
    when 'RETURNED' then 'RETURNED'
    when 'DAMAGED' then 'DAMAGED'
    when 'LOST' then 'LOST'
    when 'EXPIRED' then 'EXPIRED'
    when 'RECALLED' then 'RECALLED'
  end;

  for v_source_location_id in
    select distinct current_location_id
    from public.investment_bottle_units
    where lot_id = p_lot_id and serial_code = any(v_serials)
  loop
    select array_agg(id order by id)
      into v_group_ids
    from public.investment_bottle_units
    where lot_id = p_lot_id and serial_code = any(v_serials)
      and current_location_id = v_source_location_id;

    v_group_target_id := coalesce(v_target_location_id,v_source_location_id);
    perform public._write_unit_inventory_movement(
      p_lot_id,v_movement_type,v_source_location_id,v_group_target_id,
      v_group_ids,null,'Bottle state transition to ' || p_new_status
    );
  end loop;

  if v_target_location_id is null then
    update public.investment_bottle_units
    set status = p_new_status,
        last_actor_id = auth.uid(),
        updated_at = now()
    where lot_id = p_lot_id and serial_code = any(v_serials);
  else
    update public.investment_bottle_units
    set status = p_new_status,
        current_location_id = v_target_location_id,
        current_location = v_target_location_name,
        last_actor_id = auth.uid(),
        updated_at = now()
    where lot_id = p_lot_id and serial_code = any(v_serials);
  end if;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'update_bottle_units_status','investment_production_lots',p_lot_id,
    jsonb_build_object(
      'status',p_new_status,'count',v_requested,
      'location_id',v_target_location_id,'location',v_target_location_name
    )
  );

  return v_requested;
end;
$$;

revoke all on function public.update_bottle_units_status(uuid,text[],text,text)
  from public, anon;
grant execute on function public.update_bottle_units_status(uuid,text[],text,text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Sales OS: sale location must match the physical location of every bottle.
-- The inventory SOLD event is linked to both the sale document and every unit.
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
  v_requested_location_id uuid;
  v_location_id uuid;
  v_location_count integer;
  v_location_name text;
  v_bottle_ids uuid[];
begin
  if not public.has_investment_permission('sales.manage') then
    raise exception 'not authorized';
  end if;
  if p_lot_id is null then raise exception 'lot is required'; end if;
  if p_unit_price_cents is null or p_unit_price_cents <= 0 then
    raise exception 'unit price must be positive';
  end if;
  if p_tax_cents is null or p_tax_cents < 0 then raise exception 'tax must be non-negative'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'idempotency key is required';
  end if;

  select array_agg(distinct upper(trim(serial)) order by upper(trim(serial)))
    into v_serials
  from unnest(p_serial_codes) as serial
  where nullif(trim(serial),'') is not null;
  v_requested := coalesce(cardinality(v_serials),0);
  if v_requested <= 0 then raise exception 'at least one valid serial is required'; end if;

  v_gross := v_requested::bigint * p_unit_price_cents;
  if p_tax_cents > v_gross then raise exception 'tax cannot exceed gross revenue'; end if;

  select id, active into v_channel_id, v_channel_active
  from public.investment_sales_channels
  where code = upper(trim(p_channel_code));
  if v_channel_id is null then raise exception 'sales channel not found: %',p_channel_code; end if;

  if nullif(trim(p_location),'') is not null then
    v_requested_location_id := public._resolve_inventory_location(
      p_location,
      array['WAREHOUSE','TRANSIT','SALES_POINT','PARTNER','OTHER']::text[],
      true
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-sale-idempotency:' || trim(p_idempotency_key),0)
  );

  select * into v_existing
  from public.investment_sales
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then
    select array_agg(serial_code order by serial_code),
           bool_and(unit_price_cents = p_unit_price_cents)
      into v_existing_serials,v_existing_item_prices_match
    from public.investment_sale_items
    where sale_id = v_existing.id;

    if v_requested_location_id is null then
      v_requested_location_id := v_existing.location_id;
    end if;

    if v_existing.lot_id <> p_lot_id
       or v_existing.channel_id <> v_channel_id
       or v_existing.gross_revenue_cents <> v_gross
       or v_existing.tax_recognized_cents <> p_tax_cents
       or coalesce(v_existing.sale_reference,'') <> coalesce(nullif(trim(p_sale_reference),''),'')
       or v_existing.location_id is distinct from v_requested_location_id
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

  if not v_channel_active then raise exception 'sales channel is inactive: %',p_channel_code; end if;

  perform 1
  from public.investment_bottle_units
  where lot_id = p_lot_id and serial_code = any(v_serials)
  for update;

  select count(*)::integer,
         count(distinct current_location_id)::integer,
         min(current_location_id::text)::uuid,
         array_agg(id order by id)
    into v_count,v_location_count,v_location_id,v_bottle_ids
  from public.investment_bottle_units
  where lot_id = p_lot_id
    and serial_code = any(v_serials)
    and status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED');

  if v_count <> v_requested then
    raise exception 'one or more requested bottle units are missing or not sellable';
  end if;
  if exists (
    select 1 from public.investment_bottle_units
    where lot_id = p_lot_id and serial_code = any(v_serials)
      and current_location_id is null
  ) then
    raise exception 'sale contains bottle units without canonical inventory location';
  end if;
  if v_location_count <> 1 then
    raise exception 'a sale document cannot span multiple physical inventory locations';
  end if;
  if v_requested_location_id is not null and v_requested_location_id <> v_location_id then
    raise exception 'sale location does not match the physical location of the bottle units';
  end if;

  v_location_id := coalesce(v_requested_location_id,v_location_id);
  select name into v_location_name
  from public.investment_inventory_locations where id = v_location_id;

  insert into public.investment_sales(
    lot_id,channel_id,sale_reference,idempotency_key,location,location_id,
    gross_revenue_cents,tax_recognized_cents,created_by
  ) values (
    p_lot_id,v_channel_id,nullif(trim(p_sale_reference),''),trim(p_idempotency_key),
    v_location_name,v_location_id,v_gross,p_tax_cents,auth.uid()
  ) returning id into v_sale_id;

  insert into public.investment_sale_items(
    sale_id,lot_id,bottle_unit_id,serial_code,unit_price_cents,line_total_cents
  )
  select v_sale_id,p_lot_id,b.id,b.serial_code,p_unit_price_cents,p_unit_price_cents
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id and b.id = any(v_bottle_ids);

  perform public._write_unit_inventory_movement(
    p_lot_id,'SOLD',v_location_id,v_location_id,v_bottle_ids,v_sale_id,
    'Sales OS · sale ' || v_sale_id::text
  );

  update public.investment_bottle_units
  set status = 'SOLD',
      sold_at = now(),
      sale_price_cents = p_unit_price_cents,
      sale_reference = coalesce(nullif(trim(p_sale_reference),''),v_sale_id::text),
      current_location_id = v_location_id,
      current_location = v_location_name,
      last_actor_id = auth.uid(),
      updated_at = now()
  where lot_id = p_lot_id and id = any(v_bottle_ids);

  insert into public.investment_lot_financial_entries(
    lot_id,entry_type,amount_cents,description,actor_id,source_sale_id
  ) values (
    p_lot_id,'REVENUE',v_gross,'Sales OS · sale ' || v_sale_id::text,
    auth.uid(),v_sale_id
  );

  if p_tax_cents > 0 then
    insert into public.investment_lot_financial_entries(
      lot_id,entry_type,amount_cents,description,actor_id,source_sale_id
    ) values (
      p_lot_id,'TAX',p_tax_cents,'Sales OS · sale ' || v_sale_id::text,
      auth.uid(),v_sale_id
    );
  end if;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'record_bottle_sale_document','investment_sales',v_sale_id,
    jsonb_build_object(
      'lot_id',p_lot_id,'channel_code',upper(trim(p_channel_code)),
      'sold_count',v_count,'unit_price_cents',p_unit_price_cents,
      'gross_revenue_cents',v_gross,'tax_recognized_cents',p_tax_cents,
      'sale_reference',p_sale_reference,'idempotency_key',trim(p_idempotency_key),
      'location_id',v_location_id,'location',v_location_name
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

-- The two legacy writers can create inventory history without unit-level
-- genealogy and therefore must not be callable from the client API.
revoke execute on function public.record_inventory_movement(uuid,text,integer)
  from public, anon, authenticated;
revoke execute on function public.record_bottle_sales(uuid,text[],bigint,text,text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Inventory read models
-- ---------------------------------------------------------------------------

create or replace function public.get_inventory_location_stock(p_lot_id uuid default null)
returns table(
  location_id uuid,
  location_code text,
  location_name text,
  location_type text,
  lot_id uuid,
  lot_code text,
  bottle_status text,
  inventory_class text,
  quantity_units bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_investment_permission('ops.read') then
    raise exception 'ops.read required';
  end if;

  return query
  select
    loc.id,
    coalesce(loc.code,'UNMAPPED'),
    coalesce(loc.name,'Ubicación no mapeada'),
    coalesce(loc.location_type,'OTHER'),
    b.lot_id,
    lot.code,
    b.status,
    case
      when b.status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED') then 'SELLABLE'
      when b.status in ('PACKAGED','QC_APPROVED') then 'WORK_IN_PROCESS'
      when b.status = 'SOLD' then 'SOLD'
      else 'NON_SELLABLE'
    end,
    count(*)::bigint
  from public.investment_bottle_units b
  join public.investment_production_lots lot on lot.id = b.lot_id
  left join public.investment_inventory_locations loc on loc.id = b.current_location_id
  where p_lot_id is null or b.lot_id = p_lot_id
  group by loc.id,loc.code,loc.name,loc.location_type,b.lot_id,lot.code,b.status
  order by lot.code,coalesce(loc.code,'UNMAPPED'),b.status;
end;
$$;

revoke all on function public.get_inventory_location_stock(uuid) from public, anon;
grant execute on function public.get_inventory_location_stock(uuid) to authenticated;

create or replace function public.get_inventory_reconciliation(p_lot_id uuid default null)
returns table(
  lot_id uuid,
  lot_code text,
  serialized_units bigint,
  movement_events bigint,
  movement_quantity_mismatches bigint,
  bottles_without_history bigint,
  canonical_location_gaps bigint,
  location_mismatches bigint,
  status_mismatches bigint,
  sale_link_mismatches bigint,
  is_reconciled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_investment_permission('ops.read') then
    raise exception 'ops.read required';
  end if;

  return query
  with ranked_events as (
    select
      mu.bottle_unit_id,
      m.lot_id,
      m.movement_type,
      m.to_location_id,
      m.source_sale_id,
      row_number() over (
        partition by mu.bottle_unit_id
        order by m.sequence_no desc
      ) as rn
    from public.investment_inventory_movement_units mu
    join public.investment_inventory_movements m on m.id = mu.movement_id
  ),
  last_events as (
    select bottle_unit_id,lot_id,movement_type,to_location_id,source_sale_id
    from ranked_events where rn = 1
  ),
  bottle_eval as (
    select
      b.lot_id,
      count(*)::bigint as serialized_units,
      count(*) filter (where le.bottle_unit_id is null)::bigint as bottles_without_history,
      count(*) filter (
        where b.current_location_id is null
           or (le.bottle_unit_id is not null and le.to_location_id is null)
      )::bigint as canonical_location_gaps,
      count(*) filter (
        where le.bottle_unit_id is not null
          and b.current_location_id is distinct from le.to_location_id
      )::bigint as location_mismatches,
      count(*) filter (
        where le.bottle_unit_id is not null
          and b.status is distinct from case le.movement_type
            when 'PACKAGED' then 'PACKAGED'
            when 'QC_APPROVED' then 'QC_APPROVED'
            when 'WAREHOUSE_RECEIPT' then 'WAREHOUSE'
            when 'DISPATCHED' then 'DISPATCHED'
            when 'RECEIVED_AT_DESTINATION' then 'IN_MARKET'
            when 'RETURNED' then 'RETURNED'
            when 'DAMAGED' then 'DAMAGED'
            when 'LOST' then 'LOST'
            when 'EXPIRED' then 'EXPIRED'
            when 'RECALLED' then 'RECALLED'
            when 'SOLD' then 'SOLD'
            else b.status
          end
      )::bigint as status_mismatches,
      count(*) filter (
        where (
          b.status = 'SOLD'
          and (
            si.sale_id is null
            or le.source_sale_id is distinct from si.sale_id
          )
        ) or (
          b.status <> 'SOLD' and si.sale_id is not null
        )
      )::bigint as sale_link_mismatches
    from public.investment_bottle_units b
    left join last_events le on le.bottle_unit_id = b.id
    left join public.investment_sale_items si on si.bottle_unit_id = b.id
    group by b.lot_id
  ),
  movement_eval as (
    select
      m.lot_id,
      count(*)::bigint as movement_events,
      count(*) filter (
        where m.quantity_units <> coalesce(mu.linked_units,0)
      )::bigint as movement_quantity_mismatches
    from public.investment_inventory_movements m
    left join (
      select movement_id,count(*)::integer as linked_units
      from public.investment_inventory_movement_units
      group by movement_id
    ) mu on mu.movement_id = m.id
    group by m.lot_id
  )
  select
    l.id,
    l.code,
    coalesce(be.serialized_units,0),
    coalesce(me.movement_events,0),
    coalesce(me.movement_quantity_mismatches,0),
    coalesce(be.bottles_without_history,0),
    coalesce(be.canonical_location_gaps,0),
    coalesce(be.location_mismatches,0),
    coalesce(be.status_mismatches,0),
    coalesce(be.sale_link_mismatches,0),
    (
      coalesce(me.movement_quantity_mismatches,0) = 0
      and coalesce(be.bottles_without_history,0) = 0
      and coalesce(be.canonical_location_gaps,0) = 0
      and coalesce(be.location_mismatches,0) = 0
      and coalesce(be.status_mismatches,0) = 0
      and coalesce(be.sale_link_mismatches,0) = 0
    )
  from public.investment_production_lots l
  left join bottle_eval be on be.lot_id = l.id
  left join movement_eval me on me.lot_id = l.id
  where p_lot_id is null or l.id = p_lot_id
  order by l.created_at desc;
end;
$$;

revoke all on function public.get_inventory_reconciliation(uuid) from public, anon;
grant execute on function public.get_inventory_reconciliation(uuid) to authenticated;

comment on table public.investment_inventory_locations is
  'Canonical physical/logical inventory location registry. Free-text bottle location remains a display projection only.';
comment on table public.investment_inventory_movement_units is
  'Unit genealogy for every authoritative physical inventory movement. movement.quantity_units must equal the linked unit count.';
comment on column public.investment_bottle_units.current_location_id is
  'Canonical inventory location. current_location text is a denormalized display label maintained by domain RPCs.';
comment on column public.investment_inventory_movements.source_sale_id is
  'Authoritative Sales OS document for SOLD movements; null for non-sale physical events.';
