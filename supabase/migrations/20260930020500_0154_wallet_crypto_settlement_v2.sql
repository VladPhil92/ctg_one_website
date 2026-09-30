-- CTG One Wallet — Crypto Settlement V2
--
-- One-time public deposit addresses can be provisioned into a private pool.
-- A quote atomically leases one available address. Leased addresses are never
-- recycled by application code, preventing late transfers from being attributed
-- to a later claimant. If the pool is empty, the shared operator address remains
-- available but stays manual-review-only.

create table private.wallet_crypto_deposit_addresses (
  id uuid primary key default gen_random_uuid(),
  asset text not null check (asset in ('BTC','ETH','BNB','USDT','USDC')),
  network text not null check (length(btrim(network)) > 0),
  address text not null check (length(btrim(address)) >= 16),
  derivation_reference text,
  source_fingerprint text,
  status text not null default 'available' check (status in ('available','assigned','retired')),
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wallet_crypto_deposit_addresses_unique unique (asset, network, address),
  constraint wallet_crypto_deposit_addresses_assignment_shape check (
    status <> 'assigned' or assigned_at is not null
  )
);

alter table private.wallet_crypto_deposit_addresses enable row level security;
revoke all on private.wallet_crypto_deposit_addresses from public, anon, authenticated, service_role;
grant usage on schema private to service_role;
grant select, insert, update on private.wallet_crypto_deposit_addresses to service_role;

alter table public.wallet_crypto_quotes
  add column settlement_binding text not null default 'shared-operator-address'
    check (settlement_binding in ('shared-operator-address','claimant-specific-address')),
  add column deposit_address_id uuid references private.wallet_crypto_deposit_addresses(id) on delete restrict;

alter table public.wallet_crypto_quotes
  add constraint wallet_crypto_quotes_binding_shape check (
    settlement_binding <> 'claimant-specific-address' or deposit_address_id is not null
  );

create unique index wallet_crypto_quotes_deposit_address_unique
  on public.wallet_crypto_quotes(deposit_address_id)
  where deposit_address_id is not null;

alter table public.wallet_crypto_topup_claims
  add column settlement_binding text not null default 'shared-operator-address'
    check (settlement_binding in ('shared-operator-address','claimant-specific-address')),
  add column deposit_address_id uuid references private.wallet_crypto_deposit_addresses(id) on delete restrict;

alter table public.wallet_crypto_topup_claims
  add constraint wallet_crypto_topup_claims_binding_shape check (
    settlement_binding <> 'claimant-specific-address' or deposit_address_id is not null
  );

