-- CTG One Wallet — Wallet Intent Submission V1
--
-- Advances an already authorized Polygon crypto_send intent to `submitted`
-- only after CTG One has independently verified the broadcast transaction hash
-- against the immutable intent and canonical Privy signer.
--
-- This migration records external-chain submission evidence only. It does not
-- confirm finality, reconcile settlement, post Wallet V2 journal entries or
-- mutate COP balances.

alter table public.wallet_intents_v2
  add column if not exists submitted_at timestamptz;

alter table public.wallet_intents_v2
  add constraint wallet_intents_v2_submission_timestamp_check check (
    submitted_at is null
    or (
      intent_type = 'crypto_send'
      and authorized_at is not null
      and authorized_wallet_address is not null
      and simulation_digest_sha256 is not null
      and tx_hash is not null
      and status in ('submitted','pending_external','confirmed_external','reconciled','failed','replaced')
    )
  );

comment on column public.wallet_intents_v2.submitted_at is
  'Timestamp at which CTG One durably registered a trusted-verified external transaction hash for an authorized crypto intent.';

-- A Polygon transaction hash may represent only one canonical wallet intent.
do $$
begin
  if exists (
    select lower(tx_hash)
    from public.wallet_intents_v2
    where rail = 'polygon' and tx_hash is not null
    group by lower(tx_hash)
    having count(*) > 1
  ) then
    raise exception 'WALLET_SUBMISSION_EXISTING_TX_HASH_COLLISION';
  end if;
end $$;

create unique index if not exists wallet_intents_v2_polygon_tx_hash_unique
  on public.wallet_intents_v2 (lower(tx_hash))
  where rail = 'polygon' and tx_hash is not null;

create index if not exists wallet_intents_v2_submitted_user_idx
  on public.wallet_intents_v2(user_id, submitted_at desc)
  where submitted_at is not null;

