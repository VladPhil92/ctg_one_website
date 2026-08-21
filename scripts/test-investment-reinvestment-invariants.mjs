import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// Phase 15 owns the immutable 0065 contract. It deliberately does not assert
// that 0065 remains the repository's latest migration; later phases own current
// schema-version expectations.
const migration = read('supabase/migrations/0065_participant_liquidity_loop.sql');
const component = read('src/components/inversion/InvestmentReinvestmentPanel.tsx');
const participantPage = read('src/app/inversion/app/page.tsx');
const proof = read('src/data/technology-proof.ts');
const allowlist = read('scripts/security-definer-authenticated-allowlist.txt');
const exposureSmoke = read('scripts/security-definer-exposure-smoke.sql');

assert.match(migration, /add column if not exists case_equivalent_units integer/i);
assert.match(migration, /case_equivalent_units is null or case_equivalent_units >= 2/i);
assert.match(migration, /client_idempotency_key text/i);
assert.match(migration, /request_reinvestment_cases\(/i);
assert.match(migration, /minimum reinvestment is 2 cases/i);
assert.match(migration, /production_cost_unit_cents\s*\n\s*\+ v_lot\.label_cost_unit_cents\s*\n\s*\+ v_lot\.transport_cost_unit_cents/i);
assert.match(migration, /v_amount := v_capital_per_case \* p_case_equivalent_units/i);
assert.match(migration, /get_investment_spendable_balance\(auth\.uid\(\)\)/i);
assert.match(migration, /source settlement does not contain an eligible participant credit/i);
assert.match(migration, /_investment_reserved_reinvestment_cases/i);
assert.match(migration, /v_allocated \+ v_reserved \+ v_reinvestment_reserved \+ p_case_equivalent_units/i);
assert.match(migration, /v_allocated \+ v_order_reserved \+ v_reinvestment_reserved \+ p_case_equivalent_units/i);
assert.match(migration, /revoke execute on function public\.request_reinvestment\(uuid,uuid,bigint\) from public, anon, authenticated/i);
assert.match(migration, /participant reinvestment case quantity is immutable/i);
assert.match(migration, /approve_reinvestment_request\(p_request_id uuid\)/i);
assert.doesNotMatch(migration.match(/create or replace function public\.approve_reinvestment_request[\s\S]*?\$\$;/i)?.[0] ?? '', /p_case_equivalent_units/);
assert.match(migration, /cancel_reinvestment_request\(p_request_id uuid\)/i);
assert.match(migration, /reject_reinvestment_request\(p_request_id uuid, p_reason text\)/i);
assert.match(migration, /status = 'CANCELLED'/i);
assert.match(migration, /status = 'REJECTED'/i);
assert.match(migration, /get_participant_reinvestment_context\(\)/i);
assert.match(migration, /participant_user_id = v_user/i);
assert.match(migration, /investment_reinvestment_requests r[\s\S]*r\.status = 'REQUESTED'/i);
assert.match(migration, /unresolved legacy reinvestment reservation/i);
assert.match(migration, /get_public_investment_lot_funding/i);

assert.match(component, /get_participant_reinvestment_context/);
assert.match(component, /request_reinvestment_cases/);
assert.match(component, /cancel_reinvestment_request/);
assert.match(component, /crypto\.randomUUID\(\)/);
assert.match(component, /capitalPerCaseCents/);
assert.match(component, /availableFundableCases/);
assert.doesNotMatch(component, /rpc\('request_reinvestment'/);
assert.match(participantPage, /InvestmentReinvestmentPanel/);
assert.match(participantPage, /<InvestmentReinvestmentPanel onRefresh=\{refreshSummary\}/);

assert.match(proof, /status: 'PARTIAL'[\s\S]*publicStatus: 'BETA'/);
assert.match(proof, /Participant withdrawal and server-priced reinvestment request loop implemented/i);
assert.match(proof, /phase: '15'/);

assert.doesNotMatch(allowlist, /public\.request_reinvestment\(p_source_settlement_id uuid, p_target_lot_id uuid, p_amount_cents bigint\)/);
assert.match(allowlist, /public\.request_reinvestment_cases\(p_source_settlement_id uuid, p_target_lot_id uuid, p_case_equivalent_units integer, p_idempotency_key text\)/);
assert.match(allowlist, /public\.approve_reinvestment_request\(p_request_id uuid\)/);
assert.match(allowlist, /public\.cancel_reinvestment_request\(p_request_id uuid\)/);
assert.match(allowlist, /public\.reject_reinvestment_request\(p_request_id uuid, p_reason text\)/);
assert.match(allowlist, /public\.get_participant_reinvestment_context\(\)/);
assert.match(exposureSmoke, /investment_reinvestment_requests/);

console.log('Investment participant liquidity-loop invariants passed.');
