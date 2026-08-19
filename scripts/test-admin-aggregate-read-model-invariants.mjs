import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [migration, adminPage, operationsPage, schemaVersion] = await Promise.all([
  read('supabase/migrations/0059_admin_aggregate_read_models.sql'),
  read('src/app/admin/page.tsx'),
  read('src/app/admin/operations/overview/page.tsx'),
  read('src/lib/observability/schema-version.ts'),
]);

assert.match(migration, /create or replace function public\.get_admin_command_snapshot\(\)/i);
assert.match(migration, /if not public\.is_admin\(\)/i, 'Global Admin OS aggregate must re-check the database admin boundary.');
assert.match(migration, /operational_wallet_balance_cents[\s\S]*sum\(balance_cents\)/i, 'Wallet totals must be aggregated inside PostgreSQL.');
assert.match(migration, /status = 'PENDING_BANK_VERIFICATION'/, 'Admin attention must follow the current human bank-verification state.');
assert.doesNotMatch(migration, /status = 'PAYMENT_SUBMITTED'/, 'Legacy PAYMENT_SUBMITTED must not drive the current admin attention model.');

assert.match(migration, /create or replace function public\.get_operations_dashboard_snapshot\(p_lot_limit integer default 12\)/i);
assert.match(migration, /has_investment_permission\('ops\.read'\)/, 'Operations snapshot must require ops.read.');
assert.match(migration, /p_lot_limit > 50/, 'Operations lot performance must enforce a hard upper bound.');
assert.match(migration, /limit p_lot_limit/i, 'Recent lot performance must be bounded in PostgreSQL.');
assert.match(migration, /count\(\*\) filter \(where status = 'SOLD'\)/i, 'Sold-unit totals must be computed in PostgreSQL.');
assert.match(migration, /REVENUE_REVERSAL/, 'Net revenue must retain credit-note reversal semantics.');

assert.match(adminPage, /rpc\('get_admin_command_snapshot'\)/, 'Admin OS must consume the aggregate snapshot RPC.');
assert.doesNotMatch(adminPage, /from\('wallets'\)/, 'Admin OS must never download all wallet rows to sum balances.');
assert.doesNotMatch(adminPage, /from\('profiles'\)/, 'Admin overview counts must remain inside the aggregate read model.');

assert.match(operationsPage, /rpc\('get_operations_dashboard_snapshot'/, 'Production Command View must consume the bounded aggregate snapshot.');
assert.doesNotMatch(operationsPage, /from\('investment_bottle_units'\)/, 'Production Command View must not download the global bottle collection.');
assert.doesNotMatch(operationsPage, /from\('investment_lot_financial_entries'\)/, 'Production Command View must not download the global financial fact collection.');
assert.doesNotMatch(operationsPage, /from\('investment_production_lots'\)/, 'Production Command View must not download every lot for aggregation.');

const schemaMatch = schemaVersion.match(/EXPECTED_DATABASE_MIGRATION\s*=\s*'(\d{4})'/);
const countMatch = schemaVersion.match(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/);
assert.ok(schemaMatch && Number(schemaMatch[1]) >= 59, 'Runtime schema must remain at or beyond aggregate read models 0059.');
assert.ok(countMatch && Number(countMatch[1]) >= 59, 'Runtime migration count must remain at or beyond aggregate read models 0059.');

console.log('Admin aggregate read-model invariants: PASS');
