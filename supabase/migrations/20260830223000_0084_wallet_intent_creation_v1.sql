-- CTG One Wallet — canonical Wallet Intent V1 creation boundary
--
-- This migration advances Wallet Domain V2 from a read-only intent registry to
-- a narrowly scoped, server-only creation boundary. Creating an intent records
-- what an authenticated CTG user asked to do; it does NOT authorize, sign,
-- broadcast, reconcile, post journal entries or move money.
--
-- Safety boundary:
--   * browser/authenticated roles retain no direct INSERT/UPDATE/DELETE access;
--   * the creation RPC is executable only by service_role;
--   * the caller user_id is supplied by a server route after canonical auth;
--   * only Polygon crypto_send intents are admitted in this first slice;
--   * journal posting and money movement remain unchanged and fail-closed.

-- ---------------------------------------------------------------------------
-- Bring the durable intent row up to the reviewed ctg-wallet-intent-v1 shape.
-- Existing COP rows remain compatible; new crypto intents use asset_symbol and
-- amount_base_units rather than pretending a token amount is COP cents.
-- ---------------------------------------------------------------------------
alter table public.wallet_intents_v2
  add column if not exists rail text,
  add column if not exists chain_id bigint,
  add column if not exists asset_symbol text,
  add column if not exists amount_base_units text,
  add column if not exists destination_address text,
  add column if not exists tx_hash text,
  add column if not exists replaced_by_reference text,
  add column if not exists settled_at timestamptz;

alter table public.wallet_intents_v2
  alter column currency drop not null;

alter table public.wallet_intents_v2
  drop constraint if exists wallet_intents_v2_status_check;

alter table public.wallet_intents_v2
  add constraint wallet_intents_v2_status_check check (
    status in (
      'created',
      'authorized',
      'submitted',
      'pending_external',
      'confirmed_external',
      'reconciled',
      'failed',
      'cancelled',
      'replaced'
    )
  );

alter table public.wallet_intents_v2
  add constraint wallet_intents_v2_rail_check check (
    rail is null or rail ~ '^[a-z][a-z0-9_.-]{2,31}$'
  ),
  add constraint wallet_intents_v2_chain_id_check check (
    chain_id is null or chain_id > 0
  ),
  add constraint wallet_intents_v2_asset_symbol_check check (
    asset_symbol is null or asset_symbol ~ '^[A-Z0-9]{2,12}$'
  ),
  add constraint wallet_intents_v2_amount_base_units_check check (
    amount_base_units is null
    or (length(amount_base_units) between 1 and 78 and amount_base_units ~ '^[1-9][0-9]*$')
  ),
  add constraint wallet_intents_v2_destination_address_check check (
    destination_address is null or destination_address ~ '^0x[0-9a-fA-F]{40}$'
  ),
  add constraint wallet_intents_v2_tx_hash_check check (
    tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$'
  );

create index if not exists wallet_intents_v2_user_status_updated_idx
  on public.wallet_intents_v2(user_id, status, updated_at desc);

comment on column public.wallet_intents_v2.destination_address is
  'Immutable destination requested for a crypto send intent. It is not proof of authorization or broadcast.';
comment on column public.wallet_intents_v2.tx_hash is
  'Authoritative blockchain transaction hash once separately registered by a later trusted lifecycle boundary; creation V1 never sets it.';

