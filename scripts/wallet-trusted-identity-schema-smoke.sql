\set ON_ERROR_STOP on

-- CTG One Wallet — trusted identity-link transactional contract.
-- Runs only against the ephemeral Supabase database created by CI.
-- The entire scenario is rolled back so no fixture data survives the test.

begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'wallet-identity-a@example.invalid',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'wallet-identity-b@example.invalid',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

do $$
begin
  if has_function_privilege(
    'authenticated',
    'public.link_verified_wallet_identity(uuid,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated browser role must not execute link_verified_wallet_identity';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.link_verified_wallet_identity(uuid,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role must execute link_verified_wallet_identity';
  end if;

  if has_table_privilege('authenticated', 'public.wallet_identity_links', 'INSERT')
     or has_table_privilege('authenticated', 'public.wallet_identity_links', 'UPDATE')
     or has_table_privilege('authenticated', 'public.wallet_external_accounts', 'INSERT')
     or has_table_privilege('authenticated', 'public.wallet_external_accounts', 'UPDATE') then
    raise exception 'authenticated role gained a direct wallet identity mutation privilege';
  end if;

  if has_table_privilege('authenticated', 'public.wallet_identity_audit_log', 'INSERT')
     or has_table_privilege('authenticated', 'public.wallet_identity_audit_log', 'UPDATE')
     or has_table_privilege('authenticated', 'public.wallet_identity_audit_log', 'DELETE') then
    raise exception 'authenticated role gained wallet identity audit mutation privileges';
  end if;
end $$;

do $$
declare
  v_first jsonb;
  v_second jsonb;
  v_user_a uuid := '10000000-0000-0000-0000-000000000001';
  v_user_b uuid := '10000000-0000-0000-0000-000000000002';
  v_address_a text := '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  v_address_b text := '0x1234567890abcdef1234567890abcdef12345678';
begin
  v_first := public.link_verified_wallet_identity(
    v_user_a,
    'did:privy:ctg-wallet-a',
    v_address_a,
    'new',
    null
  );

  if v_first->>'userId' <> v_user_a::text
     or v_first->>'address' <> lower(v_address_a)
     or v_first->>'status' <> 'verified'
     or (v_first->>'legacyPreserved')::boolean
     or (v_first->>'idempotent')::boolean then
    raise exception 'initial trusted identity link returned an invalid contract: %', v_first;
  end if;

  v_second := public.link_verified_wallet_identity(
    v_user_a,
    'did:privy:ctg-wallet-a',
    '0x' || upper(substr(v_address_a, 3)),
    'new',
    null
  );

  if not (v_second->>'idempotent')::boolean
     or v_second->>'identityLinkId' <> v_first->>'identityLinkId'
     or v_second->>'externalAccountId' <> v_first->>'externalAccountId' then
    raise exception 'idempotent trusted identity retry changed canonical linkage: first=%, second=%', v_first, v_second;
  end if;

  if (select count(*) from public.wallet_identity_links where user_id = v_user_a) <> 1
     or (select count(*) from public.wallet_external_accounts where user_id = v_user_a) <> 1 then
    raise exception 'idempotent trusted identity retry duplicated canonical rows';
  end if;

  begin
    perform public.link_verified_wallet_identity(
      v_user_b,
      'did:privy:ctg-wallet-a',
      v_address_b,
      'new',
      null
    );
    raise exception 'TEST_EXPECTED_PROVIDER_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_PROVIDER_CONFLICT' then
      raise;
    end if;
    if position('Privy identity is already linked to another CTG user' in sqlerrm) = 0 then
      raise exception 'unexpected provider-conflict error: %', sqlerrm;
    end if;
  end;

  begin
    perform public.link_verified_wallet_identity(
      v_user_b,
      'did:privy:ctg-wallet-b',
      v_address_a,
      'new',
      null
    );
    raise exception 'TEST_EXPECTED_ADDRESS_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_ADDRESS_CONFLICT' then
      raise;
    end if;
    if position('EVM wallet is already linked to another CTG user' in sqlerrm) = 0 then
      raise exception 'unexpected address-conflict error: %', sqlerrm;
    end if;
  end;

  begin
    perform public.link_verified_wallet_identity(
      v_user_a,
      'did:privy:ctg-wallet-a',
      v_address_b,
      'new',
      null
    );
    raise exception 'TEST_EXPECTED_PRIMARY_REPLACEMENT_BLOCK';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_PRIMARY_REPLACEMENT_BLOCK' then
      raise;
    end if;
    if position('already has a different active primary EVM wallet' in sqlerrm) = 0 then
      raise exception 'unexpected primary-replacement error: %', sqlerrm;
    end if;
  end;

  begin
    perform public.link_verified_wallet_identity(
      v_user_b,
      'did:privy:ctg-wallet-b',
      v_address_b,
      'legacy_preserve',
      v_address_a
    );
    raise exception 'TEST_EXPECTED_LEGACY_MISMATCH';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_LEGACY_MISMATCH' then
      raise;
    end if;
    if position('LEGACY_WALLET_MISMATCH' in sqlerrm) = 0 then
      raise exception 'unexpected legacy mismatch error: %', sqlerrm;
    end if;
  end;

  v_second := public.link_verified_wallet_identity(
    v_user_b,
    'did:privy:ctg-wallet-b',
    v_address_b,
    'legacy_preserve',
    '0x' || upper(substr(v_address_b, 3))
  );

  if not (v_second->>'legacyPreserved')::boolean
     or v_second->>'address' <> lower(v_address_b) then
    raise exception 'legacy wallet was not preserved deterministically: %', v_second;
  end if;

  if (select count(*) from public.wallet_identity_audit_log where actor_user_id = v_user_a) <> 2 then
    raise exception 'verified + idempotent identity attempts must both be auditable';
  end if;
end $$;

do $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.wallet_identity_audit_log
  order by created_at
  limit 1;

  begin
    update public.wallet_identity_audit_log
    set details = details || '{"tampered":true}'::jsonb
    where id = v_id;
    raise exception 'TEST_EXPECTED_AUDIT_IMMUTABILITY';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_AUDIT_IMMUTABILITY' then
      raise;
    end if;
    if position('wallet identity audit history is append-only' in sqlerrm) = 0 then
      raise exception 'unexpected audit immutability error: %', sqlerrm;
    end if;
  end;
end $$;

rollback;

select 'Trusted wallet identity PostgreSQL contract: PASS' as result;
