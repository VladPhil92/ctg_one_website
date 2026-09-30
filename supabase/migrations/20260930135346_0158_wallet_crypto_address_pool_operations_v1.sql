-- CTG One Wallet — Address Pool Operations V1
-- Public receiving addresses are quarantined until explicitly validated and enabled.
-- No seed, xprv or private key is stored in CTG One.

alter table private.wallet_crypto_deposit_addresses
  add column validation_status text not null default 'pending'
    check (validation_status in ('pending','validated','rejected')),
  add column validation_reference text,
  add column validated_at timestamptz,
  add column validated_by uuid,
  add column retired_at timestamptz,
  add column retired_by uuid,
  add column retirement_reason text;

alter table private.wallet_crypto_deposit_addresses
  add constraint wallet_crypto_deposit_addresses_validation_shape check (
    validation_status <> 'validated'
    or (validated_at is not null and validated_by is not null and length(btrim(coalesce(validation_reference,''))) >= 12)
  ),
  add constraint wallet_crypto_deposit_addresses_retirement_shape check (
    status <> 'retired'
    or (retired_at is not null and retired_by is not null and length(btrim(coalesce(retirement_reason,''))) >= 8)
  );

create table private.wallet_crypto_address_pool_controls (
  asset text not null check (asset in ('BTC','ETH','BNB','USDT','USDC')),
  network text not null check (length(btrim(network)) > 0),
  auto_assignment_enabled boolean not null default false,
  activation_minimum_ready_addresses integer not null default 5
    check (activation_minimum_ready_addresses between 3 and 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (asset, network)
);

create table private.wallet_crypto_deposit_address_events (
  id uuid primary key default gen_random_uuid(),
  deposit_address_id uuid references private.wallet_crypto_deposit_addresses(id) on delete restrict,
  asset text not null check (asset in ('BTC','ETH','BNB','USDT','USDC')),
  network text not null,
  event_type text not null check (event_type in ('provisioned','validated','retired','pool_enabled','pool_disabled')),
  actor_user_id uuid not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table private.wallet_crypto_address_pool_controls enable row level security;
alter table private.wallet_crypto_deposit_address_events enable row level security;
revoke all on private.wallet_crypto_address_pool_controls from public, anon, authenticated, service_role;
revoke all on private.wallet_crypto_deposit_address_events from public, anon, authenticated, service_role;
grant usage on schema private to service_role;
grant select, insert, update on private.wallet_crypto_address_pool_controls to service_role;
grant select, insert on private.wallet_crypto_deposit_address_events to service_role;

insert into private.wallet_crypto_address_pool_controls(asset, network)
values
  ('BTC','Bitcoin'),
  ('ETH','Ethereum (ERC20)'),
  ('BNB','BNB Smart Chain (BEP20)'),
  ('USDT','BNB Smart Chain (BEP20)'),
  ('USDC','BNB Smart Chain (BEP20)')
on conflict (asset, network) do nothing;

create or replace function public.provision_wallet_crypto_deposit_addresses_batch_server(
  p_entries jsonb,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry jsonb;
  v_asset text;
  v_network text;
  v_address text;
  v_derivation text;
  v_fingerprint text;
  v_id uuid;
  v_ids jsonb := '[]'::jsonb;
  v_count integer := 0;
begin
  if p_actor is null then raise exception 'CRYPTO_ADDRESS_POOL_ACTOR_REQUIRED'; end if;
  if jsonb_typeof(p_entries) <> 'array' then raise exception 'CRYPTO_ADDRESS_POOL_BATCH_INVALID'; end if;
  v_count := jsonb_array_length(p_entries);
  if v_count < 1 or v_count > 100 then raise exception 'CRYPTO_ADDRESS_POOL_BATCH_SIZE_INVALID'; end if;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    v_asset := upper(btrim(coalesce(v_entry->>'asset','')));
    v_network := btrim(coalesce(v_entry->>'network',''));
    v_address := btrim(coalesce(v_entry->>'address',''));
    v_derivation := btrim(coalesce(v_entry->>'derivationReference',''));
    v_fingerprint := lower(btrim(coalesce(v_entry->>'sourceFingerprint','')));

    if v_asset not in ('BTC','ETH','BNB','USDT','USDC') then raise exception 'CRYPTO_DEPOSIT_ADDRESS_ASSET_INVALID'; end if;
    if not (
      (v_asset = 'BTC' and v_network = 'Bitcoin') or
      (v_asset = 'ETH' and v_network = 'Ethereum (ERC20)') or
      (v_asset in ('BNB','USDT','USDC') and v_network = 'BNB Smart Chain (BEP20)')
    ) then raise exception 'CRYPTO_DEPOSIT_ADDRESS_NETWORK_MISMATCH'; end if;

    if v_asset in ('ETH','BNB','USDT','USDC') then
      v_address := lower(v_address);
      if v_address !~ '^0x[0-9a-f]{40}$' then raise exception 'CRYPTO_DEPOSIT_ADDRESS_EVM_INVALID'; end if;
    else
      if v_address !~ '^(bc1[0-9a-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$' then raise exception 'CRYPTO_DEPOSIT_ADDRESS_BTC_INVALID'; end if;
    end if;

    if length(v_derivation) < 3 or length(v_derivation) > 180 then raise exception 'CRYPTO_DEPOSIT_DERIVATION_REFERENCE_REQUIRED'; end if;
    if length(v_fingerprint) < 16 or length(v_fingerprint) > 256 then raise exception 'CRYPTO_DEPOSIT_SOURCE_FINGERPRINT_REQUIRED'; end if;

    if exists (
      select 1 from private.wallet_crypto_deposit_addresses
      where asset = v_asset and network = v_network
        and case when v_asset in ('ETH','BNB','USDT','USDC') then lower(address) else address end = v_address
    ) then
      raise exception 'CRYPTO_DEPOSIT_ADDRESS_ALREADY_EXISTS';
    end if;

    insert into private.wallet_crypto_deposit_addresses(
      asset, network, address, derivation_reference, source_fingerprint,
      status, validation_status
    ) values (
      v_asset, v_network, v_address, v_derivation, v_fingerprint,
      'available', 'pending'
    ) returning id into v_id;

    insert into private.wallet_crypto_deposit_address_events(
      deposit_address_id, asset, network, event_type, actor_user_id, detail
    ) values (
      v_id, v_asset, v_network, 'provisioned', p_actor,
      jsonb_build_object('derivationReference',v_derivation,'sourceFingerprint',v_fingerprint)
    );

    v_ids := v_ids || jsonb_build_array(v_id);
  end loop;

  return jsonb_build_object('importedCount',v_count,'depositAddressIds',v_ids,'validationStatus','pending','autoAssignment',false);
end;
$$;
revoke all on function public.provision_wallet_crypto_deposit_addresses_batch_server(jsonb,uuid) from public, anon, authenticated, service_role;
grant execute on function public.provision_wallet_crypto_deposit_addresses_batch_server(jsonb,uuid) to service_role;

create or replace function public.validate_wallet_crypto_deposit_address_server(
  p_address_id uuid,
  p_actor uuid,
  p_validation_reference text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row private.wallet_crypto_deposit_addresses%rowtype;
  v_reference text := btrim(coalesce(p_validation_reference,''));
begin
  if p_actor is null then raise exception 'CRYPTO_ADDRESS_POOL_ACTOR_REQUIRED'; end if;
  if length(v_reference) < 12 or length(v_reference) > 256 then raise exception 'CRYPTO_ADDRESS_VALIDATION_REFERENCE_INVALID'; end if;

  select * into v_row
  from private.wallet_crypto_deposit_addresses
  where id = p_address_id
  for update;
  if v_row.id is null then raise exception 'CRYPTO_DEPOSIT_ADDRESS_NOT_FOUND'; end if;
  if v_row.status <> 'available' then raise exception 'CRYPTO_DEPOSIT_ADDRESS_NOT_VALIDATABLE'; end if;
  if v_row.validation_status = 'validated' then
    return jsonb_build_object('id',v_row.id,'validationStatus','validated','idempotentReplay',true);
  end if;
  if v_row.validation_status = 'rejected' then raise exception 'CRYPTO_DEPOSIT_ADDRESS_REJECTED'; end if;
  if v_row.derivation_reference is null or v_row.source_fingerprint is null then raise exception 'CRYPTO_DEPOSIT_ADDRESS_PROVENANCE_REQUIRED'; end if;

  update private.wallet_crypto_deposit_addresses
  set validation_status='validated', validation_reference=v_reference,
      validated_at=now(), validated_by=p_actor
  where id=v_row.id;

  insert into private.wallet_crypto_deposit_address_events(
    deposit_address_id, asset, network, event_type, actor_user_id, detail
  ) values (
    v_row.id, v_row.asset, v_row.network, 'validated', p_actor,
    jsonb_build_object('validationReference',v_reference)
  );

  return jsonb_build_object('id',v_row.id,'validationStatus','validated','idempotentReplay',false);
end;
$$;
revoke all on function public.validate_wallet_crypto_deposit_address_server(uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.validate_wallet_crypto_deposit_address_server(uuid,uuid,text) to service_role;

create or replace function public.retire_wallet_crypto_deposit_address_server(
  p_address_id uuid,
  p_actor uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row private.wallet_crypto_deposit_addresses%rowtype;
  v_reason text := btrim(coalesce(p_reason,''));
begin
  if p_actor is null then raise exception 'CRYPTO_ADDRESS_POOL_ACTOR_REQUIRED'; end if;
  if length(v_reason) < 8 or length(v_reason) > 300 then raise exception 'CRYPTO_DEPOSIT_ADDRESS_RETIREMENT_REASON_INVALID'; end if;

  select * into v_row from private.wallet_crypto_deposit_addresses where id=p_address_id for update;
  if v_row.id is null then raise exception 'CRYPTO_DEPOSIT_ADDRESS_NOT_FOUND'; end if;
  if v_row.status = 'assigned' then raise exception 'CRYPTO_DEPOSIT_ADDRESS_ASSIGNED_CANNOT_RETIRE'; end if;
  if v_row.status = 'retired' then return jsonb_build_object('id',v_row.id,'status','retired','idempotentReplay',true); end if;

  update private.wallet_crypto_deposit_addresses
  set status='retired', retired_at=now(), retired_by=p_actor, retirement_reason=v_reason
  where id=v_row.id;

  insert into private.wallet_crypto_deposit_address_events(
    deposit_address_id, asset, network, event_type, actor_user_id, detail
  ) values (v_row.id,v_row.asset,v_row.network,'retired',p_actor,jsonb_build_object('reason',v_reason));

  return jsonb_build_object('id',v_row.id,'status','retired','idempotentReplay',false);
end;
$$;
revoke all on function public.retire_wallet_crypto_deposit_address_server(uuid,uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.retire_wallet_crypto_deposit_address_server(uuid,uuid,text) to service_role;

create or replace function public.set_wallet_crypto_address_pool_control_server(
  p_asset text,
  p_network text,
  p_enabled boolean,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_asset text := upper(btrim(coalesce(p_asset,'')));
  v_network text := btrim(coalesce(p_network,''));
  v_control private.wallet_crypto_address_pool_controls%rowtype;
  v_ready integer;
begin
  if p_actor is null then raise exception 'CRYPTO_ADDRESS_POOL_ACTOR_REQUIRED'; end if;
  select * into v_control
  from private.wallet_crypto_address_pool_controls
  where asset=v_asset and network=v_network
  for update;
  if v_control.asset is null then raise exception 'CRYPTO_ADDRESS_POOL_CONTROL_NOT_FOUND'; end if;

  select count(*)::integer into v_ready
  from private.wallet_crypto_deposit_addresses
  where asset=v_asset and network=v_network and status='available' and validation_status='validated';

  if p_enabled and v_ready < v_control.activation_minimum_ready_addresses then
    raise exception 'CRYPTO_ADDRESS_POOL_INSUFFICIENT_VALIDATED_CAPACITY';
  end if;

  update private.wallet_crypto_address_pool_controls
  set auto_assignment_enabled=p_enabled, updated_at=now(), updated_by=p_actor
  where asset=v_asset and network=v_network;

  insert into private.wallet_crypto_deposit_address_events(
    deposit_address_id, asset, network, event_type, actor_user_id, detail
  ) values (
    null, v_asset, v_network, case when p_enabled then 'pool_enabled' else 'pool_disabled' end,
    p_actor, jsonb_build_object('readyAddresses',v_ready,'activationMinimum',v_control.activation_minimum_ready_addresses)
  );

  return jsonb_build_object('asset',v_asset,'network',v_network,'enabled',p_enabled,'readyAddresses',v_ready,'activationMinimum',v_control.activation_minimum_ready_addresses);
end;
$$;
revoke all on function public.set_wallet_crypto_address_pool_control_server(text,text,boolean,uuid) from public, anon, authenticated, service_role;
grant execute on function public.set_wallet_crypto_address_pool_control_server(text,text,boolean,uuid) to service_role;

create or replace function public.get_wallet_crypto_address_pool_snapshot_server()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with controls as (
    select c.asset, c.network, c.auto_assignment_enabled, c.activation_minimum_ready_addresses,
      c.updated_at, c.updated_by,
      count(a.id) filter (where a.status='available' and a.validation_status='validated')::integer as ready_count,
      count(a.id) filter (where a.status='available' and a.validation_status='pending')::integer as pending_count,
      count(a.id) filter (where a.status='assigned')::integer as assigned_count,
      count(a.id) filter (where a.status='retired')::integer as retired_count
    from private.wallet_crypto_address_pool_controls c
    left join private.wallet_crypto_deposit_addresses a on a.asset=c.asset and a.network=c.network
    group by c.asset,c.network,c.auto_assignment_enabled,c.activation_minimum_ready_addresses,c.updated_at,c.updated_by
  ), rows as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',a.id,'asset',a.asset,'network',a.network,'address',a.address,
      'derivationReference',a.derivation_reference,'sourceFingerprint',a.source_fingerprint,
      'status',a.status,'validationStatus',a.validation_status,'validationReference',a.validation_reference,
      'validatedAt',a.validated_at,'assignedAt',a.assigned_at,'retiredAt',a.retired_at,
      'retirementReason',a.retirement_reason,'createdAt',a.created_at
    ) order by a.created_at desc), '[]'::jsonb) value
    from (select * from private.wallet_crypto_deposit_addresses order by created_at desc limit 200) a
  ), events as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'depositAddressId',e.deposit_address_id,'asset',e.asset,'network',e.network,
      'eventType',e.event_type,'actorUserId',e.actor_user_id,'detail',e.detail,'createdAt',e.created_at
    ) order by e.created_at desc), '[]'::jsonb) value
    from (select * from private.wallet_crypto_deposit_address_events order by created_at desc limit 100) e
  )
  select jsonb_build_object(
    'controls', coalesce((select jsonb_agg(to_jsonb(controls) order by asset,network) from controls),'[]'::jsonb),
    'addresses', (select value from rows),
    'events', (select value from events)
  );
$$;
revoke all on function public.get_wallet_crypto_address_pool_snapshot_server() from public, anon, authenticated, service_role;
grant execute on function public.get_wallet_crypto_address_pool_snapshot_server() to service_role;

-- Allocation remains fail-closed unless the asset/network control is enabled and
-- the candidate address has been operator-validated. Shared operator routing is
-- retained as the manual-review fallback.
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
  v_assignment_enabled boolean := false;
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

  select auto_assignment_enabled into v_assignment_enabled
  from private.wallet_crypto_address_pool_controls
  where asset=p_asset and network=p_network;

  if coalesce(v_assignment_enabled,false) then
    select * into v_pool
    from private.wallet_crypto_deposit_addresses
    where asset = p_asset
      and network = p_network
      and status = 'available'
      and validation_status = 'validated'
    order by created_at, id
    for update skip locked
    limit 1;
  end if;

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
    where id = v_deposit_address_id and status = 'available' and validation_status='validated';
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
