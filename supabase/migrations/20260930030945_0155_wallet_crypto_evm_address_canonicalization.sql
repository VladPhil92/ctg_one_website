-- CTG One Wallet — canonical EVM deposit-address identity.
-- EVM addresses are case-insensitive for recipient matching. Store them in one
-- canonical lowercase form and enforce case-insensitive uniqueness so a checksum
-- and lowercase spelling of the same destination can never be leased twice.

do $$
begin
  if exists (
    select 1
    from private.wallet_crypto_deposit_addresses
    where asset in ('ETH','BNB','USDT','USDC')
    group by asset, network, lower(btrim(address))
    having count(*) > 1
  ) then
    raise exception 'CRYPTO_DEPOSIT_ADDRESS_CANONICAL_CONFLICT';
  end if;
end
$$;

update private.wallet_crypto_deposit_addresses
set address = lower(btrim(address))
where asset in ('ETH','BNB','USDT','USDC')
  and address is distinct from lower(btrim(address));

alter table private.wallet_crypto_deposit_addresses
  add constraint wallet_crypto_deposit_addresses_evm_canonical_check
  check (
    asset not in ('ETH','BNB','USDT','USDC')
    or address = lower(btrim(address))
  );

create unique index wallet_crypto_deposit_addresses_evm_canonical_uidx
  on private.wallet_crypto_deposit_addresses(asset, network, lower(address))
  where asset in ('ETH','BNB','USDT','USDC');

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

  if v_asset in ('ETH','BNB','USDT','USDC') then
    v_address := lower(v_address);
  end if;

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
