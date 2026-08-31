\set ON_ERROR_STOP on

-- CTG One Wallet — Wallet Intent Authorization V2 PostgreSQL contract.
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
  'wallet-auth-v2@example.invalid',
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
  v_wallet text := '0x1111111111111111111111111111111111111111';
  v_destination text := '0x2222222222222222222222222222222222222222';
  v_link_id uuid;
  v_creation jsonb;
  v_authorization jsonb;
  v_replay jsonb;
  v_intent_id uuid;
  v_single_flight_id uuid;
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
    'did:privy:wallet-auth-v2-user',
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
    v_wallet,
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
    'wallet-auth-v2-idempotency-0001',
    137,
    'USDC',
    '1000000',
    v_destination
  );

  v_intent_id := (v_creation -> 'intent' ->> 'id')::uuid;

  if v_creation -> 'intent' ->> 'status' <> 'created' then
    raise exception 'intent creation did not remain created before authorization';
  end if;

  v_authorization := public.authorize_wallet_intent_v2_server(
    v_user,
    v_intent_id,
    v_digest,
    v_wallet,
    137,
    'USDC',
    '1000000',
    v_destination
  );

  if v_authorization ->> 'version' <> 'ctg-wallet-authorization-v1' then
    raise exception 'authorization response version contract regressed';
  end if;
  if (v_authorization ->> 'replayed')::boolean is not false then
    raise exception 'first authorization unexpectedly reported a replay';
  end if;
  if v_authorization ->> 'authorizedWalletAddress' <> v_wallet then
    raise exception 'authorization did not bind the verified primary Privy wallet';
  end if;
  if v_authorization ->> 'simulationDigestSha256' <> v_digest then
    raise exception 'authorization did not bind the trusted simulation digest';
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

  -- Identical replay is idempotent and self-excluded from single-flight.
  v_replay := public.authorize_wallet_intent_v2_server(
    v_user,
    v_intent_id,
    v_digest,
    v_wallet,
    137,
    'USDC',
    '1000000',
    v_destination
  );

  if (v_replay ->> 'replayed')::boolean is not true then
    raise exception 'identical authorization replay was not idempotent';
  end if;

  -- A response can be lost after durable authorization. Expiring the original
  -- creation TTL must not break an identical replay because no new transition
  -- or signing authority is granted.
  update public.wallet_intents_v2
  set expires_at = now() - interval '1 minute'
  where id = v_intent_id;

  v_replay := public.authorize_wallet_intent_v2_server(
    v_user,
    v_intent_id,
    v_digest,
    v_wallet,
    137,
    'USDC',
    '1000000',
    v_destination
  );

  if (v_replay ->> 'replayed')::boolean is not true then
    raise exception 'post-expiry identical authorization replay must remain idempotent';
  end if;

  begin
    perform public.authorize_wallet_intent_v2_server(
      v_user,
      v_intent_id,
      v_other_digest,
      v_wallet,
      137,
      'USDC',
      '1000000',
      v_destination
    );
    raise exception 'TEST_EXPECTED_AUTHORIZATION_REPLAY_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_AUTHORIZATION_REPLAY_CONFLICT' then
      raise;
    end if;
    if position('WALLET_AUTH_REPLAY_CONFLICT' in sqlerrm) = 0 then
      raise exception 'unexpected conflicting replay error: %', sqlerrm;
    end if;
  end;

  begin
    perform public.authorize_wallet_intent_v2_server(
      v_user,
      v_intent_id,
      v_digest,
      v_wallet,
      137,
      'USDC',
      '1000000',
      '0x9999999999999999999999999999999999999999'
    );
    raise exception 'TEST_EXPECTED_SIMULATION_BINDING_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_SIMULATION_BINDING_CONFLICT' then
      raise;
    end if;
    if position('WALLET_AUTH_SIMULATION_BINDING_CONFLICT' in sqlerrm) = 0 then
      raise exception 'unexpected simulation binding error: %', sqlerrm;
    end if;
  end;

  -- The same user cannot advance a second active Polygon crypto_send while the
  -- first authorization remains non-terminal.
  v_creation := public.create_wallet_intent_v1_server(
    v_user,
    'wallet-auth-v2-single-flight-0002',
    137,
    'USDC',
    '500000',
    '0x3333333333333333333333333333333333333333'
  );
  v_single_flight_id := (v_creation -> 'intent' ->> 'id')::uuid;

  begin
    perform public.authorize_wallet_intent_v2_server(
      v_user,
      v_single_flight_id,
      v_digest,
      v_wallet,
      137,
      'USDC',
      '500000',
      '0x3333333333333333333333333333333333333333'
    );
    raise exception 'TEST_EXPECTED_CANARY_SINGLE_FLIGHT_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_CANARY_SINGLE_FLIGHT_CONFLICT' then
      raise;
    end if;
    if position('WALLET_AUTH_CANARY_SINGLE_FLIGHT_CONFLICT' in sqlerrm) = 0 then
      raise exception 'unexpected single-flight error: %', sqlerrm;
    end if;
  end;

  -- Close the synthetic first intent only to isolate the pre-existing expiry
  -- behavior in this smoke transaction. Authorization evidence must remain.
  update public.wallet_intents_v2
  set status = 'cancelled', updated_at = now()
  where id = v_intent_id;

  v_creation := public.create_wallet_intent_v1_server(
    v_user,
    'wallet-auth-v2-expired-0003',
    137,
    'POL',
    '1000000000000000',
    '0x4444444444444444444444444444444444444444'
  );
  v_expired_id := (v_creation -> 'intent' ->> 'id')::uuid;

  update public.wallet_intents_v2
  set expires_at = now() - interval '1 minute'
  where id = v_expired_id;

  begin
    perform public.authorize_wallet_intent_v2_server(
      v_user,
      v_expired_id,
      v_digest,
      v_wallet,
      137,
      'POL',
      '1000000000000000',
      '0x4444444444444444444444444444444444444444'
    );
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
        status <> 'cancelled'
        or authorized_at is null
        or authorized_wallet_address <> v_wallet
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
    'public.authorize_wallet_intent_v1_server(uuid,uuid,text,text,bigint,text,text,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.authorize_wallet_intent_v2_server(uuid,uuid,text,text,bigint,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute either authorization RPC directly';
  end if;

  if has_function_privilege(
    'service_role',
    'public.authorize_wallet_intent_v1_server(uuid,uuid,text,text,bigint,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role must not bypass canary single-flight through authorization V1';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.authorize_wallet_intent_v2_server(uuid,uuid,text,text,bigint,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role guarded authorization V2 privilege missing';
  end if;

  if has_table_privilege('authenticated', 'public.wallet_intents_v2', 'UPDATE')
     or has_table_privilege('service_role', 'public.wallet_intents_v2', 'UPDATE') then
    raise exception 'authorization must not widen direct wallet intent mutation privileges';
  end if;
end $$;

rollback;

select 'Wallet Intent Authorization V2 + Canary Single-Flight PostgreSQL contract: PASS' as result;
