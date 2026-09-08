-- CTG One — Federated Crowdfunding Settlement Foundation V1
--
-- CTG One remains the financial authority. VERTICE owns civic campaign UX,
-- evidence and impact; CTG One owns KYC gating, payment intents, provider refs,
-- wallet intents and settlement evidence.
--
-- Safety invariants:
--   * only verified donation/reward campaigns may accept contributions;
--   * browser roles cannot write campaign, contribution or settlement rows;
--   * crypto fundraising is limited to Polygon USDC in this first slice;
--   * a campaign treasury is registered server-side and cannot be supplied by a donor;
--   * crypto contribution creation reuses canonical wallet_intents_v2;
--   * provider redirects never settle a contribution;
--   * settlement is append-only evidence and never changes civic reputation.

create table public.federated_crowdfunding_campaigns (
  id uuid primary key default gen_random_uuid(),
  federation_provider text not null default 'vertice' check (federation_provider = 'vertice'),
  external_campaign_id uuid not null,
  subject_user_id uuid not null references public.profiles(id) on delete restrict,
  funding_model text not null check (funding_model in ('donation','reward')),
  compliance_status text not null default 'verified' check (compliance_status in ('verified','suspended','revoked')),
  campaign_status text not null check (campaign_status in ('active','suspended','completed')),
  crypto_chain_id bigint check (crypto_chain_id is null or crypto_chain_id = 137),
  crypto_asset_symbol text check (crypto_asset_symbol is null or crypto_asset_symbol = 'USDC'),
  crypto_treasury_address text check (
    crypto_treasury_address is null or crypto_treasury_address ~ '^0x[0-9a-f]{40}$'
  ),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (federation_provider, external_campaign_id),
  constraint federated_crowdfunding_crypto_tuple_check check (
    (crypto_treasury_address is null and crypto_chain_id is null and crypto_asset_symbol is null)
    or (crypto_treasury_address is not null and crypto_chain_id = 137 and crypto_asset_symbol = 'USDC')
  )
);

comment on table public.federated_crowdfunding_campaigns is
  'CTG One financial attestation of a VERTICE campaign. This is not the civic campaign source of truth; it is the allowlist required before CTG financial rails may be used.';

alter table public.federated_crowdfunding_campaigns enable row level security;
revoke all on table public.federated_crowdfunding_campaigns from public, anon, authenticated;
grant select, insert, update on table public.federated_crowdfunding_campaigns to service_role;

create table public.federated_crowdfunding_contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.federated_crowdfunding_campaigns(id) on delete restrict,
  external_contribution_id uuid not null,
  contributor_user_id uuid references public.profiles(id) on delete restrict,
  idempotency_key text not null check (length(trim(idempotency_key)) between 16 and 128),
  idempotency_key_normalized text generated always as (lower(trim(idempotency_key))) stored,
  rail text not null check (rail in ('bold','ctg_wallet_crypto')),
  status text not null default 'created' check (
    status in ('created','pending_external','submitted','settled','failed','cancelled','expired','reversed')
  ),
  currency text,
  amount_cents bigint,
  chain_id bigint,
  asset_symbol text,
  amount_base_units text,
  wallet_intent_id uuid references public.wallet_intents_v2(id) on delete restrict,
  provider_reference text,
  provider_checkout_url text,
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, external_contribution_id),
  unique (campaign_id, idempotency_key_normalized),
  constraint federated_crowdfunding_contribution_shape_check check (
    (
      rail = 'bold'
      and currency = 'COP'
      and amount_cents between 100000 and 5000000000
      and chain_id is null
      and asset_symbol is null
      and amount_base_units is null
      and wallet_intent_id is null
    )
    or
    (
      rail = 'ctg_wallet_crypto'
      and currency is null
      and amount_cents is null
      and chain_id = 137
      and asset_symbol = 'USDC'
      and amount_base_units ~ '^[1-9][0-9]{0,77}$'
      and wallet_intent_id is not null
      and contributor_user_id is not null
    )
  )
);

create unique index federated_crowdfunding_provider_reference_unique
  on public.federated_crowdfunding_contributions(rail, provider_reference)
  where provider_reference is not null;
create index federated_crowdfunding_campaign_status_idx
  on public.federated_crowdfunding_contributions(campaign_id, status, created_at desc);
create index federated_crowdfunding_contributor_idx
  on public.federated_crowdfunding_contributions(contributor_user_id, created_at desc)
  where contributor_user_id is not null;

