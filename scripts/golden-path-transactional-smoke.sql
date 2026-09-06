\set ON_ERROR_STOP on

-- CTG Craft Beer Inversión — transactional Golden Path
--
-- Executes the real domain commands against the ephemeral clean PostgreSQL used
-- by CI. Every fixture and business fact is wrapped in one transaction and is
-- rolled back at the end. Production is never touched.
--
-- Certified path:
--   lot -> funding open -> idempotent order -> trusted proof boundary ->
--   human Bancolombia verification -> authoritative receipt/allocation ->
--   production/inventory -> authoritative sale -> settlement -> participant credit

begin;

create or replace function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'TRANSACTIONAL GOLDEN PATH ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

-- Deterministic actors. auth.users inserts intentionally exercise the repository's
-- real new-user trigger, which creates public.profiles + wallets.
insert into auth.users (
  id, email, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000101', 'gp-participant@ctgone.test', 'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Golden Path Participant"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000201', 'gp-production@ctgone.test',  'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Golden Path Production"}'::jsonb,  now(), now()),
  ('00000000-0000-0000-0000-000000000301', 'gp-finance@ctgone.test',     'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Golden Path Finance"}'::jsonb,     now(), now()),
  ('00000000-0000-0000-0000-000000000401', 'gp-sales@ctgone.test',       'authenticated', 'authenticated', '{}'::jsonb, '{"full_name":"Golden Path Sales"}'::jsonb,       now(), now());

insert into public.investment_participant_profiles(user_id, investment_role, kyc_status, agreement_accepted_at)
values
  ('00000000-0000-0000-0000-000000000101', 'PARTICIPANT',        'VERIFIED', now()),
  ('00000000-0000-0000-0000-000000000201', 'PRODUCTION_MANAGER', 'VERIFIED', now()),
  ('00000000-0000-0000-0000-000000000301', 'FINANCE_ADMIN',      'VERIFIED', now()),
  ('00000000-0000-0000-0000-000000000401', 'SALES_MANAGER',      'VERIFIED', now());

select pg_temp.assert_true(
  (select count(*) = 4 from public.profiles where email like 'gp-%@ctgone.test'),
  'auth.users fixture must exercise handle_new_user() and create all profiles'
);

-- A clean database may intentionally have no ACTIVE formula. Seed one only for
-- this rolled-back contract. If a migration already provides one, certify it.
insert into public.investment_formula_versions(
  version, participant_profit_share, ctg_profit_share, status, approved_at
)
select 'CI-TRANSACTIONAL-GOLDEN-PATH', 0.5000, 0.5000, 'ACTIVE', now()
where not exists (
  select 1 from public.investment_formula_versions where status = 'ACTIVE'
);

select pg_temp.assert_true(
  (select count(*) = 1 from public.investment_formula_versions where status = 'ACTIVE'),
  'exactly one ACTIVE investment formula must exist'
);

-- ---------------------------------------------------------------------------
-- Production creates the authoritative lot and opens funding.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);

select public.create_production_lot_from_style(
  p_style_code => 'GOLD',
  p_destination => 'CI Transactional Golden Path',
  p_total_cases => 2,
  p_case_size_units => 2,
  p_production_cost_unit_cents => 1000::bigint,
  p_label_cost_unit_cents => 100::bigint,
  p_transport_cost_unit_cents => 50::bigint,
  p_own_point_price_unit_cents => 3000::bigint,
  p_b2b_price_unit_cents => 2500::bigint,
  p_inc_rate => 0.08::numeric,
  p_advertising_rate_on_pre_inc => 0.035::numeric,
  p_total_eligible_units => 2
) as lot_id \gset

select public.transition_lot_status(:'lot_id'::uuid, 'FUNDING_PENDING', 'CI transactional Golden Path', null);
select public.transition_lot_status(:'lot_id'::uuid, 'FUNDING_OPEN', 'CI transactional Golden Path', null);

select (public.upsert_inventory_location(
  'CI_GP_SALES_POINT', 'CI Golden Path Sales Point', 'SALES_POINT', null, true
)).id as sales_location_id \gset

reset role;

