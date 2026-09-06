\set ON_ERROR_STOP on

-- CTG Craft Beer Investment — manual crypto verification contract
--
-- Proves the second manual rail end to end against a clean database:
-- crypto order -> participant evidence -> independent human on-chain
-- verification -> authoritative receipt/allocation/ledger/contract, plus the
-- fail-closed rejections. Ephemeral CI evidence only; the scenario rolls back.

begin;
create or replace function pg_temp.assert_ok(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_condition is not true then raise exception 'CRYPTO E2E FAILED: %', p_message; end if;
end; $$;

create or replace function pg_temp.must_fail(p_sql text, p_label text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'expected rejection (%): %', p_label, sqlerrm;
    return;
  end;
  raise exception 'CRYPTO E2E FAILED: % was accepted but must be rejected', p_label;
end; $$;

insert into auth.users(id,email,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000901','crypto-participant@ctgone.test','authenticated','authenticated','{}'::jsonb,'{}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000902','crypto-production@ctgone.test','authenticated','authenticated','{}'::jsonb,'{}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000903','crypto-finance@ctgone.test','authenticated','authenticated','{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.investment_participant_profiles(user_id,investment_role,kyc_status,agreement_accepted_at)
values
  ('00000000-0000-0000-0000-000000000901','PARTICIPANT','VERIFIED',now()),
  ('00000000-0000-0000-0000-000000000902','PRODUCTION_MANAGER','VERIFIED',now()),
  ('00000000-0000-0000-0000-000000000903','FINANCE_ADMIN','VERIFIED',now());

insert into public.investment_formula_versions(version,participant_profit_share,ctg_profit_share,status,approved_at)
select 'CI-CRYPTO-E2E',0.5000,0.5000,'ACTIVE',now()
where not exists(select 1 from public.investment_formula_versions where status='ACTIVE');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000902',true);
select public.create_production_lot_from_style(
  'GOLD','CI Crypto E2E',24,2,1000::bigint,100::bigint,50::bigint,3000::bigint,2500::bigint,0.08::numeric,0.035::numeric,24
) as lot_id \gset
select public.transition_lot_status(:'lot_id'::uuid,'FUNDING_PENDING','CI crypto',null);
select public.transition_lot_status(:'lot_id'::uuid,'FUNDING_OPEN','CI crypto',null);
reset role;

-- ---------------------------------------------------------------------------
-- Happy path: crypto order -> proof -> human on-chain verification -> allocation
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000901',true);
select (public.create_investment_order(:'lot_id'::uuid,2,'ci-crypto-order-0001')).id as order_id \gset
reset role;

set local role service_role;
select public.submit_investment_order_crypto_proof_server(
  '00000000-0000-0000-0000-000000000901'::uuid,:'order_id'::uuid,
  '00000000-0000-0000-0000-000000000901/ci-crypto-proof.pdf',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'ci-crypto-proof.pdf','application/pdf'
);
reset role;

select pg_temp.assert_ok(
  (select status='PENDING_BANK_VERIFICATION' and payment_method='crypto'
     and allocation_id is null and contract_reference is null
   from public.investment_orders where id=:'order_id'::uuid),
  'crypto proof must reach the shared pending-verification stage with no funding facts'
);
select pg_temp.assert_ok(
  (select count(*)=0 from public.investment_payment_receipts where order_id=:'order_id'::uuid),
  'proof submission must never create a receipt'
);

-- The server boundary must reject a participant actor even though service_role
-- owns the transport. Actor authorization is revalidated inside PostgreSQL.
set local role service_role;
select pg_temp.must_fail(
  format('select public.verify_investment_crypto_transfer_server(%L::uuid,%L::uuid,%L,%L,4600::bigint,now(),null)',
    '00000000-0000-0000-0000-000000000901',:'order_id','0xaaaabbbbccccdddd1111','POLYGON'),
  'participant self-verification'
);

-- Finance actor reaches domain validation through the same server-only wrapper.
-- Amount must equal the exact server-priced capital requirement.
select pg_temp.must_fail(
  format('select public.verify_investment_crypto_transfer_server(%L::uuid,%L::uuid,%L,%L,4599::bigint,now(),null)',
    '00000000-0000-0000-0000-000000000903',:'order_id','0xaaaabbbbccccdddd1111','POLYGON'),
  'amount mismatch'
);
-- The network is mandatory.
select pg_temp.must_fail(
  format('select public.verify_investment_crypto_transfer_server(%L::uuid,%L::uuid,%L,%L,4600::bigint,now(),null)',
    '00000000-0000-0000-0000-000000000903',:'order_id','0xaaaabbbbccccdddd1111',''),
  'missing network'
);
-- A plausible transaction hash is mandatory.
select pg_temp.must_fail(
  format('select public.verify_investment_crypto_transfer_server(%L::uuid,%L::uuid,%L,%L,4600::bigint,now(),null)',
    '00000000-0000-0000-0000-000000000903',:'order_id','0xabc','POLYGON'),
  'implausible transaction hash'
);
-- Wrong rail command on a crypto order.
select pg_temp.must_fail(
  format('select public.verify_investment_bancolombia_transfer_server(%L::uuid,%L::uuid,%L,4600::bigint,now(),null)',
    '00000000-0000-0000-0000-000000000903',:'order_id','CI-CRYPTO-WRONG-RAIL'),
  'bank command against a crypto claim'
);

select (public.verify_investment_crypto_transfer_server(
  '00000000-0000-0000-0000-000000000903'::uuid,
  :'order_id'::uuid,'0xAAAA-bbbb-cccc-dddd-1111',' polygon ',4600::bigint,now(),'CI crypto verification'
)).id as verified_id \gset
reset role;

select pg_temp.assert_ok(
  (select status='ALLOCATED' and allocation_id is not null and contract_reference is not null
     and bank_verified_provider_code='CRYPTO_MANUAL' and crypto_network='POLYGON'
     and bank_verified_reference='0XAAAABBBBCCCCDDDD1111'
   from public.investment_orders where id=:'order_id'::uuid),
  'human on-chain verification must activate the allocation and normalize the reference'
);
select pg_temp.assert_ok(
  (select count(*)=1 and sum(amount_cents)=4600 and bool_and(payment_rail='crypto' and provider_code='CRYPTO_MANUAL')
   from public.investment_payment_receipts where order_id=:'order_id'::uuid),
  'exactly one authoritative crypto receipt must exist'
);
select pg_temp.assert_ok(
  (select count(*)=1 from public.investment_ledger_entries
   where entry_type='FUNDING_RECEIVED' and lot_id=:'lot_id'::uuid),
  'funding ledger entry must be created once'
);

-- ---------------------------------------------------------------------------
-- The same on-chain movement must not be able to fund a second order
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000901',true);
select (public.create_investment_order(:'lot_id'::uuid,2,'ci-crypto-order-0002')).id as order2_id \gset
reset role;

set local role service_role;
-- The exact same evidence file must not be reusable on a fresh order.
select pg_temp.must_fail(
  format('select public.submit_investment_order_crypto_proof_server(%L::uuid,%L::uuid,%L,%L,%L,%L)',
    '00000000-0000-0000-0000-000000000901',:'order2_id',
    '00000000-0000-0000-0000-000000000901/dup.pdf',
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','dup.pdf','application/pdf'),
  'reused proof file hash'
);
select public.submit_investment_order_crypto_proof_server(
  '00000000-0000-0000-0000-000000000901'::uuid,:'order2_id'::uuid,
  '00000000-0000-0000-0000-000000000901/ci-crypto-proof-2.pdf',
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'ci-crypto-proof-2.pdf','application/pdf'
);

select pg_temp.must_fail(
  format('select public.verify_investment_crypto_transfer_server(%L::uuid,%L::uuid,%L,%L,4600::bigint,now(),null)',
    '00000000-0000-0000-0000-000000000903',:'order2_id','0xaaaa_BBBB.cccc dddd/1111','POLYGON'),
  'reused transaction hash under a different textual form'
);
reset role;

-- Rejection creates no money facts and is rail-labelled in the audit log.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000903',true);
select public.reject_investment_bank_proof(:'order2_id'::uuid,'CI crypto rejection');
reset role;

select pg_temp.assert_ok(
  (select status='REJECTED' and allocation_id is null and contract_reference is null
   from public.investment_orders where id=:'order2_id'::uuid),
  'rejection must leave no funding facts'
);
select pg_temp.assert_ok(
  (select count(*)=0 from public.investment_payment_receipts where order_id=:'order2_id'::uuid),
  'rejection must not create a receipt'
);
select pg_temp.assert_ok(
  (select new_value->>'payment_method'='crypto' from public.investment_audit_log
   where action='reject_investment_bank_proof' and entity_id=:'order2_id'::uuid),
  'rejection audit entry must record which rail was rejected'
);

-- ---------------------------------------------------------------------------
-- The bank rail must be completely unaffected
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000901',true);
select (public.create_investment_order(:'lot_id'::uuid,2,'ci-crypto-order-0003')).id as order3_id \gset
reset role;

set local role service_role;
select public.submit_investment_order_bank_proof_server(
  '00000000-0000-0000-0000-000000000901'::uuid,:'order3_id'::uuid,
  '00000000-0000-0000-0000-000000000901/ci-bank-proof.pdf',
  'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'ci-bank-proof.pdf','application/pdf'
);
-- Crypto command must not work on a bank claim.
select pg_temp.must_fail(
  format('select public.verify_investment_crypto_transfer_server(%L::uuid,%L::uuid,%L,%L,4600::bigint,now(),null)',
    '00000000-0000-0000-0000-000000000903',:'order3_id','0x9999888877776666','POLYGON'),
  'crypto command against a bank claim'
);
select public.verify_investment_bancolombia_transfer_server(
  '00000000-0000-0000-0000-000000000903'::uuid,
  :'order3_id'::uuid,'CI-BANK-STILL-OK',4600::bigint,now(),null
);
reset role;

select pg_temp.assert_ok(
  (select status='ALLOCATED' and bank_verified_provider_code='BANCOLOMBIA_MANUAL' and crypto_network is null
   from public.investment_orders where id=:'order3_id'::uuid),
  'the Bancolombia rail must still work end to end and record no network'
);

-- Health counters must see the crypto rail.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000903',true);
select pg_temp.assert_ok(
  (select allocated_without_human_verification=0 and allocated_without_receipt=0
      and allocated_without_network=0 and duplicated_transaction_hashes=0
   from public.get_manual_crypto_verification_health()),
  'crypto health counters must report a clean rail'
);
reset role;

select 'CRYPTO E2E: PASS' as result;
rollback;
