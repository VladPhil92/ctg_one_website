-- CTG One 0107 — Authorization Surface Hardening
-- Restrict internal/redundant SECURITY DEFINER RPCs to the trusted server role.
-- Canonical authenticated entry points remain unchanged.

revoke execute on function public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,bigint,numeric,numeric,integer) from public, anon, authenticated;
grant execute on function public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,bigint,numeric,numeric,integer) to service_role;

revoke execute on function public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,bigint,numeric,numeric) from public, anon, authenticated;
grant execute on function public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,bigint,numeric,numeric) to service_role;

revoke execute on function public.get_inventory_reconciliation(uuid) from public, anon, authenticated;
grant execute on function public.get_inventory_reconciliation(uuid) to service_role;

revoke execute on function public.get_investment_money_rail_health() from public, anon, authenticated;
grant execute on function public.get_investment_money_rail_health() to service_role;

revoke execute on function public.get_investment_provider_reconciliation_health() from public, anon, authenticated;
grant execute on function public.get_investment_provider_reconciliation_health() to service_role;

revoke execute on function public.get_sales_return_reconciliation(uuid) from public, anon, authenticated;
grant execute on function public.get_sales_return_reconciliation(uuid) to service_role;
