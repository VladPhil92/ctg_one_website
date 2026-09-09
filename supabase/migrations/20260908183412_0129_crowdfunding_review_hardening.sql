-- CTG One — crowdfunding review hardening
-- Supersedes function bodies introduced by 0126 without rewriting applied history.

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
  v_subject_kyc_verified boolean;
begin
  if p_external_campaign_id is null then raise exception 'CROWDFUNDING_CAMPAIGN_ID_REQUIRED'; end if;
  if p_subject_user_id is null then raise exception 'CROWDFUNDING_SUBJECT_REQUIRED'; end if;
  if v_model not in ('donation','reward') then raise exception 'CROWDFUNDING_FUNDING_MODEL_PROHIBITED'; end if;
  if v_status not in ('active','suspended','completed') then raise exception 'CROWDFUNDING_CAMPAIGN_STATUS_INVALID'; end if;
  if v_treasury is not null and v_treasury !~ '^0x[0-9a-f]{40}$' then raise exception 'CROWDFUNDING_TREASURY_INVALID'; end if;

  select exists (
    select 1 from public.profiles p
    where p.id = p_subject_user_id and p.kyc_status = 'verified'
  ) into v_subject_kyc_verified;

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

    -- Losing KYC must never prevent a safety transition away from active.
    -- Reactivation, however, requires current verified KYC.
    if v_status = 'active' and not v_subject_kyc_verified then
      raise exception 'CROWDFUNDING_KYC_REQUIRED';
    end if;

    update public.federated_crowdfunding_campaigns
    set campaign_status = v_status,
        compliance_status = case
          when v_status = 'suspended' then 'suspended'
          when v_status = 'active' and v_subject_kyc_verified then 'verified'
          else compliance_status
        end,
        crypto_treasury_address = coalesce(crypto_treasury_address, v_treasury),
        crypto_chain_id = case when coalesce(crypto_treasury_address, v_treasury) is null then null else 137 end,
        crypto_asset_symbol = case when coalesce(crypto_treasury_address, v_treasury) is null then null else 'USDC' end,
        updated_at = clock_timestamp()
    where id = v_row.id
    returning * into v_row;
  else
    if not v_subject_kyc_verified then raise exception 'CROWDFUNDING_KYC_REQUIRED'; end if;
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
  v_external_lock bigint;
  v_idempotency_lock bigint;
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

  -- Financial eligibility re-checks current beneficiary KYC instead of trusting
  -- a stale campaign attestation. A revoked beneficiary cannot receive new funds.
  if not exists (
    select 1 from public.profiles p
    where p.id = v_campaign.subject_user_id and p.kyc_status = 'verified'
  ) then
    raise exception 'CROWDFUNDING_BENEFICIARY_KYC_REQUIRED';
  end if;

  -- Serialize both unique idempotency dimensions before looking for an existing
  -- row. Stable lock ordering prevents deadlocks when requests collide.
  v_external_lock := hashtextextended(v_campaign.id::text || ':external:' || p_external_contribution_id::text, 0);
  v_idempotency_lock := hashtextextended(v_campaign.id::text || ':idempotency:' || lower(v_key), 0);
  perform pg_advisory_xact_lock(least(v_external_lock, v_idempotency_lock));
  if v_external_lock <> v_idempotency_lock then
    perform pg_advisory_xact_lock(greatest(v_external_lock, v_idempotency_lock));
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