create or replace function public.submit_wallet_intent_v1_server(
  p_user_id uuid,
  p_intent_id uuid,
  p_tx_hash text,
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
  v_tx_hash text := lower(trim(coalesce(p_tx_hash, '')));
  v_expected_wallet text := lower(trim(coalesce(p_expected_wallet_address, '')));
  v_expected_asset text := upper(trim(coalesce(p_expected_asset_symbol, '')));
  v_expected_amount text := trim(coalesce(p_expected_amount_base_units, ''));
  v_expected_destination text := lower(trim(coalesce(p_expected_destination_address, '')));
  v_intent public.wallet_intents_v2;
  v_rate_row public.api_rate_limit_windows;
  v_now timestamptz := clock_timestamp();
  v_replayed boolean := false;
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_user_id
  ) then
    raise exception 'WALLET_SUBMISSION_CANONICAL_USER_INVALID';
  end if;

  if p_intent_id is null then
    raise exception 'WALLET_SUBMISSION_INTENT_ID_INVALID';
  end if;
  if v_tx_hash !~ '^0x[0-9a-f]{64}$' then
    raise exception 'WALLET_SUBMISSION_TX_HASH_INVALID';
  end if;
  if v_expected_wallet !~ '^0x[0-9a-f]{40}$'
     or v_expected_destination !~ '^0x[0-9a-f]{40}$' then
    raise exception 'WALLET_SUBMISSION_EXPECTED_ADDRESS_INVALID';
  end if;
  if p_expected_chain_id is distinct from 137 then
    raise exception 'WALLET_SUBMISSION_EXPECTED_CHAIN_INVALID';
  end if;
  if v_expected_asset not in ('POL','CTG','USDC','USDT') then
    raise exception 'WALLET_SUBMISSION_EXPECTED_ASSET_INVALID';
  end if;
  if length(v_expected_amount) < 1
     or length(v_expected_amount) > 78
     or v_expected_amount !~ '^[1-9][0-9]*$' then
    raise exception 'WALLET_SUBMISSION_EXPECTED_AMOUNT_INVALID';
  end if;

  insert into public.api_rate_limit_windows(
    user_id,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_user_id, 'wallet.intent-submit', v_now, 0, v_now)
  on conflict (user_id, scope) do nothing;

  select * into v_rate_row
  from public.api_rate_limit_windows
  where user_id = p_user_id
    and scope = 'wallet.intent-submit'
  for update;

  if v_rate_row.window_started_at + interval '5 minutes' <= v_now then
    update public.api_rate_limit_windows
    set window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    where user_id = p_user_id
      and scope = 'wallet.intent-submit';
  elsif v_rate_row.request_count >= 30 then
    raise exception 'WALLET_SUBMISSION_RATE_LIMITED';
  else
    update public.api_rate_limit_windows
    set request_count = request_count + 1,
        updated_at = v_now
    where user_id = p_user_id
      and scope = 'wallet.intent-submit';
  end if;

  select * into v_intent
  from public.wallet_intents_v2
  where id = p_intent_id
  for update;

  if v_intent.id is null or v_intent.user_id is distinct from p_user_id then
    raise exception 'WALLET_SUBMISSION_INTENT_NOT_FOUND';
  end if;

  if v_intent.intent_type is distinct from 'crypto_send'
     or v_intent.rail is distinct from 'polygon'
     or v_intent.chain_id is distinct from 137
     or v_intent.asset_symbol is null
     or v_intent.amount_base_units is null
     or v_intent.destination_address is null then
    raise exception 'WALLET_SUBMISSION_INTENT_SHAPE_INVALID';
  end if;

  if v_intent.chain_id is distinct from p_expected_chain_id
     or v_intent.asset_symbol is distinct from v_expected_asset
     or v_intent.amount_base_units is distinct from v_expected_amount
     or lower(v_intent.destination_address) is distinct from v_expected_destination then
    raise exception 'WALLET_SUBMISSION_INTENT_BINDING_CONFLICT';
  end if;

  if v_intent.authorized_at is null
     or v_intent.authorized_wallet_address is null
     or v_intent.simulation_digest_sha256 is null then
    raise exception 'WALLET_SUBMISSION_AUTHORIZATION_EVIDENCE_MISSING';
  end if;
  if lower(v_intent.authorized_wallet_address) is distinct from v_expected_wallet then
    raise exception 'WALLET_SUBMISSION_SIGNER_BINDING_CONFLICT';
  end if;
  if v_intent.external_reference is not null or v_intent.settled_at is not null then
    raise exception 'WALLET_SUBMISSION_EXTERNAL_STATE_CONFLICT';
  end if;

  if v_intent.status = 'submitted' then
    v_replayed := true;
    if lower(coalesce(v_intent.tx_hash, '')) is distinct from v_tx_hash
       or v_intent.submitted_at is null then
      raise exception 'WALLET_SUBMISSION_REPLAY_CONFLICT';
    end if;
  elsif v_intent.status = 'authorized' then
    -- An authorization is intentionally short-lived. Once a transaction is
    -- broadcast, however, registration retries use the durable submitted state
    -- and never ask the client to broadcast again.
    if v_intent.authorized_at + interval '10 minutes' <= v_now then
      raise exception 'WALLET_SUBMISSION_AUTHORIZATION_EXPIRED';
    end if;

    if exists (
      select 1
      from public.wallet_intents_v2 i
      where i.id <> v_intent.id
        and i.rail = 'polygon'
        and i.tx_hash is not null
        and lower(i.tx_hash) = v_tx_hash
    ) then
      raise exception 'WALLET_SUBMISSION_TX_HASH_CONFLICT';
    end if;

    update public.wallet_intents_v2
    set status = 'submitted',
        tx_hash = v_tx_hash,
        submitted_at = v_now,
        updated_at = v_now
    where id = v_intent.id
    returning * into v_intent;
  else
    raise exception 'WALLET_SUBMISSION_STATUS_INVALID';
  end if;

  return jsonb_build_object(
    'version', 'ctg-wallet-submission-v1',
    'replayed', v_replayed,
    'submittedAt', v_intent.submitted_at,
    'submittedWalletAddress', v_intent.authorized_wallet_address,
    'txHash', v_intent.tx_hash,
    'intent', jsonb_build_object(
      'version', 'ctg-wallet-intent-v1',
      'id', v_intent.id,
      'canonicalUserId', v_intent.user_id,
      'idempotencyKey', v_intent.idempotency_key,
      'kind', v_intent.intent_type,
      'status', v_intent.status,
      'rail', v_intent.rail,
      'chainId', v_intent.chain_id,
      'assetSymbol', v_intent.asset_symbol,
      'amountBaseUnits', v_intent.amount_base_units,
      'amountCents', v_intent.amount_cents,
      'destinationAddress', v_intent.destination_address,
      'txHash', v_intent.tx_hash,
      'externalReference', v_intent.external_reference,
      'replacedByReference', v_intent.replaced_by_reference,
      'createdAt', v_intent.created_at,
      'updatedAt', v_intent.updated_at,
      'settledAt', v_intent.settled_at
    )
  );
end;
$$;

revoke all on function public.submit_wallet_intent_v1_server(uuid, uuid, text, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_wallet_intent_v1_server(uuid, uuid, text, text, bigint, text, text, text)
  to service_role;

revoke insert, update, delete on public.wallet_intents_v2
  from public, anon, authenticated, service_role;
