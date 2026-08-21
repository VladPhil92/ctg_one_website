\set ON_ERROR_STOP on

-- Static contract: signatures, grants and critical implementation dependencies.
DO $$
DECLARE
  v_nullable text;
  v_definition text;
BEGIN
  SELECT is_nullable INTO v_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'investment_reinvestment_requests'
    AND column_name = 'case_equivalent_units';
  IF v_nullable IS NULL THEN
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

-- Transactional behavior contract. Everything is rolled back; production is
-- never touched. This proves the money/capacity semantics rather than merely
-- inspecting function text.
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

-- Create a source and target lot using the real production command. Target lot
-- economics: (1000 + 100 + 50) * 2 bottles = 2300 cents per case.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000602', true);

select public.create_production_lot_from_style(
  p_style_code => 'GOLD',
  p_destination => 'CI Reinvestment Source',
  p_total_cases => 4,
  p_case_size_units => 2,
  p_production_cost_unit_cents => 1000::bigint,
  p_label_cost_unit_cents => 100::bigint,
  p_transport_cost_unit_cents => 50::bigint,
  p_own_point_price_unit_cents => 3000::bigint,
  p_b2b_price_unit_cents => 2500::bigint,
  p_inc_rate => 0.08::numeric,
  p_advertising_rate_on_pre_inc => 0.035::numeric,
  p_total_eligible_units => 4
) as source_lot_id \gset

select public.create_production_lot_from_style(
  p_style_code => 'GOLD',
  p_destination => 'CI Reinvestment Target',
  p_total_cases => 4,
  p_case_size_units => 2,
  p_production_cost_unit_cents => 1000::bigint,
  p_label_cost_unit_cents => 100::bigint,
  p_transport_cost_unit_cents => 50::bigint,
  p_own_point_price_unit_cents => 3000::bigint,
  p_b2b_price_unit_cents => 2500::bigint,
  p_inc_rate => 0.08::numeric,
  p_advertising_rate_on_pre_inc => 0.035::numeric,
  p_total_eligible_units => 4
) as target_lot_id \gset

select public.transition_lot_status(:'target_lot_id'::uuid, 'FUNDING_PENDING', 'CI reinvestment contract', null);
select public.transition_lot_status(:'target_lot_id'::uuid, 'FUNDING_OPEN', 'CI reinvestment contract', null);
reset role;

-- Settlement/ledger credit is deterministic fixture data for this isolated
-- contract. The business commands under test consume it exactly as production
-- would after finalize_settlement().
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

-- Participant creates an idempotent two-case reinvestment. PostgreSQL, not the
-- client, computes 2 * 2300 = 4600 cents.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
select public.request_reinvestment_cases(
  :'source_settlement_id'::uuid,
  :'target_lot_id'::uuid,
  2,
  'ci-reinvestment-request-0001'
) as request_one_id \gset
select public.request_reinvestment_cases(
  :'source_settlement_id'::uuid,
  :'target_lot_id'::uuid,
  2,
  'ci-reinvestment-request-0001'
) as request_one_replay_id \gset
reset role;

select pg_temp.assert_reinvestment_true(
  :'request_one_id'::uuid = :'request_one_replay_id'::uuid,
  'exact idempotent replay must return the same reinvestment request'
);
select pg_temp.assert_reinvestment_true(
  (select count(*) = 1
   from public.investment_reinvestment_requests
   where participant_user_id = '00000000-0000-0000-0000-000000000601'
     and client_idempotency_key = 'ci-reinvestment-request-0001'),
  'idempotent replay must not reserve money/capacity twice'
);
select pg_temp.assert_reinvestment_true(
  (select amount_cents = 4600
      and case_equivalent_units = 2
      and status = 'REQUESTED'
   from public.investment_reinvestment_requests where id = :'request_one_id'::uuid),
  'request must persist server-priced two-case intent'
);
select pg_temp.assert_reinvestment_true(
  (select available_cases_equivalent = 2 and reserved_cases = 2
   from public.get_public_investment_lot_funding(:'target_lot_id'::uuid)),
  'pending reinvestment must reserve target-lot public capacity'
);
select pg_temp.assert_reinvestment_true(
  public.get_investment_spendable_balance('00000000-0000-0000-0000-000000000601') = 5400,
  'pending reinvestment must reserve participant spendable balance'
);

