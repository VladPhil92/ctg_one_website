-- CTG Craft Beer Investment OS — economics function privilege hardening
--
-- New PostgreSQL functions can inherit explicit Supabase client-role grants.
-- The economics master-data RPC must never be callable by anon even though it
-- also revalidates production.manage internally.

revoke all on function public.update_investment_beer_style_economics(
  text,bigint,bigint,bigint,bigint,numeric,numeric
) from public, anon;

grant execute on function public.update_investment_beer_style_economics(
  text,bigint,bigint,bigint,bigint,numeric,numeric
) to authenticated;
