\set ON_ERROR_STOP on

-- CTG One Wallet — Polygon chain submission/reconciliation V1 contract.
-- Ephemeral CI only; all fixtures are rolled back.

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
  '22000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'wallet-chain-v1@example.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

do $$
declare
  v_user uuid := '22000000-0000-0000-0000-000000000001';
  v_wallet text := '0x1111111111111111111111111111111111111111';
  v_destination text := '0x2222222222222222222222222222222222222222';
  v_destination_2 text := '0x3333333333333333333333333333333333333333';
  v_tx_hash text := '0x' || repeat('a', 64);
  v_tx_hash_2 text := '0x' || repeat('b', 64);
  v_digest text := repeat('c', 64);
  v_digest_2 text := repeat('d', 64);
  v_link_id uuid;
  v_creation jsonb;
  v_submission jsonb;
  v_replay jsonb;
  v_observation jsonb;
  v_intent_id uuid;
  v_second_intent_id uuid;
  v_journal_before bigint;
  v_journal_after bigint;
begin
  insert into public.wallet_identity_links(
    user_id, provider, provider_user_id, status, link_mode, linked_at, verified_at
  ) values (
    v_user,
    'privy',
    'did:privy:wallet-chain-v1-user',
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

  select count(*) into v_journal_before from public.wallet_journal_entries_v2;

  v_creation := public.create_wallet_intent_v1_server(
    v_user,
    'wallet-chain-v1-idempotency-0001',
    137,
    'USDC',
    '1000000',
    v_destination
  );
  v_intent_id := (v_creation -> 'intent' ->> 'id')::uuid;

  perform public.authorize_wallet_intent_v1_server(
    v_user,
    v_intent_id,
    repeat('e', 64),
    v_wallet,
    137,
    'USDC',
    '1000000',
    v_destination
  );

  v_submission := public.register_wallet_chain_submission_v1_server(
    v_user,
    v_intent_id,
    v_tx_hash
  );

  if v_submission ->> 'version' <> 'ctg-wallet-chain-submission-v1' then
    raise exception 'chain submission version contract regressed';
  end if;
  if (v_submission ->> 'replayed')::boolean is not false then
    raise exception 'first tx hash registration unexpectedly replayed';
  end if;
  if v_submission ->> 'status' <> 'submitted'
     or v_submission ->> 'txHash' <> v_tx_hash
     or v_submission ->> 'submittedAt' is null then
    raise exception 'authorized intent did not advance exactly to submitted';
  end if;

  if not exists (
    select 1
    from public.wallet_transaction_references_v2
    where subject_user_id = v_user
      and intent_id = v_intent_id
      and authority = 'blockchain'
      and reference_kind = 'tx_hash'
      and reference_normalized = v_tx_hash
  ) then
    raise exception 'submitted tx hash was not registered in the canonical reference registry';
  end if;

  v_replay := public.register_wallet_chain_submission_v1_server(
    v_user,
    v_intent_id,
    upper(v_tx_hash)
  );
  if (v_replay ->> 'replayed')::boolean is not true then
    raise exception 'identical tx hash registration was not idempotent';
  end if;

  -- A blockchain hash can belong to only one canonical intent.
  v_creation := public.create_wallet_intent_v1_server(
    v_user,
    'wallet-chain-v1-idempotency-0002',
    137,
    'POL',
    '1000000000000000',
    v_destination_2
  );
  v_second_intent_id := (v_creation -> 'intent' ->> 'id')::uuid;

  perform public.authorize_wallet_intent_v1_server(
    v_user,
    v_second_intent_id,
    repeat('f', 64),
    v_wallet,
    137,
    'POL',
    '1000000000000000',
    v_destination_2
  );

  begin
    perform public.register_wallet_chain_submission_v1_server(v_user, v_second_intent_id, v_tx_hash);
    raise exception 'TEST_EXPECTED_TX_HASH_BINDING_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_TX_HASH_BINDING_CONFLICT' then raise; end if;
    if position('WALLET_CHAIN_TX_HASH_ALREADY_BOUND' in sqlerrm) = 0 then
      raise exception 'unexpected duplicate tx hash error: %', sqlerrm;
    end if;
  end;

  -- A not-yet-observed hash remains pending and cannot be treated as success.
  v_observation := public.record_wallet_chain_reconciliation_v1_server(
    v_user,
    v_intent_id,
    v_tx_hash,
    'pending_external',
    v_digest,
    false,
    null,
    null,
    null
  );
  if v_observation ->> 'status' <> 'pending_external' then
    raise exception 'unobserved chain hash did not remain pending';
  end if;

  -- A successful receipt below the finality threshold is visible but non-final.
  v_observation := public.record_wallet_chain_reconciliation_v1_server(
    v_user,
    v_intent_id,
    v_tx_hash,
    'confirmed_external',
    v_digest_2,
    true,
    123456,
    3,
    null
  );
  if v_observation ->> 'status' <> 'confirmed_external'
     or (v_observation ->> 'chainConfirmations')::bigint <> 3
     or (v_observation ->> 'chainBlockNumber')::bigint <> 123456 then
    raise exception 'confirmed external observation was not persisted correctly';
  end if;

  -- Final server-observed confirmations advance the intent without touching COP.
  v_observation := public.record_wallet_chain_reconciliation_v1_server(
    v_user,
    v_intent_id,
    v_tx_hash,
    'reconciled',
    repeat('1', 64),
    true,
    123456,
    12,
    null
  );
  if v_observation ->> 'status' <> 'reconciled'
     or v_observation ->> 'settledAt' is null then
    raise exception 'final chain observation did not reconcile the intent';
  end if;

  begin
    perform public.record_wallet_chain_reconciliation_v1_server(
      v_user,
      v_intent_id,
      v_tx_hash,
      'pending_external',
      repeat('2', 64),
      false,
      null,
      null,
      null
    );
    raise exception 'TEST_EXPECTED_RECONCILED_TERMINAL';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_RECONCILED_TERMINAL' then raise; end if;
    if position('WALLET_CHAIN_RECONCILED_TERMINAL' in sqlerrm) = 0 then
      raise exception 'unexpected reconciled terminal-state error: %', sqlerrm;
    end if;
  end;

  -- A deterministic chain failure is also terminal and preserves its hash.
  perform public.register_wallet_chain_submission_v1_server(v_user, v_second_intent_id, v_tx_hash_2);
  v_observation := public.record_wallet_chain_reconciliation_v1_server(
    v_user,
    v_second_intent_id,
    v_tx_hash_2,
    'failed',
    repeat('3', 64),
    true,
    null,
    0,
    'WALLET_CHAIN_RECEIPT_REVERTED'
  );
  if v_observation ->> 'status' <> 'failed'
     or v_observation ->> 'chainFailureCode' <> 'WALLET_CHAIN_RECEIPT_REVERTED' then
    raise exception 'failed chain observation was not persisted fail-closed';
  end if;

  select count(*) into v_journal_after from public.wallet_journal_entries_v2;
  if v_journal_after <> v_journal_before then
    raise exception 'chain submission/reconciliation mutated the COP journal';
  end if;

  if exists (
    select 1
    from public.wallet_intents_v2
    where id = v_intent_id
      and (
        status <> 'reconciled'
        or tx_hash <> v_tx_hash
        or submitted_at is null
        or chain_observed_at is null
        or chain_confirmed_at is null
        or chain_block_number <> 123456
        or chain_confirmations <> 12
        or settled_at is null
      )
  ) then
    raise exception 'persisted reconciled chain lifecycle is inconsistent';
  end if;
end $$;

do $$
begin
  if has_function_privilege(
    'authenticated',
    'public.register_wallet_chain_submission_v1_server(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute chain submission RPC directly';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.record_wallet_chain_reconciliation_v1_server(uuid,uuid,text,text,text,boolean,bigint,bigint,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must not execute chain reconciliation RPC directly';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.register_wallet_chain_submission_v1_server(uuid,uuid,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.record_wallet_chain_reconciliation_v1_server(uuid,uuid,text,text,text,boolean,bigint,bigint,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role chain lifecycle RPC privilege missing';
  end if;

  if has_table_privilege('authenticated', 'public.wallet_intents_v2', 'UPDATE')
     or has_table_privilege('service_role', 'public.wallet_intents_v2', 'UPDATE')
     or has_table_privilege('authenticated', 'public.wallet_transaction_references_v2', 'INSERT')
     or has_table_privilege('service_role', 'public.wallet_transaction_references_v2', 'INSERT') then
    raise exception 'chain reconciliation widened direct authoritative mutation privileges';
  end if;
end $$;

rollback;

select 'Wallet Chain Submission/Reconciliation V1 PostgreSQL contract: PASS' as result;
