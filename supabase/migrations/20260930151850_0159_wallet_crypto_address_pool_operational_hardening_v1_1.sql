-- CTG One Wallet — Address Pool Operations V1.1 hardening
-- Production follow-up for migration 0158.
-- 1) Serialize pool disablement with claimant-specific quote allocation.
-- 2) Add a bounded paginated operations snapshot so every address remains operable.

create or replace function public.get_wallet_crypto_address_pool_snapshot_page_server(
  p_address_limit integer default 100,
  p_address_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with params as (
    select
      least(greatest(coalesce(p_address_limit,100),1),200)::integer as lim,
      greatest(coalesce(p_address_offset,0),0)::integer as off
  ), controls as (
    select c.asset, c.network, c.auto_assignment_enabled, c.activation_minimum_ready_addresses,
      c.updated_at, c.updated_by,
      count(a.id) filter (where a.status='available' and a.validation_status='validated')::integer as ready_count,
      count(a.id) filter (where a.status='available' and a.validation_status='pending')::integer as pending_count,
      count(a.id) filter (where a.status='assigned')::integer as assigned_count,
      count(a.id) filter (where a.status='retired')::integer as retired_count
    from private.wallet_crypto_address_pool_controls c
    left join private.wallet_crypto_deposit_addresses a on a.asset=c.asset and a.network=c.network
    group by c.asset,c.network,c.auto_assignment_enabled,c.activation_minimum_ready_addresses,c.updated_at,c.updated_by
  ), address_total as (
    select count(*)::integer as total from private.wallet_crypto_deposit_addresses
  ), rows as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',a.id,'asset',a.asset,'network',a.network,'address',a.address,
      'derivationReference',a.derivation_reference,'sourceFingerprint',a.source_fingerprint,
      'status',a.status,'validationStatus',a.validation_status,'validationReference',a.validation_reference,
      'validatedAt',a.validated_at,'assignedAt',a.assigned_at,'retiredAt',a.retired_at,
      'retirementReason',a.retirement_reason,'createdAt',a.created_at
    ) order by a.created_at desc, a.id desc), '[]'::jsonb) value
    from (
      select * from private.wallet_crypto_deposit_addresses
      order by created_at desc, id desc
      limit (select lim from params)
      offset (select off from params)
    ) a
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
    'events', (select value from events),
    'addressTotal', (select total from address_total),
    'addressOffset', (select off from params),
    'addressLimit', (select lim from params),
    'hasMore', ((select off from params) + (select lim from params) < (select total from address_total))
  );
$$;
revoke all on function public.get_wallet_crypto_address_pool_snapshot_page_server(integer,integer) from public, anon, authenticated, service_role;
grant execute on function public.get_wallet_crypto_address_pool_snapshot_page_server(integer,integer) to service_role;

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

  -- Serialize allocation with set_wallet_crypto_address_pool_control_server(),
  -- which locks the same control row FOR UPDATE. If disable wins first, this
  -- reader sees false; if allocation wins first, disable cannot return until
  -- that quote commits and the address lease is complete.
  select auto_assignment_enabled into v_assignment_enabled
  from private.wallet_crypto_address_pool_controls
  where asset=p_asset and network=p_network
  for share;

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
