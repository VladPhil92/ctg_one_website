-- CTG One Wallet — direct crypto top-ups
-- A quote is a server-authored price snapshot. A proof/tx hash is a claim, not money.
-- Only service-role on-chain validation may confirm a claim and credit the canonical COP wallet.

create table public.wallet_crypto_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  asset text not null check (asset in ('BTC','ETH','BNB','USDT','USDC')),
  network text not null,
  destination_address text not null,
  amount_cents bigint not null check (amount_cents > 0),
  price_cop numeric(30,12) not null check (price_cop > 0),
  price_usd numeric(30,12) not null check (price_usd > 0),
  crypto_amount numeric(40,18) not null check (crypto_amount > 0),
  display_currency text not null default 'COP' check (display_currency in ('COP','USD')),
  market_provider text not null check (market_provider = 'coingecko'),
  market_fetched_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wallet_crypto_quotes_expiry_check check (expires_at > created_at)
);

create table public.wallet_crypto_topup_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  quote_id uuid not null unique references public.wallet_crypto_quotes(id) on delete restrict,
  transaction_id uuid not null unique references public.transactions(id) on delete restrict,
  asset text not null check (asset in ('BTC','ETH','BNB','USDT','USDC')),
  network text not null,
  destination_address text not null,
  amount_cents bigint not null check (amount_cents > 0),
  crypto_amount_expected numeric(40,18) not null check (crypto_amount_expected > 0),
  tx_hash text not null,
  normalized_tx_hash text not null unique,
  proof_storage_path text not null,
  proof_sha256 text not null check (proof_sha256 ~ '^[0-9a-f]{64}$'),
  proof_original_name text,
  proof_mime text not null check (proof_mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  state text not null default 'submitted'
    check (state in ('submitted','confirming','manual_review','confirmed','rejected')),
  confirmations integer not null default 0 check (confirmations >= 0),
  onchain_received_amount numeric(40,18),
  validation_data jsonb not null default '{}'::jsonb,
  validation_checked_at timestamptz,
  confirmed_at timestamptz,
  credited_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_crypto_topup_confirmed_shape check (
    state <> 'confirmed' or (confirmed_at is not null and credited_at is not null)
  ),
  constraint wallet_crypto_topup_rejected_shape check (
    state <> 'rejected' or (rejected_at is not null and rejection_reason is not null)
  )
);

create index wallet_crypto_quotes_user_created_idx
  on public.wallet_crypto_quotes(user_id, created_at desc);
create index wallet_crypto_topup_user_created_idx
  on public.wallet_crypto_topup_claims(user_id, created_at desc);
create index wallet_crypto_topup_state_created_idx
  on public.wallet_crypto_topup_claims(state, created_at);

alter table public.wallet_crypto_quotes enable row level security;
alter table public.wallet_crypto_topup_claims enable row level security;

create policy wallet_crypto_quotes_read_own_or_admin
  on public.wallet_crypto_quotes for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy wallet_crypto_topups_read_own_or_admin
  on public.wallet_crypto_topup_claims for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

revoke all on public.wallet_crypto_quotes from public, anon, authenticated, service_role;
revoke all on public.wallet_crypto_topup_claims from public, anon, authenticated, service_role;
grant select on public.wallet_crypto_quotes to authenticated, service_role;
grant select on public.wallet_crypto_topup_claims to authenticated, service_role;
grant insert, update on public.wallet_crypto_quotes to service_role;
grant insert, update on public.wallet_crypto_topup_claims to service_role;

create or replace function public.normalize_crypto_tx_hash(p_hash text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(btrim(coalesce(p_hash,'')), '[^A-Za-z0-9]', '', 'g'));
$$;
revoke all on function public.normalize_crypto_tx_hash(text) from public, anon, authenticated;
grant execute on function public.normalize_crypto_tx_hash(text) to service_role;

