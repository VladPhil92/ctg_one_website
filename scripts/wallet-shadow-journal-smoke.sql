\set ON_ERROR_STOP on

begin;

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '21000000-0000-0000-0000-000000000001',
  'authenticated','authenticated','wallet-shadow@example.invalid','',now(),
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

  if not exists (
    select 1 from public.wallet_shadow_opening_snapshots_v2
    where user_id = v_user and wallet_id = v_wallet and account_id = v_account
      and opening_balance_cents = 0 and journal_entry_id is null
  ) then
    raise exception 'new zero-balance wallet did not receive shadow baseline';
  end if;

  if not exists (
    select 1 from public.wallet_shadow_reconciliation_v2
    where user_id = v_user and legacy_balance_cents = 0 and shadow_balance_cents = 0
      and drift_cents = 0 and baseline_initialized and in_sync
      and balance_authority = 'legacy_wallets' and shadow_authoritative is false
  ) then
    raise exception 'zero opening baseline is not reconciled';
  end if;

  update public.wallets set balance_cents = 10000, updated_at = now() where id = v_wallet;

  if not exists (
    select 1 from public.wallet_shadow_reconciliation_v2
    where user_id = v_user and legacy_balance_cents = 10000 and shadow_balance_cents = 10000
      and drift_cents = 0 and in_sync
  ) then
    raise exception 'shadow journal failed to mirror positive legacy delta';
  end if;

  update public.wallets set balance_cents = 2500, updated_at = now() where id = v_wallet;

  if not exists (
    select 1 from public.wallet_shadow_reconciliation_v2
    where user_id = v_user and legacy_balance_cents = 2500 and shadow_balance_cents = 2500
      and drift_cents = 0 and in_sync
  ) then
    raise exception 'shadow journal failed to mirror negative legacy delta';
  end if;

  if exists (
    select 1
    from public.wallet_journal_entries_v2 e
    left join lateral (
      select count(*)::bigint as posting_count, coalesce(sum(p.amount_cents),0)::bigint as posting_sum
      from public.wallet_journal_postings_v2 p where p.entry_id = e.id
    ) x on true
    where e.subject_user_id = v_user
      and e.metadata ->> 'shadow' = 'true'
      and (x.posting_count <> 2 or x.posting_sum <> 0)
  ) then
    raise exception 'shadow journal produced an unbalanced entry';
  end if;
end $$;

-- Prove fail-open semantics: temporarily make the shadow offset undiscoverable.
do $$
declare
  v_user uuid := '21000000-0000-0000-0000-000000000001';
  v_wallet uuid;
  v_before_failures bigint;
begin
  select id into v_wallet from public.wallets where user_id = v_user;
  select count(*) into v_before_failures from public.wallet_shadow_capture_failures_v2;

  update public.wallet_accounts_v2
     set account_code = 'COP_SHADOW_OFFSET_HOLD'
   where user_id is null and account_code = 'COP_SHADOW_OFFSET';

  update public.wallets set balance_cents = 3000, updated_at = now() where id = v_wallet;

  if (select balance_cents from public.wallets where id = v_wallet) <> 3000 then
    raise exception 'legacy balance update was blocked by shadow capture failure';
  end if;

  if (select count(*) from public.wallet_shadow_capture_failures_v2) <> v_before_failures + 1 then
    raise exception 'shadow capture failure was not recorded';
  end if;

  if not exists (
    select 1 from public.wallet_shadow_reconciliation_v2
    where user_id = v_user and legacy_balance_cents = 3000 and shadow_balance_cents = 2500
      and drift_cents = -500 and in_sync is false
  ) then
    raise exception 'shadow drift detector failed to expose capture loss';
  end if;

  update public.wallet_accounts_v2
     set account_code = 'COP_SHADOW_OFFSET'
   where user_id is null and account_code = 'COP_SHADOW_OFFSET_HOLD';
end $$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'public.wallet_journal_entries_v2',
    'public.wallet_journal_postings_v2',
    'public.wallet_shadow_opening_snapshots_v2',
    'public.wallet_shadow_capture_failures_v2'
  ] loop
    if has_table_privilege('authenticated', v_table, 'INSERT')
       or has_table_privilege('authenticated', v_table, 'UPDATE')
       or has_table_privilege('authenticated', v_table, 'DELETE')
       or has_table_privilege('service_role', v_table, 'INSERT')
       or has_table_privilege('service_role', v_table, 'UPDATE')
       or has_table_privilege('service_role', v_table, 'DELETE') then
      raise exception 'wallet shadow mutation privilege widened on %', v_table;
    end if;
  end loop;

  if has_function_privilege('authenticated', 'public._wallet_shadow_initialize_user(uuid)', 'EXECUTE')
     or has_function_privilege('service_role', 'public._wallet_shadow_initialize_user(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._wallet_shadow_capture_balance_delta()', 'EXECUTE')
     or has_function_privilege('service_role', 'public._wallet_shadow_capture_balance_delta()', 'EXECUTE') then
    raise exception 'internal shadow mutation functions became externally executable';
  end if;

  if not has_table_privilege('authenticated', 'public.wallet_shadow_reconciliation_v2', 'SELECT')
     or not has_table_privilege('service_role', 'public.wallet_shadow_reconciliation_v2', 'SELECT') then
    raise exception 'reconciliation view read privilege missing';
  end if;

  if has_table_privilege('authenticated', 'public.wallet_shadow_reconciliation_health_v2', 'SELECT')
     or not has_table_privilege('service_role', 'public.wallet_shadow_reconciliation_health_v2', 'SELECT') then
    raise exception 'shadow health view role boundary is incorrect';
  end if;
end $$;

rollback;
select 'Wallet shadow journal PostgreSQL contract: PASS' as result;
