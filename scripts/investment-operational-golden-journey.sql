\set ON_ERROR_STOP on

-- CTG Craft Beer Investment — Operational Golden Journey
-- Ephemeral CI evidence only. The whole scenario rolls back.
--
-- funding -> payment -> allocation -> production -> serialization -> inventory ->
-- sale -> return/credit note -> physical return disposition -> settlement ->
-- participant credit -> reinvestment + withdrawal -> allocation + confirmed payout.

begin;

create or replace function pg_temp.assert_journey(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_condition is not true then
    raise exception 'OPERATIONAL GOLDEN JOURNEY ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

insert into auth.users(id,email,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000711','journey-participant@ctgone.test','authenticated','authenticated','{}'::jsonb,'{"full_name":"Journey Participant"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000712','journey-production@ctgone.test','authenticated','authenticated','{}'::jsonb,'{"full_name":"Journey Production"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000713','journey-finance@ctgone.test','authenticated','authenticated','{}'::jsonb,'{"full_name":"Journey Finance"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000714','journey-sales@ctgone.test','authenticated','authenticated','{}'::jsonb,'{"full_name":"Journey Sales"}'::jsonb,now(),now());

insert into public.investment_participant_profiles(user_id,investment_role,kyc_status)
values
  ('00000000-0000-0000-0000-000000000711','PARTICIPANT','VERIFIED'),
  ('00000000-0000-0000-0000-000000000712','PRODUCTION_MANAGER','VERIFIED'),
  ('00000000-0000-0000-0000-000000000713','FINANCE_ADMIN','VERIFIED'),
  ('00000000-0000-0000-0000-000000000714','SALES_MANAGER','VERIFIED');

insert into public.investment_formula_versions(version,participant_profit_share,ctg_profit_share,status,approved_at)
select 'CI-OPERATIONAL-GOLDEN-JOURNEY',0.5000,0.5000,'ACTIVE',now()
where not exists(select 1 from public.investment_formula_versions where status='ACTIVE');

-- Source lot + canonical locations.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000712',true);
select public.create_production_lot_from_style(
  'GOLD','CI Operational Golden Journey',2,2,
  1000::bigint,100::bigint,50::bigint,
  3000::bigint,2500::bigint,0.08::numeric,0.035::numeric,2
) as source_lot_id \gset
select public.transition_lot_status(:'source_lot_id'::uuid,'FUNDING_PENDING','CI journey',null);
select public.transition_lot_status(:'source_lot_id'::uuid,'FUNDING_OPEN','CI journey',null);
select (public.upsert_inventory_location('CI_JOURNEY_SALES','CI Journey Sales Point','SALES_POINT',null,true)).id as sales_location_id \gset
select (public.upsert_inventory_location('CI_JOURNEY_RETURN','CI Journey Returns','QUARANTINE',null,true)).id as return_location_id \gset
reset role;

-- Participant funding order and authoritative bank receipt.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000711',true);
select (public.create_investment_order(:'source_lot_id'::uuid,2,'ci-operational-order-0001')).id as order_id \gset
reset role;

set local role service_role;
select public.submit_investment_order_bank_proof_server(
  '00000000-0000-0000-0000-000000000711'::uuid,:'order_id'::uuid,
  '00000000-0000-0000-0000-000000000711/ci-operational-proof.pdf',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'ci-operational-proof.pdf','application/pdf'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000713',true);
select (public.verify_investment_bancolombia_transfer(
  :'order_id'::uuid,'CI-OP-GJ-001',4600::bigint,now(),'CI operational journey'
)).id as verified_order_id \gset
select public.record_lot_financial_entry(
  :'source_lot_id'::uuid,'PRODUCTION_COST',4600::bigint,'CI authoritative production cost'
);
reset role;

select pg_temp.assert_journey(
  (select status='ALLOCATED' and allocation_id is not null from public.investment_orders where id=:'order_id'::uuid),
  'authoritative payment must activate one allocation'
);
select pg_temp.assert_journey(
  (select count(*)=1 and sum(amount_cents)=4600 from public.investment_payment_receipts where order_id=:'order_id'::uuid),
  'receipt must equal the server-priced capital requirement'
);

-- Production and serialized physical lifecycle.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000712',true);
select public.transition_lot_status(:'source_lot_id'::uuid,'FUNDED',null,null);
select public.transition_lot_status(:'source_lot_id'::uuid,'PROCUREMENT',null,null);
select public.transition_lot_status(:'source_lot_id'::uuid,'BREWING',null,null);
select public.transition_lot_status(:'source_lot_id'::uuid,'FERMENTATION',null,null);
select public.transition_lot_status(:'source_lot_id'::uuid,'CONDITIONING',null,null);
select public.transition_lot_status(:'source_lot_id'::uuid,'BOTTLING',null,null);
select * from public.generate_bottle_units(:'source_lot_id'::uuid,4);
select public.transition_lot_status(:'source_lot_id'::uuid,'QUALITY_CONTROL',null,null);
select public.update_bottle_units_status(:'source_lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid order by unit_number),'QC_APPROVED',null);
select public.transition_lot_status(:'source_lot_id'::uuid,'WAREHOUSE',null,null);
select public.update_bottle_units_status(:'source_lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid order by unit_number),'WAREHOUSE','CTG_WAREHOUSE');
select public.transition_lot_status(:'source_lot_id'::uuid,'DISPATCHED',null,null);
select public.update_bottle_units_status(:'source_lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid order by unit_number),'DISPATCHED','IN_TRANSIT');
select public.transition_lot_status(:'source_lot_id'::uuid,'IN_MARKET',null,null);
select public.update_bottle_units_status(:'source_lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid order by unit_number),'IN_MARKET','CI_JOURNEY_SALES');
select public.transition_lot_status(:'source_lot_id'::uuid,'SELLING',null,null);
reset role;

-- Sell all four units, then credit one exact customer return.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000714',true);
select sale_id,gross_revenue_cents,tax_recognized_cents
from public.record_bottle_sale_document(
  :'source_lot_id'::uuid,
  array(select serial_code from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid order by unit_number),
  3000::bigint,'DIRECT','ci-operational-sale-0001','CI-OP-SALE-001','CI_JOURNEY_SALES',800::bigint
) \gset sale_
select serial_code as returned_serial
from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid order by unit_number limit 1 \gset
select credit_note_id,returned_count,gross_credit_cents,tax_credit_cents
from public.record_sale_return_credit_note(
  :'sale_sale_id'::uuid,array[:'returned_serial'::text],
  'CI_JOURNEY_RETURN','CUSTOMER_RETURN','ci-operational-return-0001',
  'CI-OP-CREDIT-001','CI operational journey return'
) \gset return_
reset role;

select pg_temp.assert_journey(:'return_returned_count'::integer=1,'exactly one bottle must be returned');
select pg_temp.assert_journey(:'return_gross_credit_cents'::bigint=3000,'return gross must match the original sale item');
select pg_temp.assert_journey(:'return_tax_credit_cents'::bigint=200,'return tax must use deterministic per-item allocation');
select pg_temp.assert_journey(
  (select count(*)=4 and count(*) filter(where status='SOLD')=3 and count(*) filter(where status='RETURNED')=1
   from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid),
  'credit note must leave three SOLD and one physically RETURNED unit'
);
select pg_temp.assert_journey(
  (select coalesce(sum(amount_cents) filter(where entry_type='REVENUE'),0)=12000
       and coalesce(sum(amount_cents) filter(where entry_type='TAX'),0)=800
       and coalesce(sum(amount_cents) filter(where entry_type='REVENUE_REVERSAL'),0)=3000
       and coalesce(sum(amount_cents) filter(where entry_type='TAX_REVERSAL'),0)=200
   from public.investment_lot_financial_entries where lot_id=:'source_lot_id'::uuid),
  'sale and credit-note financial genealogy must reconcile'
);

-- A credited return is not a terminal physical disposition. Resolve it before SOLD_OUT.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000712',true);
select public.update_bottle_units_status(
  :'source_lot_id'::uuid,array[:'returned_serial'::text],'DAMAGED','CI_JOURNEY_RETURN'
);
reset role;

select pg_temp.assert_journey(
  (select count(*)=4 and count(*) filter(where status='SOLD')=3 and count(*) filter(where status='DAMAGED')=1
   from public.investment_bottle_units where lot_id=:'source_lot_id'::uuid),
  'returned inventory must be dispositioned before lot close'
);
select pg_temp.assert_journey(
  (select count(*)=1
   from public.investment_inventory_movements m
   join public.investment_inventory_movement_units mu on mu.movement_id=m.id
   join public.investment_bottle_units b on b.id=mu.bottle_unit_id
   where m.lot_id=:'source_lot_id'::uuid and m.movement_type='SALE_RETURNED'
     and m.source_credit_note_id=:'return_credit_note_id'::uuid and b.serial_code=:'returned_serial'),
  'physical disposition must preserve the earlier SALE_RETURNED credit-note genealogy'
);

-- Commercial close and settlement.
-- NDLP = (12000-3000) - (800-200) - 4600 = 3800.
-- Participant credit = 4600 capital + 50% * 3800 = 6500.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000712',true);
select public.transition_lot_status(:'source_lot_id'::uuid,'SOLD_OUT',null,null);
select public.transition_lot_status(:'source_lot_id'::uuid,'SETTLEMENT_PENDING',null,null);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000713',true);
select public.finalize_settlement(:'source_lot_id'::uuid) as settlement_id \gset
reset role;

select pg_temp.assert_journey(
  (select net_distributable_profit_cents=3800 from public.investment_settlements where id=:'settlement_id'::uuid),
  'settlement must net return and tax reversal before distribution'
);
select pg_temp.assert_journey(
  (select amount_cents=6500 from public.investment_ledger_entries
   where participant_user_id='00000000-0000-0000-0000-000000000711'
     and entry_type='SETTLEMENT_CREDIT' and reference=:'settlement_id'),
  'settlement credit must equal capital plus formula-pinned profit'
);
select pg_temp.assert_journey(
  public.get_investment_available_balance('00000000-0000-0000-0000-000000000711'::uuid)=6500,
  'post-settlement available balance must be 6500'
);

-- Target lot. Reinvestment price = (500+50+25) * 2 units/case * 2 cases = 2300.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000712',true);
select public.create_production_lot_from_style(
  'GOLD','CI Operational Reinvestment Target',2,2,
  500::bigint,50::bigint,25::bigint,
  3000::bigint,2500::bigint,0.08::numeric,0.035::numeric,2
) as target_lot_id \gset
select public.transition_lot_status(:'target_lot_id'::uuid,'FUNDING_PENDING','CI reinvestment target',null);
select public.transition_lot_status(:'target_lot_id'::uuid,'FUNDING_OPEN','CI reinvestment target',null);
reset role;

-- Split the full 6500 participant credit between reinvestment and withdrawal.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000711',true);
select public.set_investment_payout_destination('BANCO ****7711','ci-operational-destination-7711');
select public.request_reinvestment_cases(
  :'settlement_id'::uuid,:'target_lot_id'::uuid,2,'ci-operational-reinvest-0001'
) as reinvestment_request_id \gset
select public.request_withdrawal(4200::bigint) as withdrawal_request_id \gset
reset role;

select pg_temp.assert_journey(
  public.get_investment_spendable_balance('00000000-0000-0000-0000-000000000711'::uuid)=0,
  'pending reinvestment and withdrawal must reserve the entire credit without double spend'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000713',true);
select public.approve_reinvestment_request(:'reinvestment_request_id'::uuid) as reinvestment_allocation_id \gset
select public.approve_withdrawal(:'withdrawal_request_id'::uuid);
select public.initiate_investment_payout(
  :'withdrawal_request_id'::uuid,'bank_transfer','CI_BANK','BANCO ****7711',
  'ci-operational-destination-7711','ci-operational-payout-0001','CI journey payout'
) as payout_id \gset
select public.confirm_investment_payout(
  :'payout_id'::uuid,'CI-PAYOUT-CONFIRMED-001',now(),'CI journey confirmed'
);
reset role;

select pg_temp.assert_journey(
  (select status='APPROVED' and amount_cents=2300 and case_equivalent_units=2
   from public.investment_reinvestment_requests where id=:'reinvestment_request_id'::uuid),
  'reinvestment must preserve participant case intent and server price'
);
select pg_temp.assert_journey(
  (select count(*)=1 and sum(case_equivalent_units)=2 and sum(capital_committed_cents)=2300
   from public.investment_funding_allocations where id=:'reinvestment_allocation_id'::uuid and lot_id=:'target_lot_id'::uuid),
  'reinvestment must create one exact target allocation'
);
select pg_temp.assert_journey(
  (select status='PAID' from public.investment_withdrawal_requests where id=:'withdrawal_request_id'::uuid),
  'withdrawal must become PAID only after payout confirmation'
);
select pg_temp.assert_journey(
  (select count(*)=1
       and coalesce(sum(amount_cents),0)=-4200
       and coalesce(bool_and(source_payout_id=:'payout_id'::uuid),false)
   from public.investment_ledger_entries
   where entry_type='WITHDRAWAL_DEBIT' and participant_user_id='00000000-0000-0000-0000-000000000711'),
  'withdrawal debit must retain authoritative payout genealogy'
);
select pg_temp.assert_journey(
  (select count(*)=1 and coalesce(sum(amount_cents),0)=-2300
   from public.investment_ledger_entries
   where entry_type='REINVESTMENT_DEBIT' and reference=:'reinvestment_request_id'),
  'reinvestment debit must be exact and unique'
);
select pg_temp.assert_journey(
  public.get_investment_available_balance('00000000-0000-0000-0000-000000000711'::uuid)=0,
  'liquidity split must conserve settlement credit to zero residual balance'
);

-- Phase 17 read model reconstructs both funding paths without writes.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000713',true);
select public.get_investment_operational_journey(:'source_lot_id'::uuid) as source_journey_snapshot \gset
select public.get_investment_operational_journey(:'target_lot_id'::uuid) as target_journey_snapshot \gset
reset role;

-- Source lot: cash/order funding must reconcile exactly to payment receipts.
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb->>'nextAction')='CLOSED_LOOP','source snapshot must identify closed loop');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{funding,isReconciled}')::boolean,'source funding must reconcile');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{funding,orderBackedAllocationCapitalCents}')::bigint=4600,'source order-backed allocation must be 4600');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{funding,receiptCents}')::bigint=4600,'source receipts must reconcile to 4600');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{funding,unbackedAllocationCapitalCents}')::bigint=0,'source lot must have no unbacked allocation');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{settlement,finalized}')::boolean,'source snapshot must expose settlement');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{settlement,participantCreditCents}')::bigint=6500,'source snapshot must expose exact participant credit');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{sales,returnedUnits}')::bigint=1,'source snapshot must expose credited return');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{sales,returnGenealogyMismatches}')::bigint=0,'return genealogy must reconcile');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{production,terminalPhysicalUnits}')::bigint=4,'all source physical units must be terminal');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{liquidity,sourceLinkedApprovedReinvestmentCents}')::bigint=2300,'source snapshot must preserve settlement-to-reinvestment genealogy');
select pg_temp.assert_journey((:'source_journey_snapshot'::jsonb#>>'{liquidity,creditedParticipantWithdrawalCentsAfterSettlement}')::bigint=4200,'source snapshot must report later withdrawal activity without source attribution');

-- Target lot: approved reinvestment is authoritative funding without a bank receipt.
select pg_temp.assert_journey((:'target_journey_snapshot'::jsonb#>>'{funding,isReconciled}')::boolean,'reinvestment-funded target must reconcile without a bank receipt');
select pg_temp.assert_journey((:'target_journey_snapshot'::jsonb#>>'{funding,receiptCents}')::bigint=0,'reinvestment target must not fabricate bank receipts');
select pg_temp.assert_journey((:'target_journey_snapshot'::jsonb#>>'{funding,orderBackedAllocationCapitalCents}')::bigint=0,'reinvestment target must not fabricate order-backed capital');
select pg_temp.assert_journey((:'target_journey_snapshot'::jsonb#>>'{funding,reinvestmentBackedAllocationCapitalCents}')::bigint=2300,'target allocation must be backed by approved reinvestment');
select pg_temp.assert_journey((:'target_journey_snapshot'::jsonb#>>'{funding,reinvestmentDebitCents}')::bigint=2300,'target reinvestment debit must reconcile to allocation capital');
select pg_temp.assert_journey((:'target_journey_snapshot'::jsonb#>>'{funding,unbackedAllocationCapitalCents}')::bigint=0,'target lot must have no unbacked allocation');
select pg_temp.assert_journey((:'target_journey_snapshot'::jsonb->>'nextAction')='PRODUCTION_SERIALIZATION','reinvestment-funded target must advance to production instead of payment reconciliation');

rollback;
select 'Investment Operational Golden Journey: PASS' as result;