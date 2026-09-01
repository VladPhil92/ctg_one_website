-- CTG One Wallet — atomic legacy identity bootstrap
--
-- A server route has already verified both the canonical Supabase user and the
-- signed Privy identity token before invoking this function through service_role.
-- This transaction either creates/reuses trusted legacy provenance AND links the
-- verified wallet identity, or leaves neither mutation behind.

create or replace function public.bootstrap_verified_legacy_wallet_identity(
  p_user_id uuid,
  p_provider_user_id text,
  p_evm_address text,
  p_source_digest_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_user_id text := nullif(trim(p_provider_user_id), '');
  v_address text := lower(nullif(trim(p_evm_address), ''));
  v_source_digest text := lower(nullif(trim(p_source_digest_sha256), ''));
  v_evidence public.wallet_legacy_migration_evidence;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    raise exception 'canonical CTG user not found';
  end if;

  if v_provider_user_id is null
     or length(v_provider_user_id) < 3
     or length(v_provider_user_id) > 255 then
    raise exception 'valid Privy user id is required';
  end if;

  if v_address is null or v_address !~ '^0x[0-9a-f]{40}$' then
    raise exception 'valid EVM address is required';
  end if;

  if v_source_digest is null or v_source_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'valid legacy evidence digest is required';
  end if;

  -- Use the same deterministic lock order as link_verified_wallet_identity so
  -- competing bootstrap/link requests serialize before provenance is created.
  perform pg_advisory_xact_lock(
    hashtextextended('wallet-link:user:' || p_user_id::text, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('wallet-link:provider:privy:' || v_provider_user_id, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('wallet-link:evm:' || v_address, 0)
  );

  select * into v_evidence
  from public.wallet_legacy_migration_evidence
  where user_id = p_user_id and provider = 'privy'
  for update;

  if v_evidence.id is null then
    insert into public.wallet_legacy_migration_evidence(
      user_id,
      provider,
      provider_user_id,
      chain_family,
      expected_address,
      source_digest_sha256,
      evidence_captured_at,
      status
    ) values (
      p_user_id,
      'privy',
      v_provider_user_id,
      'evm',
      v_address,
      v_source_digest,
      v_now,
      'pending'
    )
    returning * into v_evidence;
  else
    -- Pre-imported operator evidence has its own immutable source-document
    -- digest. Reuse it when the cryptographically verified principal/address
    -- agree; do not require it to equal this endpoint's identity-claim digest.
    if v_evidence.status = 'rejected' then
      raise exception 'legacy migration evidence requires operator review';
    end if;
    if v_evidence.provider_user_id <> v_provider_user_id then
      raise exception 'LEGACY_PROVIDER_IDENTITY_MISMATCH';
    end if;
    if v_evidence.expected_address_normalized <> v_address then
      raise exception 'LEGACY_WALLET_MISMATCH';
    end if;
  end if;

  -- Function calls share this transaction. Any conflict raised by the existing
  -- link RPC rolls back a newly inserted evidence row automatically.
  return public.link_verified_wallet_identity(
    p_user_id,
    v_provider_user_id,
    v_address,
    'legacy_preserve'
  );
end;
$$;

comment on function public.bootstrap_verified_legacy_wallet_identity(uuid,text,text,text) is
  'Service-role-only atomic bootstrap for a cryptographically verified historical Privy identity. Browser roles cannot invoke it and cannot submit wallet provenance directly.';

revoke all on function public.bootstrap_verified_legacy_wallet_identity(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.bootstrap_verified_legacy_wallet_identity(uuid,text,text,text)
  to service_role;