-- A normal three-case checkout would exceed the two cases remaining and must
-- fail while the reinvestment is pending.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
do $$
begin
  perform public.create_investment_order(
    :'target_lot_id'::uuid, 3, 'ci-reinvestment-blocked-order-0001'
  );
  raise exception 'expected target-capacity rejection did not occur';
exception when others then
  if sqlerrm not like '%available fundable capacity%' then
    raise;
  end if;
end;
$$;

-- The same reserved money must also block an over-sized withdrawal.
do $$
begin
  perform public.request_withdrawal(6000::bigint);
  raise exception 'expected shared-spend rejection did not occur';
exception when others then
  if sqlerrm not like '%spendable balance%' then
    raise;
  end if;
end;
$$;
reset role;

select pg_temp.assert_reinvestment_true(
  (select count(*) = 0 from public.investment_withdrawal_requests
   where participant_user_id = '00000000-0000-0000-0000-000000000601'),
  'failed withdrawal must not consume spendable balance'
);

-- Participant cancellation releases both reservations.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
select public.cancel_reinvestment_request(:'request_one_id'::uuid);
reset role;

select pg_temp.assert_reinvestment_true(
  (select status = 'CANCELLED' from public.investment_reinvestment_requests where id = :'request_one_id'::uuid),
  'participant must be able to cancel its own pending reinvestment'
);
select pg_temp.assert_reinvestment_true(
  public.get_investment_spendable_balance('00000000-0000-0000-0000-000000000601') = 10000,
  'cancellation must release the spend reservation'
);
select pg_temp.assert_reinvestment_true(
  (select available_cases_equivalent = 4 and reserved_cases = 0
   from public.get_public_investment_lot_funding(:'target_lot_id'::uuid)),
  'cancellation must release target-lot capacity'
);

-- Create a second request and prove finance cannot mutate the participant's
-- chosen case quantity before canonical approval.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000601', true);
select public.request_reinvestment_cases(
  :'source_settlement_id'::uuid,
  :'target_lot_id'::uuid,
  2,
  'ci-reinvestment-request-0002'
) as request_two_id \gset
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000603', true);
do $$
begin
  perform public.approve_reinvestment(:'request_two_id'::uuid, 3);
  raise exception 'expected immutable participant quantity rejection did not occur';
exception when others then
  if sqlerrm not like '%case quantity is immutable%' then
    raise;
  end if;
end;
$$;
select public.approve_reinvestment_request(:'request_two_id'::uuid) as allocation_id \gset
reset role;

select pg_temp.assert_reinvestment_true(
  (select status = 'APPROVED' and case_equivalent_units = 2
   from public.investment_reinvestment_requests where id = :'request_two_id'::uuid),
  'canonical approval must preserve participant case intent'
);
select pg_temp.assert_reinvestment_true(
  (select participant_user_id = '00000000-0000-0000-0000-000000000601'
      and lot_id = :'target_lot_id'::uuid
      and case_equivalent_units = 2
      and capital_committed_cents = 4600
   from public.investment_funding_allocations where id = :'allocation_id'::uuid),
  'approval must create the exact server-priced target allocation'
);
select pg_temp.assert_reinvestment_true(
  (select count(*) = 1
   from public.investment_ledger_entries
   where participant_user_id = '00000000-0000-0000-0000-000000000601'
     and entry_type = 'REINVESTMENT_DEBIT'
     and amount_cents = -4600
     and reference = :'request_two_id'),
  'approval must debit participant ledger exactly once'
);
select pg_temp.assert_reinvestment_true(
  (select available_cases_equivalent = 2
      and allocated_cases = 2
      and reserved_cases = 0
   from public.get_public_investment_lot_funding(:'target_lot_id'::uuid)),
  'approved reinvestment must convert reservation into allocation without double-counting capacity'
);
select pg_temp.assert_reinvestment_true(
  public.get_investment_available_balance('00000000-0000-0000-0000-000000000601') = 5400,
  'ledger balance after approval must reflect the reinvestment debit'
);

rollback;

SELECT 'Investment reinvestment schema + transactional contract: PASS' AS result;
