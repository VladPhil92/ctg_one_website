\set ON_ERROR_STOP on

-- CTG One Wallet — Wallet Intent Submission V1 PostgreSQL contract.
-- Runs against an ephemeral CI database and rolls back all fixtures.

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
  'wallet-submission-v1@example.invalid',
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
  v_hash text := '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  v_other_hash text := '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  v_link_id uuid;
  v_creation jsonb;
  v_authorization jsonb;
  v_submission jsonb;
  v_replay jsonb;
  v_intent_id uuid;
  v_journal_before bigint;
  v_journal_after bigint;
  v_refs_before bigint;
  v_refs_after bigint;
begin
  insert into public.wallet_identity_links(
    user_id, provider, provider_user_id, status, link_mode, linked_at, verified_at
  ) values (
    v_user, 'privy', 'did:privy:wallet-submission-v1-user', 'verified', 'new', now(), now()
  ) returning id into v_link_id;

  insert into public.wallet_external_accounts(
    user_id, identity_link_id, provider, chain_family, account_kind,
    address, status, is_primary, verified_at
  ) values (
    v_user, v_link_id, 'privy', 'evm', 'embedded',
    v_wallet, 'verified', true, now()
  );

  select count(*) into v_journal_before from public.wallet_journal_entries_v2;
  select count(*) into v_refs_before from public.wallet_transaction_references_v2;

  v_creation := public.create_wallet_intent_v1_server(
    v_user,
    'wallet-submission-v1-idempotency-0001',
    137,
    'USDC',
    '1000000',
    v_destination
  );
  v_intent_id := (v_creation -> 'intent' ->> 'id')::uuid;

  v_authorization := public.authorize_wallet_intent_v1_server(
    v_user,
    v_intent_id,
    repeat('a', 64),
    v_wallet,
    137,
    'USDC',
    '1000000',
    v_destination
  );
  if v_authorization -> 'intent' ->> 'status' <> 'authorized' then
    raise exception 'submission fixture was not authorized';
  end if;

  v_submission := public.submit_wallet_intent_v1_server(
    v_user,
    v_intent_id,
    v_hash,
    v_wallet,
    137,
    'USDC',
    '1000000',
    v_destination
  );

  if v_submission ->> 'version' <> 'ctg-wallet-submission-v1' then
    raise exception 'submission version contract regressed';
  end if;
  if (v_submission ->> 'replayed')::boolean is not false then
    raise exception 'first submission unexpectedly reported replay';
  end if;
  if v_submission ->> 'txHash' <> v_hash then
    raise exception 'submission did not persist exact tx hash';
  end if;
  if v_submission ->> 'submittedWalletAddress' <> v_wallet then
    raise exception 'submission did not retain canonical signer binding';
  end if;
  if v_submission -> 'intent' ->> 'status' <> 'submitted' then
    raise exception 'authorized intent did not advance exactly to submitted';
  end if;
  if v_submission -> 'intent' ->> 'externalReference' is not null
     or v_submission -> 'intent' ->> 'settledAt' is not null then
    raise exception 'submission must not confirm or settle external state';
  end if;

  v_replay := public.submit_wallet_intent_v1_server(
    v_user,
    v_intent_id,
    v_hash,
    v_wallet,
    137,
    'USDC',
    '1000000',
    v_destination
  );
  if (v_replay ->> 'replayed')::boolean is not true then
    raise exception 'identical submission replay was not idempotent';
  end if;

  begin
    perform public.submit_wallet_intent_v1_server(
      v_user,
      v_intent_id,
      v_other_hash,
      v_wallet,
      137,
      'USDC',
      '1000000',
      v_destination
    );
    raise exception 'TEST_EXPECTED_SUBMISSION_REPLAY_CONFLICT';
  exception when others then
    if sqlerrm = 'TEST_EXPECTED_SUBMISSION_REPLAY_CONFLICT' then raise; end if;
    if position('WALLET_SUBMISSION_REPLAY_CONFLICT' in sqlerrm) = 0 then
      raise exception 'unexpected submission replay error: %', sqlerrm;
    end if;
  end;

  select count(*) into v_journal_after from public.wallet_journal_entries_v2;
  select count(*) into v_refs_after from public.wallet_transaction_references_v2;
  if v_journal_after <> v_journal_before then
    raise exception 'submission must not post Wallet V2 journal entries';
  end if;
  if v_refs_after <> v_refs_before then
    raise exception 'submission must not create reconciled transaction references';
  end if;
end $$;

rollback;

select 'Wallet Intent Submission V1 PostgreSQL contract: PASS' as result;
