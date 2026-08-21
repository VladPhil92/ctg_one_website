import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/0066_finance_reinvestment_queue.sql');
const component = read('src/components/inversion/FinanceReinvestmentQueue.tsx');
const page = read('src/app/admin/finance/reinvestment/page.tsx');
const nav = read('src/components/admin/AdminNav.tsx');
const allowlist = read('scripts/security-definer-authenticated-allowlist.txt');
const schema = read('src/lib/observability/schema-version.ts');
const proof = read('src/data/technology-proof.ts');

assert.match(migration, /get_finance_reinvestment_queue_snapshot/);
assert.match(migration, /if not public\.is_investment_admin\(\) then raise exception 'not authorized'/i);
assert.match(migration, /least\(greatest\(coalesce\(p_active_limit, 50\), 1\), 100\)/i);
assert.match(migration, /r\.status = 'REQUESTED'/i);
assert.match(migration, /participantSpendableBalanceCents/);
assert.match(migration, /legacyCaseIntentMissing/);
assert.match(migration, /revoke execute on function public\.get_finance_reinvestment_queue_snapshot\(integer,integer\) from anon/i);
assert.match(migration, /grant execute on function public\.get_finance_reinvestment_queue_snapshot\(integer,integer\) to authenticated/i);
assert.doesNotMatch(migration, /update public\.investment_reinvestment_requests/i);
assert.doesNotMatch(migration, /insert into public\.investment_ledger_entries/i);

assert.match(component, /get_finance_reinvestment_queue_snapshot/);
assert.match(component, /approve_reinvestment_request/);
assert.match(component, /reject_reinvestment_request/);
assert.doesNotMatch(component, /approve_reinvestment\'/);
assert.match(component, /legacyCaseIntentMissing/);
assert.match(component, /participantKycStatus !== 'VERIFIED'/);
assert.match(component, /targetLotStatus !== 'FUNDING_OPEN'/);
assert.match(page, /FinanceReinvestmentQueue/);
assert.match(nav, /\/admin\/finance\/reinvestment/);
assert.match(nav, /Reinvestment Rail/);
assert.match(nav, /SUPER_ADMIN','FINANCE_ADMIN/);
assert.match(allowlist, /public\.get_finance_reinvestment_queue_snapshot\(p_active_limit integer, p_history_limit integer\)/);

// Phase 16 owns migration 0066 but must not assume it remains the repository tip.
const migrationCount = Number(schema.match(/EXPECTED_DATABASE_MIGRATION_COUNT = (\d+)/)?.[1] ?? 0);
assert.ok(migrationCount >= 66, 'current schema cannot predate Phase 16 migration 0066');
assert.match(proof, /publicStatus: 'BETA'/);
assert.match(proof, /Finance reinvestment queue exposes bounded review evidence/i);
assert.match(proof, /phase: '16'/);
assert.match(proof, /Finance reinvestment queue/i);

console.log('Finance reinvestment queue invariants passed.');
