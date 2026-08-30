\set ON_ERROR_STOP on

begin;

insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '22000000-0000-0000-0000-000000000001',
  'authenticated','authenticated','wallet-topup-user@example.invalid','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22000000-0000-0000-0000-000000000002',
  'authenticated','authenticated','wallet-topup-verifier@example.invalid','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22000000-0000-0000-0000-000000000003',
  'authenticated','authenticated','wallet-topup-reconciler@example.invalid','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
);

update public.profiles
set kyc_status = 'verified'
where id = '22000000-0000-0000-0000-000000000001';

update public.profiles
set role = 'admin'
where id in (
  '22000000-0000-0000-0000-000000000002',
  '22000000-0000-0000-0000-000000000003'
);

-- Server-only proof submission: claim creation must leave COP untouched.
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000001', true);

select public.submit_wallet_topup_claim_server(
  '22000000-0000-0000-0000-000000000001',
  'bank_transfer',
  100000,
  'BANCO-ABC-1234',
  '22000000-0000-0000-0000-000000000001/wallet-topups/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf',
  repeat('a', 64),
  'receipt.pdf',
  'application/pdf',
  repeat('b', 64)
);

do $$
begin
  if (select balance_cents from public.wallets where user_id = '22000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'proof submission credited money before reconciliation';
  end if;

  if public._wallet_ledger_balance_cents('22000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'proof submission posted canonical ledger money before reconciliation';
  end if;

  if not exists (
    select 1
    from public.wallet_topup_claims c
    join public.transactions t on t.id = c.transaction_id
    where c.user_id = '22000000-0000-0000-0000-000000000001'
      and c.state = 'submitted'
      and c.amount_cents = 100000
      and c.normalized_reference = 'BANCOABC1234'
      and t.status = 'pending'
      and t.amount_cents = 100000
  ) then
    raise exception 'server proof submission did not create the expected pending claim';
  end if;
end $$;

-- First control: verifier may validate evidence but still cannot credit COP.
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000002', true);

select public.verify_wallet_topup_claim(
  (select id from public.wallet_topup_claims where normalized_reference = 'BANCOABC1234'),
  'Bank evidence matched in smoke contract'
);

do $$
begin
  if (select balance_cents from public.wallets where user_id = '22000000-0000-0000-0000-000000000001') <> 0
     or public._wallet_ledger_balance_cents('22000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'verification credited money before reconciliation';
  end if;
end $$;

-- Segregation of duties: the verifier cannot reconcile their own decision.
do $$
declare
  v_claim uuid := (select id from public.wallet_topup_claims where normalized_reference = 'BANCOABC1234');
begin
  begin
    perform public.reconcile_wallet_topup_claim(v_claim, 'must fail');
    raise exception 'same verifier was allowed to reconcile';
  exception when others then
    if sqlerrm = 'same verifier was allowed to reconcile' then
      raise;
    end if;
    if position('WALLET_TOPUP_INDEPENDENT_RECONCILER_REQUIRED' in sqlerrm) = 0 then
      raise exception 'unexpected same-verifier reconciliation error: %', sqlerrm;
    end if;
  end;
end $$;

-- Second control: a different admin reconciles exactly once.
select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000003', true);

select public.reconcile_wallet_topup_claim(
  (select id from public.wallet_topup_claims where normalized_reference = 'BANCOABC1234'),
  'Independent finance reconciliation smoke'
);

-- Replay is idempotent and must not double-credit or double-post.
select public.reconcile_wallet_topup_claim(
  (select id from public.wallet_topup_claims where normalized_reference = 'BANCOABC1234'),
  'Replay'
);

do $$
declare
  v_user uuid := '22000000-0000-0000-0000-000000000001';
  v_topup_entries bigint;
begin
  if (select balance_cents from public.wallets where user_id = v_user) <> 100000 then
    raise exception 'independent reconciliation did not credit compatibility cache exactly once';
  end if;

  if public._wallet_ledger_balance_cents(v_user) <> 100000 then
    raise exception 'independent reconciliation did not credit canonical ledger exactly once';
  end if;

  select count(*) into v_topup_entries
  from public.wallet_journal_entries_v2
  where subject_user_id = v_user
    and event_type = 'ledger.topup'
    and metadata ->> 'authoritative' = 'true';
  if v_topup_entries <> 1 then
    raise exception 'reconciled top-up created duplicate canonical journal entries';
  end if;

  if not exists (
    select 1
    from public.wallet_topup_claims c
    join public.transactions t on t.id = c.transaction_id
    where c.normalized_reference = 'BANCOABC1234'
      and c.state = 'reconciled'
      and t.status = 'approved'
  ) then
    raise exception 'reconciled claim/transaction terminal state mismatch';
  end if;

  if not exists (
    select 1 from public.wallet_ledger_activity_v2
    where user_id = v_user
      and event_type = 'ledger.topup'
      and status = 'posted'
      and direction = 'credit'
      and amount_cents = 100000
      and external_reference = 'BANCOABC1234'
  ) then
    raise exception 'wallet ledger did not expose reconciled COP credit';
  end if;

  if not exists (
    select 1 from public.wallet_ledger_reconciliation_v2
    where user_id = v_user
      and ledger_balance_cents = 100000
      and legacy_cache_balance_cents = 100000
      and drift_cents = 0
      and in_sync
      and balance_authority = 'ctg_ledger_v2'
  ) then
    raise exception 'wallet ledger/cache reconciliation failed after COP credit';
  end if;
end $$;

-- Compatibility RPC must not resurrect arbitrary legacy pending deposits.
insert into public.transactions(
  user_id,type,method,amount_cents,status,proof_storage_path,external_reference
) values (
  '22000000-0000-0000-0000-000000000001',
  'deposit','bank_transfer',50000,'pending',
  '22000000-0000-0000-0000-000000000001/wallet-topups/legacy.pdf',
  'LEGACYNOCLAIM999'
);

do $$
declare
  v_tx uuid := (select id from public.transactions where external_reference = 'LEGACYNOCLAIM999');
begin
  begin
    perform public.approve_deposit(v_tx, 'must fail');
    raise exception 'legacy approve_deposit accepted a transaction without a verified claim';
  exception when others then
    if sqlerrm = 'legacy approve_deposit accepted a transaction without a verified claim' then
      raise;
    end if;
    if position('WALLET_TOPUP_CLAIM_REQUIRED' in sqlerrm) = 0 then
      raise exception 'unexpected legacy approval rejection: %', sqlerrm;
    end if;
  end;
end $$;

-- Database privileges are part of the money boundary, not only application code.
do $$
begin
  if has_table_privilege('authenticated', 'public.transactions', 'INSERT') then
    raise exception 'authenticated regained INSERT on public.transactions';
  end if;

  if has_table_privilege('authenticated', 'public.wallet_topup_claims', 'INSERT')
     or has_table_privilege('authenticated', 'public.wallet_topup_claims', 'UPDATE')
     or has_table_privilege('authenticated', 'public.wallet_topup_claims', 'DELETE') then
    raise exception 'authenticated can mutate wallet_topup_claims directly';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.submit_wallet_topup_claim_server(uuid,text,bigint,text,text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute server-only top-up submission RPC';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.submit_wallet_topup_claim_server(uuid,text,bigint,text,text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute top-up submission RPC';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute server-only Saldo CTG consumption RPC';
  end if;
end $$;

rollback;
select 'Wallet COP top-up canonical ledger PostgreSQL contract: PASS' as result;
