-- CTG One P1.2 — retire browser access to transport-less economics compatibility RPCs.
--
-- Migrations 0044/0045 introduced transport as a first-class cost while keeping
-- temporary overloads for older clients. The production admin console now sends
-- transport explicitly. Retain the wrappers for service-role recovery only, but
-- make authenticated clients fail closed if they attempt to omit transport.

revoke all on function public.update_investment_beer_style_economics(
  text,bigint,bigint,bigint,bigint,numeric,numeric
) from public, anon, authenticated;
grant execute on function public.update_investment_beer_style_economics(
  text,bigint,bigint,bigint,bigint,numeric,numeric
) to service_role;

revoke all on function public.create_production_lot_from_style(
  text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric
) from public, anon, authenticated;
grant execute on function public.create_production_lot_from_style(
  text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric
) to service_role;
