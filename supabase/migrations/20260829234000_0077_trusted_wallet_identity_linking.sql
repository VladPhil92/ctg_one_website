-- CTG One Wallet — trusted external identity linking
--
-- The browser cannot write wallet_identity_links/wallet_external_accounts.
-- A server route first verifies the Supabase session and a signed Privy identity
-- token, then calls link_verified_wallet_identity() through the service role.
-- This function is therefore the atomic database boundary for an already-
-- verified relationship; it never creates a Privy wallet or trusts browser
-- claims about identity ownership.

-- ---------------------------------------------------------------------------
-- Rate limiting: add a bounded identity-link scope.
-- ---------------------------------------------------------------------------
create or replace function public.consume_api_rate_limit(p_scope text)
returns table(
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer;
  v_row public.api_rate_limit_windows;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  case p_scope
    when 'knowledge.query' then
      v_limit := 30;
      v_window_seconds := 300;
    when 'investment.payment-proof' then
      v_limit := 8;
      v_window_seconds := 600;
    when 'wallet.identity-link' then
      v_limit := 6;
      v_window_seconds := 600;
    else
      raise exception 'unsupported rate-limit scope';
  end case;

  insert into public.api_rate_limit_windows(
    user_id,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (v_user_id, p_scope, v_now, 0, v_now)
  on conflict (user_id, scope) do nothing;

  select * into v_row
  from public.api_rate_limit_windows
  where user_id = v_user_id and scope = p_scope
  for update;

  if v_row.window_started_at + make_interval(secs => v_window_seconds) <= v_now then
    update public.api_rate_limit_windows
    set window_started_at = v_now, request_count = 1, updated_at = v_now
    where user_id = v_user_id and scope = p_scope;

    allowed := true;
    remaining := v_limit - 1;
    retry_after_seconds := 0;
    return next;
    return;
  end if;

  if v_row.request_count >= v_limit then
    allowed := false;
    remaining := 0;
    retry_after_seconds := greatest(
      1,
      ceil(extract(epoch from (
        v_row.window_started_at + make_interval(secs => v_window_seconds) - v_now
      )))::integer
    );
    return next;
    return;
  end if;

  update public.api_rate_limit_windows
  set request_count = request_count + 1, updated_at = v_now
  where user_id = v_user_id and scope = p_scope;

  allowed := true;
  remaining := v_limit - (v_row.request_count + 1);
  retry_after_seconds := 0;
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(text) from public, anon;
grant execute on function public.consume_api_rate_limit(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Append-only identity-link audit trail.
-- ---------------------------------------------------------------------------
create table public.wallet_identity_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('IDENTITY_LINK_VERIFIED','IDENTITY_LINK_IDEMPOTENT')),
  identity_link_id uuid not null references public.wallet_identity_links(id) on delete restrict,
  external_account_id uuid not null references public.wallet_external_accounts(id) on delete restrict,
  provider text not null check (provider = 'privy'),
  provider_user_id text not null,
  address_normalized text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index wallet_identity_audit_log_actor_idx
  on public.wallet_identity_audit_log(actor_user_id, created_at desc);
create index wallet_identity_audit_log_link_idx
  on public.wallet_identity_audit_log(identity_link_id, created_at desc);

alter table public.wallet_identity_audit_log enable row level security;

create policy wallet_identity_audit_log_read_own_or_admin
  on public.wallet_identity_audit_log
  for select
  to authenticated
  using (actor_user_id = auth.uid() or public.is_admin());

revoke all on public.wallet_identity_audit_log from public, anon, authenticated;
grant select on public.wallet_identity_audit_log to authenticated;

create or replace function public._reject_wallet_identity_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'wallet identity audit history is append-only';
end;
$$;

revoke all on function public._reject_wallet_identity_audit_mutation()
  from public, anon, authenticated;

create trigger wallet_identity_audit_log_immutable
before update or delete on public.wallet_identity_audit_log
for each row execute function public._reject_wallet_identity_audit_mutation();

-- ---------------------------------------------------------------------------
-- Trusted atomic identity link.
-- Only service_role may invoke this after server-side cryptographic verification.
-- ---------------------------------------------------------------------------
create or replace function public.link_verified_wallet_identity(
  p_user_id uuid,
  p_provider_user_id text,
  p_evm_address text,
  p_link_mode text,
  p_expected_legacy_address text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_user_id text := nullif(trim(p_provider_user_id), '');
  v_address text := lower(nullif(trim(p_evm_address), ''));
  v_expected_legacy text := lower(nullif(trim(p_expected_legacy_address), ''));
  v_link public.wallet_identity_links;
  v_provider_link public.wallet_identity_links;
  v_account public.wallet_external_accounts;
  v_conflicting_account public.wallet_external_accounts;
  v_primary_account public.wallet_external_accounts;
  v_is_idempotent boolean := false;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null then
    raise exception 'canonical CTG user is required';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'canonical CTG user not found';
  end if;

  if v_provider_user_id is null or length(v_provider_user_id) < 3 or length(v_provider_user_id) > 255 then
    raise exception 'valid Privy user id is required';
  end if;
  if v_address is null or v_address !~ '^0x[0-9a-f]{40}$' then
    raise exception 'valid EVM address is required';
  end if;
  if p_link_mode not in ('new','legacy_preserve') then
    raise exception 'invalid wallet identity link mode';
  end if;
  if v_expected_legacy is not null and v_expected_legacy !~ '^0x[0-9a-f]{40}$' then
    raise exception 'valid expected legacy EVM address is required';
  end if;
  if p_link_mode = 'legacy_preserve' and v_expected_legacy is null then
    raise exception 'legacy_preserve requires the expected legacy wallet address';
  end if;
  if p_link_mode = 'new' and v_expected_legacy is not null then
    raise exception 'new identity link must not supply a legacy wallet address';
  end if;
  if v_expected_legacy is not null and v_expected_legacy <> v_address then
    raise exception 'LEGACY_WALLET_MISMATCH';
  end if;

  -- Serialize competing claims in a deterministic order. These locks protect
  -- both idempotent retries and races involving the same provider identity/address.
  perform pg_advisory_xact_lock(hashtextextended('wallet-link:user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('wallet-link:provider:privy:' || v_provider_user_id, 0));
  perform pg_advisory_xact_lock(hashtextextended('wallet-link:evm:' || v_address, 0));

  select * into v_link
  from public.wallet_identity_links
  where user_id = p_user_id and provider = 'privy'
  for update;

  select * into v_provider_link
  from public.wallet_identity_links
  where provider = 'privy' and provider_user_id = v_provider_user_id
  for update;

  if v_provider_link.id is not null and v_provider_link.user_id <> p_user_id then
    raise exception 'Privy identity is already linked to another CTG user';
  end if;

  if v_link.id is not null then
    if v_link.status = 'revoked' then
      raise exception 'revoked wallet identity links require operator review';
    end if;
    if v_link.provider_user_id <> v_provider_user_id then
      raise exception 'canonical CTG user is already linked to a different Privy identity';
    end if;
    if v_link.link_mode <> p_link_mode then
      raise exception 'wallet identity link mode cannot change implicitly';
    end if;

    v_is_idempotent := v_link.status = 'verified';

    update public.wallet_identity_links
    set status = 'verified',
        linked_at = coalesce(linked_at, v_now),
        verified_at = coalesce(verified_at, v_now),
        revoked_at = null,
        updated_at = v_now
    where id = v_link.id
    returning * into v_link;
  else
    insert into public.wallet_identity_links(
      user_id, provider, provider_user_id, status, link_mode,
      linked_at, verified_at, created_at, updated_at
    ) values (
      p_user_id, 'privy', v_provider_user_id, 'verified', p_link_mode,
      v_now, v_now, v_now, v_now
    )
    returning * into v_link;
  end if;

  select * into v_conflicting_account
  from public.wallet_external_accounts
  where chain_family = 'evm' and address_normalized = v_address
  for update;

  if v_conflicting_account.id is not null and v_conflicting_account.user_id <> p_user_id then
    raise exception 'EVM wallet is already linked to another CTG user';
  end if;

  if v_conflicting_account.id is not null then
    if v_conflicting_account.status = 'revoked' then
      raise exception 'revoked external wallet accounts require operator review';
    end if;
    if v_conflicting_account.identity_link_id is distinct from v_link.id
       or v_conflicting_account.provider <> 'privy'
       or v_conflicting_account.account_kind <> 'embedded' then
      raise exception 'existing EVM wallet association conflicts with verified Privy identity';
    end if;

    update public.wallet_external_accounts
    set status = 'verified',
        is_primary = true,
        legacy_preserved = (p_link_mode = 'legacy_preserve'),
        verified_at = coalesce(verified_at, v_now),
        revoked_at = null,
        updated_at = v_now
    where id = v_conflicting_account.id
    returning * into v_account;
  else
    select * into v_primary_account
    from public.wallet_external_accounts
    where user_id = p_user_id
      and chain_family = 'evm'
      and is_primary is true
      and status <> 'revoked'
    for update;

    if v_primary_account.id is not null and v_primary_account.address_normalized <> v_address then
      raise exception 'canonical CTG user already has a different active primary EVM wallet';
    end if;

    insert into public.wallet_external_accounts(
      user_id, identity_link_id, provider, chain_family, account_kind,
      address, status, is_primary, legacy_preserved,
      verified_at, created_at, updated_at
    ) values (
      p_user_id, v_link.id, 'privy', 'evm', 'embedded',
      v_address, 'verified', true, (p_link_mode = 'legacy_preserve'),
      v_now, v_now, v_now
    )
    returning * into v_account;
  end if;

  insert into public.wallet_identity_audit_log(
    actor_user_id, action, identity_link_id, external_account_id,
    provider, provider_user_id, address_normalized, details
  ) values (
    p_user_id,
    case when v_is_idempotent then 'IDENTITY_LINK_IDEMPOTENT' else 'IDENTITY_LINK_VERIFIED' end,
    v_link.id,
    v_account.id,
    'privy',
    v_provider_user_id,
    v_address,
    jsonb_build_object(
      'link_mode', p_link_mode,
      'legacy_preserved', p_link_mode = 'legacy_preserve',
      'trusted_boundary', 'SERVER_VERIFIED_PRIVY_IDENTITY_TOKEN'
    )
  );

  return jsonb_build_object(
    'userId', p_user_id,
    'identityLinkId', v_link.id,
    'externalAccountId', v_account.id,
    'provider', 'privy',
    'providerUserId', v_provider_user_id,
    'address', v_address,
    'status', 'verified',
    'legacyPreserved', v_account.legacy_preserved,
    'idempotent', v_is_idempotent
  );
end;
$$;

revoke all on function public.link_verified_wallet_identity(uuid,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.link_verified_wallet_identity(uuid,text,text,text,text)
  to service_role;
