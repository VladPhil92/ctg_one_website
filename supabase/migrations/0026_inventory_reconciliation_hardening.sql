-- CTG Craft Beer Investment OS — Inventory Reconciliation hardening
-- Follow-up to 0025 after static preflight. Keeps migration history append-only.

-- Make UUID-array normalization unambiguous for PostgreSQL and preserve exact
-- bottle genealogy for every movement written through the canonical helper.
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
  select array_agg(distinct u.id order by u.id)
    into v_ids
  from unnest(p_bottle_ids) as u(id)
  where u.id is not null;

  v_count := coalesce(cardinality(v_ids),0);
  if v_count <= 0 then raise exception 'movement requires bottle units'; end if;

  select count(*)::integer into v_matching
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id and b.id = any(v_ids);

  if v_matching <> v_count then
    raise exception 'one or more movement bottle units do not belong to the lot';
  end if;

  insert into public.investment_inventory_movements(
    lot_id,movement_type,quantity_units,actor_id,
    from_location_id,to_location_id,source_sale_id,notes
  ) values (
    p_lot_id,p_movement_type,v_count,auth.uid(),
    p_from_location_id,p_to_location_id,p_source_sale_id,
    nullif(trim(p_notes),'')
  ) returning id into v_movement_id;

  insert into public.investment_inventory_movement_units(
    movement_id,bottle_unit_id,lot_id
  )
  select v_movement_id,u.id,p_lot_id
  from unnest(v_ids) as u(id);

  return v_movement_id;
end;
$$;

revoke all on function public._write_unit_inventory_movement(uuid,text,uuid,uuid,uuid[],uuid,text)
  from public, anon, authenticated;

-- A movement row is inserted before its unit links, so the exact quantity/link
-- equality must be checked at COMMIT, not at the initial INSERT. This prevents
-- an orphan/coarse movement from becoming durable even through privileged code.
create or replace function public._assert_inventory_movement_unit_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linked bigint;
begin
  select count(*)::bigint into v_linked
  from public.investment_inventory_movement_units
  where movement_id = new.id;

  if v_linked <> new.quantity_units then
    raise exception 'inventory movement quantity/link mismatch: movement %, quantity %, linked %',
      new.id,new.quantity_units,v_linked;
  end if;

  return null;
end;
$$;

revoke all on function public._assert_inventory_movement_unit_count()
  from public, anon, authenticated;

drop trigger if exists investment_inventory_movement_unit_count_guard
  on public.investment_inventory_movements;
create constraint trigger investment_inventory_movement_unit_count_guard
after insert on public.investment_inventory_movements
deferrable initially deferred
for each row execute function public._assert_inventory_movement_unit_count();

-- SOLD genealogy must point to a confirmed sale from the same lot. The FK alone
-- proves existence, but not domain ownership.
create or replace function public.guard_inventory_sale_genealogy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_sale_id is not null and not exists (
    select 1
    from public.investment_sales s
    where s.id = new.source_sale_id
      and s.lot_id = new.lot_id
      and s.status = 'CONFIRMED'
  ) then
    raise exception 'inventory movement source sale must be a confirmed sale from the same lot';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_inventory_sale_genealogy()
  from public, anon, authenticated;

drop trigger if exists investment_inventory_sale_genealogy_guard
  on public.investment_inventory_movements;
create trigger investment_inventory_sale_genealogy_guard
before insert on public.investment_inventory_movements
for each row execute function public.guard_inventory_sale_genealogy();

-- System locations are semantic infrastructure. Operators may refine their
-- display name/address but cannot deactivate them or change their location type.
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
  v_type text;
  v_existing public.investment_inventory_locations;
  v_row public.investment_inventory_locations;
begin
  if not public.has_investment_permission('inventory.manage') then
    raise exception 'inventory.manage required';
  end if;

  v_code := upper(trim(p_code));
  v_type := upper(trim(p_location_type));
  if v_code !~ '^[A-Z0-9_]{2,48}$' then raise exception 'invalid location code'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'location name is required'; end if;
  if v_type not in (
    'PRODUCTION','WAREHOUSE','TRANSIT','SALES_POINT','PARTNER',
    'CUSTOMER','QUARANTINE','OTHER'
  ) then raise exception 'invalid location type'; end if;

  select * into v_existing
  from public.investment_inventory_locations
  where code = v_code
  for update;

  if found and v_existing.is_system then
    if p_active is false then
      raise exception 'system inventory location cannot be deactivated';
    end if;
    if v_type <> v_existing.location_type then
      raise exception 'system inventory location type cannot be changed';
    end if;
  end if;

  insert into public.investment_inventory_locations(
    code,name,location_type,address,active,created_by
  ) values (
    v_code,trim(p_name),v_type,nullif(trim(p_address),''),p_active,auth.uid()
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
