-- CTG One Wallet — trusted external identity linking
--
-- The browser cannot write wallet_identity_links/wallet_external_accounts.
-- A server route first verifies the Supabase session and a signed Privy identity
-- token, then calls link_verified_wallet_identity() through the service role.
-- Legacy-wallet provenance is loaded from a server-only migration-evidence row;
-- a browser assertion can never mark an arbitrary current wallet as legacy.

-- ---------------------------------------------------------------------------
-- Durable identity-link rate limiting.
--
-- This deliberately does not expand the authenticated SECURITY DEFINER surface.
-- The server has already resolved the canonical Supabase user and passes that
-- UUID through the service role. Browser roles cannot call this function.
-- ---------------------------------------------------------------------------
create or replace function public.consume_wallet_identity_link_rate_limit(p_user_id uuid)
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
  v_limit constant integer := 6;
  v_window_seconds constant integer := 600;
  v_scope constant text := 'wallet.identity-link';
  v_row public.api_rate_limit_windows;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'canonical CTG user not found';
  end if;

  insert into public.api_rate_limit_windows(
    user_id,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_user_id, v_scope, v_now, 0, v_now)
  on conflict (user_id, scope) do nothing;

  select * into v_row
  from public.api_rate_limit_windows
  where user_id = p_user_id and scope = v_scope
  for update;

  if v_row.window_started_at + make_interval(secs => v_window_seconds) <= v_now then
    update public.api_rate_limit_windows
    set window_started_at = v_now, request_count = 1, updated_at = v_now
    where user_id = p_user_id and scope = v_scope;

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
  where user_id = p_user_id and scope = v_scope;

  allowed := true;
  remaining := v_limit - (v_row.request_count + 1);
  retry_after_seconds := 0;
  return next;
end;
$$;