create or replace function public.create_wallet_crypto_quote_server(
  p_user_id uuid,
  p_asset text,
  p_network text,
  p_destination_address text,
  p_amount_cents bigint,
  p_price_cop numeric,
  p_price_usd numeric,
  p_crypto_amount numeric,
  p_display_currency text,
  p_market_provider text,
  p_market_fetched_at timestamptz,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'CRYPTO_QUOTE_SERVER_ROLE_REQUIRED'; end if;
  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile.id is null then raise exception 'CRYPTO_QUOTE_USER_NOT_FOUND'; end if;
  if v_profile.kyc_status <> 'verified' then raise exception 'CRYPTO_QUOTE_KYC_REQUIRED'; end if;
  if p_asset not in ('BTC','ETH','BNB','USDT','USDC') then raise exception 'CRYPTO_QUOTE_ASSET_INVALID'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'CRYPTO_QUOTE_AMOUNT_INVALID'; end if;
  if p_price_cop <= 0 or p_price_usd <= 0 or p_crypto_amount <= 0 then raise exception 'CRYPTO_QUOTE_PRICE_INVALID'; end if;
  if p_display_currency not in ('COP','USD') then raise exception 'CRYPTO_QUOTE_DISPLAY_INVALID'; end if;
  if p_market_provider <> 'coingecko' then raise exception 'CRYPTO_QUOTE_PROVIDER_INVALID'; end if;
  if p_expires_at <= now() then raise exception 'CRYPTO_QUOTE_EXPIRY_INVALID'; end if;

  insert into public.wallet_crypto_quotes(
    user_id, asset, network, destination_address, amount_cents,
    price_cop, price_usd, crypto_amount, display_currency,
    market_provider, market_fetched_at, expires_at
  ) values (
    p_user_id, p_asset, p_network, p_destination_address, p_amount_cents,
    p_price_cop, p_price_usd, p_crypto_amount, p_display_currency,
    p_market_provider, p_market_fetched_at, p_expires_at
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_wallet_crypto_quote_server(uuid,text,text,text,bigint,numeric,numeric,numeric,text,text,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.create_wallet_crypto_quote_server(uuid,text,text,text,bigint,numeric,numeric,numeric,text,text,timestamptz,timestamptz)
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
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'CRYPTO_TOPUP_SERVER_ROLE_REQUIRED'; end if;
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
    proof_storage_path, proof_sha256, proof_original_name, proof_mime
  ) values (
    p_user_id, v_quote.id, v_tx_id, v_quote.asset, v_quote.network, v_quote.destination_address,
    v_quote.amount_cents, v_quote.crypto_amount, btrim(p_tx_hash), v_normalized_hash,
    p_proof_storage_path, p_proof_sha256, nullif(left(btrim(coalesce(p_original_name,'')),180),''), p_mime
  ) returning id into v_claim_id;

  update public.wallet_crypto_quotes set consumed_at = now() where id = v_quote.id;
  return jsonb_build_object('claimId', v_claim_id, 'transactionId', v_tx_id, 'state', 'submitted');
end;
$$;
revoke all on function public.submit_wallet_crypto_topup_claim_server(uuid,uuid,text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_wallet_crypto_topup_claim_server(uuid,uuid,text,text,text,text,text)
  to service_role;

create or replace function public.record_wallet_crypto_validation_server(
  p_claim_id uuid,
  p_state text,
  p_confirmations integer,
  p_received_amount numeric,
  p_validation_data jsonb,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'CRYPTO_TOPUP_SERVER_ROLE_REQUIRED'; end if;
  if p_state not in ('submitted','confirming','manual_review','rejected') then raise exception 'CRYPTO_TOPUP_VALIDATION_STATE_INVALID'; end if;
  update public.wallet_crypto_topup_claims
  set state = p_state,
      confirmations = greatest(coalesce(p_confirmations,0),0),
      onchain_received_amount = p_received_amount,
      validation_data = coalesce(p_validation_data,'{}'::jsonb),
      validation_checked_at = now(),
      rejected_at = case when p_state='rejected' then now() else null end,
      rejection_reason = case when p_state='rejected' then nullif(btrim(coalesce(p_rejection_reason,'')),'') else null end,
      updated_at = now()
  where id = p_claim_id and state <> 'confirmed';
  if not found then raise exception 'CRYPTO_TOPUP_CLAIM_NOT_FOUND_OR_FINAL'; end if;
  return jsonb_build_object('claimId',p_claim_id,'state',p_state);
end;
$$;
revoke all on function public.record_wallet_crypto_validation_server(uuid,text,integer,numeric,jsonb,text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_wallet_crypto_validation_server(uuid,text,integer,numeric,jsonb,text)
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
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'CRYPTO_TOPUP_SERVER_ROLE_REQUIRED'; end if;
  select * into v_claim from public.wallet_crypto_topup_claims where id = p_claim_id for update;
  if v_claim.id is null then raise exception 'CRYPTO_TOPUP_CLAIM_NOT_FOUND'; end if;
  if v_claim.state = 'confirmed' then
    return jsonb_build_object('claimId',v_claim.id,'state','confirmed','creditedCents',v_claim.amount_cents,'idempotentReplay',true);
  end if;
  if v_claim.state = 'rejected' then raise exception 'CRYPTO_TOPUP_CLAIM_REJECTED'; end if;
  if p_received_amount is null or p_received_amount < v_claim.crypto_amount_expected then
    raise exception 'CRYPTO_TOPUP_RECEIVED_AMOUNT_INSUFFICIENT';
  end if;

  select * into v_wallet from public.wallets where user_id = v_claim.user_id for update;
  if v_wallet.id is null then raise exception 'CRYPTO_TOPUP_WALLET_NOT_FOUND'; end if;
  if v_wallet.currency <> 'COP' then raise exception 'CRYPTO_TOPUP_WALLET_CURRENCY_INVALID'; end if;

  update public.transactions
  set status='approved', reviewed_at=now(), admin_notes='Automatically validated on-chain'
  where id=v_claim.transaction_id and status='pending';
  if not found then raise exception 'CRYPTO_TOPUP_TRANSACTION_STATE_INVALID'; end if;

  update public.wallets
  set balance_cents = balance_cents + v_claim.amount_cents, updated_at=now()
  where id=v_wallet.id;

  update public.wallet_crypto_topup_claims
  set state='confirmed', confirmations=greatest(coalesce(p_confirmations,0),0),
      onchain_received_amount=p_received_amount, validation_data=coalesce(p_validation_data,'{}'::jsonb),
      validation_checked_at=now(), confirmed_at=now(), credited_at=now(), updated_at=now()
  where id=v_claim.id;

  insert into public.admin_audit_log(admin_id, action, target_table, target_id, details)
  values (
    null,
    'confirm_wallet_crypto_topup_server',
    'wallet_crypto_topup_claims',
    v_claim.id,
    jsonb_build_object(
      'transaction_id',v_claim.transaction_id,
      'wallet_id',v_wallet.id,
      'asset',v_claim.asset,
      'network',v_claim.network,
      'tx_hash',v_claim.normalized_tx_hash,
      'received_amount',p_received_amount,
      'credited_cents',v_claim.amount_cents,
      'validator','ONCHAIN_SERVER'
    )
  );

  return jsonb_build_object('claimId',v_claim.id,'state','confirmed','creditedCents',v_claim.amount_cents,'idempotentReplay',false);
end;
$$;
revoke all on function public.confirm_wallet_crypto_topup_server(uuid,integer,numeric,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.confirm_wallet_crypto_topup_server(uuid,integer,numeric,jsonb)
  to service_role;
