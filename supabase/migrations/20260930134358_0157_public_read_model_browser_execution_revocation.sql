-- 0157: complete the server-only contraction for curated public read models.
-- Application SHA 2974bd8867b4f39f0a0d7e7cd265c9bfc79a08ee was verified live before
-- this migration was applied to production. The application invokes these
-- SECURITY DEFINER read models only through createAdminClient()/service_role.
-- Browser roles therefore no longer require direct EXECUTE.

revoke all on function public.get_public_bottle_trace(text)
  from public, anon, authenticated;
revoke all on function public.get_public_investment_lot_funding(uuid)
  from public, anon, authenticated;
revoke all on function public.get_public_investment_lot_operations(uuid)
  from public, anon, authenticated;

grant execute on function public.get_public_bottle_trace(text) to service_role;
grant execute on function public.get_public_investment_lot_funding(uuid) to service_role;
grant execute on function public.get_public_investment_lot_operations(uuid) to service_role;

comment on function public.get_public_bottle_trace(text) is
  'Curated bottle-trace read model. Direct browser execution revoked in 0157; invoke only through the server-only service-role boundary.';
comment on function public.get_public_investment_lot_funding(uuid) is
  'Aggregate funding read model. Direct browser execution revoked in 0157; invoke only through the server-only service-role boundary.';
comment on function public.get_public_investment_lot_operations(uuid) is
  'Curated lot-operations read model. Direct browser execution revoked in 0157; invoke only through the server-only service-role boundary.';
