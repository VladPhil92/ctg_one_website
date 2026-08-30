import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260830003500_0078_wallet_domain_v2_foundation.sql'),
  intentCreationMigration: path.join(root, 'supabase/migrations/20260830223000_0084_wallet_intent_creation_v1.sql'),
  intentAuthorizationMigration: path.join(root, 'supabase/migrations/20260830230000_0085_wallet_intent_authorization_v1.sql'),
  intentRoute: path.join(root, 'src/app/api/wallet/intents/route.ts'),
  intentAuthorizationRoute: path.join(root, 'src/app/api/wallet/intents/[intentId]/authorize/route.ts'),
  trustedSimulation: path.join(root, 'src/lib/wallet/trusted-simulation.ts'),
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
const intentAuthorizationMigration = fs.readFileSync(files.intentAuthorizationMigration, 'utf8');
const intentRoute = fs.readFileSync(files.intentRoute, 'utf8');
const intentAuthorizationRoute = fs.readFileSync(files.intentAuthorizationRoute, 'utf8');
const trustedSimulation = fs.readFileSync(files.trustedSimulation, 'utf8');
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
  "'wallet.intent-create'",
  "interval '5 minutes'",
  'v_rate_row.request_count >= 20',
  'for update;',
  'WALLET_INTENT_RATE_LIMITED',
]);

for (const unsafe of [
  'grant execute on function public.create_wallet_intent_v1_server(uuid, text, bigint, text, text, text)\n  to authenticated',
  'grant insert on public.wallet_intents_v2 to authenticated',
  'grant update on public.wallet_intents_v2 to authenticated',
  'update public.wallets set balance_cents',
  'insert into public.wallet_journal_entries_v2',
  'insert into public.wallet_journal_postings_v2',
  'create or replace function public.consume_api_rate_limit',
]) {
  if (intentCreationMigration.includes(unsafe)) {
    throw new Error(`Wallet Intent V1 creation must not cross the money-movement or authenticated-definer boundary: ${unsafe}`);
  }
}

requireFragments(intentAuthorizationMigration, 'Wallet Intent V1 authorization migration', [
  'add column if not exists authorized_at timestamptz',
  'add column if not exists authorized_wallet_address text',
  'add column if not exists simulation_digest_sha256 text',
  'create or replace function public.authorize_wallet_intent_v1_server(',
  'p_expected_wallet_address text',
  'p_expected_chain_id bigint',
  'p_expected_asset_symbol text',
  'p_expected_amount_base_units text',
  'p_expected_destination_address text',
  "'wallet.intent-authorize'",
  "interval '5 minutes'",
  'v_rate_row.request_count >= 20',
  "if v_intent.status = 'authorized' then",
  "elsif v_intent.status = 'created' then",
  'WALLET_AUTH_SIMULATION_BINDING_CONFLICT',
  'WALLET_AUTH_SIGNER_BINDING_CONFLICT',
  "a.provider = 'privy'",
  "a.chain_family = 'evm'",
  "a.account_kind = 'embedded'",
  "a.status = 'verified'",
  'a.is_primary is true',
  "l.status = 'verified'",
  "set status = 'authorized'",
  'authorized_wallet_address = v_expected_wallet',
  'simulation_digest_sha256 = v_digest',
  "'version', 'ctg-wallet-authorization-v1'",
  'WALLET_AUTH_REPLAY_CONFLICT',
  'WALLET_AUTH_INTENT_EXPIRED',
  'revoke all on function public.authorize_wallet_intent_v1_server(uuid, uuid, text, text, bigint, text, text, text)',
  'to service_role',
]);

for (const unsafe of [
  'grant execute on function public.authorize_wallet_intent_v1_server(uuid, uuid, text, text, bigint, text, text, text)\n  to authenticated',
  'insert into public.wallet_journal_entries_v2',
  'insert into public.wallet_journal_postings_v2',
  'insert into public.wallet_transaction_references_v2',
  'update public.wallets set balance_cents',
  "set status = 'submitted'",
  'tx_hash =',
  'external_reference =',
  'create or replace function public.consume_api_rate_limit',
]) {
  if (intentAuthorizationMigration.includes(unsafe)) {
    throw new Error(`Wallet authorization must stop before signing/broadcast/money movement: ${unsafe}`);
  }
}