select pg_temp.assert_true(
  (select status = 'FUNDING_OPEN'
   and total_cases = 2
   and total_eligible_units = 2
   and case_size_units = 2
   and production_cost_unit_cents = 1000
   and label_cost_unit_cents = 100
   and transport_cost_unit_cents = 50
   from public.investment_production_lots where id = :'lot_id'::uuid),
  'lot snapshot and FUNDING_OPEN state must be authoritative'
);

-- ---------------------------------------------------------------------------
-- Participant creates an idempotent two-case order.
-- 1,000 + 100 + 50 = 1,150 cents / bottle; 2 bottles/case; 2 cases = 4,600.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

select
  (public.create_investment_order(
    :'lot_id'::uuid, 2, 'ci-golden-path-order-0001'
  )).id as order_id,
  (public.create_investment_order(
    :'lot_id'::uuid, 2, 'ci-golden-path-order-0001'
  )).capital_required_cents as replay_capital_cents
\gset

reset role;

select pg_temp.assert_true(:'replay_capital_cents'::bigint = 4600,
  'order capital must include production + label + transport');
select pg_temp.assert_true(
  (select count(*) = 1 from public.investment_orders
   where participant_user_id = '00000000-0000-0000-0000-000000000101'
     and lot_id = :'lot_id'::uuid
     and client_idempotency_key = 'ci-golden-path-order-0001'),
  'exact order replay must not reserve capacity twice'
);
select pg_temp.assert_true(
  (select id = :'order_id'::uuid and status = 'AWAITING_PAYMENT'
   from public.investment_orders where id = :'order_id'::uuid),
  'new order must await trusted payment evidence'
);

-- ---------------------------------------------------------------------------
-- Trusted Next.js boundary persists server-computed proof facts as service_role.
-- ---------------------------------------------------------------------------
set local role service_role;
select public.submit_investment_order_bank_proof_server(
  '00000000-0000-0000-0000-000000000101'::uuid,
  :'order_id'::uuid,
  '00000000-0000-0000-0000-000000000101/ci-golden-path-proof.pdf',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'ci-golden-path-proof.pdf',
  'application/pdf'
);
reset role;

select pg_temp.assert_true(
  (select status = 'PENDING_BANK_VERIFICATION'
   and payment_method = 'bank_transfer'
   and payment_proof_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
   from public.investment_orders where id = :'order_id'::uuid),
  'trusted proof boundary must create PENDING_BANK_VERIFICATION without funding facts'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.investment_funding_allocations where lot_id = :'lot_id'::uuid),
  'proof evidence alone must never create an allocation'
);

-- ---------------------------------------------------------------------------
-- Finance verifies the actual bank fact through the production server boundary.
-- The service-role wrapper rebinds and revalidates the canonical Finance actor
-- before invoking the now-internal legacy implementation.
-- ---------------------------------------------------------------------------
set local role service_role;

select (public.verify_investment_bancolombia_transfer_server(
  '00000000-0000-0000-0000-000000000301'::uuid,
  :'order_id'::uuid,
  'CI-GP-REF-001',
  4600::bigint,
  now(),
  'CI transactional Golden Path bank verification'
)).id as verified_order_id \gset

reset role;

select pg_temp.assert_true(:'verified_order_id'::uuid = :'order_id'::uuid,
  'bank verification must finalize the intended order');
select pg_temp.assert_true(
  (select status = 'ALLOCATED'
   and allocation_id is not null
   and payment_verified_at is not null
   and contract_activated_at is not null
   and bank_verified_provider_code = 'BANCOLOMBIA_MANUAL'
   and bank_verified_reference = 'CIGPREF001'
   from public.investment_orders where id = :'order_id'::uuid),
  'human Bancolombia verification must activate the order and normalize the bank reference'
);
select pg_temp.assert_true(
  (select count(*) = 1 and sum(amount_cents) = 4600
   from public.investment_payment_receipts where order_id = :'order_id'::uuid),
  'one authoritative payment receipt must exist for the exact order amount'
);
select pg_temp.assert_true(
  (select count(*) = 1 and sum(case_equivalent_units) = 2 and sum(capital_committed_cents) = 4600
   from public.investment_funding_allocations where lot_id = :'lot_id'::uuid),
  'bank reconciliation must create exactly one full funding allocation'
);
select pg_temp.assert_true(
  (select count(*) = 2 and sum(amount_cents) = 9200
   from public.investment_ledger_entries
   where lot_id = :'lot_id'::uuid
     and entry_type in ('FUNDING_RECEIVED','CAPITAL_COMMITTED')),
  'funding ledger must contain one exact FUNDING_RECEIVED and one CAPITAL_COMMITTED fact'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.investment_ledger_entries
   where lot_id = :'lot_id'::uuid
     and entry_type in ('FUNDING_RECEIVED','CAPITAL_COMMITTED')
     and source_payment_receipt_id is null),
  'funding ledger genealogy must always point to the authoritative receipt'
);