create or replace function public.provision_wallet_crypto_deposit_address_server(
  p_asset text,
  p_network text,
  p_address text,
  p_derivation_reference text default null,
  p_source_fingerprint text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_asset text := upper(btrim(coalesce(p_asset,'')));
  v_network text := btrim(coalesce(p_network,''));
  v_address text := btrim(coalesce(p_address,''));
begin
  if v_asset not in ('BTC','ETH','BNB','USDT','USDC') then
    raise exception 'CRYPTO_DEPOSIT_ADDRESS_ASSET_INVALID';
  end if;
  if length(v_network) = 0 then raise exception 'CRYPTO_DEPOSIT_ADDRESS_NETWORK_INVALID'; end if;
  if length(v_address) < 16 then raise exception 'CRYPTO_DEPOSIT_ADDRESS_INVALID'; end if;

  insert into private.wallet_crypto_deposit_addresses(
    asset, network, address, derivation_reference, source_fingerprint
  ) values (
    v_asset,
    v_network,
    v_address,
    nullif(btrim(coalesce(p_derivation_reference,'')),''),
    nullif(btrim(coalesce(p_source_fingerprint,'')),'')
  )
  on conflict (asset, network, address) do update
    set derivation_reference = coalesce(private.wallet_crypto_deposit_addresses.derivation_reference, excluded.derivation_reference),
        source_fingerprint = coalesce(private.wallet_crypto_deposit_addresses.source_fingerprint, excluded.source_fingerprint)
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.provision_wallet_crypto_deposit_address_server(text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.provision_wallet_crypto_deposit_address_server(text,text,text,text,text)
  to service_role;

create or replace function public.create_wallet_crypto_quote_v2_server(
  p_user_id uuid,
  p_asset text,
  p_network text,
  p_shared_destination_address text,
  p_amount_cents bigint,
  p_price_cop numeric,
  p_price_usd numeric,
  p_crypto_amount numeric,
  p_display_currency text,
  p_market_provider text,
  p_market_fetched_at timestamptz,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_pool private.wallet_crypto_deposit_addresses%rowtype;
  v_quote_id uuid;
  v_destination text := btrim(coalesce(p_shared_destination_address,''));
  v_binding text := 'shared-operator-address';
  v_deposit_address_id uuid := null;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile.id is null then raise exception 'CRYPTO_QUOTE_USER_NOT_FOUND'; end if;
  if v_profile.kyc_status <> 'verified' then raise exception 'CRYPTO_QUOTE_KYC_REQUIRED'; end if;
  if p_asset not in ('BTC','ETH','BNB','USDT','USDC') then raise exception 'CRYPTO_QUOTE_ASSET_INVALID'; end if;
  if length(v_destination) < 16 then raise exception 'CRYPTO_QUOTE_DESTINATION_INVALID'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'CRYPTO_QUOTE_AMOUNT_INVALID'; end if;
  if p_price_cop <= 0 or p_price_usd <= 0 or p_crypto_amount <= 0 then raise exception 'CRYPTO_QUOTE_PRICE_INVALID'; end if;
  if p_display_currency not in ('COP','USD') then raise exception 'CRYPTO_QUOTE_DISPLAY_INVALID'; end if;
  if p_market_provider <> 'coingecko' then raise exception 'CRYPTO_QUOTE_PROVIDER_INVALID'; end if;
  if p_expires_at <= now() then raise exception 'CRYPTO_QUOTE_EXPIRY_INVALID'; end if;

  select * into v_pool
  from private.wallet_crypto_deposit_addresses
  where asset = p_asset
    and network = p_network
    and status = 'available'
  order by created_at, id
  for update skip locked
  limit 1;

  if v_pool.id is not null then
    v_destination := v_pool.address;
    v_binding := 'claimant-specific-address';
    v_deposit_address_id := v_pool.id;
  end if;

  insert into public.wallet_crypto_quotes(
    user_id, asset, network, destination_address, amount_cents,
    price_cop, price_usd, crypto_amount, display_currency,
    market_provider, market_fetched_at, expires_at,
    settlement_binding, deposit_address_id
  ) values (
    p_user_id, p_asset, p_network, v_destination, p_amount_cents,
    p_price_cop, p_price_usd, p_crypto_amount, p_display_currency,
    p_market_provider, p_market_fetched_at, p_expires_at,
    v_binding, v_deposit_address_id
  ) returning id into v_quote_id;

  if v_deposit_address_id is not null then
    update private.wallet_crypto_deposit_addresses
    set status = 'assigned', assigned_at = now()
    where id = v_deposit_address_id and status = 'available';
    if not found then raise exception 'CRYPTO_DEPOSIT_ADDRESS_LEASE_CONFLICT'; end if;
  end if;

  return jsonb_build_object(
    'quoteId', v_quote_id,
    'destinationAddress', v_destination,
    'settlementBinding', v_binding,
    'depositAddressId', v_deposit_address_id
  );
end;
$$;
revoke all on function public.create_wallet_crypto_quote_v2_server(uuid,text,text,text,bigint,numeric,numeric,numeric,text,text,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.create_wallet_crypto_quote_v2_server(uuid,text,text,text,bigint,numeric,numeric,numeric,text,text,timestamptz,timestamptz)
  to service_role;

create or replace function public.submit_wallet_crypto_topup_claim_server(
  p_user_id uuid,
  p_quote_id uuid,
  p_tx_hash text,
  p_proof_storage_path text,
  p_proof_sha256 text,
  p_original_name text,
  p_mime text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.wallet_crypto_quotes%rowtype;
  v_normalized_hash text;
  v_tx_id uuid;
  v_claim_id uuid;
begin
  v_normalized_hash := public.normalize_crypto_tx_hash(p_tx_hash);
  if length(v_normalized_hash) < 16 then raise exception 'CRYPTO_TOPUP_TX_HASH_INVALID'; end if;
  if coalesce(p_proof_sha256,'') !~ '^[0-9a-f]{64}$' then raise exception 'CRYPTO_TOPUP_PROOF_HASH_INVALID'; end if;
  if p_mime not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'CRYPTO_TOPUP_MIME_INVALID'; end if;
  if p_proof_storage_path is null or left(p_proof_storage_path, length(p_user_id::text || '/wallet-crypto-topups/')) <> p_user_id::text || '/wallet-crypto-topups/' then
    raise exception 'CRYPTO_TOPUP_STORAGE_PATH_INVALID';
  end if;

  select * into v_quote from public.wallet_crypto_quotes where id = p_quote_id for update;
  if v_quote.id is null or v_quote.user_id <> p_user_id then raise exception 'CRYPTO_TOPUP_QUOTE_NOT_FOUND'; end if;
  if v_quote.consumed_at is not null then raise exception 'CRYPTO_TOPUP_QUOTE_ALREADY_USED'; end if;
  if v_quote.expires_at < now() then raise exception 'CRYPTO_TOPUP_QUOTE_EXPIRED'; end if;
  if exists (select 1 from public.wallet_crypto_topup_claims where normalized_tx_hash = v_normalized_hash) then
    raise exception 'CRYPTO_TOPUP_TX_HASH_ALREADY_USED';
  end if;

  insert into public.transactions(
    user_id, type, method, amount_cents, status, proof_storage_path,
    external_reference, crypto_network, crypto_asset, crypto_tx_hash
  ) values (
    p_user_id, 'deposit', 'crypto', v_quote.amount_cents, 'pending', p_proof_storage_path,
    v_normalized_hash, v_quote.network, v_quote.asset, v_normalized_hash
  ) returning id into v_tx_id;

  insert into public.wallet_crypto_topup_claims(
    user_id, quote_id, transaction_id, asset, network, destination_address,
    amount_cents, crypto_amount_expected, tx_hash, normalized_tx_hash,
    proof_storage_path, proof_sha256, proof_original_name, proof_mime,
    settlement_binding, deposit_address_id
  ) values (
    p_user_id, v_quote.id, v_tx_id, v_quote.asset, v_quote.network, v_quote.destination_address,
    v_quote.amount_cents, v_quote.crypto_amount, btrim(p_tx_hash), v_normalized_hash,
    p_proof_storage_path, p_proof_sha256, nullif(left(btrim(coalesce(p_original_name,'')),180),''), p_mime,
    v_quote.settlement_binding, v_quote.deposit_address_id
  ) returning id into v_claim_id;

  update public.wallet_crypto_quotes set consumed_at = now() where id = v_quote.id;
  return jsonb_build_object(
    'claimId', v_claim_id,
    'transactionId', v_tx_id,
    'state', 'submitted',
    'settlementBinding', v_quote.settlement_binding
  );
end;
$$;
revoke all on function public.submit_wallet_crypto_topup_claim_server(uuid,uuid,text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_wallet_crypto_topup_claim_server(uuid,uuid,text,text,text,text,text)
  to service_role;

create or replace function public.confirm_wallet_crypto_topup_server(
  p_claim_id uuid,
  p_confirmations integer,
  p_received_amount numeric,
  p_validation_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.wallet_crypto_topup_claims%rowtype;
  v_wallet public.wallets%rowtype;
begin
  select * into v_claim from public.wallet_crypto_topup_claims where id = p_claim_id for update;
  if v_claim.id is null then raise exception 'CRYPTO_TOPUP_CLAIM_NOT_FOUND'; end if;
  if v_claim.state = 'confirmed' then
    return jsonb_build_object('claimId',v_claim.id,'state','confirmed','creditedCents',v_claim.amount_cents,'idempotentReplay',true);
  end if;
  if v_claim.state = 'rejected' then raise exception 'CRYPTO_TOPUP_CLAIM_REJECTED'; end if;
  if v_claim.settlement_binding <> 'claimant-specific-address' or v_claim.deposit_address_id is null then
    raise exception 'CRYPTO_TOPUP_AUTO_SETTLEMENT_BINDING_REQUIRED';
  end if;
  if p_received_amount is null or p_received_amount < v_claim.crypto_amount_expected then
    raise exception 'CRYPTO_TOPUP_RECEIVED_AMOUNT_INSUFFICIENT';
  end if;

  select * into v_wallet from public.wallets where user_id = v_claim.user_id for update;
  if v_wallet.id is null then raise exception 'CRYPTO_TOPUP_WALLET_NOT_FOUND'; end if;
  if v_wallet.currency <> 'COP' then raise exception 'CRYPTO_TOPUP_WALLET_CURRENCY_INVALID'; end if;

  update public.transactions
  set status='approved', reviewed_at=now(), admin_notes='Automatically validated on-chain against claimant-specific destination'
  where id=v_claim.transaction_id and status='pending';
  if not found then raise exception 'CRYPTO_TOPUP_TRANSACTION_STATE_INVALID'; end if;

  update public.wallets
  set balance_cents = balance_cents + v_claim.amount_cents, updated_at=now()
  where id=v_wallet.id;

  update public.wallet_crypto_topup_claims
  set state='confirmed', confirmations=greatest(coalesce(p_confirmations,0),0),
      onchain_received_amount=p_received_amount,
      validation_data=coalesce(p_validation_data,'{}'::jsonb),
      validation_checked_at=now(), confirmed_at=now(), credited_at=now(), updated_at=now()
  where id=v_claim.id;

  return jsonb_build_object('claimId',v_claim.id,'state','confirmed','creditedCents',v_claim.amount_cents,'idempotentReplay',false);
end;
$$;
revoke all on function public.confirm_wallet_crypto_topup_server(uuid,integer,numeric,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.confirm_wallet_crypto_topup_server(uuid,integer,numeric,jsonb)
  to service_role;
