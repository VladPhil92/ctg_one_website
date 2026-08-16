-- CTG Craft Beer Investment OS — core permission guards.
-- Requires 0010_investment_rbac.sql and 0011_role_admin_and_permission_enforcement.sql.
-- Adds table-level authorization so legacy/future SECURITY DEFINER RPCs cannot bypass domain permissions.

-- Expand finance authority with an explicit write permission.
create or replace function public.has_investment_permission(p_permission text)
returns boolean
language sql stable security definer set search_path=public
as $$
  select case public.get_investment_role()
    when 'SUPER_ADMIN' then true
    when 'FINANCE_ADMIN' then p_permission = any(array['ops.read','finance.read','finance.manage','finance.settle','funding.manage','audit.read'])
    when 'PRODUCTION_MANAGER' then p_permission = any(array['ops.read','production.manage','labels.manage','inventory.manage'])
    when 'INVENTORY_MANAGER' then p_permission = any(array['ops.read','inventory.manage','labels.read'])
    when 'SALES_MANAGER' then p_permission = any(array['ops.read','sales.manage','labels.read'])
    when 'AUDITOR' then p_permission = any(array['ops.read','finance.read','audit.read','labels.read'])
    else false
  end;
$$;

-- Correct the audit column name from the previous migration and preserve SUPER_ADMIN-only role mutation.
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
  insert into public.investment_audit_log(actor_id,action,entity,entity_id,previous_value,new_value)
  values(auth.uid(),'set_investment_user_role','investment_participant_profiles',p_user_id,
    jsonb_build_object('investment_role',coalesce(v_previous,'PARTICIPANT')),
    jsonb_build_object('investment_role',p_role,'email',v_email));
  return p_role;
end;
$$;

-- Production lots: creation and normal lifecycle changes belong to Production.
-- Settlement finalization may perform the SETTLED projection and is allowed only to Finance settlement authority.
create or replace function public.guard_investment_lot_write()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if tg_op='INSERT' then
    if not public.has_investment_permission('production.manage') then raise exception 'production.manage required to create a lot'; end if;
  elsif tg_op='UPDATE' then
    if new.status is distinct from old.status and new.status='SETTLED' then
      if not public.has_investment_permission('finance.settle') then raise exception 'finance.settle required to finalize a lot'; end if;
    elsif not public.has_investment_permission('production.manage') then
      raise exception 'production.manage required to modify a lot';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists investment_lots_permission_guard on public.investment_production_lots;
create trigger investment_lots_permission_guard
before insert or update on public.investment_production_lots
for each row execute function public.guard_investment_lot_write();

-- Coarse inventory ledger: each movement class has one explicit authority.
create or replace function public.guard_investment_inventory_movement()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.movement_type in ('PRODUCED','PACKAGED') then
    if not public.has_investment_permission('production.manage') then raise exception 'production.manage required'; end if;
  elsif new.movement_type='SOLD' then
    if not public.has_investment_permission('sales.manage') then raise exception 'sales.manage required'; end if;
  else
    if not public.has_investment_permission('inventory.manage') then raise exception 'inventory.manage required'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists investment_inventory_permission_guard on public.investment_inventory_movements;
create trigger investment_inventory_permission_guard
before insert on public.investment_inventory_movements
for each row execute function public.guard_investment_inventory_movement();

-- Lot financial facts: sales may recognize REVENUE; all other manual financial facts require Finance write authority.
create or replace function public.guard_investment_financial_entry()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if new.entry_type='REVENUE' then
    if not (public.has_investment_permission('sales.manage') or public.has_investment_permission('finance.manage')) then
      raise exception 'sales.manage or finance.manage required for revenue';
    end if;
  elsif not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required for financial entries';
  end if;
  return new;
end;
$$;

drop trigger if exists investment_financial_permission_guard on public.investment_lot_financial_entries;
create trigger investment_financial_permission_guard
before insert on public.investment_lot_financial_entries
for each row execute function public.guard_investment_financial_entry();

-- Funding allocations are economic commitments and therefore Finance/Funding authority only.
create or replace function public.guard_investment_allocation_insert()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if not public.has_investment_permission('funding.manage') then raise exception 'funding.manage required'; end if;
  return new;
end;
$$;

drop trigger if exists investment_allocation_permission_guard on public.investment_funding_allocations;
create trigger investment_allocation_permission_guard
before insert on public.investment_funding_allocations
for each row execute function public.guard_investment_allocation_insert();

-- Investment orders: participant-owned creation/payment states remain participant actions;
-- verification, allocation and rejection are funding administration actions.
create or replace function public.guard_investment_order_write()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if tg_op='INSERT' then
    if new.participant_user_id<>auth.uid() then raise exception 'cannot create an order for another participant'; end if;
  elsif tg_op='UPDATE' then
    if new.status in ('PAYMENT_VERIFIED','ALLOCATED','REJECTED') and new.status is distinct from old.status then
      if not public.has_investment_permission('funding.manage') then raise exception 'funding.manage required'; end if;
    elsif old.participant_user_id<>auth.uid() and not public.has_investment_permission('funding.manage') then
      raise exception 'not authorized to modify this order';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists investment_orders_permission_guard on public.investment_orders;
create trigger investment_orders_permission_guard
before insert or update on public.investment_orders
for each row execute function public.guard_investment_order_write();

-- Settlement creation is an irreversible finance operation.
create or replace function public.guard_investment_settlement_insert()
returns trigger
language plpgsql security definer set search_path=public
as $$
begin
  if not public.has_investment_permission('finance.settle') then raise exception 'finance.settle required'; end if;
  return new;
end;
$$;

drop trigger if exists investment_settlement_permission_guard on public.investment_settlements;
create trigger investment_settlement_permission_guard
before insert on public.investment_settlements
for each row execute function public.guard_investment_settlement_insert();

-- Revoke public execution of guard functions; triggers remain able to invoke them.
revoke all on function public.guard_investment_lot_write() from public;
revoke all on function public.guard_investment_inventory_movement() from public;
revoke all on function public.guard_investment_financial_entry() from public;
revoke all on function public.guard_investment_allocation_insert() from public;
revoke all on function public.guard_investment_order_write() from public;
revoke all on function public.guard_investment_settlement_insert() from public;