-- Record the actual production cost fact that settlement must deduct.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', true);
select public.record_lot_financial_entry(
  :'lot_id'::uuid, 'PRODUCTION_COST', 4600::bigint,
  'CI Golden Path authoritative production cost'
);
reset role;

-- ---------------------------------------------------------------------------
-- Production and inventory traverse the physical state machine.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);

select public.transition_lot_status(:'lot_id'::uuid, 'FUNDED', null, null);
select public.transition_lot_status(:'lot_id'::uuid, 'PROCUREMENT', null, null);
select public.transition_lot_status(:'lot_id'::uuid, 'BREWING', null, null);
select public.transition_lot_status(:'lot_id'::uuid, 'FERMENTATION', null, null);
select public.transition_lot_status(:'lot_id'::uuid, 'CONDITIONING', null, null);
select public.transition_lot_status(:'lot_id'::uuid, 'BOTTLING', null, null);

select * from public.generate_bottle_units(:'lot_id'::uuid, 4);

select public.transition_lot_status(:'lot_id'::uuid, 'QUALITY_CONTROL', null, null);
select public.update_bottle_units_status(
  :'lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id = :'lot_id'::uuid order by unit_number),
  'QC_APPROVED', null
);
select public.transition_lot_status(:'lot_id'::uuid, 'WAREHOUSE', null, null);
select public.update_bottle_units_status(
  :'lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id = :'lot_id'::uuid order by unit_number),
  'WAREHOUSE', 'CTG_WAREHOUSE'
);
select public.transition_lot_status(:'lot_id'::uuid, 'DISPATCHED', null, null);
select public.update_bottle_units_status(
  :'lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id = :'lot_id'::uuid order by unit_number),
  'DISPATCHED', 'IN_TRANSIT'
);
select public.transition_lot_status(:'lot_id'::uuid, 'IN_MARKET', null, null);
select public.update_bottle_units_status(
  :'lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id = :'lot_id'::uuid order by unit_number),
  'IN_MARKET', 'CI_GP_SALES_POINT'
);
select public.transition_lot_status(:'lot_id'::uuid, 'SELLING', null, null);

reset role;

select pg_temp.assert_true(
  (select count(*) = 4 and count(*) filter (where status = 'IN_MARKET') = 4
   from public.investment_bottle_units where lot_id = :'lot_id'::uuid),
  'all four eligible bottles must be serialized and physically IN_MARKET before sale'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.investment_bottle_units
   where lot_id = :'lot_id'::uuid and current_location_id is null),
  'every serialized bottle must have a canonical inventory location'
);

-- ---------------------------------------------------------------------------
-- Sales records one authoritative sale; exact replay is idempotent.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000401', true);

select sale_id, sold_count, gross_revenue_cents, tax_recognized_cents
from public.record_bottle_sale_document(
  :'lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id = :'lot_id'::uuid order by unit_number),
  3000::bigint,
  'DIRECT',
  'ci-golden-path-sale-0001',
  'CI-GP-SALE-001',
  'CI_GP_SALES_POINT',
  800::bigint
) \gset sale_

-- Exact retry must return the same Sales OS document without a second movement
-- or financial entry.
select sale_id as replay_sale_id
from public.record_bottle_sale_document(
  :'lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id = :'lot_id'::uuid order by unit_number),
  3000::bigint,
  'DIRECT',
  'ci-golden-path-sale-0001',
  'CI-GP-SALE-001',
  'CI_GP_SALES_POINT',
  800::bigint
) \gset

reset role;

select pg_temp.assert_true(:'sale_sale_id'::uuid = :'replay_sale_id'::uuid,
  'exact sale replay must return the same authoritative sale');
select pg_temp.assert_true(:'sale_sold_count'::integer = 4
  and :'sale_gross_revenue_cents'::bigint = 12000
  and :'sale_tax_recognized_cents'::bigint = 800,
  'sale output must match four bottles, gross revenue and explicit tax');
