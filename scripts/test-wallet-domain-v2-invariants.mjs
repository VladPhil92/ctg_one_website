import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260830003500_0078_wallet_domain_v2_foundation.sql'),
  intentCreationMigration: path.join(root, 'supabase/migrations/20260830223000_0084_wallet_intent_creation_v1.sql'),
  intentRoute: path.join(root, 'src/app/api/wallet/intents/route.ts'),
  domain: path.join(root, 'src/lib/wallet/domain.ts'),
  readModel: path.join(root, 'src/lib/wallet/read-model.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Wallet Domain V2 ${label} file missing: ${path.relative(root, file)}`);
  }
}

const migration = fs.readFileSync(files.migration, 'utf8');
const intentCreationMigration = fs.readFileSync(files.intentCreationMigration, 'utf8');
const intentRoute = fs.readFileSync(files.intentRoute, 'utf8');
const domain = fs.readFileSync(files.domain, 'utf8');
const readModel = fs.readFileSync(files.readModel, 'utf8');
const schema = fs.readFileSync(files.schema, 'utf8');

const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
};

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
  'reference_normalized text generated always as (lower(trim(reference_value))) stored',
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

const forbidden = [
  'grant insert on public.wallet_accounts_v2 to authenticated',
  'grant update on public.wallet_accounts_v2 to authenticated',
  'grant delete on public.wallet_accounts_v2 to authenticated',
  'grant insert on public.wallet_intents_v2 to authenticated',
  'grant update on public.wallet_intents_v2 to authenticated',
  'grant delete on public.wallet_intents_v2 to authenticated',
  'grant insert on public.wallet_journal_entries_v2 to authenticated',
  'grant insert on public.wallet_journal_postings_v2 to authenticated',
  'grant insert on public.wallet_transaction_references_v2 to authenticated',
  'grant insert on public.wallet_accounts_v2 to service_role',
  'grant update on public.wallet_accounts_v2 to service_role',
  'grant insert on public.wallet_intents_v2 to service_role',
  'grant update on public.wallet_intents_v2 to service_role',
  'grant insert on public.wallet_journal_entries_v2 to service_role',
  'grant insert on public.wallet_journal_postings_v2 to service_role',
  'grant insert on public.wallet_transaction_references_v2 to service_role',
  'post_wallet_journal_entry',
  'balance_cents =',
  'update public.wallets',
];

for (const fragment of forbidden) {
  if (migration.includes(fragment)) {
    throw new Error(`Wallet Domain V2 foundation must remain fail-closed: ${fragment}`);
  }
}

requireFragments(domain, 'Wallet Domain V2 types', [
  "WALLET_V2_BALANCE_AUTHORITY = 'legacy_wallets'",
  'WALLET_V2_JOURNAL_POSTING_ENABLED = false',
  'export type WalletInternalAccountKind',
  'export interface WalletInternalAccount',
  'export type WalletIntentStatus',
  "| 'pending_external'",
  "| 'confirmed_external'",
  "| 'replaced'",
  'destinationAddress: string | null',
  'amountBaseUnits: string | null',
  'export interface WalletIntent',
  'export type WalletJournalEntryStatus',
  'export interface WalletJournalEntry',
  'export interface WalletJournalPosting',
  'export type WalletTransactionReferenceAuthority',
  'export interface WalletTransactionReference',
  'export interface WalletBalanceCompatibilityV2',
  'export function normalizeWalletReference',
]);

requireFragments(intentCreationMigration, 'Wallet Intent V1 creation migration', [
  'add column if not exists amount_base_units text',
  'add column if not exists destination_address text',
  "'pending_external'",
  "'confirmed_external'",
  "'replaced'",
  'create or replace function public.create_wallet_intent_v1_server(',
  "'crypto_send'",
  "'polygon'",
  "now() + interval '15 minutes'",
  'on conflict on constraint wallet_intents_v2_user_idempotency_unique do nothing',
  'WALLET_INTENT_IDEMPOTENCY_CONFLICT',
  "'replayed', v_replayed",
  "'version', 'ctg-wallet-intent-v1'",
  'revoke insert, update, delete on public.wallet_intents_v2',
  'from public, anon, authenticated, service_role',
  "when 'wallet.intent-create' then",
]);

for (const unsafe of [
  'grant execute on function public.create_wallet_intent_v1_server(uuid, text, bigint, text, text, text)\n  to authenticated',
  'grant insert on public.wallet_intents_v2 to authenticated',
  'grant update on public.wallet_intents_v2 to authenticated',
  'update public.wallets set balance_cents',
  'insert into public.wallet_journal_entries_v2',
  'insert into public.wallet_journal_postings_v2',
]) {
  if (intentCreationMigration.includes(unsafe)) {
    throw new Error(`Wallet Intent V1 creation must not cross the money-movement boundary: ${unsafe}`);
  }
}

requireFragments(intentRoute, 'Wallet Intent V1 route', [
  "const CORS_METHODS = ['POST', 'OPTIONS'] as const",
  "const INTENT_VERSION = 'ctg-wallet-intent-v1' as const",
  "value.kind !== 'crypto_send'",
  "value.rail !== 'polygon'",
  "value.chainId !== POLYGON_CHAIN_ID",
  "consumeAuthenticatedRateLimit(auth.supabase, 'wallet.intent-create')",
  "admin.rpc('create_wallet_intent_v1_server'",
  'p_user_id: auth.user.id',
  'status: data.replayed ? 200 : 201',
]);

for (const unsafe of [
  "status: 'authorized'",
  "status: 'submitted'",
  'eth_sendTransaction',
  'sendTransaction(',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
]) {
  if (intentRoute.includes(unsafe)) {
    throw new Error(`Wallet Intent V1 route must remain creation-only: ${unsafe}`);
  }
}

requireFragments(readModel, 'Wallet intent read model', [
  'asset_symbol: string | null',
  'amount_base_units: string | null',
  'currency: requireIntentDisplayUnit(intent)',
  'reference: intent.tx_hash ?? intent.external_reference',
]);

// Wallet Domain V2 is a historical foundation invariant, not a requirement that
// migration 0078 remain the repository tip forever. Future migrations must be
// able to advance the runtime schema while never regressing below this boundary.
const currentSchemaMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema);
const currentSchemaCountMatch = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schema);
if (
  !currentSchemaMatch
  || !currentSchemaCountMatch
  || Number(currentSchemaMatch[1]) < 84
  || Number(currentSchemaCountMatch[1]) < 84
) {
  throw new Error('runtime schema contract must include Wallet Intent V1 migration 0084');
}

console.log('Wallet Domain V2 + Intent V1 invariants: PASS');
