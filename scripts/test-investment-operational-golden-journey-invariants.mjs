import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migration=read('supabase/migrations/0067_operational_golden_journey.sql');
const journey=read('scripts/investment-operational-golden-journey.sql');
const component=read('src/components/inversion/InvestmentOperationalJourney.tsx');
const page=read('src/app/admin/operations/journey/page.tsx');
const nav=read('src/components/admin/AdminNav.tsx');
const schema=read('src/lib/observability/schema-version.ts');
const proof=read('src/data/technology-proof.ts');
const allowlist=read('scripts/security-definer-authenticated-allowlist.txt');
const ci=read('.github/workflows/ci.yml');

assert.match(migration,/get_investment_operational_journey\(p_lot_id uuid default null\)/i);
assert.match(migration,/has_investment_permission\('ops\.read'\)/i);
assert.match(migration,/limit 60/i);
assert.match(migration,/returnGenealogyMismatches/);
assert.match(migration,/sourceLinkedApprovedReinvestmentCents/);
assert.match(migration,/Withdrawals are reported only as later activity/i);
assert.match(migration,/RETURNED is intentionally non-terminal/i);
assert.match(migration,/status in \('SOLD','DAMAGED','EXPIRED','LOST','RECALLED'\)/i);
assert.match(migration,/nextAction/);
assert.match(migration,/CLOSED_LOOP/);
assert.match(migration,/revoke execute on function public\.get_investment_operational_journey\(uuid\) from anon/i);
assert.doesNotMatch(migration,/insert into\s+public\./i);
assert.doesNotMatch(migration,/update\s+public\./i);
assert.doesNotMatch(migration,/delete\s+from\s+public\./i);

assert.match(journey,/record_bottle_sale_document/);
assert.match(journey,/record_sale_return_credit_note/);
assert.match(journey,/update_bottle_units_status\([\s\S]*'DAMAGED','CI_JOURNEY_RETURN'/i);
assert.match(journey,/SALE_RETURNED/);
assert.match(journey,/net_distributable_profit_cents=3800/);
assert.match(journey,/amount_cents=6500/);
assert.match(journey,/request_reinvestment_cases/);
assert.match(journey,/request_withdrawal\(4200/);
assert.match(journey,/approve_reinvestment_request/);
assert.match(journey,/confirm_investment_payout/);
assert.match(journey,/get_investment_available_balance[^\n]*=0/i);
assert.match(journey,/terminalPhysicalUnits/);
assert.match(journey,/get_investment_operational_journey/);
assert.match(journey,/Investment Operational Golden Journey: PASS/);

assert.match(component,/get_investment_operational_journey/);
assert.match(component,/Operational Golden Journey/);
assert.match(component,/Solo lectura/);
assert.match(page,/InvestmentOperationalJourney/);
assert.match(nav,/\/admin\/operations\/journey/);
assert.match(schema,/EXPECTED_DATABASE_MIGRATION = '0067'/);
assert.match(schema,/EXPECTED_DATABASE_MIGRATION_NAME = 'operational_golden_journey'/);
assert.match(schema,/EXPECTED_DATABASE_MIGRATION_COUNT = 67/);
assert.match(proof,/phase: '17'/);
assert.match(proof,/Operational Golden Journey/i);
assert.match(allowlist,/public\.get_investment_operational_journey\(p_lot_id uuid\)/);
assert.match(ci,/Investment Operational Golden Journey/);

console.log('Investment Operational Golden Journey invariants passed.');
