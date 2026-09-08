-- CTG One — Crowdfunding provider reconciliation V1
-- Webhooks are notifications, never settlement authority. The public webhook
-- stores a bounded inbox record quickly; a trusted reconciler independently
-- verifies the notification against Bold before this RPC can settle funds.

alter table public.federated_crowdfunding_contributions
  add column if not exists provider_external_reference text;

create unique index if not exists federated_crowdfunding_external_reference_unique
  on public.federated_crowdfunding_contributions(rail, provider_external_reference)
  where provider_external_reference is not null;

create table public.federated_crowdfunding_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'bold'),
  provider_event_id uuid not null,
  provider_payment_id text not null check (length(trim(provider_payment_id)) between 1 and 180),
  event_type text not null check (event_type in ('SALE_APPROVED','SALE_REJECTED','VOID_APPROVED','VOID_REJECTED')),
  external_reference text check (external_reference is null or length(trim(external_reference)) between 1 and 60),
  amount_cop bigint not null check (amount_cop >= 0),
  currency text not null check (currency = 'COP'),
  event_checksum text not null check (event_checksum ~ '^[0-9a-f]{64}$'),
  verification_status text not null default 'received' check (verification_status in ('received','verified','rejected')),
  verified_at timestamptz,
  rejection_code text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id),
  unique (provider, event_checksum),
  constraint federated_crowdfunding_provider_event_verification_check check (
    (verification_status = 'received' and verified_at is null and rejection_code is null)
    or (verification_status = 'verified' and verified_at is not null and rejection_code is null)
    or (verification_status = 'rejected' and verified_at is not null and rejection_code is not null)
  )
);

alter table public.federated_crowdfunding_provider_events enable row level security;
revoke all on table public.federated_crowdfunding_provider_events from public, anon, authenticated;
grant select, insert, update on table public.federated_crowdfunding_provider_events to service_role;

create index federated_crowdfunding_provider_events_pending_idx
  on public.federated_crowdfunding_provider_events(provider, verification_status, received_at)
  where verification_status = 'received';

