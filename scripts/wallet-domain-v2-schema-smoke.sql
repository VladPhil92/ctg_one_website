\set ON_ERROR_STOP on

-- CTG One Wallet — Wallet Domain V2 foundation PostgreSQL contract.
-- Runs only against an ephemeral CI database and rolls back all fixture data.

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
  '20000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'wallet-domain-v2@example.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

do $$
declare
  v_user uuid := '20000000-0000-0000-0000-000000000001';
  v_wallet_id uuid;
  v_account_id uuid;
begin
  select id into v_wallet_id
  from public.wallets
  where user_id = v_user;

  if v_wallet_id is null then
    raise exception 'legacy wallet trigger contract regressed';
  end if;

  select id into v_account_id
  from public.wallet_accounts_v2
  where user_id = v_user
    and account_kind = 'user_available'
    and account_code = 'COP_AVAILABLE'
    and currency = 'COP';

  if v_account_id is null then
    raise exception 'new CTG user did not receive a Wallet Domain V2 available account';
  end if;

  if (select count(*) from public.wallet_accounts_v2 where user_id = v_user) <> 1 then
    raise exception 'new CTG user received duplicate V2 accounts';
  end if;

  update public.wallets
  set balance_cents = 123456, updated_at = now()
  where user_id = v_user;

  if not exists (
    select 1
    from public.wallet_balance_compatibility_v2
    where user_id = v_user
      and account_id = v_account_id
      and legacy_wallet_id = v_wallet_id
      and available_balance_cents = 123456
      and balance_authority = 'legacy_wallets'
      and journal_posting_enabled is false
  ) then
    raise exception 'V2 compatibility projection stopped reflecting the authoritative legacy wallet';
  end if;
end $$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'public.wallet_accounts_v2',
    'public.wallet_intents_v2',
    'public.wallet_journal_entries_v2',
    'public.wallet_journal_postings_v2',
    'public.wallet_transaction_references_v2'
  ] loop
    if has_table_privilege('authenticated', v_table, 'INSERT')
       or has_table_privilege('authenticated', v_table, 'UPDATE')
       or has_table_privilege('authenticated', v_table, 'DELETE') then
      raise exception 'authenticated gained authoritative Wallet Domain V2 mutation privilege on %', v_table;
    end if;

    if has_table_privilege('service_role', v_table, 'INSERT')
       or has_table_privilege('service_role', v_table, 'UPDATE')
       or has_table_privilege('service_role', v_table, 'DELETE') then
      raise exception 'service_role gained premature Wallet Domain V2 mutation privilege on %', v_table;
    end if;

    if not has_table_privilege('authenticated', v_table, 'SELECT')
       or not has_table_privilege('service_role', v_table, 'SELECT') then
      raise exception 'Wallet Domain V2 read privilege missing on %', v_table;
    end if;
  end loop;

  if not has_table_privilege('authenticated', 'public.wallet_balance_compatibility_v2', 'SELECT')
     or not has_table_privilege('service_role', 'public.wallet_balance_compatibility_v2', 'SELECT') then
    raise exception 'Wallet Domain V2 compatibility projection is not readable by expected roles';
  end if;

  if has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.handle_new_user()', 'EXECUTE') then
    raise exception 'handle_new_user trigger function must not be exposed as an RPC';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'post_wallet_journal_entry'
  ) then
    raise exception 'Wallet Domain V2 authoritative journal posting RPC must remain disabled';
  end if;
end $$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'wallet_accounts_v2',
    'wallet_intents_v2',
    'wallet_journal_entries_v2',
    'wallet_journal_postings_v2',
    'wallet_transaction_references_v2'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = v_table
        and c.relrowsecurity is true
    ) then
      raise exception 'RLS is not enabled on %', v_table;
    end if;
  end loop;
end $$;

-- PostgreSQL-owner fixtures validate uniqueness/idempotency constraints without
-- widening the API-role mutation surface.
do $$
declare
  v_user uuid := '20000000-0000-0000-0000-000000000001';
  v_intent_id uuid;
begin
  insert into public.wallet_intents_v2(
    user_id, intent_type, idempotency_key, currency, amount_cents
  ) values (
    v_user, 'wallet.deposit', 'Intent-Key-0001', 'COP', 10000
  ) returning id into v_intent_id;

  begin
    insert into public.wallet_intents_v2(
      user_id, intent_type, idempotency_key, currency, amount_cents
    ) values (
      v_user, 'wallet.deposit', ' intent-key-0001 ', 'COP', 10000
    );
    raise exception 'TEST_EXPECTED_INTENT_IDEMPOTENCY_CONFLICT';
  exception when unique_violation then
    null;
  end;

  insert into public.wallet_transaction_references_v2(
    subject_user_id,
    intent_id,
    authority,
    reference_kind,
    reference_value
  ) values (
    v_user,
    v_intent_id,
    'bank',
    'bank_reference',
    'BANK-ABC-123'
  );

  begin
    insert into public.wallet_transaction_references_v2(
      subject_user_id,
      intent_id,
      authority,
      reference_kind,
      reference_value
    ) values (
      v_user,
      v_intent_id,
      'bank',
      'bank_reference',
      ' bank-abc-123 '
    );
    raise exception 'TEST_EXPECTED_REFERENCE_IDEMPOTENCY_CONFLICT';
  exception when unique_violation then
    null;
  end;
end $$;

-- Later migrations may populate only explicitly non-authoritative shadow journal
-- rows. The historical foundation invariant remains: no authoritative posting
-- RPC and no unmarked money rows may appear through this compatibility test.
do $$
begin
  if exists (
    select 1 from public.wallet_journal_entries_v2 e
    where coalesce(e.metadata ->> 'shadow', 'false') <> 'true'
  ) then
    raise exception 'Wallet Domain V2 contains unexpected non-shadow journal rows';
  end if;

  if exists (
    select 1
    from public.wallet_journal_entries_v2 e
    left join lateral (
      select count(*)::bigint as posting_count, coalesce(sum(p.amount_cents),0)::bigint as posting_sum
      from public.wallet_journal_postings_v2 p
      where p.entry_id = e.id
    ) x on true
    where e.metadata ->> 'shadow' = 'true'
      and (x.posting_count <> 2 or x.posting_sum <> 0)
  ) then
    raise exception 'Wallet Domain V2 shadow journal row is not balanced';
  end if;
end $$;

rollback;

select 'Wallet Domain V2 PostgreSQL contract: PASS' as result;
