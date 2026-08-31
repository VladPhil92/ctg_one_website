-- CTG One Wallet — Canary Execution Guardrails V1
--
-- Adds a concurrency-safe authorization wrapper for the controlled Polygon
-- real-money canary. The HTTP boundary separately enforces server-only
-- asset/amount/destination exposure limits; this database wrapper guarantees
-- that one canonical user cannot advance two Polygon crypto_send intents into
-- active execution states concurrently.
--
-- This migration does not sign, broadcast, register a transaction hash, post a
-- COP journal entry or change balances.

create or replace function public.authorize_wallet_intent_v2_server(
  p_user_id uuid,
  p_intent_id uuid,
  p_simulation_digest_sha256 text,
  p_expected_wallet_address text,
  p_expected_chain_id bigint,
  p_expected_asset_symbol text,
  p_expected_amount_base_units text,
  p_expected_destination_address text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if p_user_id is null then
    raise exception 'WALLET_AUTH_CANONICAL_USER_INVALID';
  end if;

  -- Serialize all execution-enabling authorization attempts for the same
  -- canonical user. The transaction-scoped advisory lock remains held while
  -- authorize_wallet_intent_v1_server performs its own durable transition.
  perform pg_advisory_xact_lock(
    hashtextextended('ctg-wallet-canary-single-flight:' || p_user_id::text, 0)
  );

  select i.status into v_status
  from public.wallet_intents_v2 i
  where i.id = p_intent_id
    and i.user_id = p_user_id;

  if v_status in ('created', 'authorized') and exists (
    select 1
    from public.wallet_intents_v2 other
    where other.user_id = p_user_id
      and other.id <> p_intent_id
      and other.intent_type = 'crypto_send'
      and other.rail = 'polygon'
      and other.chain_id = 137
      and other.status in ('authorized','submitted','pending_external','confirmed_external')
  ) then
    raise exception 'WALLET_AUTH_CANARY_SINGLE_FLIGHT_CONFLICT';
  end if;

  return public.authorize_wallet_intent_v1_server(
    p_user_id,
    p_intent_id,
    p_simulation_digest_sha256,
    p_expected_wallet_address,
    p_expected_chain_id,
    p_expected_asset_symbol,
    p_expected_amount_base_units,
    p_expected_destination_address
  );
end;
$$;

revoke all on function public.authorize_wallet_intent_v2_server(uuid, uuid, text, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.authorize_wallet_intent_v2_server(uuid, uuid, text, text, bigint, text, text, text)
  to service_role;

-- The service-role route must use the guarded wrapper. The underlying V1
-- implementation remains callable only by its owner so V2 can delegate inside
-- the same PostgreSQL transaction without exposing a bypass to application code.
revoke execute on function public.authorize_wallet_intent_v1_server(uuid, uuid, text, text, bigint, text, text, text)
  from service_role;
