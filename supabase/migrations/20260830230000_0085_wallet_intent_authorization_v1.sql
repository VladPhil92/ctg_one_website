-- CTG One Wallet — canonical Wallet Intent V1 authorization boundary
--
-- Advances a durable crypto_send intent from created -> authorized only after:
--   * the CTG One server has authenticated the canonical user;
--   * a verified primary Privy embedded EVM wallet exists for that same user;
--   * the client has produced a SHA-256 digest for a successful read-only
--     Polygon simulation/preflight of the immutable intent payload.
--
-- Authorization is NOT signing, broadcast, external submission, reconciliation,
-- ledger posting or money movement. This migration never writes a tx hash,
-- external reference, journal entry or wallet balance.

alter table public.wallet_intents_v2
  add column if not exists authorized_at timestamptz,
  add column if not exists authorized_wallet_address text,
  add column if not exists simulation_digest_sha256 text;

alter table public.wallet_intents_v2
  add constraint wallet_intents_v2_authorized_wallet_address_check check (
    authorized_wallet_address is null
    or authorized_wallet_address ~ '^0x[0-9a-f]{40}$'
  ),
  add constraint wallet_intents_v2_simulation_digest_check check (
    simulation_digest_sha256 is null
    or simulation_digest_sha256 ~ '^[0-9a-f]{64}$'
  ),
  add constraint wallet_intents_v2_authorization_evidence_check check (
    (authorized_at is null and authorized_wallet_address is null and simulation_digest_sha256 is null)
    or (
      authorized_at is not null
      and authorized_wallet_address is not null
      and simulation_digest_sha256 is not null
      and status in ('authorized','submitted','pending_external','confirmed_external','reconciled','failed','cancelled','replaced')
    )
  );

comment on column public.wallet_intents_v2.authorized_wallet_address is
  'Verified primary Privy embedded EVM wallet derived server-side from the canonical identity registry at authorization time.';
comment on column public.wallet_intents_v2.simulation_digest_sha256 is
  'SHA-256 digest of the successful client read-only simulation/preflight evidence bound to this authorization. It is not a transaction signature.';

create index if not exists wallet_intents_v2_authorized_user_idx
  on public.wallet_intents_v2(user_id, authorized_at desc)
  where authorized_at is not null;

create or replace function public.authorize_wallet_intent_v1_server(
  p_user_id uuid,
  p_intent_id uuid,
  p_simulation_digest_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digest text := lower(trim(coalesce(p_simulation_digest_sha256, '')));
  v_intent public.wallet_intents_v2;
  v_primary_wallet public.wallet_external_accounts;
  v_identity public.wallet_identity_links;
  v_rate_row public.api_rate_limit_windows;
  v_now timestamptz := clock_timestamp();
  v_replayed boolean := false;
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_user_id
  ) then
    raise exception 'WALLET_AUTH_CANONICAL_USER_INVALID';
  end if;

  if p_intent_id is null then
    raise exception 'WALLET_AUTH_INTENT_ID_INVALID';
  end if;

  if v_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'WALLET_AUTH_SIMULATION_DIGEST_INVALID';
  end if;

  -- Durable, concurrency-safe authorization limit. Kept server-only so no new
  -- authenticated SECURITY DEFINER surface is introduced.
  insert into public.api_rate_limit_windows(
    user_id,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_user_id, 'wallet.intent-authorize', v_now, 0, v_now)
  on conflict (user_id, scope) do nothing;

  select * into v_rate_row
  from public.api_rate_limit_windows
  where user_id = p_user_id
    and scope = 'wallet.intent-authorize'
  for update;

  if v_rate_row.window_started_at + interval '5 minutes' <= v_now then
    update public.api_rate_limit_windows
    set window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    where user_id = p_user_id
      and scope = 'wallet.intent-authorize';
  elsif v_rate_row.request_count >= 20 then
    raise exception 'WALLET_AUTH_RATE_LIMITED';
  else
    update public.api_rate_limit_windows
    set request_count = request_count + 1,
        updated_at = v_now
    where user_id = p_user_id
      and scope = 'wallet.intent-authorize';
  end if;

  -- Resolve signing identity only from trusted server-owned registry facts.
  select a.* into v_primary_wallet
  from public.wallet_external_accounts a
  join public.wallet_identity_links l
    on l.id = a.identity_link_id
   and l.user_id = a.user_id
  where a.user_id = p_user_id
    and a.provider = 'privy'
    and a.chain_family = 'evm'
    and a.account_kind = 'embedded'
    and a.status = 'verified'
    and a.is_primary is true
    and l.provider = 'privy'
    and l.status = 'verified'
  limit 1;

  if v_primary_wallet.id is null then
    raise exception 'WALLET_AUTH_SIGNER_UNAVAILABLE';
  end if;

  select * into v_identity
  from public.wallet_identity_links
  where id = v_primary_wallet.identity_link_id
    and user_id = p_user_id
    and provider = 'privy'
    and status = 'verified'
  limit 1;

  if v_identity.id is null then
    raise exception 'WALLET_AUTH_IDENTITY_UNVERIFIED';
  end if;

  select * into v_intent
  from public.wallet_intents_v2
  where id = p_intent_id
  for update;

  if v_intent.id is null or v_intent.user_id is distinct from p_user_id then
    raise exception 'WALLET_AUTH_INTENT_NOT_FOUND';
  end if;

  if v_intent.intent_type is distinct from 'crypto_send'
     or v_intent.rail is distinct from 'polygon'
     or v_intent.chain_id is distinct from 137
     or v_intent.asset_symbol is null
     or v_intent.asset_symbol not in ('POL','CTG','USDC','USDT')
     or v_intent.amount_base_units is null
     or v_intent.destination_address is null then
    raise exception 'WALLET_AUTH_INTENT_SHAPE_INVALID';
  end if;

  if v_intent.expires_at is null or v_intent.expires_at <= v_now then
    raise exception 'WALLET_AUTH_INTENT_EXPIRED';
  end if;

  if v_intent.tx_hash is not null
     or v_intent.external_reference is not null
     or v_intent.settled_at is not null then
    raise exception 'WALLET_AUTH_EXTERNAL_STATE_PRESENT';
  end if;

  if v_intent.status = 'authorized' then
    v_replayed := true;
    if v_intent.authorized_wallet_address is distinct from v_primary_wallet.address_normalized
       or v_intent.simulation_digest_sha256 is distinct from v_digest
       or v_intent.authorized_at is null then
      raise exception 'WALLET_AUTH_REPLAY_CONFLICT';
    end if;
  elsif v_intent.status = 'created' then
    update public.wallet_intents_v2
    set status = 'authorized',
        authorized_at = v_now,
        authorized_wallet_address = v_primary_wallet.address_normalized,
        simulation_digest_sha256 = v_digest,
        updated_at = v_now
    where id = v_intent.id
    returning * into v_intent;
  else
    raise exception 'WALLET_AUTH_STATUS_INVALID';
  end if;

  return jsonb_build_object(
    'version', 'ctg-wallet-authorization-v1',
    'replayed', v_replayed,
    'authorizedAt', v_intent.authorized_at,
    'authorizedWalletAddress', v_intent.authorized_wallet_address,
    'simulationDigestSha256', v_intent.simulation_digest_sha256,
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

revoke all on function public.authorize_wallet_intent_v1_server(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.authorize_wallet_intent_v1_server(uuid, uuid, text)
  to service_role;

-- Keep all direct mutation blocked. Authorization is possible only through the
-- reviewed server command above.
revoke insert, update, delete on public.wallet_intents_v2
  from public, anon, authenticated, service_role;