alter table public.federated_crowdfunding_contributions enable row level security;
revoke all on table public.federated_crowdfunding_contributions from public, anon, authenticated;
grant select, insert, update on table public.federated_crowdfunding_contributions to service_role;

create table public.federated_crowdfunding_settlements (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.federated_crowdfunding_contributions(id) on delete restrict,
  rail text not null check (rail in ('bold','ctg_wallet_crypto')),
  settlement_reference text not null check (length(trim(settlement_reference)) between 1 and 255),
  evidence_checksum text not null check (evidence_checksum ~ '^[0-9a-f]{64}$'),
  amount_cop_cents bigint not null check (amount_cop_cents > 0),
  valuation_source text not null check (length(trim(valuation_source)) between 2 and 120),
  valuation_observed_at timestamptz not null,
  tx_hash text check (tx_hash is null or tx_hash ~ '^0x[0-9a-f]{64}$'),
  block_number bigint check (block_number is null or block_number > 0),
  metadata jsonb not null default '{}'::jsonb,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (rail, settlement_reference),
  unique (rail, evidence_checksum),
  constraint federated_crowdfunding_settlement_crypto_evidence_check check (
    (rail = 'bold' and tx_hash is null and block_number is null)
    or (rail = 'ctg_wallet_crypto' and tx_hash is not null and block_number is not null)
  )
);

comment on table public.federated_crowdfunding_settlements is
  'Append-only settlement evidence for federated crowdfunding. amount_cop_cents is the accounting valuation captured with its source and observation time; no reputation linkage exists.';

alter table public.federated_crowdfunding_settlements enable row level security;
revoke all on table public.federated_crowdfunding_settlements from public, anon, authenticated;
grant select, insert on table public.federated_crowdfunding_settlements to service_role;

create or replace function public.register_vertice_crowdfunding_campaign_server(
  p_external_campaign_id uuid,
  p_subject_user_id uuid,
  p_funding_model text,
  p_campaign_status text,
  p_crypto_treasury_address text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_model text := lower(trim(coalesce(p_funding_model,'')));
  v_status text := lower(trim(coalesce(p_campaign_status,'')));
  v_treasury text := nullif(lower(trim(coalesce(p_crypto_treasury_address,''))), '');
  v_row public.federated_crowdfunding_campaigns;
begin
  if p_external_campaign_id is null then raise exception 'CROWDFUNDING_CAMPAIGN_ID_REQUIRED'; end if;
  if p_subject_user_id is null then raise exception 'CROWDFUNDING_SUBJECT_REQUIRED'; end if;
  if v_model not in ('donation','reward') then raise exception 'CROWDFUNDING_FUNDING_MODEL_PROHIBITED'; end if;
  if v_status not in ('active','suspended','completed') then raise exception 'CROWDFUNDING_CAMPAIGN_STATUS_INVALID'; end if;
  if v_treasury is not null and v_treasury !~ '^0x[0-9a-f]{40}$' then raise exception 'CROWDFUNDING_TREASURY_INVALID'; end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_subject_user_id and p.kyc_status = 'verified'
  ) then
    raise exception 'CROWDFUNDING_KYC_REQUIRED';
  end if;

  select * into v_row
  from public.federated_crowdfunding_campaigns c
  where c.federation_provider = 'vertice' and c.external_campaign_id = p_external_campaign_id
  for update;

  if found then
    if v_row.subject_user_id <> p_subject_user_id or v_row.funding_model <> v_model then
      raise exception 'CROWDFUNDING_CAMPAIGN_ATTESTATION_CONFLICT';
    end if;
    if v_row.crypto_treasury_address is not null
       and v_treasury is not null
       and v_row.crypto_treasury_address <> v_treasury then
      raise exception 'CROWDFUNDING_TREASURY_IMMUTABLE';
    end if;

    update public.federated_crowdfunding_campaigns
    set campaign_status = v_status,
        compliance_status = case when v_status = 'suspended' then 'suspended' else compliance_status end,
        crypto_treasury_address = coalesce(crypto_treasury_address, v_treasury),
        crypto_chain_id = case when coalesce(crypto_treasury_address, v_treasury) is null then null else 137 end,
        crypto_asset_symbol = case when coalesce(crypto_treasury_address, v_treasury) is null then null else 'USDC' end,
        updated_at = clock_timestamp()
    where id = v_row.id
    returning * into v_row;
  else
    if v_status <> 'active' then raise exception 'CROWDFUNDING_NEW_CAMPAIGN_MUST_BE_ACTIVE'; end if;
    insert into public.federated_crowdfunding_campaigns(
      external_campaign_id,subject_user_id,funding_model,compliance_status,campaign_status,
      crypto_chain_id,crypto_asset_symbol,crypto_treasury_address
    ) values (
      p_external_campaign_id,p_subject_user_id,v_model,'verified',v_status,
      case when v_treasury is null then null else 137 end,
      case when v_treasury is null then null else 'USDC' end,
      v_treasury
    ) returning * into v_row;
  end if;

  return jsonb_build_object(
    'id',v_row.id,
    'externalCampaignId',v_row.external_campaign_id,
    'subjectUserId',v_row.subject_user_id,
    'fundingModel',v_row.funding_model,
    'complianceStatus',v_row.compliance_status,
    'campaignStatus',v_row.campaign_status,
    'crypto',case when v_row.crypto_treasury_address is null then null else jsonb_build_object(
      'chainId',v_row.crypto_chain_id,'assetSymbol',v_row.crypto_asset_symbol
    ) end
  );
