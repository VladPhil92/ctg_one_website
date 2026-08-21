\set ON_ERROR_STOP on

-- Static contract: signatures, grants and critical implementation dependencies.
DO $$
DECLARE
  v_definition text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='investment_reinvestment_requests'
      AND column_name='case_equivalent_units'
  ) THEN
    RAISE EXCEPTION 'case_equivalent_units column missing from investment_reinvestment_requests';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='investment_reinvestment_requests'
      AND column_name='client_idempotency_key'
  ) THEN
    RAISE EXCEPTION 'reinvestment idempotency column missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.investment_reinvestment_requests'::regclass
      AND conname='investment_reinvestment_requests_case_quantity_check'
  ) THEN
    RAISE EXCEPTION 'reinvestment case quantity constraint missing';
  END IF;

  IF has_function_privilege('authenticated','public.request_reinvestment(uuid,uuid,bigint)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'legacy amount-only reinvestment command remains exposed to authenticated';
  END IF;

  IF NOT has_function_privilege('authenticated','public.request_reinvestment_cases(uuid,uuid,integer,text)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.request_reinvestment_cases(uuid,uuid,integer,text)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'participant reinvestment request grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.approve_reinvestment_request(uuid)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.approve_reinvestment_request(uuid)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'reinvestment approval grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.cancel_reinvestment_request(uuid)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.cancel_reinvestment_request(uuid)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'reinvestment cancellation grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.reject_reinvestment_request(uuid,text)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.reject_reinvestment_request(uuid,text)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'reinvestment rejection grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.get_participant_reinvestment_context()'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.get_participant_reinvestment_context()'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'participant reinvestment read model grant boundary is invalid';
  END IF;

  IF has_function_privilege('authenticated','public._investment_reserved_reinvestment_cases(uuid)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'internal reinvestment capacity helper is exposed to authenticated';
  END IF;

  SELECT pg_get_functiondef('public.create_investment_order(uuid,integer,text)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%_investment_reserved_reinvestment_cases%' THEN
    RAISE EXCEPTION 'canonical investment order does not reserve against pending reinvestments';
  END IF;

  SELECT pg_get_functiondef('public._investment_create_allocation_checked(uuid,uuid,boolean,integer,bigint,uuid)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%_investment_reserved_reinvestment_cases%' THEN
    RAISE EXCEPTION 'allocation guard does not reserve against pending reinvestments';
  END IF;

  SELECT pg_get_functiondef('public.request_reinvestment_cases(uuid,uuid,integer,text)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%production_cost_unit_cents%'
     OR v_definition NOT LIKE '%label_cost_unit_cents%'
     OR v_definition NOT LIKE '%transport_cost_unit_cents%'
     OR v_definition NOT LIKE '%get_investment_spendable_balance%'
     OR v_definition NOT LIKE '%SETTLEMENT_CREDIT%' THEN
    RAISE EXCEPTION 'participant reinvestment command lost authoritative pricing/spend/source guards';
  END IF;

  SELECT pg_get_functiondef('public.approve_reinvestment_request(uuid)'::regprocedure)
  INTO v_definition;
  IF v_definition LIKE '%p_case_equivalent_units%' THEN
    RAISE EXCEPTION 'canonical reinvestment approval accepts mutable case quantity';
  END IF;

  SELECT pg_get_functiondef('public.get_public_investment_lot_funding(uuid)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%investment_reinvestment_requests%' THEN
    RAISE EXCEPTION 'public funding availability ignores pending reinvestment capacity';
  END IF;
END $$;

-- Transactional behavior contract. Everything below is rolled back.
begin;

create or replace function pg_temp.assert_reinvestment_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'REINVESTMENT CONTRACT ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

create or replace function pg_temp.expect_reinvestment_failure(p_sql text, p_fragment text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_fragment in sqlerrm) = 0 then
      raise;
    end if;
    return;
  end;
  raise exception 'EXPECTED REINVESTMENT FAILURE DID NOT OCCUR: %', p_fragment;
end;
$$;

insert into auth.users (
  id, email, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000601', 'reinvest-participant@ctgone.test', 'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Reinvestment Participant"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000602', 'reinvest-production@ctgone.test',  'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Reinvestment Production"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000603', 'reinvest-finance@ctgone.test',     'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Reinvestment Finance"}'::jsonb, now(), now());

insert into public.investment_participant_profiles(user_id, investment_role, kyc_status)
values
  ('00000000-0000-0000-0000-000000000601', 'PARTICIPANT',        'VERIFIED'),
  ('00000000-0000-0000-0000-000000000602', 'PRODUCTION_MANAGER', 'VERIFIED'),
  ('00000000-0000-0000-0000-000000000603', 'FINANCE_ADMIN',      'VERIFIED');

-- Ensure the withdrawal path reaches the shared-spend guard instead of failing
-- earlier because the participant has no payout destination.
update public.investment_participant_profiles
set bank_account_masked = '****0001',
    payout_destination_fingerprint = 'ci-reinvestment-destination-0001'
where user_id = '00000000-0000-0000-0000-000000000601';

insert into public.investment_formula_versions(
  version, participant_profit_share, ctg_profit_share, status, approved_at
)
select 'CI-REINVESTMENT-CONTRACT', 0.5000, 0.5000, 'ACTIVE', now()
where not exists (
  select 1 from public.investment_formula_versions where status = 'ACTIVE'
);

select id as formula_id
from public.investment_formula_versions
where status = 'ACTIVE'
limit 1
\gset

-- Create source/target lots using the production command. Target economics:
-- (1000 + 100 + 50) * 2 bottles = 2300 cents/case.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000602', true);
select public.create_production_lot_from_style(
  'GOLD', 'CI Reinvestment Source', 4, 2,
  1000::bigint, 100::bigint, 50::bigint,
  3000::bigint, 2500::bigint, 0.08::numeric, 0.035::numeric, 4
) as source_lot_id \gset
select public.create_production_lot_from_style(
  'GOLD', 'CI Reinvestment Target', 4, 2,
  1000::bigint, 100::bigint, 50::bigint,
  3000::bigint, 2500::bigint, 0.08::numeric, 0.035::numeric, 4
) as target_lot_id \gset
select public.transition_lot_status(:'target_lot_id'::uuid, 'FUNDING_PENDING', 'CI reinvestment contract', null);
select public.transition_lot_status(:'target_lot_id'::uuid, 'FUNDING_OPEN', 'CI reinvestment contract', null);
reset role;

-- Deterministic source settlement fixture. Running as session owner allows the
-- insert, while the JWT claim makes the real finance-settlement trigger pass.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000603', true);
insert into public.investment_settlements(
  lot_id, formula_version_id, net_distributable_profit_cents,
  total_eligible_units, snapshot, finalized_by
) values (
  :'source_lot_id'::uuid, :'formula_id'::uuid, 10000, 4,
  '{"ci":"participant-liquidity-loop"}'::jsonb,
  '00000000-0000-0000-0000-000000000603'
) returning id as source_settlement_id \gset

insert into public.investment_ledger_entries(
  participant_user_id, lot_id, entry_type, amount_cents, reference, actor_id
) values (
  '00000000-0000-0000-0000-000000000601',
  :'source_lot_id'::uuid,
  'SETTLEMENT_CREDIT',
  10000,
  :'source_settlement_id',
  '00000000-0000-0000-0000-000000000603'
);
select set_config('request.jwt.claim.sub', '', true);

-- Participant creates an idempotent two-case request. PostgreSQL computes
-- 2 * 2300 = 4600 cents.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
select public.request_reinvestment_cases(
  :'source_settlement_id'::uuid, :'target_lot_id'::uuid, 2,
  'ci-reinvestment-request-0001'
) as request_one_id \gset
select public.request_reinvestment_cases(
  :'source_settlement_id'::uuid, :'target_lot_id'::uuid, 2,
  'ci-reinvestment-request-0001'
) as request_one_replay_id \gset
reset role;

select pg_temp.assert_reinvestment_true(
  :'request_one_id'::uuid = :'request_one_replay_id'::uuid,
  'exact idempotent replay must return the same request'
);
select pg_temp.assert_reinvestment_true(
  (select count(*) = 1
   from public.investment_reinvestment_requests
   where participant_user_id = '00000000-0000-0000-0000-000000000601'
     and client_idempotency_key = 'ci-reinvestment-request-0001'),
  'idempotent replay must not reserve twice'
);
select pg_temp.assert_reinvestment_true(
  (select amount_cents = 4600 and case_equivalent_units = 2 and status = 'REQUESTED'
   from public.investment_reinvestment_requests where id = :'request_one_id'::uuid),
  'request must persist server-priced two-case intent'
);
select pg_temp.assert_reinvestment_true(
  (select available_cases_equivalent = 2 and reserved_cases = 2
   from public.get_public_investment_lot_funding(:'target_lot_id'::uuid)),
  'pending reinvestment must reserve target capacity'
);
select pg_temp.assert_reinvestment_true(
  public.get_investment_spendable_balance('00000000-0000-0000-0000-000000000601') = 5400,
  'pending reinvestment must reserve participant spendable balance'
);

-- Pending reinvestment must block both competing lot capacity and an oversized
-- withdrawal from the same participant spend pool.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
select pg_temp.expect_reinvestment_failure(
  format(
    'select public.create_investment_order(%L::uuid,3,%L)',
    :'target_lot_id', 'ci-reinvestment-blocked-order-0001'
  ),
  'available fundable capacity'
);
select pg_temp.expect_reinvestment_failure(
  'select public.request_withdrawal(6000::bigint)',
  'spendable balance'
);
reset role;

select pg_temp.assert_reinvestment_true(
  (select count(*) = 0 from public.investment_withdrawal_requests
   where participant_user_id = '00000000-0000-0000-0000-000000000601'),
  'failed withdrawal must not consume balance'
);

-- Cancellation releases both reservations.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
select public.cancel_reinvestment_request(:'request_one_id'::uuid);
reset role;

select pg_temp.assert_reinvestment_true(
  (select status = 'CANCELLED'
   from public.investment_reinvestment_requests where id = :'request_one_id'::uuid),
  'participant must be able to cancel its own pending request'
);
select pg_temp.assert_reinvestment_true(
  public.get_investment_spendable_balance('00000000-0000-0000-0000-000000000601') = 10000,
  'cancellation must release spend reservation'
);
select pg_temp.assert_reinvestment_true(
  (select available_cases_equivalent = 4 and reserved_cases = 0
   from public.get_public_investment_lot_funding(:'target_lot_id'::uuid)),
  'cancellation must release lot capacity'
);

-- Second request: finance cannot mutate the case quantity, then canonical
-- approval converts the reservation into one allocation + one debit.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
select public.request_reinvestment_cases(
  :'source_settlement_id'::uuid, :'target_lot_id'::uuid, 2,
  'ci-reinvestment-request-0002'
) as request_two_id \gset
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000603', true);
select pg_temp.expect_reinvestment_failure(
  format('select public.approve_reinvestment(%L::uuid,3)', :'request_two_id'),
  'case quantity is immutable'
);
select public.approve_reinvestment_request(:'request_two_id'::uuid) as allocation_id \gset
reset role;

select pg_temp.assert_reinvestment_true(
  (select status = 'APPROVED' and case_equivalent_units = 2
   from public.investment_reinvestment_requests where id = :'request_two_id'::uuid),
  'approval must preserve participant case intent'
);
select pg_temp.assert_reinvestment_true(
  (select participant_user_id = '00000000-0000-0000-0000-000000000601'
      and lot_id = :'target_lot_id'::uuid
      and case_equivalent_units = 2
      and capital_committed_cents = 4600
   from public.investment_funding_allocations where id = :'allocation_id'::uuid),
  'approval must create exact server-priced allocation'
);
select pg_temp.assert_reinvestment_true(
  (select count(*) = 1
   from public.investment_ledger_entries
   where participant_user_id = '00000000-0000-0000-0000-000000000601'
     and entry_type = 'REINVESTMENT_DEBIT'
     and amount_cents = -4600
     and reference = :'request_two_id'),
  'approval must debit ledger exactly once'
);
select pg_temp.assert_reinvestment_true(
  (select available_cases_equivalent = 2 and allocated_cases = 2 and reserved_cases = 0
   from public.get_public_investment_lot_funding(:'target_lot_id'::uuid)),
  'approval must convert reservation to allocation without double-counting'
);
select pg_temp.assert_reinvestment_true(
  public.get_investment_available_balance('00000000-0000-0000-0000-000000000601') = 5400,
  'ledger balance after approval must reflect debit'
);

rollback;

SELECT 'Investment reinvestment schema + transactional contract: PASS' AS result;
