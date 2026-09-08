-- CTG One — Crowdfunding Settlement Foundation V1
--
-- CTG One is the canonical financial authority for VERTICE crowdfunding.
-- VERTICE owns campaigns/impact; CTG One owns payment intents, trusted provider
-- evidence and accounting settlement facts; CTG Wallet executes linked crypto_send
-- intents without becoming a second ledger.
--
-- Safety invariants:
--   * donation/reward only; no equity, debt, revenue/profit share or token sale;
--   * active fundraising requires VERTICE compliance=verified and CTG KYC for the beneficiary;
--   * browser roles cannot mutate financial/certification tables;
--   * Bold redirects never settle money; only a verified server webhook may do so;
--   * crypto uses the existing CTG wallet intent lifecycle and a certified treasury;
--   * crypto settlement requires reconciled on-chain evidence plus an explicit COP valuation;
--   * financial facts never write civic reputation.

-- ---------------------------------------------------------------------------
-- Certified campaign treasuries. No runtime API is introduced to certify one.
-- A later separately-reviewed operations control may populate/certify these rows.
-- ---------------------------------------------------------------------------
create table public.crowdfunding_treasuries (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null check (chain_id = 137),
  asset_symbol text not null check (asset_symbol = 'USDC'),
  address text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
  address_normalized text generated always as (lower(address)) stored,
  custody_model text not null check (custody_model in ('ctg_controlled','regulated_partner')),
  status text not null default 'pending' check (status in ('pending','certified','suspended','retired')),
  certification_reference text,
  certified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crowdfunding_treasuries_certification_check check (
    (status = 'certified' and nullif(trim(certification_reference),'') is not null and certified_at is not null)
    or (status <> 'certified')
  ),
  constraint crowdfunding_treasuries_chain_asset_address_unique unique (chain_id, asset_symbol, address_normalized)
);

comment on table public.crowdfunding_treasuries is
  'Allowlisted crypto destinations for crowdfunding. Runtime users/services cannot self-certify arbitrary wallets.';

alter table public.crowdfunding_treasuries enable row level security;
revoke all on table public.crowdfunding_treasuries from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Financially relevant mirror of VERTICE campaigns.
-- VERTICE remains the campaign source of truth; CTG One stores only the bounded
-- facts needed to decide whether money may be accepted/held.
-- ---------------------------------------------------------------------------
create table public.crowdfunding_campaign_registry (
  id uuid primary key default gen_random_uuid(),
  source_service text not null default 'vertice' check (source_service = 'vertice'),
  external_campaign_id uuid not null,
  title text not null check (char_length(trim(title)) between 8 and 160),
  beneficiary_user_id uuid not null references public.profiles(id) on delete restrict,
  funding_model text not null check (funding_model in ('donation','reward')),
  campaign_status text not null check (campaign_status in ('active','funded','executing','verifying','completed','suspended')),
  compliance_status text not null check (compliance_status in ('verified','suspended')),
  fiat_enabled boolean not null default false,
  crypto_enabled boolean not null default false,
  treasury_id uuid references public.crowdfunding_treasuries(id) on delete restrict,
  policy_version text not null check (char_length(trim(policy_version)) between 3 and 64),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crowdfunding_campaign_registry_external_unique unique (source_service, external_campaign_id),
  constraint crowdfunding_campaign_registry_crypto_treasury_check check (not crypto_enabled or treasury_id is not null),
  constraint crowdfunding_campaign_registry_active_compliance_check check (
    campaign_status <> 'active' or compliance_status = 'verified'
  )
);

create index crowdfunding_campaign_registry_beneficiary_idx
  on public.crowdfunding_campaign_registry(beneficiary_user_id, updated_at desc);
create index crowdfunding_campaign_registry_accepting_idx
  on public.crowdfunding_campaign_registry(campaign_status, compliance_status)
  where campaign_status = 'active' and compliance_status = 'verified';

alter table public.crowdfunding_campaign_registry enable row level security;
revoke all on table public.crowdfunding_campaign_registry from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Canonical financial contribution intent.
-- A crypto contribution links to the existing wallet_intents_v2 crypto_send
-- contract; no alternate blockchain intent/ledger is introduced.
-- ---------------------------------------------------------------------------
create table public.crowdfunding_contribution_intents (
  id uuid primary key default gen_random_uuid(),
  campaign_registry_id uuid not null references public.crowdfunding_campaign_registry(id) on delete restrict,
  contributor_user_id uuid not null references public.profiles(id) on delete restrict,
  intent_kind text not null default 'crowdfunding_contribution' check (intent_kind = 'crowdfunding_contribution'),
  rail text not null check (rail in ('bold','crypto_wallet')),
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 16 and 128),
  idempotency_key_normalized text generated always as (lower(trim(idempotency_key))) stored,
  status text not null check (status in (
    'created','provider_pending','wallet_pending','paid','paid_held','rejected','voided','failed','cancelled','expired'
  )),
  currency text,
  amount_cop bigint,
  provider_code text,
  provider_reference text,
  provider_payment_link_id text,
  provider_checkout_url text,
  provider_transaction_id text,
  wallet_intent_id uuid unique references public.wallet_intents_v2(id) on delete restrict,
  treasury_id uuid references public.crowdfunding_treasuries(id) on delete restrict,
  chain_id bigint,
  asset_symbol text,
  amount_base_units text,
  accounting_value_cop bigint,
  settled_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crowdfunding_contribution_user_idempotency_unique unique (contributor_user_id, idempotency_key_normalized),
  constraint crowdfunding_contribution_provider_link_unique unique (provider_payment_link_id),
  constraint crowdfunding_contribution_provider_reference_unique unique (provider_code, provider_reference),
  constraint crowdfunding_contribution_provider_transaction_unique unique (provider_code, provider_transaction_id),
  constraint crowdfunding_contribution_settlement_pair check ((settled_at is null) = (accounting_value_cop is null)),
  constraint crowdfunding_contribution_bold_shape check (
    rail <> 'bold' or (
      currency = 'COP'
      and amount_cop between 1000 and 5000000
      and provider_code = 'bold'
      and provider_reference is not null
      and wallet_intent_id is null
      and treasury_id is null
      and chain_id is null
      and asset_symbol is null
      and amount_base_units is null
    )
  ),
  constraint crowdfunding_contribution_crypto_shape check (
    rail <> 'crypto_wallet' or (
      currency is null
      and amount_cop is null
      and provider_code is null
      and provider_reference is null
      and provider_payment_link_id is null
      and provider_checkout_url is null
      and provider_transaction_id is null
      and wallet_intent_id is not null
      and treasury_id is not null
      and chain_id = 137
      and asset_symbol = 'USDC'
      and amount_base_units ~ '^[1-9][0-9]{0,77}$'
    )
  )
);