end;
$function$;

revoke all on function public.register_vertice_crowdfunding_campaign_server(uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.register_vertice_crowdfunding_campaign_server(uuid,uuid,text,text,text)
  to service_role;

create or replace function public.create_vertice_crowdfunding_contribution_server(
  p_external_campaign_id uuid,
  p_external_contribution_id uuid,
  p_contributor_user_id uuid,
  p_idempotency_key text,
  p_rail text,
  p_amount_cents bigint default null,
  p_amount_base_units text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_rail text := lower(trim(coalesce(p_rail,'')));
  v_key text := trim(coalesce(p_idempotency_key,''));
  v_campaign public.federated_crowdfunding_campaigns;
  v_row public.federated_crowdfunding_contributions;
  v_wallet jsonb;
  v_wallet_intent_id uuid;
  v_replayed boolean := false;
begin
  if p_external_campaign_id is null or p_external_contribution_id is null then
    raise exception 'CROWDFUNDING_REFERENCE_REQUIRED';
  end if;
  if length(v_key) < 16 or length(v_key) > 128 then raise exception 'CROWDFUNDING_IDEMPOTENCY_KEY_INVALID'; end if;
  if v_rail not in ('bold','ctg_wallet_crypto') then raise exception 'CROWDFUNDING_RAIL_UNSUPPORTED'; end if;

  select * into v_campaign
  from public.federated_crowdfunding_campaigns c
  where c.federation_provider = 'vertice' and c.external_campaign_id = p_external_campaign_id
  for share;

  if not found then raise exception 'CROWDFUNDING_CAMPAIGN_NOT_REGISTERED'; end if;
  if v_campaign.compliance_status <> 'verified' or v_campaign.campaign_status <> 'active' then
    raise exception 'CROWDFUNDING_CAMPAIGN_NOT_ELIGIBLE';
  end if;

  select * into v_row
  from public.federated_crowdfunding_contributions x
  where x.campaign_id = v_campaign.id
    and (x.external_contribution_id = p_external_contribution_id or x.idempotency_key_normalized = lower(v_key))
  order by x.created_at asc
  limit 1;

  if found then
    if v_row.external_contribution_id <> p_external_contribution_id
       or v_row.rail <> v_rail
       or coalesce(v_row.contributor_user_id::text,'') <> coalesce(p_contributor_user_id::text,'')
       or coalesce(v_row.amount_cents,-1) <> coalesce(p_amount_cents,-1)
       or coalesce(v_row.amount_base_units,'') <> coalesce(trim(p_amount_base_units),'') then
      raise exception 'CROWDFUNDING_IDEMPOTENCY_CONFLICT';
    end if;
    v_replayed := true;
  else
    if v_rail = 'bold' then
      if p_amount_cents is null or p_amount_cents < 100000 or p_amount_cents > 5000000000 then
        raise exception 'CROWDFUNDING_BOLD_AMOUNT_INVALID';
      end if;
      if p_amount_base_units is not null then raise exception 'CROWDFUNDING_AMOUNT_SHAPE_INVALID'; end if;

      insert into public.federated_crowdfunding_contributions(
        campaign_id,external_contribution_id,contributor_user_id,idempotency_key,rail,status,
        currency,amount_cents
      ) values (
        v_campaign.id,p_external_contribution_id,p_contributor_user_id,v_key,'bold','created','COP',p_amount_cents
      ) returning * into v_row;
    else
      if p_contributor_user_id is null then raise exception 'CROWDFUNDING_CRYPTO_IDENTITY_REQUIRED'; end if;
      if p_amount_cents is not null then raise exception 'CROWDFUNDING_AMOUNT_SHAPE_INVALID'; end if;
      if p_amount_base_units is null or trim(p_amount_base_units) !~ '^[1-9][0-9]{0,77}$' then
        raise exception 'CROWDFUNDING_CRYPTO_AMOUNT_INVALID';
      end if;
      if v_campaign.crypto_treasury_address is null then raise exception 'CROWDFUNDING_CRYPTO_TREASURY_REQUIRED'; end if;
      if not exists (
        select 1 from public.profiles p where p.id = p_contributor_user_id and p.kyc_status = 'verified'
      ) then raise exception 'CROWDFUNDING_CRYPTO_KYC_REQUIRED'; end if;

      v_wallet := public.create_wallet_intent_v1_server(
        p_contributor_user_id,
        v_key,
        137,
        'USDC',
        trim(p_amount_base_units),
        v_campaign.crypto_treasury_address
      );
      v_wallet_intent_id := nullif(v_wallet #>> '{intent,id}','')::uuid;
      if v_wallet_intent_id is null then raise exception 'CROWDFUNDING_WALLET_INTENT_FAILED'; end if;

      insert into public.federated_crowdfunding_contributions(
        campaign_id,external_contribution_id,contributor_user_id,idempotency_key,rail,status,
        chain_id,asset_symbol,amount_base_units,wallet_intent_id
      ) values (
        v_campaign.id,p_external_contribution_id,p_contributor_user_id,v_key,'ctg_wallet_crypto','created',
        137,'USDC',trim(p_amount_base_units),v_wallet_intent_id
      ) returning * into v_row;
    end if;
  end if;

  return jsonb_build_object(
    'replayed',v_replayed,
    'contribution',jsonb_build_object(
      'id',v_row.id,
      'externalContributionId',v_row.external_contribution_id,
      'externalCampaignId',p_external_campaign_id,
      'rail',v_row.rail,
      'status',v_row.status,
      'currency',v_row.currency,
      'amountCents',v_row.amount_cents,
      'chainId',v_row.chain_id,
      'assetSymbol',v_row.asset_symbol,
      'amountBaseUnits',v_row.amount_base_units,
      'walletIntentId',v_row.wallet_intent_id,
      'providerReference',v_row.provider_reference,
      'providerCheckoutUrl',v_row.provider_checkout_url,
      'expiresAt',v_row.expires_at
    )
  );
end;
$function$;

revoke all on function public.create_vertice_crowdfunding_contribution_server(uuid,uuid,uuid,text,text,bigint,text)
  from public, anon, authenticated;
grant execute on function public.create_vertice_crowdfunding_contribution_server(uuid,uuid,uuid,text,text,bigint,text)
  to service_role;

create or replace function public.bind_vertice_crowdfunding_bold_checkout_server(
  p_contribution_id uuid,
  p_provider_reference text,
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
  v_url text := trim(coalesce(p_checkout_url,''));
begin
  if v_ref !~ '^LNK_[A-Za-z0-9_-]{3,120}$' then raise exception 'CROWDFUNDING_BOLD_REFERENCE_INVALID'; end if;
  if v_url !~ '^https://checkout[.]bold[.]co/' then raise exception 'CROWDFUNDING_BOLD_CHECKOUT_URL_INVALID'; end if;

  select * into v_row from public.federated_crowdfunding_contributions where id = p_contribution_id for update;
  if not found or v_row.rail <> 'bold' then raise exception 'CROWDFUNDING_BOLD_CONTRIBUTION_INVALID'; end if;
  if v_row.status not in ('created','pending_external') then raise exception 'CROWDFUNDING_BOLD_CONTRIBUTION_NOT_BINDABLE'; end if;

  if v_row.provider_reference is not null then
    if v_row.provider_reference <> v_ref or v_row.provider_checkout_url <> v_url then
      raise exception 'CROWDFUNDING_BOLD_BINDING_CONFLICT';
    end if;
    return jsonb_build_object('replayed',true,'contributionId',v_row.id,'status',v_row.status);
  end if;

  update public.federated_crowdfunding_contributions
  set provider_reference=v_ref,provider_checkout_url=v_url,status='pending_external',updated_at=clock_timestamp()
  where id=v_row.id;

  return jsonb_build_object('replayed',false,'contributionId',v_row.id,'status','pending_external');
end;
$function$;

revoke all on function public.bind_vertice_crowdfunding_bold_checkout_server(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.bind_vertice_crowdfunding_bold_checkout_server(uuid,text,text)
  to service_role;

-- There is deliberately no trigger, FK or RPC touching reputation/ranking tables.
-- Money remains financially auditable but civically neutral.