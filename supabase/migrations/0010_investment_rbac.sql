-- CTG Craft Beer Investment OS — granular RBAC
-- Additive authorization layer. Existing public.profiles admin gate remains intact.

create or replace function public.get_investment_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select investment_role
    from public.investment_participant_profiles
    where user_id = auth.uid()
    limit 1
  ), 'PARTICIPANT');
$$;

create or replace function public.has_investment_permission(p_permission text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case public.get_investment_role()
    when 'SUPER_ADMIN' then true
    when 'FINANCE_ADMIN' then p_permission = any(array['ops.read','finance.read','finance.settle','funding.manage','audit.read'])
    when 'PRODUCTION_MANAGER' then p_permission = any(array['ops.read','production.manage','labels.manage','inventory.manage'])
    when 'INVENTORY_MANAGER' then p_permission = any(array['ops.read','inventory.manage','labels.read'])
    when 'SALES_MANAGER' then p_permission = any(array['ops.read','sales.manage','labels.read'])
    when 'AUDITOR' then p_permission = any(array['ops.read','finance.read','audit.read','labels.read'])
    else false
  end;
$$;

revoke all on function public.get_investment_role() from public;
revoke all on function public.has_investment_permission(text) from public;
grant execute on function public.get_investment_role() to authenticated;
grant execute on function public.has_investment_permission(text) to authenticated;

-- Tighten unit generation to production authority rather than the broader legacy operator helper.
create or replace function public.generate_bottle_units(p_lot_id uuid, p_quantity int)
returns table(first_serial text, last_serial text, generated_count int)
language plpgsql security definer set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_existing int; v_capacity int; v_start int; v_end int; v_i int; v_serial text;
begin
  if not public.has_investment_permission('production.manage') then raise exception 'not authorized'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'quantity must be positive'; end if;
  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status not in ('BOTTLING','QUALITY_CONTROL','WAREHOUSE') then raise exception 'bottle units can only be generated during bottling, quality control or warehouse'; end if;
  v_capacity := v_lot.total_cases * v_lot.case_size_units;
  select count(*) into v_existing from public.investment_bottle_units where lot_id = p_lot_id;
  if v_existing + p_quantity > v_capacity then raise exception 'generation exceeds lot unit capacity'; end if;
  select coalesce(max(unit_number),0)+1 into v_start from public.investment_bottle_units where lot_id=p_lot_id;
  v_end:=v_start+p_quantity-1;
  for v_i in v_start..v_end loop
    v_serial:=upper(v_lot.code)||'-'||lpad(v_i::text,6,'0');
    insert into public.investment_bottle_units(lot_id,unit_number,serial_code,status,packaged_at,last_actor_id)
    values(p_lot_id,v_i,v_serial,'PACKAGED',now(),auth.uid());
  end loop;
  insert into public.investment_inventory_movements(lot_id,movement_type,quantity_units,actor_id) values(p_lot_id,'PACKAGED',p_quantity,auth.uid());
  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value) values(auth.uid(),'generate_bottle_units','investment_production_lots',p_lot_id,jsonb_build_object('quantity',p_quantity,'first_unit',v_start,'last_unit',v_end));
  first_serial:=upper(v_lot.code)||'-'||lpad(v_start::text,6,'0'); last_serial:=upper(v_lot.code)||'-'||lpad(v_end::text,6,'0'); generated_count:=p_quantity; return next;
end;
$$;
