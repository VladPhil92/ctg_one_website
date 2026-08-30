import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260830003500_0078_wallet_domain_v2_foundation.sql'),
  domain: path.join(root, 'src/lib/wallet/domain.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Wallet Domain V2 ${label} file missing: ${path.relative(root, file)}`);
}

const migration = fs.readFileSync(files.migration, 'utf8');
const domain = fs.readFileSync(files.domain, 'utf8');
const schema = fs.readFileSync(files.schema, 'utf8');
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
};

// Migration 0078 is immutable historical evidence of the fail-closed foundation.
requireFragments(migration, 'Wallet Domain V2 migration', [
  'create table public.wallet_accounts_v2',
  "'user_available'",
  "'system_clearing'",
  'create table public.wallet_intents_v2',
  'idempotency_key_normalized text generated always as (lower(trim(idempotency_key))) stored',
  'create table public.wallet_journal_entries_v2',
  'create table public.wallet_journal_postings_v2',
  'amount_cents bigint not null check (amount_cents <> 0)',
  'create table public.wallet_transaction_references_v2',
  'create view public.wallet_balance_compatibility_v2',
  "w.balance_cents as available_balance_cents",
  "'legacy_wallets'::text as balance_authority",
  'false as journal_posting_enabled',
  'create or replace function public.handle_new_user()',
  "values (new.id, 'COP_AVAILABLE', 'user_available', 'COP')",
]);

for (const table of [
  'wallet_accounts_v2',
  'wallet_intents_v2',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
  'wallet_transaction_references_v2',
]) {
  requireFragments(migration, `${table} security boundary`, [
    `alter table public.${table} enable row level security`,
    `revoke all on public.${table} from public, anon, authenticated, service_role`,
  ]);
}

for (const fragment of [
  'grant insert on public.wallet_accounts_v2 to authenticated',
  'grant update on public.wallet_accounts_v2 to authenticated',
  'grant insert on public.wallet_journal_entries_v2 to authenticated',
  'grant insert on public.wallet_journal_postings_v2 to authenticated',
  'post_wallet_journal_entry',
  'update public.wallets',
]) {
  if (migration.includes(fragment)) throw new Error(`Wallet Domain V2 foundation must remain fail-closed: ${fragment}`);
}

// Current domain may advance beyond 0078, but must retain the structural types.
requireFragments(domain, 'Wallet Domain V2 types', [
  'export type WalletInternalAccountKind',
  'export interface WalletInternalAccount',
  'export type WalletIntentStatus',
  'export interface WalletIntent',
  'export type WalletJournalEntryStatus',
  'export interface WalletJournalEntry',
  'export interface WalletJournalPosting',
  'export type WalletTransactionReferenceAuthority',
  'export interface WalletTransactionReference',
  'export interface WalletBalanceCompatibilityV2',
  'export function normalizeWalletReference',
]);

const currentSchemaMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema);
const currentSchemaCountMatch = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schema);
if (!currentSchemaMatch || !currentSchemaCountMatch || Number(currentSchemaMatch[1]) < 78 || Number(currentSchemaCountMatch[1]) < 78) {
  throw new Error('runtime schema contract must never regress below Wallet Domain V2 migration 0078');
}

console.log('Wallet Domain V2 invariants: PASS');