requireFragments(intentRoute, 'Wallet Intent V1 route', [
  "const CORS_METHODS = ['POST', 'OPTIONS'] as const",
  "const INTENT_VERSION = 'ctg-wallet-intent-v1' as const",
  "value.kind !== 'crypto_send'",
  "value.rail !== 'polygon'",
  "value.chainId !== POLYGON_CHAIN_ID",
  "admin.rpc('create_wallet_intent_v1_server'",
  'p_user_id: auth.user.id',
  "message.includes('WALLET_INTENT_RATE_LIMITED')",
  'status: data.replayed ? 200 : 201',
]);

for (const unsafe of [
  "status: 'authorized'",
  "status: 'submitted'",
  'eth_sendTransaction',
  'sendTransaction(',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
  'consumeAuthenticatedRateLimit(',
]) {
  if (intentRoute.includes(unsafe)) {
    throw new Error(`Wallet Intent V1 route must remain creation-only and use the server-only rate boundary: ${unsafe}`);
  }
}

requireFragments(trustedSimulation, 'Wallet trusted simulation boundary', [
  "import 'server-only'",
  "process.env.POLYGON_RPC_URL",
  "WALLET_TRUSTED_SIMULATION_VERSION = 'ctg-wallet-trusted-simulation-v1'",
  "rpcCall(rpcUrl, 1, 'eth_chainId', [])",
  "rpcCall(rpcUrl, 2, 'eth_call'",
  "rpcCall(rpcUrl, 3, 'eth_estimateGas'",
  "rpcCall(rpcUrl, 4, 'eth_getBalance'",
  "rpcCall(rpcUrl, 5, 'eth_blockNumber'",
  "rpcCall(rpcUrl, 6, 'eth_gasPrice'",
  "createHash('sha256')",
  "throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_CHAIN_MISMATCH')",
  "throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_NATIVE_BALANCE_INSUFFICIENT')",
]);

for (const unsafe of [
  "'eth_sendTransaction'",
  'sendTransaction(',
  'getSigner(',
  'privateKey',
]) {
  if (trustedSimulation.includes(unsafe)) {
    throw new Error(`Trusted simulation must remain read-only: ${unsafe}`);
  }
}

requireFragments(intentAuthorizationRoute, 'Wallet Intent V1 authorization route', [
  "const AUTHORIZATION_VERSION = 'ctg-wallet-authorization-v1' as const",
  "const ALLOWED_BODY_KEYS = new Set(['version'])",
  "simulateTrustedWalletIntentV1({",
  "intent.status === 'authorized'",
  "intent.status === 'created'",
  'simulationDigestSha256 = trustedSimulation.simulationDigestSha256',
  "admin.rpc('authorize_wallet_intent_v1_server'",
  'p_user_id: auth.user.id',
  'p_intent_id: intent.id',
  'p_simulation_digest_sha256: simulationDigestSha256',
  'p_expected_wallet_address: expectedWalletAddress',
  'p_expected_chain_id: intent.chain_id',
  'p_expected_asset_symbol: intent.asset_symbol',
  'p_expected_amount_base_units: intent.amount_base_units',
  'p_expected_destination_address: intent.destination_address',
  "message.includes('WALLET_AUTH_RATE_LIMITED')",
  "message.includes('WALLET_AUTH_SIGNER_UNAVAILABLE')",
]);

for (const unsafe of [
  "new Set(['version', 'simulationDigestSha256'])",
  'parsed.simulationDigestSha256',
  'sendTransaction(',
  'eth_sendTransaction',
  'eth_signTransaction',
  'personal_sign',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
  'txHash:',
]) {
  if (intentAuthorizationRoute.includes(unsafe)) {
    throw new Error(`Wallet authorization route must remain trusted-simulation and signing/broadcast-free: ${unsafe}`);
  }
}

requireFragments(readModel, 'Wallet intent read model', [
  'asset_symbol: string | null',
  'amount_base_units: string | null',
  'currency: requireIntentDisplayUnit(intent)',
  'reference: intent.tx_hash ?? intent.external_reference',
]);

const currentSchemaMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema);
const currentSchemaCountMatch = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schema);
if (
  !currentSchemaMatch
  || !currentSchemaCountMatch
  || Number(currentSchemaMatch[1]) < 85
  || Number(currentSchemaCountMatch[1]) < 85
) {
  throw new Error('runtime schema contract must include Wallet Intent Authorization V1 migration 0085');
}

console.log('Wallet Domain V2 + trusted Intent Creation/Authorization V1 invariants: PASS');
