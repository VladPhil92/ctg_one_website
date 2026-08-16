-- CTG Craft Beer Investment OS — granular domain RBAC.
-- Additive: public.profiles remains the global /admin boundary.

create or replace function public.get_investment_role()
returns text language sql stable security definer set search_path=public as $$
 select coalesce((select investment_role from public.investment_participant_profiles where user_id=auth.uid() limit 1),'PARTICIPANT');
$$;

create or replace function public.has_investment_permission(p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
 select case public.get_investment_role()
  when 'SUPER_ADMIN' then true
  when 'FINANCE_ADMIN' then p_permission=any(array['ops.read','finance.read','finance.settle','funding.manage','audit.read'])
  when 'PRODUCTION_MANAGER' then p_permission=any(array['ops.read','production.manage','labels.manage','inventory.manage'])
  when 'INVENTORY_MANAGER' then p_permission=any(array['ops.read','inventory.manage','labels.read'])
  when 'SALES_MANAGER' then p_permission=any(array['ops.read','sales.manage','labels.read'])
  when 'AUDITOR' then p_permission=any(array['ops.read','finance.read','audit.read','labels.read'])
  else false end;
$$;
revoke all on function public.get_investment_role() from public;
revoke all on function public.has_investment_permission(text) from public;
grant execute on function public.get_investment_role() to authenticated;
grant execute on function public.has_investment_permission(text) to authenticated;
