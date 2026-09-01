import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [migration, worker, alerts, schema] = await Promise.all([
  read('supabase/migrations/20260831041000_0090_wallet_lifecycle_correlation_alerts_v1.sql'),
  read('src/app/api/internal/wallet/reconcile-pending/route.ts'),
  read('src/lib/wallet/operational-alerts.ts'),
  read('src/lib/observability/schema-version.ts'),
]);

for (const fragment of [
  'operational_correlation_id uuid not null default gen_random_uuid()',
  'wallet_chain_operational_alerts_v1',
  "'submission_stuck','reconciliation_stuck','confirmation_stuck'",
  "state in ('open','resolved')",
  'enable row level security',
  'revoke all on table public.wallet_chain_operational_alerts_v1 from public, anon, authenticated',
  'grant select, insert, update on table public.wallet_chain_operational_alerts_v1 to service_role',
]) assert.ok(migration.includes(fragment), `0090 missing invariant: ${fragment}`);

for (const forbidden of ['user_id ', 'tx_hash ', 'wallet_address ', 'destination_address ', 'amount_base_units ', 'amount_cents ']) {
  const tableStart = migration.indexOf('create table if not exists public.wallet_chain_operational_alerts_v1');
  const tableEnd = migration.indexOf(');', tableStart);
  assert.ok(!migration.slice(tableStart, tableEnd).includes(forbidden), `Operational alert table leaked sensitive field: ${forbidden}`);
}

for (const fragment of [
  'operational_correlation_id',
  'normalizeOperationalCorrelationId(',
  'upsertWalletOperationalAlertV1(',
  'resolveWalletOperationalAlertsV1(',
  'wallet_correlation_id: correlationId',
  'alertsOpened',
  'alertsResolved',
  'recoverTerminalOperationalAlerts(',
  ".from('wallet_chain_operational_alerts_v1')",
  ".select('intent_id')",
  ".eq('state', 'open')",
  ".select('id,status')",
  'terminalLifecycleStatus(row.status)',
  'wallet.chain.worker.alert_recovery_failed',
  'const terminalStatusCommitted = terminalLifecycleStatus(observedStatus) !== null',
  "const priorStuckAgeSeconds = intent.status === 'confirmed_external'",
  'if (!terminalStatusCommitted && priorStuckAgeSeconds >= stuckAfterSeconds)',
  "stuck_age_anchor: intent.status === 'confirmed_external' ? 'chain_confirmed_at' : 'submitted_at'",
]) assert.ok(worker.includes(fragment), `Worker missing correlation/alert invariant: ${fragment}`);

assert.ok(
  worker.indexOf('recoverTerminalOperationalAlerts(admin, batchSize)') < worker.indexOf('for (const rawIntent of rows)'),
  'Terminal open-alert recovery must run before the normal reconcilable-intent sweep.',
);
assert.ok(
  worker.includes(".in('status', [...WALLET_CHAIN_RECONCILABLE_STATUSES])"),
  'Normal reconciliation candidates must remain restricted to reconcilable lifecycle states.',
);

for (const fragment of [
  "'submission_stuck'",
  "'reconciliation_stuck'",
  "'confirmation_stuck'",
  ".from('wallet_chain_operational_alerts_v1')",
  ".upsert(",
  ".update(",
  ".eq('state', 'open')",
]) assert.ok(alerts.includes(fragment), `Alert service missing invariant: ${fragment}`);

for (const forbidden of ['wallets', 'wallet_journal', 'balance', 'tx_hash', 'destination_address', 'amount_base_units', 'privateKey', 'sendTransaction']) {
  assert.ok(!alerts.includes(forbidden), `Alert service crossed financial/privacy boundary: ${forbidden}`);
}

// 0090 defines the durable alert contract. Global runtime schema metadata may
// advance through additive migrations in other domains without invalidating it.
const schemaMigration = Number(/EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema)?.[1]);
const schemaCount = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schema)?.[1]);
assert.ok(
  Number.isInteger(schemaMigration) && schemaMigration >= 90
    && Number.isInteger(schemaCount) && schemaCount >= 90,
  'Runtime schema metadata must include Wallet lifecycle correlation migration 0090 or a compatible additive successor.',
);

console.log('Wallet lifecycle correlation + durable stuck-state alert invariants: PASS');
