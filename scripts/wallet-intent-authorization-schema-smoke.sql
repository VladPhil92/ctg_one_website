\set ON_ERROR_STOP on

-- CTG One Wallet — Wallet Intent Authorization V1 PostgreSQL contract.
-- Runs only against an ephemeral CI database and rolls back all fixtures.

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
) values (
  '00000000-0000-0000-0000-000000000000',
  '21000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'wallet-auth-v1@example.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

do $$
declare
  v_user uuid := '21000000-0000-0000-0000-000000000001';
  v_link_id uuid;
  v_creation jsonb;
  v_authorization jsonb;
  v_replay jsonb;
  v_intent_id uuid;
  v_expired_id uuid;
  v_digest text := repeat('a', 64);
  v_other_digest text := repeat('b', 64);
  v_journal_before bigint;
  v_journal_after bigint;
  v_refs_before bigint;
  v_refs_after bigint;
begin
  insert into public.wallet_identity_links(
    user_id,
    provider,
    provider_user_id,
    status,
    link_mode,
    linked_at,
    verified_at
  ) values (
    v_user,
    'privy',
    'did:privy:wallet-auth-v1-user',
    'verified',
    'new',
    now(),
    now()
  ) returning id into v_link_id;

  insert into public.wallet_external_accounts(
    user_id,
    identity_link_id,
    provider,
    chain_family,
    account_kind,
    address,
    status,
    is_primary,
    verified_at
  ) values (
    v_user,
    v_link_id,
    'privy',
    'evm',
    'embedded',
    '0x1111111111111111111111111111111111111111',
    'verified',
    true,
    now()
  );

  select count(*) into v_journal_before
  from public.wallet_journal_entries_v2;

  select count(*) into v_refs_before
  from public.wallet_transaction_references_v2;

  v_creation := public.create_wallet_intent_v1_server(
    v_user,
    'wallet-auth-v1-idempotency-0001',
    137,
    'USDC',
    '1000000',
    '0x2222222222222222222222222222222222222222'
  );

  v_intent_id := (v_creation -> 'intent' ->> 'id')::uuid;

  if v_creation -> 'intent' ->> 'status' <> 'created' then
    raise exception 'intent creation did not remain created before authorization';
  end if;

  v_authorization := public.authorize_wallet_intent_v1_server(
    v_user,
    v_intent_id,
    v_digest
  );

  if v_authorization ->> 'version' <> 'ctg-wallet-authorization-v1' then
    raise exception 'authorization version contract regressed';
  end if;
  if (v_authorization ->> 'replayed')::boolean is not false then
    raise exception 'first authorization unexpectedly reported a replay';
  end if;
  if v_authorization ->> 'authorizedWalletAddress' <> '0x1111111111111111111111111111111111111111' then
    raise exception 'authorization did not derive the verified primary Privy wallet';
  end if;
  if v_authorization ->> 'simulationDigestSha256' <> v_digest then
    raise exception 'authorization did not bind the simulation digest';
  end if;
  if v_authorization -> 'intent' ->> 'status' <> 'authorized' then
    raise exception 'created intent did not advance exactly to authorized';
  end if;
  if v_authorization -> 'intent' ->> 'txHash' is not null then
    raise exception 'authorization must not create a transaction hash';
  end if;
  if v_authorization -> 'intent' ->> 'externalReference' is not null then
    raise exception 'authorization must not create an external reference';
  end if;
  if v_authorization -> 'intent' ->> 'settledAt' is not null then
    raise exception 'authorization must not settle an intent';
  end if;

  v_replay := public.authorize_wallet_intent_v1_server(
    v_user,
    v_intent_id,
    v_digest
  );

  if (v_replay ->> 'replayed')::boolean is not true then
    raise exception 'identical authorization replay was not idempotent';
  end if;

  begin
    perform public.authorize_wallet_intent_v1_server(v_user, v_intent_id, v_other_digest);
    raise exception 'TEST_EXPECTED_AUTHORIZATION_REPLAY_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_AUTHORIZATION_REPLAY_CONFLICT' then
      raise;
    end if;
    if position('WALLET_AUTH_REPLAY_CONFLICT' in sqlerrm) = 0 then
      raise exception 'unexpected conflicting replay error: %', sqlerrm;
    end if;
  end;

  v_creation := public.create_wallet_intent_v1_server(
    v_user,
    'wallet-auth-v1-idempotency-0002',
    137,
    'POL',
    '1000000000000000',
    '0x3333333333333333333333333333333333333333'
  );
  v_expired_id := (v_creation -> 'intent' ->> 'id')::uuid;

  update public.wallet_intents_v2
  set expires_at = now() - interval '1 minute'
  where id = v_expired_id;

  begin
    perform public.authorize_wallet_intent_v1_server(v_user, v_expired_id, v_digest);
    raise exception 'TEST_EXPECTED_EXPIRED_AUTHORIZATION_FAILURE';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_EXPIRED_AUTHORIZATION_FAILURE' then
      raise;
    end if;
    if position('WALLET_AUTH_INTENT_EXPIRED' in sqlerrm) = 0 then
      raise exception 'unexpected expired intent error: %', sqlerrm;
    end if;
  end;

  select count(*) into v_journal_after
  from public.wallet_journal_entries_v2;
  select count(*) into v_refs_after
  from public.wallet_transaction_references_v2;

  if v_journal_after <> v_journal_before then
    raise exception 'authorization mutated the wallet journal';
  end if;
  if v_refs_after <> v_refs_before then
    raise exception 'authorization created an external transaction reference';
  end if;

  if exists (
    select 1
    from public.wallet_intents_v2
    where id = v_intent_id
      and (
        status <> 'authorized'
        or authorized_at is null
        or authorized_wallet_address <> '0x1111111111111111111111111111111111111111'
        or simulation_digest_sha256 <> v_digest
        or tx_hash is not null
        or external_reference is not null
        or settled_at is not null
      )
  ) then
    raise exception 'persisted authorization evidence/state is inconsistent';
  end if;
end $$;

do $$
begin
  if has_function_privilege(
    'authenticated',
    'public.authorize_wallet_intent_v1_server(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute the authorization RPC directly';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.authorize_wallet_intent_v1_server(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role authorization RPC privilege missing';
  end if;

  if has_table_privilege('authenticated', 'public.wallet_intents_v2', 'UPDATE')
     or has_table_privilege('service_role', 'public.wallet_intents_v2', 'UPDATE') then
    raise exception 'authorization must not widen direct wallet intent mutation privileges';
  end if;
end $$;

rollback;

select 'Wallet Intent Authorization V1 PostgreSQL contract: PASS' as result;