revoke all on function public.consume_wallet_identity_link_rate_limit(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_wallet_identity_link_rate_limit(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Trusted legacy-migration provenance.
--
-- Rows are created/maintained only by trusted operator or service-role tooling
-- from a deterministic legacy export. No browser role receives any privilege.
-- ---------------------------------------------------------------------------
create table public.wallet_legacy_migration_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null check (provider = 'privy'),
  provider_user_id text not null check (length(trim(provider_user_id)) between 3 and 255),
  chain_family text not null default 'evm' check (chain_family = 'evm'),
  expected_address text not null check (trim(expected_address) ~* '^0x[0-9a-f]{40}$'),
  expected_address_normalized text generated always as (lower(trim(expected_address))) stored,
  source_digest_sha256 text not null check (lower(source_digest_sha256) ~ '^[0-9a-f]{64}$'),
  evidence_captured_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','consumed','rejected')),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_legacy_migration_evidence_user_provider_unique unique (user_id, provider),
  constraint wallet_legacy_migration_evidence_provider_user_unique unique (provider, provider_user_id),
  constraint wallet_legacy_migration_evidence_address_unique unique (chain_family, expected_address_normalized),
  constraint wallet_legacy_migration_evidence_consumption_check check (
    (status = 'pending' and consumed_at is null)
    or (status = 'consumed' and consumed_at is not null)
    or (status = 'rejected' and consumed_at is null)
  )
);

comment on table public.wallet_legacy_migration_evidence is
  'Server-only provenance for a pre-unification Privy identity and EVM wallet. The expected address comes from deterministic legacy evidence, never from the browser.';

create index wallet_legacy_migration_evidence_status_idx
  on public.wallet_legacy_migration_evidence(status, evidence_captured_at);

alter table public.wallet_legacy_migration_evidence enable row level security;
revoke all on public.wallet_legacy_migration_evidence from public, anon, authenticated;
revoke all on public.wallet_legacy_migration_evidence from service_role;
grant select, insert, update on public.wallet_legacy_migration_evidence to service_role;

create or replace function public._guard_wallet_legacy_migration_evidence_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.provider is distinct from old.provider
     or new.provider_user_id is distinct from old.provider_user_id
     or new.chain_family is distinct from old.chain_family
     or new.expected_address is distinct from old.expected_address
     or new.source_digest_sha256 is distinct from old.source_digest_sha256
     or new.evidence_captured_at is distinct from old.evidence_captured_at
     or new.created_at is distinct from old.created_at then
    raise exception 'legacy wallet migration provenance is immutable';
  end if;

  if old.status = 'pending' then
    if new.status not in ('pending','consumed','rejected') then
      raise exception 'invalid legacy migration evidence status transition';
    end if;
  elsif new.status is distinct from old.status then
    raise exception 'terminal legacy migration evidence status cannot change';
  end if;

  if old.status <> 'pending' and new.consumed_at is distinct from old.consumed_at then
    raise exception 'terminal legacy migration consumption timestamp is immutable';
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function public._guard_wallet_legacy_migration_evidence_update()
  from public, anon, authenticated;

create trigger wallet_legacy_migration_evidence_guard
before update on public.wallet_legacy_migration_evidence
for each row execute function public._guard_wallet_legacy_migration_evidence_update();

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
  using (actor_user_id = auth.uid() or (select public.is_admin()));

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
  p_link_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_user_id text := nullif(trim(p_provider_user_id), '');
  v_address text := lower(nullif(trim(p_evm_address), ''));
  v_legacy_evidence public.wallet_legacy_migration_evidence;
  v_link public.wallet_identity_links;
  v_provider_link public.wallet_identity_links;
  v_account public.wallet_external_accounts;
  v_conflicting_account public.wallet_external_accounts;
  v_primary_account public.wallet_external_accounts;
  v_link_preexisting boolean := false;
  v_account_preexisting boolean := false;
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

  -- Serialize competing claims in a deterministic order. These locks protect
  -- idempotent retries and races involving the same user/provider/address.
  perform pg_advisory_xact_lock(hashtextextended('wallet-link:user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('wallet-link:provider:privy:' || v_provider_user_id, 0));
  perform pg_advisory_xact_lock(hashtextextended('wallet-link:evm:' || v_address, 0));

  select * into v_legacy_evidence
  from public.wallet_legacy_migration_evidence
  where user_id = p_user_id and provider = 'privy'
  for update;

  if p_link_mode = 'legacy_preserve' then
    if v_legacy_evidence.id is null then
      raise exception 'LEGACY_MIGRATION_EVIDENCE_REQUIRED';
    end if;
    if v_legacy_evidence.status = 'rejected' then
      raise exception 'legacy migration evidence requires operator review';
    end if;
    if v_legacy_evidence.provider_user_id <> v_provider_user_id then
      raise exception 'LEGACY_PROVIDER_IDENTITY_MISMATCH';
    end if;
    if v_legacy_evidence.expected_address_normalized <> v_address then
      raise exception 'LEGACY_WALLET_MISMATCH';
    end if;
  elsif v_legacy_evidence.id is not null and v_legacy_evidence.status = 'pending' then
    -- A known legacy user cannot bypass preservation by asking for a fresh link.
    raise exception 'LEGACY_MIGRATION_REQUIRED';
  end if;

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
    v_link_preexisting := true;
    if v_link.status = 'revoked' then
      raise exception 'revoked wallet identity links require operator review';
    end if;
    if v_link.provider_user_id <> v_provider_user_id then
      raise exception 'canonical CTG user is already linked to a different Privy identity';
    end if;
    if v_link.link_mode <> p_link_mode then
      raise exception 'wallet identity link mode cannot change implicitly';
    end if;

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
    v_account_preexisting := true;
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

  v_is_idempotent := v_link_preexisting and v_account_preexisting;

  if p_link_mode = 'legacy_preserve' and v_legacy_evidence.status = 'pending' then
    update public.wallet_legacy_migration_evidence
    set status = 'consumed', consumed_at = v_now, updated_at = v_now
    where id = v_legacy_evidence.id
    returning * into v_legacy_evidence;
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
      'legacy_evidence_id', case when p_link_mode = 'legacy_preserve' then v_legacy_evidence.id else null end,
      'legacy_source_digest_sha256', case when p_link_mode = 'legacy_preserve' then v_legacy_evidence.source_digest_sha256 else null end,
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

revoke all on function public.link_verified_wallet_identity(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.link_verified_wallet_identity(uuid,text,text,text)
  to service_role;
