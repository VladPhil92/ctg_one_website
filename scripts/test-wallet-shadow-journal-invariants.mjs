import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260830014000_0080_wallet_shadow_journal_reconciliation.sql'),
  contract: path.join(root, 'src/lib/wallet/shadow-journal.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
  smoke: path.join(root, 'scripts/wallet-shadow-journal-smoke.sql'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Wallet shadow journal ${label} file missing: ${path.relative(root, file)}`);
  }
}

const migration = fs.readFileSync(files.migration, 'utf8');
const contract = fs.readFileSync(files.contract, 'utf8');
const schema = fs.readFileSync(files.schema, 'utf8');
const smoke = fs.readFileSync(files.smoke, 'utf8');

const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
};

requireFragments(migration, 'shadow migration', [
  "'COP_SHADOW_OFFSET'",
  'create table public.wallet_shadow_opening_snapshots_v2',
  'create table public.wallet_shadow_capture_failures_v2',
  'create or replace function public._wallet_shadow_initialize_user',
  'lock table public.wallets in share row exclusive mode',
  'create or replace function public._wallet_shadow_capture_balance_delta()',
  'after update of balance_cents on public.wallets',
  "'shadow.opening_balance'",
  "'shadow.balance_delta'",
  "'shadow', true",
  "'authoritative', false",
  'exception when others then',
  'wallet_shadow_capture_failures_v2',
  'return new;',
  'create view public.wallet_shadow_reconciliation_v2',
  'create view public.wallet_shadow_reconciliation_health_v2',
  "'legacy_wallets'::text as balance_authority",
  'false as shadow_authoritative',
]);

for (const fragment of [
  'update public.wallets',
  'insert into public.wallets',
  'delete from public.wallets',
  'grant insert on public.wallet_journal_entries_v2 to service_role',
  'grant insert on public.wallet_journal_postings_v2 to service_role',
  'grant update on public.wallet_journal_entries_v2 to service_role',
  'grant update on public.wallet_journal_postings_v2 to service_role',
  'grant insert on public.wallet_journal_entries_v2 to authenticated',
  'grant insert on public.wallet_journal_postings_v2 to authenticated',
  'post_wallet_journal_entry',
]) {
  if (migration.includes(fragment)) {
    throw new Error(`shadow journal must not widen authoritative money movement: ${fragment}`);
  }
}

for (const fn of [
  '_wallet_shadow_initialize_user(uuid)',
  '_wallet_shadow_assert_balanced(uuid)',
  '_wallet_shadow_capture_balance_delta()',
  '_wallet_shadow_after_available_account_insert()',
]) {
  requireFragments(migration, `${fn} execution boundary`, [
    `revoke all on function public.${fn}`,
  ]);
}

requireFragments(contract, 'shadow TypeScript contract', [
  'WALLET_SHADOW_JOURNAL_ENABLED = true',
  'WALLET_SHADOW_AUTHORITATIVE = false',
  "WALLET_SHADOW_BALANCE_AUTHORITY = 'legacy_wallets'",
  'export interface WalletShadowReconciliationV2',
  'export interface WalletShadowReconciliationHealthV2',
]);

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema);
const schemaCount = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schema);
if (!schemaMigration || !schemaCount || Number(schemaMigration[1]) < 80 || Number(schemaCount[1]) < 80) {
  throw new Error('runtime schema contract must include Wallet Shadow Journal migration 0080 or later');
}

requireFragments(smoke, 'shadow PostgreSQL contract', [
  'wallet_shadow_reconciliation_v2',
  'wallet_shadow_capture_failures_v2',
  'shadow journal failed to mirror positive legacy delta',
  'shadow journal failed to mirror negative legacy delta',
  'legacy balance update was blocked by shadow capture failure',
  'shadow drift detector failed to expose capture loss',
]);

console.log('Wallet shadow journal invariants: PASS');