create index crowdfunding_contribution_campaign_idx
  on public.crowdfunding_contribution_intents(campaign_registry_id, created_at desc);
create index crowdfunding_contribution_user_idx
  on public.crowdfunding_contribution_intents(contributor_user_id, created_at desc);
create index crowdfunding_contribution_status_idx
  on public.crowdfunding_contribution_intents(status, updated_at desc);

alter table public.crowdfunding_contribution_intents enable row level security;
revoke all on table public.crowdfunding_contribution_intents from public, anon, authenticated, service_role;

-- Sanitized, append-only provider notification evidence. Raw Bold payloads and
-- payer/card details are deliberately not persisted.
create table public.crowdfunding_provider_events (
  id uuid primary key default gen_random_uuid(),
  contribution_intent_id uuid not null references public.crowdfunding_contribution_intents(id) on delete restrict,
  provider_code text not null check (provider_code = 'bold'),
  provider_event_id uuid not null,
  event_type text not null check (event_type in ('SALE_APPROVED','SALE_REJECTED','VOID_APPROVED','VOID_REJECTED')),
  provider_payment_id text not null check (char_length(trim(provider_payment_id)) between 1 and 160),
  provider_payment_link_id text not null check (provider_payment_link_id ~ '^LNK_[A-Za-z0-9_-]{3,120}$'),
  amount_cop bigint not null check (amount_cop > 0),
  currency text not null check (currency = 'COP'),
  body_sha256 text not null check (body_sha256 ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint crowdfunding_provider_event_identity_unique unique (provider_code, provider_event_id)
);

create index crowdfunding_provider_events_contribution_idx
  on public.crowdfunding_provider_events(contribution_intent_id, occurred_at, id);
create index crowdfunding_provider_events_payment_idx
  on public.crowdfunding_provider_events(provider_code, provider_payment_id, occurred_at);

alter table public.crowdfunding_provider_events enable row level security;
revoke all on table public.crowdfunding_provider_events from public, anon, authenticated, service_role;

-- Accounting/settlement evidence is append-only. For crypto, value_cop is the
-- explicit accounting valuation at settlement time; token units are never
-- silently reinterpreted as COP.
create table public.crowdfunding_settlement_events (
  id uuid primary key default gen_random_uuid(),
  contribution_intent_id uuid not null references public.crowdfunding_contribution_intents(id) on delete restrict,
  event_type text not null check (event_type in ('fiat_approved','fiat_voided','crypto_confirmed')),
  rail text not null check (rail in ('bold','crypto_wallet')),
  external_reference text not null check (char_length(trim(external_reference)) between 1 and 255),
  value_cop bigint not null check (value_cop > 0),
  chain_id bigint,
  asset_symbol text,
  amount_base_units text,
  tx_hash text,
  valuation_source text,
  valuation_at timestamptz,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint crowdfunding_settlement_external_unique unique (rail, event_type, external_reference),
  constraint crowdfunding_settlement_crypto_evidence check (
    (rail = 'bold' and chain_id is null and asset_symbol is null and amount_base_units is null and tx_hash is null and valuation_source is null and valuation_at is null)
    or (
      rail = 'crypto_wallet'
      and event_type = 'crypto_confirmed'
      and chain_id = 137
      and asset_symbol = 'USDC'
      and amount_base_units ~ '^[1-9][0-9]{0,77}$'
      and tx_hash ~ '^0x[0-9a-f]{64}$'
      and nullif(trim(valuation_source),'') is not null
      and valuation_at is not null
    )
  )
);

create index crowdfunding_settlement_contribution_idx
  on public.crowdfunding_settlement_events(contribution_intent_id, occurred_at, id);

alter table public.crowdfunding_settlement_events enable row level security;
revoke all on table public.crowdfunding_settlement_events from public, anon, authenticated, service_role;

create function public._reject_crowdfunding_financial_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  raise exception 'CROWDFUNDING_FINANCIAL_HISTORY_IMMUTABLE';
end;
$function$;

revoke all on function public._reject_crowdfunding_financial_history_mutation()
  from public, anon, authenticated, service_role;

create trigger crowdfunding_provider_events_immutable
before update or delete on public.crowdfunding_provider_events
for each row execute function public._reject_crowdfunding_financial_history_mutation();

create trigger crowdfunding_settlement_events_immutable
before update or delete on public.crowdfunding_settlement_events
for each row execute function public._reject_crowdfunding_financial_history_mutation();

-- ---------------------------------------------------------------------------
-- VERTICE -> CTG One campaign sync boundary. The route that invokes this RPC is
-- protected by the existing VERTICE federation secret/rate-limit boundary.
-- CTG One independently revalidates beneficiary KYC and certified treasury state.
-- ---------------------------------------------------------------------------
create function public.sync_vertice_crowdfunding_campaign_server(
  p_external_campaign_id uuid,
  p_title text,
  p_beneficiary_user_id uuid,
  p_funding_model text,
  p_campaign_status text,
  p_compliance_status text,
  p_fiat_enabled boolean,
  p_crypto_enabled boolean,
  p_treasury_id uuid,
  p_policy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_title text := btrim(coalesce(p_title,''));
  v_funding_model text := lower(btrim(coalesce(p_funding_model,'')));
  v_campaign_status text := lower(btrim(coalesce(p_campaign_status,'')));
  v_compliance_status text := lower(btrim(coalesce(p_compliance_status,'')));
  v_policy_version text := btrim(coalesce(p_policy_version,''));
  v_treasury public.crowdfunding_treasuries;
  v_row public.crowdfunding_campaign_registry;
  v_now timestamptz := clock_timestamp();
begin
  if p_external_campaign_id is null then raise exception 'CROWDFUNDING_CAMPAIGN_ID_REQUIRED'; end if;
  if char_length(v_title) < 8 or char_length(v_title) > 160 then raise exception 'CROWDFUNDING_CAMPAIGN_TITLE_INVALID'; end if;
  if p_beneficiary_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_beneficiary_user_id
  ) then raise exception 'CROWDFUNDING_BENEFICIARY_INVALID'; end if;
  if v_funding_model not in ('donation','reward') then raise exception 'CROWDFUNDING_FUNDING_MODEL_PROHIBITED'; end if;
  if v_campaign_status not in ('active','funded','executing','verifying','completed','suspended') then raise exception 'CROWDFUNDING_CAMPAIGN_STATUS_INVALID'; end if;
  if v_compliance_status not in ('verified','suspended') then raise exception 'CROWDFUNDING_COMPLIANCE_STATUS_INVALID'; end if;
  if char_length(v_policy_version) < 3 or char_length(v_policy_version) > 64 then raise exception 'CROWDFUNDING_POLICY_VERSION_INVALID'; end if;
  if v_campaign_status = 'active' and v_compliance_status <> 'verified' then raise exception 'CROWDFUNDING_ACTIVE_REQUIRES_COMPLIANCE'; end if;

  -- Financial activation is CTG-controlled. VERTICE cannot attest its own way
  -- around CTG One KYC records.
  if v_campaign_status = 'active' and (coalesce(p_fiat_enabled,false) or coalesce(p_crypto_enabled,false)) then
    if not exists (
      select 1 from public.profiles p
      where p.id = p_beneficiary_user_id and p.kyc_status = 'verified'
    ) or not exists (
      select 1 from public.kyc_submissions k
      where k.user_id = p_beneficiary_user_id
        and k.status = 'verified'
        and k.reviewed_at is not null
    ) then
      raise exception 'CROWDFUNDING_BENEFICIARY_KYC_REQUIRED';
    end if;
  end if;

  if coalesce(p_crypto_enabled,false) then
    if p_treasury_id is null then raise exception 'CROWDFUNDING_CERTIFIED_TREASURY_REQUIRED'; end if;
    select * into v_treasury from public.crowdfunding_treasuries where id = p_treasury_id;
    if v_treasury.id is null or v_treasury.status <> 'certified' or v_treasury.chain_id <> 137 or v_treasury.asset_symbol <> 'USDC' then
      raise exception 'CROWDFUNDING_CERTIFIED_TREASURY_REQUIRED';
    end if;
  elsif p_treasury_id is not null then
    raise exception 'CROWDFUNDING_TREASURY_WITHOUT_CRYPTO';
  end if;

  insert into public.crowdfunding_campaign_registry(
    source_service,external_campaign_id,title,beneficiary_user_id,funding_model,
    campaign_status,compliance_status,fiat_enabled,crypto_enabled,treasury_id,
    policy_version,synced_at,created_at,updated_at
  ) values (
    'vertice',p_external_campaign_id,v_title,p_beneficiary_user_id,v_funding_model,
    v_campaign_status,v_compliance_status,coalesce(p_fiat_enabled,false),coalesce(p_crypto_enabled,false),p_treasury_id,
    v_policy_version,v_now,v_now,v_now
  )
  on conflict (source_service,external_campaign_id) do update
  set title = excluded.title,
      beneficiary_user_id = excluded.beneficiary_user_id,
      funding_model = excluded.funding_model,
      campaign_status = excluded.campaign_status,
      compliance_status = excluded.compliance_status,
      fiat_enabled = excluded.fiat_enabled,
      crypto_enabled = excluded.crypto_enabled,
      treasury_id = excluded.treasury_id,
      policy_version = excluded.policy_version,
      synced_at = excluded.synced_at,
      updated_at = excluded.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'campaignRegistryId',v_row.id,
    'externalCampaignId',v_row.external_campaign_id,
    'status',v_row.campaign_status,
    'complianceStatus',v_row.compliance_status,
    'fiatEnabled',v_row.fiat_enabled,
    'cryptoEnabled',v_row.crypto_enabled,
    'treasuryCertified',case when v_row.treasury_id is null then false else true end,
    'syncedAt',v_row.synced_at
  );
