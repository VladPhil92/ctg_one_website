-- CTG Craft Beer Investment OS — role administration + action-level enforcement.
-- Requires 0009_production_traceability_os.sql and 0010_investment_rbac.sql.

-- Readable roster for SUPER_ADMIN only. Returns global identity + investment role.
create or replace function public.list_investment_role_assignments()
returns table(
  user_id uuid,
  email text,
  full_name text,
  global_role text,
  investment_role text,
  investment_kyc_status text,
  created_at timestamptz
)
language plpgsql security definer set search_path=public
as $$
begin
  if public.get_investment_role() <> 'SUPER_ADMIN' then
    raise exception 'not authorized';
  end if;
  return query
    select p.id, p.email, p.full_name, p.role,
           coalesce(ip.investment_role,'PARTICIPANT'),
           coalesce(ip.kyc_status,'NOT_STARTED'), p.created_at
    from public.profiles p
    left join public.investment_participant_profiles ip on ip.user_id=p.id
    order by p.created_at desc;
end;
$$;

-- Assign/revoke one investment role. PARTICIPANT is the explicit revocation target.
create or replace function public.set_investment_user_role(p_user_id uuid, p_role text)
returns text
language plpgsql security definer set search_path=public
as $$
declare
  v_previous text;
  v_email text;
begin
  if public.get_investment_role() <> 'SUPER_ADMIN' then raise exception 'not authorized'; end if;
  if p_role not in ('SUPER_ADMIN','FINANCE_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER','SALES_MANAGER','AUDITOR','PARTICIPANT') then
    raise exception 'invalid investment role';
  end if;
  if p_user_id = auth.uid() and p_role <> 'SUPER_ADMIN' then
    raise exception 'a SUPER_ADMIN cannot revoke their own SUPER_ADMIN role';
  end if;
  select email into v_email from public.profiles where id=p_user_id;
  if v_email is null then raise exception 'user not found'; end if;
  select investment_role into v_previous from public.investment_participant_profiles where user_id=p_user_id;
  insert into public.investment_participant_profiles(user_id,investment_role)
  values(p_user_id,p_role)
  on conflict(user_id) do update set investment_role=excluded.investment_role;
  insert into public.investment_audit_log(actor_id,action,entity,entity_id,old_value,new_value)
  values(auth.uid(),'set_investment_user_role','investment_participant_profiles',p_user_id,
    jsonb_build_object('investment_role',coalesce(v_previous,'PARTICIPANT')),
    jsonb_build_object('investment_role',p_role,'email',v_email));
  return p_role;
end;
$$;

revoke all on function public.list_investment_role_assignments() from public;
revoke all on function public.set_investment_user_role(uuid,text) from public;
grant execute on function public.list_investment_role_assignments() to authenticated;
grant execute on function public.set_investment_user_role(uuid,text) to authenticated;

-- Replace traceability RPC authorization with explicit domain permissions.
create or replace function public.update_bottle_units_status(
  p_lot_id uuid, p_serial_codes text[], p_new_status text, p_location text default null
)
returns int
language plpgsql security definer set search_path=public
as $$
declare v_count int; v_movement text; v_authorized boolean;
begin
  v_authorized := case
    when p_new_status='QC_APPROVED' then public.has_investment_permission('production.manage')
    when p_new_status in ('WAREHOUSE','DISPATCHED','DAMAGED','LOST','EXPIRED','RECALLED') then public.has_investment_permission('inventory.manage')
    when p_new_status in ('IN_MARKET','RETURNED') then public.has_investment_permission('inventory.manage') or public.has_investment_permission('sales.manage')
    else false end;
  if not v_authorized then raise exception 'not authorized for this bottle transition'; end if;
  if p_new_status not in ('QC_APPROVED','WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED','DAMAGED','LOST','EXPIRED','RECALLED') then raise exception 'unsupported unit status'; end if;
  if coalesce(array_length(p_serial_codes,1),0)=0 then raise exception 'at least one serial is required'; end if;
  update public.investment_bottle_units
    set status=p_new_status,current_location=coalesce(nullif(trim(p_location),''),current_location),last_actor_id=auth.uid(),updated_at=now()
    where lot_id=p_lot_id and serial_code=any(p_serial_codes) and status<>'SOLD';
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'no eligible bottle units found'; end if;
  v_movement:=case p_new_status when 'WAREHOUSE' then 'WAREHOUSE_RECEIPT' when 'DISPATCHED' then 'DISPATCHED' when 'IN_MARKET' then 'RECEIVED_AT_DESTINATION' when 'RETURNED' then 'RETURNED' when 'DAMAGED' then 'DAMAGED' when 'LOST' then 'LOST' when 'EXPIRED' then 'EXPIRED' else null end;
  if v_movement is not null then insert into public.investment_inventory_movements(lot_id,movement_type,quantity_units,actor_id) values(p_lot_id,v_movement,v_count,auth.uid()); end if;
  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value) values(auth.uid(),'update_bottle_units_status','investment_production_lots',p_lot_id,jsonb_build_object('status',p_new_status,'count',v_count,'location',p_location));
  return v_count;
