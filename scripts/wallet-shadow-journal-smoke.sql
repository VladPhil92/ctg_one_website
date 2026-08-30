\set ON_ERROR_STOP on

begin;

-- Test-only user created after the canonical cutover. handle_new_user creates
-- the legacy compatibility wallet plus the V2 user_available account, but the
-- retired shadow triggers must no longer create new shadow baselines.
insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '21000000-0000-0000-0000-000000000001',
  'authenticated','authenticated','wallet-ledger@example.invalid','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
);

do $$
declare
  v_user uuid := '21000000-0000-0000-0000-000000000001';
  v_wallet uuid;
  v_account uuid;
begin
  select id into v_wallet from public.wallets where user_id = v_user;
  select id into v_account from public.wallet_accounts_v2
   where user_id = v_user and account_kind = 'user_available' and currency = 'COP';

  if v_wallet is null or v_account is null then
    raise exception 'wallet/account bootstrap failed';
  end if;

  if exists (
    select 1
    from pg_trigger
    where not tgisinternal
      and tgname in ('wallet_shadow_capture_balance_delta_v2', 'wallet_shadow_initialize_available_account_v2')
  ) then
    raise exception 'retired shadow trigger still active after canonical cutover';
  end if;

  if exists (
    select 1 from public.wallet_shadow_opening_snapshots_v2
    where user_id = v_user
  ) then
    raise exception 'post-cutover user unexpectedly received a shadow baseline';
  end if;

  if not exists (
    select 1 from public.wallet_balance_compatibility_v2
    where user_id = v_user
      and available_balance_cents = 0
      and balance_authority = 'ctg_ledger_v2'
      and journal_posting_enabled is true
  ) then
    raise exception 'new user did not receive zero canonical Saldo CTG projection';
  end if;
end $$;

-- The browser cannot post financial mutations. Only the server service role may
-- invoke the trusted ecosystem consumption debit.
do $$
begin
  if has_function_privilege(
      'authenticated',
      'public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text)',
      'EXECUTE'
    ) then
    raise exception 'authenticated role can execute canonical consumption debit';
  end if;

  if not has_function_privilege(
      'service_role',
      'public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text)',
      'EXECUTE'
    ) then
    raise exception 'service role cannot execute canonical consumption debit';
  end if;

  if has_function_privilege(
      'authenticated',
      'public._wallet_ledger_balance_cents(uuid)',
      'EXECUTE'
    ) or has_function_privilege(
      'service_role',
      'public._wallet_ledger_balance_cents(uuid)',
      'EXECUTE'
    ) then
    raise exception 'internal canonical balance helper became externally executable';
  end if;
end $$;

