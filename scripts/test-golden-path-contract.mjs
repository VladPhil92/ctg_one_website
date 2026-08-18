import fs from 'node:fs';
import path from 'node:path';

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const sql = migrationFiles
  .map((name) => fs.readFileSync(path.join(migrationDir, name), 'utf8'))
  .join('\n\n')
  .toLowerCase();

const requiredFunctions = [
  'create_investment_order',
  'submit_investment_order_payment',
  'approve_investment_order',
  'transition_lot_status',
  'generate_bottle_units',
  'update_bottle_units_status',
  'record_bottle_sale_document',
  'finalize_settlement',
  'request_withdrawal',
  'request_reinvestment',
];

for (const fn of requiredFunctions) {
  if (!sql.includes(fn.toLowerCase())) {
    throw new Error(`Golden Path contract missing authoritative function: ${fn}`);
  }
}

const requiredTables = [
  'investment_orders',
  'investment_funding_allocations',
  'investment_production_lots',
  'investment_bottle_units',
  'investment_sales',
  'investment_lot_financial_entries',
  'investment_settlements',
  'investment_ledger_entries',
  'investment_withdrawal_requests',
  'investment_reinvestment_requests',
  'investment_audit_log',
];

for (const table of requiredTables) {
  if (!sql.includes(table.toLowerCase())) {
    throw new Error(`Golden Path contract missing authoritative table: ${table}`);
  }
}

const requiredSafetySignals = [
  'client_idempotency_key',
  'pg_advisory_xact_lock',
  'funding_received',
  'capital_committed',
  'settlement_credit',
  'withdrawal_debit',
  'reinvestment_debit',
  'security definer',
  'auth.uid()',
];

for (const signal of requiredSafetySignals) {
  if (!sql.includes(signal.toLowerCase())) {
    throw new Error(`Golden Path safety invariant missing: ${signal}`);
  }
}

// The authoritative order command must remain idempotent and must include the
// full capital perimeter introduced by transport economics.
const orderMigration = fs.readFileSync(
  path.join(migrationDir, '0048_investment_order_idempotency.sql'),
  'utf8',
).toLowerCase();

for (const signal of [
  'p_idempotency_key text',
  'participant_user_id, client_idempotency_key',
  'production_cost_unit_cents',
  'label_cost_unit_cents',
  'transport_cost_unit_cents',
]) {
  if (!orderMigration.includes(signal)) {
    throw new Error(`Order command contract drifted: ${signal}`);
  }
}

// Settlement must remain unique per lot and the participant ledger must stay
// append-only by design. These textual checks intentionally fail if future
// migrations silently remove the database-level guarantees.
if (!sql.includes('investment_settlements_one_per_lot')) {
  throw new Error('Settlement uniqueness invariant is missing.');
}
if (!sql.includes('append-only')) {
  throw new Error('Ledger/audit append-only invariant is no longer documented in migrations.');
}

console.log('Golden Path contract invariants passed.');
