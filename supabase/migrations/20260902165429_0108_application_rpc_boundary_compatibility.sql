-- 0108: restore authenticated execution only for SECURITY DEFINER RPCs that
-- are still part of the live browser application contract.
--
-- 0107 intentionally revoked a reviewed set while tightening the internal
-- surface. Five of those functions are still invoked directly by authenticated
-- admin UI flows and already fail closed through explicit investment permission
-- checks. Keep the genuinely internal money-rail helper service-role-only.

REVOKE EXECUTE ON FUNCTION public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,bigint,numeric,numeric,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,bigint,numeric,numeric,integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,bigint,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,bigint,numeric,numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_inventory_reconciliation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_reconciliation(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_investment_provider_reconciliation_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_investment_provider_reconciliation_health() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_sales_return_reconciliation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_return_reconciliation(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_investment_money_rail_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_investment_money_rail_health() TO service_role;