end;
$$;

create or replace function public.record_bottle_sales(
  p_lot_id uuid,p_serial_codes text[],p_unit_price_cents bigint,p_sale_reference text default null,p_location text default null
)
returns table(sold_count int,revenue_cents bigint)
language plpgsql security definer set search_path=public
as $$
declare v_count int; v_revenue bigint;
begin
  if not public.has_investment_permission('sales.manage') then raise exception 'not authorized'; end if;
  if p_unit_price_cents is null or p_unit_price_cents<=0 then raise exception 'unit price must be positive'; end if;
  if coalesce(array_length(p_serial_codes,1),0)=0 then raise exception 'at least one serial is required'; end if;
  update public.investment_bottle_units set status='SOLD',sold_at=now(),sale_price_cents=p_unit_price_cents,sale_reference=nullif(trim(p_sale_reference),''),current_location=coalesce(nullif(trim(p_location),''),current_location),last_actor_id=auth.uid(),updated_at=now()
    where lot_id=p_lot_id and serial_code=any(p_serial_codes) and status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED');
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'no sellable bottle units found'; end if;
  v_revenue:=v_count::bigint*p_unit_price_cents;
  insert into public.investment_inventory_movements(lot_id,movement_type,quantity_units,actor_id) values(p_lot_id,'SOLD',v_count,auth.uid());
  insert into public.investment_lot_financial_entries(lot_id,entry_type,amount_cents,description,actor_id) values(p_lot_id,'REVENUE',v_revenue,concat('Unit sales',case when nullif(trim(p_sale_reference),'') is not null then ' · '||trim(p_sale_reference) else '' end),auth.uid());
  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value) values(auth.uid(),'record_bottle_sales','investment_production_lots',p_lot_id,jsonb_build_object('sold_count',v_count,'unit_price_cents',p_unit_price_cents,'revenue_cents',v_revenue,'reference',p_sale_reference));
  sold_count:=v_count; revenue_cents:=v_revenue; return next;
end;
$$;

create or replace function public.generate_bottle_units(p_lot_id uuid,p_quantity int)
returns table(first_serial text,last_serial text,generated_count int)
language plpgsql security definer set search_path=public
as $$
declare v_lot public.investment_production_lots;v_existing int;v_capacity int;v_start int;v_end int;v_i int;v_serial text;
begin
  if not public.has_investment_permission('production.manage') then raise exception 'not authorized'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'quantity must be positive'; end if;
  select * into v_lot from public.investment_production_lots where id=p_lot_id for update;
  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status not in ('BOTTLING','QUALITY_CONTROL','WAREHOUSE') then raise exception 'bottle units can only be generated during bottling, quality control or warehouse'; end if;
  v_capacity:=v_lot.total_cases*v_lot.case_size_units;
  select count(*) into v_existing from public.investment_bottle_units where lot_id=p_lot_id;
  if v_existing+p_quantity>v_capacity then raise exception 'generation exceeds lot unit capacity'; end if;
  select coalesce(max(unit_number),0)+1 into v_start from public.investment_bottle_units where lot_id=p_lot_id;v_end:=v_start+p_quantity-1;
  for v_i in v_start..v_end loop v_serial:=upper(v_lot.code)||'-'||lpad(v_i::text,6,'0');insert into public.investment_bottle_units(lot_id,unit_number,serial_code,status,packaged_at,last_actor_id) values(p_lot_id,v_i,v_serial,'PACKAGED',now(),auth.uid());end loop;
  insert into public.investment_inventory_movements(lot_id,movement_type,quantity_units,actor_id) values(p_lot_id,'PACKAGED',p_quantity,auth.uid());
  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value) values(auth.uid(),'generate_bottle_units','investment_production_lots',p_lot_id,jsonb_build_object('quantity',p_quantity,'first_unit',v_start,'last_unit',v_end));
  first_serial:=upper(v_lot.code)||'-'||lpad(v_start::text,6,'0');last_serial:=upper(v_lot.code)||'-'||lpad(v_end::text,6,'0');generated_count:=p_quantity;return next;
end;
$$;
