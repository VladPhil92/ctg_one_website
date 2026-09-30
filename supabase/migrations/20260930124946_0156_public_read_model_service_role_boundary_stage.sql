-- 0156: stage CTG One public read models behind the server-only service-role boundary.
-- This migration is intentionally additive. Direct anon/authenticated execution remains
-- available until the application callers have been deployed through createAdminClient().

revoke all on function public.get_public_bottle_trace(text) from public;
revoke all on function public.get_public_investment_lot_funding(uuid) from public;
revoke all on function public.get_public_investment_lot_operations(uuid) from public;

grant execute on function public.get_public_bottle_trace(text) to anon, authenticated, service_role;
grant execute on function public.get_public_investment_lot_funding(uuid) to anon, authenticated, service_role;
grant execute on function public.get_public_investment_lot_operations(uuid) to anon, authenticated, service_role;

comment on function public.get_public_bottle_trace(text) is
  'Curated bottle-trace read model. Stage 0156 guarantees server-only service-role execution before browser-role grants are removed in the follow-up hardening migration.';
comment on function public.get_public_investment_lot_funding(uuid) is
  'Aggregate public funding read model. Stage 0156 guarantees server-only service-role execution before browser-role grants are removed in the follow-up hardening migration.';
comment on function public.get_public_investment_lot_operations(uuid) is
  'Curated public lot operations read model. Stage 0156 guarantees server-only service-role execution before browser-role grants are removed in the follow-up hardening migration.';