-- A zero-balance wallet must fail closed on consumption.
do $$
begin
  begin
    perform public.consume_wallet_cop_balance_server(
      '21000000-0000-0000-0000-000000000001',
      100,
      'smoke-insufficient-zero',
      'SMOKE-ZERO',
      'Expected insufficient funds'
    );
    raise exception 'zero-balance consumption unexpectedly succeeded';
  exception
    when others then
      if position('WALLET_COP_INSUFFICIENT_FUNDS' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end $$;

-- Test-only seed of one authoritative credit. Product code never receives this
-- direct table privilege; this setup runs as the database owner inside rollback.
do $$
declare
  v_user uuid := '21000000-0000-0000-0000-000000000001';
  v_wallet uuid;
  v_user_account uuid;
  v_clearing_account uuid;
  v_entry uuid := '21000000-0000-4000-8000-000000000010';
begin
  select id into v_wallet from public.wallets where user_id = v_user;
  select id into v_user_account from public.wallet_accounts_v2
   where user_id = v_user and account_kind = 'user_available' and currency = 'COP' and status = 'active';
  select id into v_clearing_account from public.wallet_accounts_v2
   where user_id is null and account_code = 'COP_EXTERNAL_CLEARING' and currency = 'COP' and status = 'active';

  if v_wallet is null or v_user_account is null or v_clearing_account is null then
    raise exception 'canonical ledger seed accounts missing';
  end if;

  insert into public.wallet_journal_entries_v2(
    id, subject_user_id, event_type, status, currency, idempotency_key,
    source_type, external_reference, occurred_at, posted_at, metadata
  ) values (
    v_entry, v_user, 'ledger.smoke_credit', 'posted', 'COP',
    'ledger.smoke.credit:21000000-0000-0000-0000-000000000001',
    'test_fixture', 'SMOKE-CREDIT', now(), now(),
    jsonb_build_object('authoritative', true, 'testOnly', true)
  );

  insert into public.wallet_journal_postings_v2(entry_id, account_id, amount_cents, memo)
  values
    (v_entry, v_user_account, 10000, 'Test-only canonical credit'),
    (v_entry, v_clearing_account, -10000, 'Test-only clearing offset');

  perform public._wallet_ledger_assert_balanced(v_entry);

  update public.wallets
  set balance_cents = 10000, updated_at = now()
  where id = v_wallet;

  if public._wallet_ledger_balance_cents(v_user) <> 10000 then
    raise exception 'canonical balance helper failed to project authoritative credit';
  end if;

  if not exists (
    select 1 from public.wallet_ledger_reconciliation_v2
    where user_id = v_user
      and ledger_balance_cents = 10000
      and legacy_cache_balance_cents = 10000
      and drift_cents = 0
      and in_sync
      and balance_authority = 'ctg_ledger_v2'
  ) then
    raise exception 'canonical ledger/cache reconciliation failed after credit seed';
  end if;
end $$;

-- Debit once, replay exactly once, then prove insufficient funds remains atomic.
do $$
declare
  v_user uuid := '21000000-0000-0000-0000-000000000001';
  v_first jsonb;
  v_replay jsonb;
  v_balance bigint;
  v_entry_count bigint;
begin
  v_first := public.consume_wallet_cop_balance_server(
    v_user,
    2500,
    'smoke-consume-order-001',
    'SMOKE-ORDER-001',
    'Canonical Saldo CTG smoke purchase'
  );

  if coalesce((v_first ->> 'idempotentReplay')::boolean, true) then
    raise exception 'first canonical consumption was incorrectly marked replay';
  end if;
  if (v_first ->> 'balanceCents')::bigint <> 7500 then
    raise exception 'canonical consumption did not return expected balance';
  end if;

  v_replay := public.consume_wallet_cop_balance_server(
    v_user,
    2500,
    'smoke-consume-order-001',
    'SMOKE-ORDER-001',
    'Canonical Saldo CTG smoke purchase'
  );

  if coalesce((v_replay ->> 'idempotentReplay')::boolean, false) is not true then
    raise exception 'canonical consumption replay was not idempotent';
  end if;

  select public._wallet_ledger_balance_cents(v_user) into v_balance;
  if v_balance <> 7500 then
    raise exception 'idempotent replay changed canonical balance';
  end if;

  select count(*) into v_entry_count
  from public.wallet_journal_entries_v2
  where subject_user_id = v_user
    and event_type = 'ledger.consumption'
    and idempotency_key_normalized = 'smoke-consume-order-001';
  if v_entry_count <> 1 then
    raise exception 'idempotent consumption created duplicate journal entries';
  end if;

  if not exists (
    select 1 from public.wallet_ledger_activity_v2
    where user_id = v_user
      and event_type = 'ledger.consumption'
      and direction = 'debit'
      and amount_cents = 2500
      and external_reference = 'SMOKE-ORDER-001'
  ) then
    raise exception 'canonical ledger activity did not expose consumption debit';
  end if;

  begin
    perform public.consume_wallet_cop_balance_server(
      v_user,
      8000,
      'smoke-consume-order-002',
      'SMOKE-ORDER-002',
      'Expected insufficient funds'
    );
    raise exception 'overdraft consumption unexpectedly succeeded';
  exception
    when others then
      if position('WALLET_COP_INSUFFICIENT_FUNDS' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  if public._wallet_ledger_balance_cents(v_user) <> 7500
     or (select balance_cents from public.wallets where user_id = v_user) <> 7500 then
    raise exception 'failed consumption mutated ledger or compatibility cache';
  end if;
end $$;

-- All authoritative entries must remain double-entry balanced and cache drift
-- must remain zero after the tested debit.
do $$
declare
  v_user uuid := '21000000-0000-0000-0000-000000000001';
begin
  if exists (
    select 1
    from public.wallet_journal_entries_v2 e
    left join lateral (
      select count(*)::bigint as posting_count, coalesce(sum(p.amount_cents),0)::bigint as posting_sum
      from public.wallet_journal_postings_v2 p where p.entry_id = e.id
    ) x on true
    where e.subject_user_id = v_user
      and e.metadata ->> 'authoritative' = 'true'
      and (x.posting_count <> 2 or x.posting_sum <> 0)
  ) then
    raise exception 'canonical ledger produced an unbalanced authoritative entry';
  end if;

  if not exists (
    select 1 from public.wallet_ledger_reconciliation_v2
    where user_id = v_user
      and ledger_balance_cents = 7500
      and legacy_cache_balance_cents = 7500
      and drift_cents = 0
      and in_sync
  ) then
    raise exception 'canonical reconciliation drifted after consumption debit';
  end if;

  if not (select all_in_sync from public.wallet_ledger_reconciliation_health_v2) then
    raise exception 'canonical ledger reconciliation health is not in sync';
  end if;
end $$;

-- Keep financial tables readable only through their existing RLS contracts and
-- unwritable from browser/service API roles.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'public.wallet_journal_entries_v2',
    'public.wallet_journal_postings_v2',
    'public.wallet_transaction_references_v2'
  ] loop
    if has_table_privilege('authenticated', v_table, 'INSERT')
       or has_table_privilege('authenticated', v_table, 'UPDATE')
       or has_table_privilege('authenticated', v_table, 'DELETE')
       or has_table_privilege('service_role', v_table, 'INSERT')
       or has_table_privilege('service_role', v_table, 'UPDATE')
       or has_table_privilege('service_role', v_table, 'DELETE') then
      raise exception 'canonical ledger direct mutation privilege widened on %', v_table;
    end if;
  end loop;
end $$;

rollback;
select 'Wallet canonical Saldo CTG ledger PostgreSQL contract: PASS' as result;