-- Replace the checkout binder so the deterministic merchant reference is also
-- bound before any provider event can be reconciled.
drop function if exists public.bind_vertice_crowdfunding_bold_checkout_server(uuid,text,text);
create or replace function public.bind_vertice_crowdfunding_bold_checkout_server(
  p_contribution_id uuid,
  p_provider_reference text,
  p_provider_external_reference text,
  p_checkout_url text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_row public.federated_crowdfunding_contributions;
  v_ref text := trim(coalesce(p_provider_reference,''));
  v_external text := trim(coalesce(p_provider_external_reference,''));
  v_url text := trim(coalesce(p_checkout_url,''));
begin
  if v_ref !~ '^LNK_[A-Za-z0-9_-]{3,120}$' then raise exception 'CROWDFUNDING_BOLD_REFERENCE_INVALID'; end if;
  if v_external !~ '^[A-Za-z0-9_-]{1,60}$' then raise exception 'CROWDFUNDING_BOLD_EXTERNAL_REFERENCE_INVALID'; end if;
  if v_url !~ '^https://checkout[.]bold[.]co/' then raise exception 'CROWDFUNDING_BOLD_CHECKOUT_URL_INVALID'; end if;

  select * into v_row from public.federated_crowdfunding_contributions where id = p_contribution_id for update;
  if not found or v_row.rail <> 'bold' then raise exception 'CROWDFUNDING_BOLD_CONTRIBUTION_INVALID'; end if;
  if v_row.status not in ('created','pending_external') then raise exception 'CROWDFUNDING_BOLD_CONTRIBUTION_NOT_BINDABLE'; end if;

  if v_row.provider_reference is not null then
    if v_row.provider_reference <> v_ref
       or v_row.provider_external_reference <> v_external
       or v_row.provider_checkout_url <> v_url then
      raise exception 'CROWDFUNDING_BOLD_BINDING_CONFLICT';
    end if;
    return jsonb_build_object('replayed',true,'contributionId',v_row.id,'status',v_row.status);
  end if;

  update public.federated_crowdfunding_contributions
  set provider_reference=v_ref,
      provider_external_reference=v_external,
      provider_checkout_url=v_url,
      status='pending_external',
      updated_at=clock_timestamp()
  where id=v_row.id;

  return jsonb_build_object('replayed',false,'contributionId',v_row.id,'status','pending_external');
end;
$function$;

revoke all on function public.bind_vertice_crowdfunding_bold_checkout_server(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.bind_vertice_crowdfunding_bold_checkout_server(uuid,text,text,text)
  to service_role;

create or replace function public.record_crowdfunding_bold_webhook_inbox_server(
  p_provider_event_id uuid,
  p_provider_payment_id text,
  p_event_type text,
  p_external_reference text,
  p_amount_cop bigint,
  p_currency text,
  p_event_checksum text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_type text := upper(trim(coalesce(p_event_type,'')));
  v_payment text := trim(coalesce(p_provider_payment_id,''));
  v_external text := nullif(trim(coalesce(p_external_reference,'')), '');
  v_currency text := upper(trim(coalesce(p_currency,'')));
  v_checksum text := lower(trim(coalesce(p_event_checksum,'')));
  v_row public.federated_crowdfunding_provider_events;
  v_replayed boolean := false;
begin
  if p_provider_event_id is null then raise exception 'CROWDFUNDING_BOLD_EVENT_ID_INVALID'; end if;
  if length(v_payment) < 1 or length(v_payment) > 180 then raise exception 'CROWDFUNDING_BOLD_PAYMENT_ID_INVALID'; end if;
  if v_type not in ('SALE_APPROVED','SALE_REJECTED','VOID_APPROVED','VOID_REJECTED') then raise exception 'CROWDFUNDING_BOLD_EVENT_TYPE_INVALID'; end if;
  if v_external is not null and (length(v_external) > 60 or v_external !~ '^[A-Za-z0-9_-]+$') then raise exception 'CROWDFUNDING_BOLD_EXTERNAL_REFERENCE_INVALID'; end if;
  if p_amount_cop is null or p_amount_cop < 0 then raise exception 'CROWDFUNDING_BOLD_AMOUNT_INVALID'; end if;
  if v_currency <> 'COP' then raise exception 'CROWDFUNDING_BOLD_CURRENCY_INVALID'; end if;
  if v_checksum !~ '^[0-9a-f]{64}$' then raise exception 'CROWDFUNDING_BOLD_CHECKSUM_INVALID'; end if;

  insert into public.federated_crowdfunding_provider_events(
    provider,provider_event_id,provider_payment_id,event_type,external_reference,amount_cop,currency,event_checksum
  ) values (
    'bold',p_provider_event_id,v_payment,v_type,v_external,p_amount_cop,v_currency,v_checksum
  ) on conflict (provider,provider_event_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    v_replayed := true;
    select * into v_row from public.federated_crowdfunding_provider_events
    where provider='bold' and provider_event_id=p_provider_event_id;
    if v_row.provider_payment_id <> v_payment
       or v_row.event_type <> v_type
       or coalesce(v_row.external_reference,'') <> coalesce(v_external,'')
       or v_row.amount_cop <> p_amount_cop
       or v_row.currency <> v_currency
       or v_row.event_checksum <> v_checksum then
      raise exception 'CROWDFUNDING_BOLD_EVENT_REPLAY_CONFLICT';
    end if;
  end if;

  return jsonb_build_object('replayed',v_replayed,'eventId',v_row.id,'verificationStatus',v_row.verification_status);
end;
$function$;

revoke all on function public.record_crowdfunding_bold_webhook_inbox_server(uuid,text,text,text,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.record_crowdfunding_bold_webhook_inbox_server(uuid,text,text,text,bigint,text,text)
  to service_role;

create or replace function public.reconcile_crowdfunding_bold_event_server(
  p_event_row_id uuid,
  p_verified boolean,
  p_rejection_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_event public.federated_crowdfunding_provider_events;
  v_contribution public.federated_crowdfunding_contributions;
  v_settlement public.federated_crowdfunding_settlements;
  v_expected_cop bigint;
  v_rejection text := nullif(upper(trim(coalesce(p_rejection_code,''))), '');
begin
  select * into v_event from public.federated_crowdfunding_provider_events where id=p_event_row_id for update;
  if not found then raise exception 'CROWDFUNDING_BOLD_EVENT_NOT_FOUND'; end if;

  if v_event.verification_status <> 'received' then
    return jsonb_build_object('replayed',true,'eventId',v_event.id,'verificationStatus',v_event.verification_status);
  end if;

  if p_verified is distinct from true then
    if v_rejection is null or v_rejection !~ '^BOLD_[A-Z0-9_]{3,96}$' then
      raise exception 'CROWDFUNDING_BOLD_REJECTION_CODE_REQUIRED';
    end if;
    update public.federated_crowdfunding_provider_events
    set verification_status='rejected',verified_at=clock_timestamp(),rejection_code=v_rejection
    where id=v_event.id;
    return jsonb_build_object('replayed',false,'eventId',v_event.id,'verificationStatus','rejected');
  end if;

  if v_event.external_reference is null then raise exception 'CROWDFUNDING_BOLD_REFERENCE_MISSING'; end if;
  select * into v_contribution
  from public.federated_crowdfunding_contributions c
  where c.rail='bold' and c.provider_external_reference=v_event.external_reference
  for update;
  if not found then raise exception 'CROWDFUNDING_BOLD_CONTRIBUTION_NOT_FOUND'; end if;

  v_expected_cop := v_contribution.amount_cents / 100;
  if v_contribution.currency <> 'COP' or v_event.currency <> 'COP' then raise exception 'CROWDFUNDING_BOLD_CURRENCY_MISMATCH'; end if;
  if v_contribution.amount_cents % 100 <> 0 or v_event.amount_cop <> v_expected_cop then
    raise exception 'CROWDFUNDING_BOLD_AMOUNT_MISMATCH';
  end if;

  if v_event.event_type = 'SALE_APPROVED' then
    if v_contribution.status = 'settled' then
      update public.federated_crowdfunding_provider_events
      set verification_status='verified',verified_at=clock_timestamp()
      where id=v_event.id;
      return jsonb_build_object('replayed',true,'eventId',v_event.id,'contributionId',v_contribution.id,'status','settled');
    end if;
    if v_contribution.status not in ('pending_external','submitted') then raise exception 'CROWDFUNDING_BOLD_STATUS_NOT_SETTLEABLE'; end if;

    insert into public.federated_crowdfunding_settlements(
      contribution_id,rail,settlement_reference,evidence_checksum,amount_cop_cents,
      valuation_source,valuation_observed_at,metadata
    ) values (
      v_contribution.id,'bold',v_event.provider_payment_id,v_event.event_checksum,v_contribution.amount_cents,
      'bold_cop_payment',v_event.received_at,jsonb_build_object('providerEventId',v_event.provider_event_id,'eventType',v_event.event_type)
    )
    on conflict (rail,settlement_reference) do nothing
    returning * into v_settlement;

    if v_settlement.id is null then
      select * into v_settlement from public.federated_crowdfunding_settlements
      where rail='bold' and settlement_reference=v_event.provider_payment_id;
      if v_settlement.contribution_id <> v_contribution.id or v_settlement.amount_cop_cents <> v_contribution.amount_cents then
        raise exception 'CROWDFUNDING_BOLD_SETTLEMENT_CONFLICT';
      end if;
    end if;

    update public.federated_crowdfunding_contributions
    set status='settled',settled_at=coalesce(settled_at,clock_timestamp()),updated_at=clock_timestamp()
    where id=v_contribution.id;
  elsif v_event.event_type = 'SALE_REJECTED' then
    if v_contribution.status in ('created','pending_external','submitted') then
      update public.federated_crowdfunding_contributions set status='failed',updated_at=clock_timestamp() where id=v_contribution.id;
    end if;
  elsif v_event.event_type = 'VOID_APPROVED' then
    if v_contribution.status = 'settled' then
      update public.federated_crowdfunding_contributions set status='reversed',updated_at=clock_timestamp() where id=v_contribution.id;
    elsif v_contribution.status in ('created','pending_external','submitted') then
      update public.federated_crowdfunding_contributions set status='cancelled',updated_at=clock_timestamp() where id=v_contribution.id;
    end if;
  end if;

  update public.federated_crowdfunding_provider_events
  set verification_status='verified',verified_at=clock_timestamp()
  where id=v_event.id;

  return jsonb_build_object('replayed',false,'eventId',v_event.id,'contributionId',v_contribution.id,'status',
    (select status from public.federated_crowdfunding_contributions where id=v_contribution.id));
end;
$function$;

revoke all on function public.reconcile_crowdfunding_bold_event_server(uuid,boolean,text)
  from public, anon, authenticated;
grant execute on function public.reconcile_crowdfunding_bold_event_server(uuid,boolean,text)
  to service_role;

create or replace function public.materialize_crowdfunding_crypto_settlement_server(
  p_wallet_intent_id uuid,
  p_amount_cop_cents bigint,
  p_valuation_source text,
  p_valuation_observed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_contribution public.federated_crowdfunding_contributions;
  v_wallet public.wallet_intents_v2;
  v_settlement public.federated_crowdfunding_settlements;
begin
  if p_amount_cop_cents is null or p_amount_cop_cents <= 0 then raise exception 'CROWDFUNDING_CRYPTO_VALUATION_INVALID'; end if;
  if length(trim(coalesce(p_valuation_source,''))) < 2 then raise exception 'CROWDFUNDING_CRYPTO_VALUATION_SOURCE_REQUIRED'; end if;
  if p_valuation_observed_at is null then raise exception 'CROWDFUNDING_CRYPTO_VALUATION_TIME_REQUIRED'; end if;

  select * into v_contribution from public.federated_crowdfunding_contributions
  where rail='ctg_wallet_crypto' and wallet_intent_id=p_wallet_intent_id for update;
  if not found then raise exception 'CROWDFUNDING_CRYPTO_CONTRIBUTION_NOT_FOUND'; end if;

  select * into v_wallet from public.wallet_intents_v2 where id=p_wallet_intent_id;
  if not found
     or v_wallet.status <> 'reconciled'
     or v_wallet.chain_id <> 137
     or v_wallet.asset_symbol <> 'USDC'
     or v_wallet.tx_hash is null
     or v_wallet.chain_block_number is null
     or v_wallet.chain_confirmations is null
     or v_wallet.chain_confirmations < 1
     or v_wallet.chain_reconciliation_digest_sha256 is null then
    raise exception 'CROWDFUNDING_CRYPTO_CHAIN_EVIDENCE_INCOMPLETE';
  end if;

  insert into public.federated_crowdfunding_settlements(
    contribution_id,rail,settlement_reference,evidence_checksum,amount_cop_cents,
    valuation_source,valuation_observed_at,tx_hash,block_number,metadata
  ) values (
    v_contribution.id,'ctg_wallet_crypto',v_wallet.tx_hash,v_wallet.chain_reconciliation_digest_sha256,
    p_amount_cop_cents,trim(p_valuation_source),p_valuation_observed_at,v_wallet.tx_hash,v_wallet.chain_block_number,
    jsonb_build_object('walletIntentId',v_wallet.id,'chainId',137,'assetSymbol','USDC','amountBaseUnits',v_wallet.amount_base_units,'confirmations',v_wallet.chain_confirmations)
  ) on conflict (rail,settlement_reference) do nothing
  returning * into v_settlement;

  if v_settlement.id is null then
    select * into v_settlement from public.federated_crowdfunding_settlements
    where rail='ctg_wallet_crypto' and settlement_reference=v_wallet.tx_hash;
    if v_settlement.contribution_id <> v_contribution.id or v_settlement.amount_cop_cents <> p_amount_cop_cents then
      raise exception 'CROWDFUNDING_CRYPTO_SETTLEMENT_CONFLICT';
    end if;
  end if;

  update public.federated_crowdfunding_contributions
  set status='settled',settled_at=coalesce(settled_at,v_wallet.settled_at,clock_timestamp()),updated_at=clock_timestamp()
  where id=v_contribution.id;

  return jsonb_build_object('settlementId',v_settlement.id,'contributionId',v_contribution.id,'status','settled');
end;
$function$;

revoke all on function public.materialize_crowdfunding_crypto_settlement_server(uuid,bigint,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.materialize_crowdfunding_crypto_settlement_server(uuid,bigint,text,timestamptz)
  to service_role;
