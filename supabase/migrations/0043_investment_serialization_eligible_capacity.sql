-- CTG Craft Beer Inversión — investment serials only cover the economic perimeter.
-- Physical cases excluded before funding (e.g. already sold inventory) are not
-- serialized into the participant settlement domain and therefore cannot leak
-- pre-funding revenue into future participant returns.

create or replace function public.generate_bottle_units(
  p_lot_id uuid,
  p_quantity integer
)
returns table(first_serial text, last_serial text, generated_count integer)
language plpgsql
security definer
set search_path to 'public'
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

  -- Only inventory inside the investment perimeter receives investment serials.
  v_capacity := v_lot.total_eligible_units * v_lot.case_size_units;
  select count(*)::integer into v_existing
  from public.investment_bottle_units where lot_id = p_lot_id;
  if v_existing + p_quantity > v_capacity then
    raise exception 'generation exceeds eligible investment unit capacity: % of % already generated, % requested',
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
    p_lot_id,'PACKAGED',null,v_location_id,v_bottle_ids,null,'Investment-perimeter bottle serialization / packaging'
  );

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'generate_bottle_units','investment_production_lots',p_lot_id,
    jsonb_build_object(
      'quantity',p_quantity,'first_unit',v_start,'last_unit',v_end,
      'eligible_case_capacity',v_lot.total_eligible_units,
      'eligible_unit_capacity',v_capacity,
      'location_id',v_location_id,'location',v_location_name
    )
  );

  first_serial := upper(v_lot.code) || '-' || lpad(v_start::text,6,'0');
  last_serial := upper(v_lot.code) || '-' || lpad(v_end::text,6,'0');
  generated_count := p_quantity;
  return next;
end;
$$;

revoke execute on function public.generate_bottle_units(uuid, integer) from public, anon;
grant execute on function public.generate_bottle_units(uuid, integer) to authenticated;