select pg_temp.assert_true(
  (select count(*) = 1 from public.investment_sales
   where lot_id = :'lot_id'::uuid and idempotency_key = 'ci-golden-path-sale-0001'),
  'sale idempotency must prevent duplicate sale documents'
);
select pg_temp.assert_true(
  (select count(*) = 4 from public.investment_sale_items where sale_id = :'sale_sale_id'::uuid),
  'every SOLD bottle must be backed by one sale item'
);
select pg_temp.assert_true(
  (select count(*) = 4 and count(*) filter (where status = 'SOLD') = 4
   from public.investment_bottle_units where lot_id = :'lot_id'::uuid),
  'physical inventory projection must be SOLD after the sale'
);
select pg_temp.assert_true(
  (select coalesce(sum(amount_cents) filter (where entry_type = 'REVENUE'),0) = 12000
      and coalesce(sum(amount_cents) filter (where entry_type = 'TAX'),0) = 800
   from public.investment_lot_financial_entries where lot_id = :'lot_id'::uuid),
  'Sales OS revenue/tax must reconcile to financial facts'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.investment_lot_financial_entries
   where lot_id = :'lot_id'::uuid
     and entry_type in ('REVENUE','TAX')
     and source_sale_id is null),
  'sales-backed revenue/tax must retain source-sale genealogy'
);

-- ---------------------------------------------------------------------------
-- Physical close and Finance settlement.
-- NDLP = 12,000 - 800 - 4,600 = 6,600 cents.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select public.transition_lot_status(:'lot_id'::uuid, 'SOLD_OUT', null, null);
select public.transition_lot_status(:'lot_id'::uuid, 'SETTLEMENT_PENDING', null, null);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', true);
select public.finalize_settlement(:'lot_id'::uuid) as settlement_id \gset
reset role;

select participant_profit_share as participant_profit_share
from public.investment_formula_versions where status = 'ACTIVE' \gset

select pg_temp.assert_true(
  (select status = 'SETTLED' from public.investment_production_lots where id = :'lot_id'::uuid),
  'finalize_settlement must be the only successful transition to SETTLED'
);
select pg_temp.assert_true(
  (select net_distributable_profit_cents = 6600
   and total_eligible_units = 2
   from public.investment_settlements where id = :'settlement_id'::uuid),
  'settlement NDLP must conserve recognized revenue, tax and production cost'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.investment_settlements where lot_id = :'lot_id'::uuid),
  'a lot must have exactly one settlement'
);
select pg_temp.assert_true(
  (select amount_cents = 4600 + round(6600 * :'participant_profit_share'::numeric)::bigint
   from public.investment_ledger_entries
   where participant_user_id = '00000000-0000-0000-0000-000000000101'
     and lot_id = :'lot_id'::uuid
     and entry_type = 'SETTLEMENT_CREDIT'),
  'participant settlement credit must equal capital recovery plus formula-pinned profit share'
);
select pg_temp.assert_true(
  public.get_investment_available_balance('00000000-0000-0000-0000-000000000101'::uuid)
    = 4600 + round(6600 * :'participant_profit_share'::numeric)::bigint,
  'participant available balance must project exactly from settlement ledger facts'
);

-- Negative terminal invariant: retry the actual settled lot, and accept only the
-- explicit terminal-state rejection. A null/unknown lot or unrelated permission
-- error is a test failure, not a valid duplicate-settlement rejection.
select set_config('ci.golden_path_lot', :'lot_id', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', true);
do $$
declare
  v_error text;
begin
  begin
    perform public.finalize_settlement(current_setting('ci.golden_path_lot')::uuid);
  exception
    when others then
      v_error := sqlerrm;
  end;

  if v_error is null then
    raise exception 'second settlement unexpectedly succeeded';
  end if;
  if v_error not like 'lot is not in SETTLEMENT_PENDING (status: SETTLED)%' then
    raise exception 'second settlement failed for unexpected reason: %', v_error;
  end if;
end;
$$;
reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from public.investment_settlements where lot_id = :'lot_id'::uuid),
  'terminal settlement uniqueness must remain intact'
);

rollback;

select 'Investment transactional Golden Path: PASS' as result;
