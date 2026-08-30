import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  shadowMigration: path.join(root, 'supabase/migrations/20260830014000_0080_wallet_shadow_journal_reconciliation.sql'),
  ledgerMigration: path.join(root, 'supabase/migrations/20260830215500_0084_wallet_canonical_cop_ledger_authority.sql'),
  contract: path.join(root, 'src/lib/wallet/shadow-journal.ts'),
  domain: path.join(root, 'src/lib/wallet/domain.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
  smoke: path.join(root, 'scripts/wallet-shadow-journal-smoke.sql'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Wallet ledger ${label} file missing: ${path.relative(root, file)}`);
}

const shadow = fs.readFileSync(files.shadowMigration, 'utf8');
const ledger = fs.readFileSync(files.ledgerMigration, 'utf8');
const contract = fs.readFileSync(files.contract, 'utf8');
const domain = fs.readFileSync(files.domain, 'utf8');
const schema = fs.readFileSync(files.schema, 'utf8');
const smoke = fs.readFileSync(files.smoke, 'utf8');
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
};

// Historical 0080 shadow evidence remains immutable and non-authoritative.
requireFragments(shadow, 'shadow migration', [
  "'COP_SHADOW_OFFSET'",
  'create table public.wallet_shadow_opening_snapshots_v2',
  'create table public.wallet_shadow_capture_failures_v2',
  'create or replace function public._wallet_shadow_initialize_user',
  'create or replace function public._wallet_shadow_capture_balance_delta()',
  'after update of balance_cents on public.wallets',
  "'shadow.opening_balance'",
  "'shadow.balance_delta'",
  "'authoritative', false",
  'create view public.wallet_shadow_reconciliation_v2',
  'create view public.wallet_shadow_reconciliation_health_v2',
  "'legacy_wallets'::text as balance_authority",
  'false as shadow_authoritative',
]);

requireFragments(contract, 'shadow TypeScript contract', [
  'WALLET_SHADOW_JOURNAL_ENABLED = true',
  'WALLET_SHADOW_AUTHORITATIVE = false',
  "WALLET_SHADOW_BALANCE_AUTHORITY = 'legacy_wallets'",
]);

// 0084 is the explicit authority boundary and must fail closed on drift.
requireFragments(ledger, 'canonical ledger cutover', [
  "raise exception 'WALLET_LEDGER_CUTOVER_RECONCILIATION_FAILED'",
  'drop trigger if exists wallet_shadow_capture_balance_delta_v2 on public.wallets',
  'drop trigger if exists wallet_shadow_initialize_available_account_v2 on public.wallet_accounts_v2',
  "'COP_LEDGER_OPENING_OFFSET'",
  "'COP_ECOSYSTEM_CONSUMPTION'",
  'create or replace function public._wallet_ledger_assert_balanced',
  'create or replace function public._wallet_ledger_balance_cents',
  "'ledger.opening_balance'",
  "'authoritative', true",
  "'ctg_ledger_v2'::text as balance_authority",
  'true as journal_posting_enabled',
  'create view public.wallet_ledger_activity_v2',
  "case when p.amount_cents > 0 then 'credit' else 'debit' end",
  'create view public.wallet_ledger_reconciliation_v2',
  'create view public.wallet_ledger_reconciliation_health_v2',
  'create or replace function public.reconcile_wallet_topup_claim(',
  "'ledger.topup'",
  'create or replace function public.consume_wallet_cop_balance_server(',
  "'ledger.consumption'",
  "raise exception 'WALLET_COP_INSUFFICIENT_FUNDS'",
  'grant execute on function public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text)',
  'to service_role',
]);

for (const forbidden of [
  'grant execute on function public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text) to authenticated',
  'grant insert on public.wallet_journal_entries_v2 to authenticated',
  'grant insert on public.wallet_journal_postings_v2 to authenticated',
]) {
  if (ledger.includes(forbidden)) throw new Error(`canonical ledger widened browser financial authority: ${forbidden}`);
}

requireFragments(domain, 'canonical ledger domain', [
  "WALLET_V2_BALANCE_AUTHORITY = 'ctg_ledger_v2'",
  'WALLET_V2_JOURNAL_POSTING_ENABLED = true',
  'journalPosting: true',
  'moneyMovement: false',
]);

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema);
const schemaCount = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schema);
if (!schemaMigration || !schemaCount || Number(schemaMigration[1]) < 84 || Number(schemaCount[1]) < 84) {
  throw new Error('runtime schema contract must include canonical COP ledger migration 0084 or later');
}

requireFragments(smoke, 'shadow PostgreSQL contract', [
  'wallet_shadow_reconciliation_v2',
  'shadow journal failed to mirror positive legacy delta',
  'shadow journal failed to mirror negative legacy delta',
  'shadow drift detector failed to expose capture loss',
]);

console.log('Wallet shadow-to-canonical-ledger invariants: PASS');