-- ---------------------------------------------------------------------------
-- Server-only, idempotent creation RPC.
--
-- The same canonical user + idempotency key replays the existing intent only
-- when the immutable request payload is identical. A changed payload fails
-- closed instead of silently reusing an unrelated intent.
--
-- Rate limiting is deliberately internal to this server-only RPC. We reuse the
-- durable api_rate_limit_windows table keyed by the canonical user, but do not
-- change the authenticated consume_api_rate_limit() surface or its reviewed
-- SECURITY DEFINER body.
-- ---------------------------------------------------------------------------
create or replace function public.create_wallet_intent_v1_server(
  p_user_id uuid,
  p_idempotency_key text,
  p_chain_id bigint,
  p_asset_symbol text,
  p_amount_base_units text,
  p_destination_address text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := trim(coalesce(p_idempotency_key, ''));
  v_asset_symbol text := upper(trim(coalesce(p_asset_symbol, '')));
  v_amount_base_units text := trim(coalesce(p_amount_base_units, ''));
  v_destination_address text := lower(trim(coalesce(p_destination_address, '')));
  v_row public.wallet_intents_v2;
  v_rate_row public.api_rate_limit_windows;
  v_now timestamptz := clock_timestamp();
  v_replayed boolean := false;
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_user_id
  ) then
    raise exception 'WALLET_INTENT_CANONICAL_USER_INVALID';
  end if;

  if length(v_key) < 16 or length(v_key) > 128 then
    raise exception 'WALLET_INTENT_IDEMPOTENCY_KEY_INVALID';
  end if;

  if p_chain_id is distinct from 137 then
    raise exception 'WALLET_INTENT_CHAIN_UNSUPPORTED';
  end if;

  if v_asset_symbol not in ('POL', 'CTG', 'USDC', 'USDT') then
    raise exception 'WALLET_INTENT_ASSET_UNSUPPORTED';
  end if;

  if length(v_amount_base_units) < 1
     or length(v_amount_base_units) > 78
     or v_amount_base_units !~ '^[1-9][0-9]*$' then
    raise exception 'WALLET_INTENT_AMOUNT_INVALID';
  end if;

  if v_destination_address !~ '^0x[0-9a-f]{40}$' then
    raise exception 'WALLET_INTENT_DESTINATION_INVALID';
  end if;

  -- Durable, concurrency-safe server-side limit: 20 accepted creation/replay
  -- attempts per canonical user in a rolling 5-minute window.
  insert into public.api_rate_limit_windows(
    user_id,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_user_id, 'wallet.intent-create', v_now, 0, v_now)
  on conflict (user_id, scope) do nothing;

  select * into v_rate_row
  from public.api_rate_limit_windows
  where user_id = p_user_id
    and scope = 'wallet.intent-create'
  for update;

  if v_rate_row.window_started_at + interval '5 minutes' <= v_now then
    update public.api_rate_limit_windows
    set window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    where user_id = p_user_id
      and scope = 'wallet.intent-create';
  elsif v_rate_row.request_count >= 20 then
    raise exception 'WALLET_INTENT_RATE_LIMITED';
  else
    update public.api_rate_limit_windows
    set request_count = request_count + 1,
        updated_at = v_now
    where user_id = p_user_id
      and scope = 'wallet.intent-create';
  end if;

  insert into public.wallet_intents_v2(
    user_id,
    intent_type,
    idempotency_key,
    status,
    currency,
    amount_cents,
    rail,
    chain_id,
    asset_symbol,
    amount_base_units,
    destination_address,
    metadata,
    expires_at
  ) values (
    p_user_id,
    'crypto_send',
    v_key,
    'created',
    null,
    null,
    'polygon',
    137,
    v_asset_symbol,
    v_amount_base_units,
    v_destination_address,
    jsonb_build_object('contractVersion', 'ctg-wallet-intent-v1'),
    now() + interval '15 minutes'
  )
  on conflict on constraint wallet_intents_v2_user_idempotency_unique do nothing
  returning * into v_row;

  if v_row.id is null then
    v_replayed := true;

    select * into v_row
    from public.wallet_intents_v2 i
    where i.user_id = p_user_id
      and i.idempotency_key_normalized = lower(v_key)
    limit 1;

    if v_row.id is null then
      raise exception 'WALLET_INTENT_IDEMPOTENCY_LOOKUP_FAILED';
    end if;

    if v_row.intent_type is distinct from 'crypto_send'
       or v_row.rail is distinct from 'polygon'
       or v_row.chain_id is distinct from 137
       or v_row.asset_symbol is distinct from v_asset_symbol
       or v_row.amount_base_units is distinct from v_amount_base_units
       or lower(coalesce(v_row.destination_address, '')) is distinct from v_destination_address
       or v_row.currency is not null
       or v_row.amount_cents is not null then
      raise exception 'WALLET_INTENT_IDEMPOTENCY_CONFLICT';
    end if;
  end if;

  return jsonb_build_object(
    'replayed', v_replayed,
    'intent', jsonb_build_object(
      'version', 'ctg-wallet-intent-v1',
      'id', v_row.id,
      'canonicalUserId', v_row.user_id,
      'idempotencyKey', v_row.idempotency_key,
      'kind', v_row.intent_type,
      'status', v_row.status,
      'rail', v_row.rail,
      'chainId', v_row.chain_id,
      'assetSymbol', v_row.asset_symbol,
      'amountBaseUnits', v_row.amount_base_units,
      'amountCents', v_row.amount_cents,
      'destinationAddress', v_row.destination_address,
      'txHash', v_row.tx_hash,
      'externalReference', v_row.external_reference,
      'replacedByReference', v_row.replaced_by_reference,
      'createdAt', v_row.created_at,
      'updatedAt', v_row.updated_at,
      'settledAt', v_row.settled_at
    )
  );
end;
$$;

revoke all on function public.create_wallet_intent_v1_server(uuid, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_wallet_intent_v1_server(uuid, text, bigint, text, text, text)
  to service_role;

-- Preserve the direct-table denial from the Wallet Domain V2 foundation.
revoke insert, update, delete on public.wallet_intents_v2
  from public, anon, authenticated, service_role;