end;
$function$;

revoke all on function public.sync_vertice_crowdfunding_campaign_server(uuid,text,uuid,text,text,text,boolean,boolean,uuid,text)
  from public, anon, authenticated;
grant execute on function public.sync_vertice_crowdfunding_campaign_server(uuid,text,uuid,text,text,text,boolean,boolean,uuid,text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Authenticated contribution intent creation. The server supplies canonical user
-- identity. Destination addresses never come from the browser.
-- ---------------------------------------------------------------------------
create function public.create_crowdfunding_contribution_intent_server(
  p_user_id uuid,
  p_external_campaign_id uuid,
  p_idempotency_key text,
  p_rail text,
  p_amount_cop bigint,
  p_asset_symbol text,
  p_amount_base_units text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_key text := btrim(coalesce(p_idempotency_key,''));
  v_rail text := lower(btrim(coalesce(p_rail,'')));
  v_asset text := upper(btrim(coalesce(p_asset_symbol,'')));
  v_units text := btrim(coalesce(p_amount_base_units,''));
  v_campaign public.crowdfunding_campaign_registry;
  v_treasury public.crowdfunding_treasuries;
  v_existing public.crowdfunding_contribution_intents;
  v_id uuid := gen_random_uuid();
  v_provider_reference text;
  v_wallet_response jsonb;
  v_wallet_intent_id uuid;
  v_row public.crowdfunding_contribution_intents;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'CROWDFUNDING_CONTRIBUTOR_INVALID';
  end if;
  if p_external_campaign_id is null then raise exception 'CROWDFUNDING_CAMPAIGN_ID_REQUIRED'; end if;
  if char_length(v_key) < 16 or char_length(v_key) > 128 then raise exception 'CROWDFUNDING_IDEMPOTENCY_KEY_INVALID'; end if;
  if v_rail not in ('bold','crypto_wallet') then raise exception 'CROWDFUNDING_RAIL_UNSUPPORTED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('ctg-crowdfunding-intent:'||p_user_id::text||':'||lower(v_key),0));

  select * into v_existing
  from public.crowdfunding_contribution_intents i
  where i.contributor_user_id = p_user_id and i.idempotency_key_normalized = lower(v_key);

  if found then
    if v_existing.rail <> v_rail then raise exception 'CROWDFUNDING_IDEMPOTENCY_CONFLICT'; end if;
    if v_rail = 'bold' and (
      v_existing.amount_cop is distinct from p_amount_cop or p_asset_symbol is not null or p_amount_base_units is not null
    ) then raise exception 'CROWDFUNDING_IDEMPOTENCY_CONFLICT'; end if;
    if v_rail = 'crypto_wallet' and (
      v_existing.asset_symbol is distinct from v_asset or v_existing.amount_base_units is distinct from v_units or p_amount_cop is not null
    ) then raise exception 'CROWDFUNDING_IDEMPOTENCY_CONFLICT'; end if;

    if not exists (
      select 1 from public.crowdfunding_campaign_registry c
      where c.id = v_existing.campaign_registry_id and c.external_campaign_id = p_external_campaign_id
    ) then raise exception 'CROWDFUNDING_IDEMPOTENCY_CONFLICT'; end if;

    return jsonb_build_object(
      'replayed',true,'contributionId',v_existing.id,'rail',v_existing.rail,'status',v_existing.status,
      'providerReference',v_existing.provider_reference,'paymentLinkId',v_existing.provider_payment_link_id,
      'checkoutUrl',v_existing.provider_checkout_url,'walletIntentId',v_existing.wallet_intent_id,
      'expiresAt',v_existing.expires_at
    );
  end if;

  select * into v_campaign
  from public.crowdfunding_campaign_registry c
  where c.source_service = 'vertice' and c.external_campaign_id = p_external_campaign_id
  for share;

  if v_campaign.id is null then raise exception 'CROWDFUNDING_CAMPAIGN_NOT_REGISTERED'; end if;
  if v_campaign.campaign_status <> 'active' or v_campaign.compliance_status <> 'verified' then
    raise exception 'CROWDFUNDING_CAMPAIGN_NOT_ACCEPTING_FUNDS';
  end if;
  if v_campaign.funding_model not in ('donation','reward') then raise exception 'CROWDFUNDING_FUNDING_MODEL_PROHIBITED'; end if;

  if not exists (
    select 1 from public.profiles p where p.id = v_campaign.beneficiary_user_id and p.kyc_status = 'verified'
  ) or not exists (
    select 1 from public.kyc_submissions k
    where k.user_id = v_campaign.beneficiary_user_id and k.status = 'verified' and k.reviewed_at is not null
  ) then raise exception 'CROWDFUNDING_BENEFICIARY_KYC_REQUIRED'; end if;

  if v_rail = 'bold' then
    if not v_campaign.fiat_enabled then raise exception 'CROWDFUNDING_FIAT_DISABLED'; end if;
    if p_amount_cop is null or p_amount_cop < 1000 or p_amount_cop > 5000000 then raise exception 'CROWDFUNDING_BOLD_AMOUNT_INVALID'; end if;
    if p_asset_symbol is not null or p_amount_base_units is not null then raise exception 'CROWDFUNDING_BOLD_SHAPE_INVALID'; end if;

    v_provider_reference := 'CTGCF-'||v_id::text;
    insert into public.crowdfunding_contribution_intents(
      id,campaign_registry_id,contributor_user_id,rail,idempotency_key,status,currency,amount_cop,
      provider_code,provider_reference,expires_at,created_at,updated_at
    ) values (
      v_id,v_campaign.id,p_user_id,'bold',v_key,'created','COP',p_amount_cop,
      'bold',v_provider_reference,v_now + interval '30 minutes',v_now,v_now
    ) returning * into v_row;

  else
    if not v_campaign.crypto_enabled then raise exception 'CROWDFUNDING_CRYPTO_DISABLED'; end if;
    if v_asset <> 'USDC' then raise exception 'CROWDFUNDING_CRYPTO_ASSET_UNSUPPORTED'; end if;
    if char_length(v_units) < 1 or char_length(v_units) > 78 or v_units !~ '^[1-9][0-9]*$' then
      raise exception 'CROWDFUNDING_CRYPTO_AMOUNT_INVALID';
    end if;
    if p_amount_cop is not null then raise exception 'CROWDFUNDING_CRYPTO_SHAPE_INVALID'; end if;

    -- Crypto contributions require CTG KYC in addition to the wallet identity
    -- controls already enforced by the existing authorization contract.
    if not exists (
      select 1 from public.profiles p where p.id = p_user_id and p.kyc_status = 'verified'
    ) or not exists (
      select 1 from public.kyc_submissions k
      where k.user_id = p_user_id and k.status = 'verified' and k.reviewed_at is not null
    ) then raise exception 'CROWDFUNDING_CRYPTO_CONTRIBUTOR_KYC_REQUIRED'; end if;

    select * into v_treasury from public.crowdfunding_treasuries where id = v_campaign.treasury_id for share;
    if v_treasury.id is null or v_treasury.status <> 'certified' or v_treasury.chain_id <> 137 or v_treasury.asset_symbol <> 'USDC' then
      raise exception 'CROWDFUNDING_CERTIFIED_TREASURY_REQUIRED';
    end if;

    -- Reuse the audited CTG Wallet V1 creation contract. Its intent remains
    -- crypto_send so wallet.ctgone.com can authorize/sign it without a parallel
    -- signing protocol. Financial context is linked below server-side.
    v_wallet_response := public.create_wallet_intent_v1_server(
      p_user_id,
      'crowdfunding-'||v_id::text,
      137,
      'USDC',
      v_units,
      v_treasury.address_normalized
    );
    v_wallet_intent_id := (v_wallet_response #>> '{intent,id}')::uuid;
    if v_wallet_intent_id is null then raise exception 'CROWDFUNDING_WALLET_INTENT_CREATE_FAILED'; end if;

    update public.wallet_intents_v2
    set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
          'context','crowdfunding_contribution',
          'crowdfundingContributionId',v_id,
          'verticeCampaignId',p_external_campaign_id,
          'treasuryId',v_treasury.id
        ),
        updated_at = v_now
    where id = v_wallet_intent_id and user_id = p_user_id;

    if not found then raise exception 'CROWDFUNDING_WALLET_INTENT_BIND_FAILED'; end if;

    insert into public.crowdfunding_contribution_intents(
      id,campaign_registry_id,contributor_user_id,rail,idempotency_key,status,
      wallet_intent_id,treasury_id,chain_id,asset_symbol,amount_base_units,
      expires_at,created_at,updated_at
    ) values (
      v_id,v_campaign.id,p_user_id,'crypto_wallet',v_key,'wallet_pending',
      v_wallet_intent_id,v_treasury.id,137,'USDC',v_units,
      v_now + interval '15 minutes',v_now,v_now
    ) returning * into v_row;
  end if;

  return jsonb_build_object(
    'replayed',false,'contributionId',v_row.id,'externalCampaignId',p_external_campaign_id,
    'rail',v_row.rail,'status',v_row.status,'amountCop',v_row.amount_cop,
    'assetSymbol',v_row.asset_symbol,'amountBaseUnits',v_row.amount_base_units,
    'providerReference',v_row.provider_reference,'walletIntentId',v_row.wallet_intent_id,
    'expiresAt',v_row.expires_at
  );
end;
$function$;

revoke all on function public.create_crowdfunding_contribution_intent_server(uuid,uuid,text,text,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.create_crowdfunding_contribution_intent_server(uuid,uuid,text,text,bigint,text,text)
  to service_role;

create function public.bind_crowdfunding_bold_link_server(
  p_contribution_id uuid,
  p_provider_reference text,
  p_payment_link_id text,
  p_checkout_url text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_reference text := btrim(coalesce(p_provider_reference,''));
  v_link text := btrim(coalesce(p_payment_link_id,''));
  v_url text := btrim(coalesce(p_checkout_url,''));
  v_row public.crowdfunding_contribution_intents;
  v_replayed boolean := false;
begin
  if p_contribution_id is null then raise exception 'CROWDFUNDING_CONTRIBUTION_REQUIRED'; end if;
  if char_length(v_reference) < 8 or char_length(v_reference) > 60 or v_reference !~ '^[A-Za-z0-9_-]+$' then raise exception 'CROWDFUNDING_BOLD_REFERENCE_INVALID'; end if;
  if v_link !~ '^LNK_[A-Za-z0-9_-]{3,120}$' then raise exception 'CROWDFUNDING_BOLD_LINK_INVALID'; end if;
  if v_url !~ '^https://checkout[.]bold[.]co/LNK_[A-Za-z0-9_-]{3,120}([?][^[:space:]]*)?$' then raise exception 'CROWDFUNDING_BOLD_URL_INVALID'; end if;

  select * into v_row from public.crowdfunding_contribution_intents where id = p_contribution_id for update;
  if v_row.id is null then raise exception 'CROWDFUNDING_CONTRIBUTION_NOT_FOUND'; end if;
  if v_row.rail <> 'bold' or v_row.provider_code <> 'bold' then raise exception 'CROWDFUNDING_BOLD_PROVIDER_MISMATCH'; end if;
  if v_row.provider_reference <> v_reference then raise exception 'CROWDFUNDING_BOLD_REFERENCE_MISMATCH'; end if;
  if v_row.status not in ('created','provider_pending') then raise exception 'CROWDFUNDING_BOLD_INTENT_NOT_BINDABLE'; end if;

  if v_row.provider_payment_link_id is not null then
    v_replayed := true;
    if v_row.provider_payment_link_id <> v_link or v_row.provider_checkout_url <> v_url then
      raise exception 'CROWDFUNDING_BOLD_LINK_CONFLICT';
    end if;
  else
    if exists (select 1 from public.crowdfunding_contribution_intents i where i.provider_payment_link_id = v_link and i.id <> v_row.id) then
      raise exception 'CROWDFUNDING_BOLD_LINK_CONFLICT';
    end if;
    update public.crowdfunding_contribution_intents
    set provider_payment_link_id = v_link,
        provider_checkout_url = v_url,
        status = 'provider_pending',
        updated_at = clock_timestamp()
    where id = v_row.id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'replayed',v_replayed,'contributionId',v_row.id,'status',v_row.status,
    'paymentLinkId',v_row.provider_payment_link_id,'checkoutUrl',v_row.provider_checkout_url
  );
end;
$function$;

revoke all on function public.bind_crowdfunding_bold_link_server(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.bind_crowdfunding_bold_link_server(uuid,text,text,text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Verified Bold webhook settlement boundary. Caller MUST verify x-bold-signature
-- over the raw body before invoking. API Link webhooks identify the LNK_* in
-- data.metadata.reference; merchant reference is optional recovery evidence from
-- a trusted server-side GET /online/link/v1/{LNK_*} query.
-- ---------------------------------------------------------------------------
create function public.process_crowdfunding_bold_event_server(
  p_provider_event_id uuid,
  p_event_type text,
  p_provider_payment_id text,
  p_payment_link_id text,
  p_merchant_reference text,
  p_amount_cop bigint,
  p_currency text,
  p_body_sha256 text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_event_type text := upper(btrim(coalesce(p_event_type,'')));
  v_payment_id text := btrim(coalesce(p_provider_payment_id,''));
  v_link text := btrim(coalesce(p_payment_link_id,''));
  v_merchant_reference text := nullif(btrim(coalesce(p_merchant_reference,'')),'');
  v_currency text := upper(btrim(coalesce(p_currency,'')));
  v_hash text := lower(btrim(coalesce(p_body_sha256,'')));
  v_existing public.crowdfunding_provider_events;
  v_intent public.crowdfunding_contribution_intents;
  v_campaign public.crowdfunding_campaign_registry;
  v_target_status text;
  v_settlement_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if p_provider_event_id is null then raise exception 'CROWDFUNDING_BOLD_EVENT_ID_INVALID'; end if;
  if v_event_type not in ('SALE_APPROVED','SALE_REJECTED','VOID_APPROVED','VOID_REJECTED') then raise exception 'CROWDFUNDING_BOLD_EVENT_TYPE_INVALID'; end if;
  if char_length(v_payment_id) < 1 or char_length(v_payment_id) > 160 then raise exception 'CROWDFUNDING_BOLD_PAYMENT_ID_INVALID'; end if;
  if v_link !~ '^LNK_[A-Za-z0-9_-]{3,120}$' then raise exception 'CROWDFUNDING_BOLD_LINK_INVALID'; end if;
  if p_amount_cop is null or p_amount_cop <= 0 then raise exception 'CROWDFUNDING_BOLD_AMOUNT_INVALID'; end if;
  if v_currency <> 'COP' then raise exception 'CROWDFUNDING_BOLD_CURRENCY_INVALID'; end if;
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception 'CROWDFUNDING_BOLD_BODY_HASH_INVALID'; end if;
  if p_occurred_at is null or p_occurred_at > v_now + interval '5 minutes' then raise exception 'CROWDFUNDING_BOLD_EVENT_TIME_INVALID'; end if;
  if v_merchant_reference is not null and (
    char_length(v_merchant_reference) < 8 or char_length(v_merchant_reference) > 60 or v_merchant_reference !~ '^[A-Za-z0-9_-]+$'
  ) then raise exception 'CROWDFUNDING_BOLD_REFERENCE_INVALID'; end if;

  select * into v_existing
  from public.crowdfunding_provider_events e
  where e.provider_code = 'bold' and e.provider_event_id = p_provider_event_id;

  if found then
    if v_existing.event_type <> v_event_type
       or v_existing.provider_payment_id <> v_payment_id
       or v_existing.provider_payment_link_id <> v_link
       or v_existing.amount_cop <> p_amount_cop
       or v_existing.currency <> v_currency
       or v_existing.body_sha256 <> v_hash then
      raise exception 'CROWDFUNDING_BOLD_EVENT_REPLAY_CONFLICT';
    end if;
    return jsonb_build_object(
      'replayed',true,'contributionId',v_existing.contribution_intent_id,'providerEventId',p_provider_event_id
    );
  end if;

  select * into v_intent
  from public.crowdfunding_contribution_intents i
  where i.rail = 'bold' and i.provider_code = 'bold' and i.provider_payment_link_id = v_link
  for update;

  -- Recover a link that Bold created successfully but CTG One could not bind
  -- because of an interrupted response. Merchant reference must come from a
  -- trusted server-side Bold link lookup, never directly from the webhook body.
  if v_intent.id is null and v_merchant_reference is not null then
    select * into v_intent
    from public.crowdfunding_contribution_intents i
    where i.rail = 'bold' and i.provider_code = 'bold' and i.provider_reference = v_merchant_reference
    for update;

    if v_intent.id is not null and v_intent.provider_payment_link_id is null then
      update public.crowdfunding_contribution_intents
      set provider_payment_link_id = v_link,
          provider_checkout_url = 'https://checkout.bold.co/'||v_link,
          status = case when status = 'created' then 'provider_pending' else status end,
          updated_at = v_now
      where id = v_intent.id
      returning * into v_intent;
    end if;
  end if;

  if v_intent.id is null then raise exception 'CROWDFUNDING_BOLD_LINK_NOT_FOUND'; end if;
  if v_intent.amount_cop <> p_amount_cop then raise exception 'CROWDFUNDING_BOLD_AMOUNT_MISMATCH'; end if;
  if v_intent.currency <> 'COP' then raise exception 'CROWDFUNDING_BOLD_CURRENCY_MISMATCH'; end if;
  if v_intent.provider_payment_link_id <> v_link then raise exception 'CROWDFUNDING_BOLD_LINK_MISMATCH'; end if;

  if exists (
    select 1 from public.crowdfunding_provider_events e
    where e.provider_code = 'bold' and e.provider_payment_id = v_payment_id
      and e.event_type = v_event_type and e.contribution_intent_id <> v_intent.id
  ) then raise exception 'CROWDFUNDING_BOLD_PAYMENT_CONFLICT'; end if;

  insert into public.crowdfunding_provider_events(
    contribution_intent_id,provider_code,provider_event_id,event_type,provider_payment_id,
    provider_payment_link_id,amount_cop,currency,body_sha256,occurred_at,received_at
  ) values (
    v_intent.id,'bold',p_provider_event_id,v_event_type,v_payment_id,
    v_link,p_amount_cop,'COP',v_hash,p_occurred_at,v_now
  );

  select * into v_campaign from public.crowdfunding_campaign_registry where id = v_intent.campaign_registry_id;

  if v_event_type = 'SALE_APPROVED' then
    if v_intent.status in ('paid','paid_held') then
      if v_intent.provider_transaction_id = v_payment_id then
        return jsonb_build_object('replayed',true,'contributionId',v_intent.id,'status',v_intent.status);
      end if;
      raise exception 'CROWDFUNDING_BOLD_ALREADY_SETTLED';
    end if;
    if v_intent.status not in ('created','provider_pending') then raise exception 'CROWDFUNDING_BOLD_NOT_SETTLEABLE'; end if;

    v_target_status := 'paid';
    if v_campaign.id is null
       or v_campaign.compliance_status <> 'verified'
       or v_campaign.campaign_status <> 'active'
       or not exists (select 1 from public.profiles p where p.id = v_campaign.beneficiary_user_id and p.kyc_status = 'verified')
       or not exists (select 1 from public.kyc_submissions k where k.user_id = v_campaign.beneficiary_user_id and k.status = 'verified' and k.reviewed_at is not null)
    then v_target_status := 'paid_held'; end if;

    update public.crowdfunding_contribution_intents
    set status = v_target_status,
        provider_transaction_id = v_payment_id,
        accounting_value_cop = p_amount_cop,
        settled_at = p_occurred_at,
        updated_at = v_now
    where id = v_intent.id
    returning * into v_intent;

    insert into public.crowdfunding_settlement_events(
      contribution_intent_id,event_type,rail,external_reference,value_cop,occurred_at,metadata
    ) values (
      v_intent.id,'fiat_approved','bold',v_payment_id,p_amount_cop,p_occurred_at,
      jsonb_build_object('providerEventId',p_provider_event_id,'paymentLinkId',v_link,'held',v_target_status='paid_held')
    ) returning id into v_settlement_id;

    perform public._append_domain_event(
      case when v_target_status = 'paid' then 'crowdfunding.contribution.paid' else 'crowdfunding.contribution.held' end,
      'crowdfunding_contribution',
      v_intent.id,
      'crowdfunding:'||v_intent.id::text||':bold-approved:'||v_payment_id,
      jsonb_build_object(
        'contributionId',v_intent.id,'externalCampaignId',v_campaign.external_campaign_id,
        'rail','bold','valueCop',p_amount_cop,'settlementId',v_settlement_id,'status',v_target_status
      ),
      p_occurred_at
    );

    return jsonb_build_object(
      'replayed',false,'contributionId',v_intent.id,'status',v_target_status,
      'settlementId',v_settlement_id,'providerTransactionId',v_payment_id
    );
  end if;

  if v_event_type = 'VOID_APPROVED' then
    if v_intent.status = 'voided' then
      return jsonb_build_object('replayed',true,'contributionId',v_intent.id,'status','voided');
    end if;
    if v_intent.status not in ('paid','paid_held') then raise exception 'CROWDFUNDING_BOLD_VOID_NOT_SETTLEABLE'; end if;

    update public.crowdfunding_contribution_intents
    set status = 'voided', updated_at = v_now
    where id = v_intent.id
    returning * into v_intent;

    insert into public.crowdfunding_settlement_events(
      contribution_intent_id,event_type,rail,external_reference,value_cop,occurred_at,metadata
    ) values (
      v_intent.id,'fiat_voided','bold',p_provider_event_id::text,p_amount_cop,p_occurred_at,
      jsonb_build_object('providerPaymentId',v_payment_id,'reversesProviderTransactionId',v_intent.provider_transaction_id)
    ) returning id into v_settlement_id;

    perform public._append_domain_event(
      'crowdfunding.contribution.voided','crowdfunding_contribution',v_intent.id,
      'crowdfunding:'||v_intent.id::text||':bold-void:'||p_provider_event_id::text,
      jsonb_build_object(
        'contributionId',v_intent.id,'externalCampaignId',v_campaign.external_campaign_id,
        'rail','bold','valueCop',p_amount_cop,'settlementId',v_settlement_id,'status','voided'
      ),p_occurred_at
    );

    return jsonb_build_object('replayed',false,'contributionId',v_intent.id,'status','voided','settlementId',v_settlement_id);
  end if;

  if v_event_type = 'SALE_REJECTED' and v_intent.status in ('created','provider_pending') then
    update public.crowdfunding_contribution_intents set status='rejected',updated_at=v_now where id=v_intent.id returning * into v_intent;
    perform public._append_domain_event(
      'crowdfunding.contribution.rejected','crowdfunding_contribution',v_intent.id,
      'crowdfunding:'||v_intent.id::text||':bold-rejected:'||p_provider_event_id::text,
      jsonb_build_object('contributionId',v_intent.id,'externalCampaignId',v_campaign.external_campaign_id,'rail','bold','status','rejected'),
      p_occurred_at
    );
  end if;

  -- VOID_REJECTED never reverses a successful payment. SALE_REJECTED arriving
  -- after settlement is evidence only and cannot downgrade paid state.
  return jsonb_build_object('replayed',false,'contributionId',v_intent.id,'status',v_intent.status,'providerEventType',v_event_type);
end;
$function$;

revoke all on function public.process_crowdfunding_bold_event_server(uuid,text,text,text,text,bigint,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.process_crowdfunding_bold_event_server(uuid,text,text,text,text,bigint,text,text,timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Crypto accounting finalization. Chain authority remains the existing CTG
-- wallet reconciliation contract. This RPC cannot fabricate on-chain success:
-- the linked wallet_intents_v2 row must already be reconciled with a tx hash.
-- ---------------------------------------------------------------------------
create function public.finalize_crowdfunding_crypto_settlement_server(
  p_contribution_id uuid,
  p_value_cop bigint,
  p_valuation_source text,
  p_valuation_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_intent public.crowdfunding_contribution_intents;
  v_wallet public.wallet_intents_v2;
  v_campaign public.crowdfunding_campaign_registry;
  v_treasury public.crowdfunding_treasuries;
  v_source text := btrim(coalesce(p_valuation_source,''));
  v_target_status text;
  v_settlement_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if p_contribution_id is null then raise exception 'CROWDFUNDING_CONTRIBUTION_REQUIRED'; end if;
  if p_value_cop is null or p_value_cop <= 0 then raise exception 'CROWDFUNDING_CRYPTO_VALUATION_INVALID'; end if;
  if char_length(v_source) < 3 or char_length(v_source) > 120 then raise exception 'CROWDFUNDING_CRYPTO_VALUATION_SOURCE_INVALID'; end if;
  if p_valuation_at is null or p_valuation_at > v_now + interval '5 minutes' then raise exception 'CROWDFUNDING_CRYPTO_VALUATION_TIME_INVALID'; end if;

  select * into v_intent from public.crowdfunding_contribution_intents where id=p_contribution_id for update;
  if v_intent.id is null then raise exception 'CROWDFUNDING_CONTRIBUTION_NOT_FOUND'; end if;
  if v_intent.rail <> 'crypto_wallet' or v_intent.wallet_intent_id is null then raise exception 'CROWDFUNDING_CRYPTO_INTENT_INVALID'; end if;
  if v_intent.status in ('paid','paid_held') then
    if v_intent.accounting_value_cop = p_value_cop then
      return jsonb_build_object('replayed',true,'contributionId',v_intent.id,'status',v_intent.status,'valueCop',v_intent.accounting_value_cop);
    end if;
    raise exception 'CROWDFUNDING_CRYPTO_SETTLEMENT_CONFLICT';
  end if;
  if v_intent.status <> 'wallet_pending' then raise exception 'CROWDFUNDING_CRYPTO_NOT_SETTLEABLE'; end if;

  select * into v_wallet from public.wallet_intents_v2 where id=v_intent.wallet_intent_id and user_id=v_intent.contributor_user_id for share;
  if v_wallet.id is null
     or v_wallet.intent_type <> 'crypto_send'
     or v_wallet.status <> 'reconciled'
     or v_wallet.rail <> 'polygon'
     or v_wallet.chain_id <> 137
     or v_wallet.asset_symbol <> 'USDC'
     or v_wallet.amount_base_units <> v_intent.amount_base_units
     or v_wallet.tx_hash is null
     or v_wallet.tx_hash !~ '^0x[0-9a-fA-F]{64}$'
     or v_wallet.settled_at is null then
    raise exception 'CROWDFUNDING_CRYPTO_CHAIN_NOT_RECONCILED';
  end if;

  select * into v_treasury from public.crowdfunding_treasuries where id=v_intent.treasury_id;
  if v_treasury.id is null or lower(v_wallet.destination_address) <> v_treasury.address_normalized then
    raise exception 'CROWDFUNDING_CRYPTO_TREASURY_BINDING_CONFLICT';
  end if;
  if p_valuation_at < v_wallet.settled_at - interval '1 hour' or p_valuation_at > v_wallet.settled_at + interval '24 hours' then
    raise exception 'CROWDFUNDING_CRYPTO_VALUATION_TIME_OUT_OF_RANGE';
  end if;

  select * into v_campaign from public.crowdfunding_campaign_registry where id=v_intent.campaign_registry_id;
  v_target_status := 'paid';
  if v_campaign.id is null
     or v_campaign.compliance_status <> 'verified'
     or v_campaign.campaign_status not in ('active','funded','executing','verifying','completed')
     or not exists (select 1 from public.profiles p where p.id=v_campaign.beneficiary_user_id and p.kyc_status='verified')
     or not exists (select 1 from public.kyc_submissions k where k.user_id=v_campaign.beneficiary_user_id and k.status='verified' and k.reviewed_at is not null)
  then v_target_status := 'paid_held'; end if;

  update public.crowdfunding_contribution_intents
  set status=v_target_status,
      accounting_value_cop=p_value_cop,
      settled_at=v_wallet.settled_at,
      updated_at=v_now
  where id=v_intent.id
  returning * into v_intent;

  insert into public.crowdfunding_settlement_events(
    contribution_intent_id,event_type,rail,external_reference,value_cop,
    chain_id,asset_symbol,amount_base_units,tx_hash,valuation_source,valuation_at,occurred_at,metadata
  ) values (
    v_intent.id,'crypto_confirmed','crypto_wallet',lower(v_wallet.tx_hash),p_value_cop,
    137,'USDC',v_intent.amount_base_units,lower(v_wallet.tx_hash),v_source,p_valuation_at,v_wallet.settled_at,
    jsonb_build_object('walletIntentId',v_wallet.id,'treasuryId',v_intent.treasury_id,'held',v_target_status='paid_held')
  ) returning id into v_settlement_id;

  perform public._append_domain_event(
    case when v_target_status='paid' then 'crowdfunding.contribution.paid' else 'crowdfunding.contribution.held' end,
    'crowdfunding_contribution',v_intent.id,
    'crowdfunding:'||v_intent.id::text||':crypto:'||lower(v_wallet.tx_hash),
    jsonb_build_object(
      'contributionId',v_intent.id,'externalCampaignId',v_campaign.external_campaign_id,
      'rail','crypto_wallet','assetSymbol','USDC','amountBaseUnits',v_intent.amount_base_units,
      'valueCop',p_value_cop,'txHash',lower(v_wallet.tx_hash),'settlementId',v_settlement_id,'status',v_target_status
    ),v_wallet.settled_at
  );

  return jsonb_build_object(
    'replayed',false,'contributionId',v_intent.id,'status',v_target_status,
    'valueCop',p_value_cop,'txHash',lower(v_wallet.tx_hash),'settlementId',v_settlement_id
  );
end;
$function$;

revoke all on function public.finalize_crowdfunding_crypto_settlement_server(uuid,bigint,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.finalize_crowdfunding_crypto_settlement_server(uuid,bigint,text,timestamptz)
  to service_role;

comment on function public.sync_vertice_crowdfunding_campaign_server(uuid,text,uuid,text,text,text,boolean,boolean,uuid,text) is
  'Server-only bounded VERTICE campaign mirror. CTG One independently validates KYC and treasury certification.';
comment on function public.create_crowdfunding_contribution_intent_server(uuid,uuid,text,text,bigint,text,text) is
  'Server-only canonical crowdfunding financial intent. Crypto reuses wallet_intents_v2 and never accepts a browser destination address.';
comment on function public.process_crowdfunding_bold_event_server(uuid,text,text,text,text,bigint,text,text,timestamptz) is
  'Server-only Bold settlement boundary. Caller must first verify Bold HMAC over the raw request body.';
comment on function public.finalize_crowdfunding_crypto_settlement_server(uuid,bigint,text,timestamptz) is
  'Server-only crypto accounting finalizer. Requires an already reconciled CTG wallet intent plus explicit COP valuation evidence.';
