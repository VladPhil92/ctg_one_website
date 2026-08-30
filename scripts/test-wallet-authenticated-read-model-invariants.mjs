import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  route: path.join(root, 'src/app/api/wallet/overview/route.ts'),
  readModel: path.join(root, 'src/lib/wallet/read-model.ts'),
  domain: path.join(root, 'src/lib/wallet/domain.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`wallet authenticated read-model ${label} missing: ${path.relative(root, file)}`);
  }
}

const route = fs.readFileSync(files.route, 'utf8');
const readModel = fs.readFileSync(files.readModel, 'utf8');
const domain = fs.readFileSync(files.domain, 'utf8');
const schema = fs.readFileSync(files.schema, 'utf8');

const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
};

requireFragments(route, 'wallet overview route', [
  'export async function GET()',
  'const supabase = await createClient()',
  'supabase.auth.getUser()',
  "headers.set('Cache-Control', 'no-store')",
  "headers.set('X-Content-Type-Options', 'nosniff')",
  "headers.set('Referrer-Policy', 'no-referrer')",
  ".from('profiles')",
  ".from('wallet_balance_compatibility_v2')",
  ".from('wallet_identity_links')",
  ".from('wallet_external_accounts')",
  ".from('transactions')",
  ".from('wallet_intents_v2')",
  ".eq('user_id', userId)",
  'buildWalletOverviewV2({',
  "{ error: 'UNAUTHENTICATED' }",
  "{ error: 'WALLET_ACCOUNT_INCOMPLETE' }",
  "{ error: 'WALLET_READ_CONTRACT_VIOLATION' }",
]);

const authIndex = route.indexOf('supabase.auth.getUser()');
for (const table of [
  ".from('profiles')",
  ".from('wallet_balance_compatibility_v2')",
  ".from('wallet_identity_links')",
  ".from('wallet_external_accounts')",
  ".from('transactions')",
  ".from('wallet_intents_v2')",
]) {
  if (route.indexOf(table) <= authIndex) {
    throw new Error(`wallet overview must authenticate before querying ${table}`);
  }
}

for (const forbidden of [
  'createAdminClient',
  'SUPABASE_SERVICE_ROLE_KEY',
  '.insert(',
  '.update(',
  '.upsert(',
  '.delete(',
  '.rpc(',
  'proof_storage_path',
  'admin_notes',
  'idempotency_key',
  'metadata',
  'provider_user_id',
]) {
  if (route.includes(forbidden)) {
    throw new Error(`wallet overview route must remain read-only/minimal: ${forbidden}`);
  }
}

requireFragments(readModel, 'wallet read-model builder', [
  'export class WalletReadModelError',
  'export function buildWalletOverviewV2',
  "'WALLET_OWNER_MISMATCH'",
  'Number.isSafeInteger(parsed)',
  'balance.balance_authority !== WALLET_V2_BALANCE_AUTHORITY',
  'balance.journal_posting_enabled !== WALLET_V2_JOURNAL_POSTING_ENABLED',
  "source: 'legacy_transaction'",
  "source: 'wallet_intent'",
  'activity.slice(0, MAX_ACTIVITY_ITEMS)',
  'journalPosting: false',
  'moneyMovement: false',
  'blockchainBalances: false',
  'investmentPositions: false',
]);

requireFragments(domain, 'wallet overview domain contract', [
  "WALLET_OVERVIEW_VERSION = 'ctg-wallet-overview-v2'",
  'export type WalletKycStatus',
  'export interface WalletOverviewBalance',
  'export interface WalletOverviewIdentity',
  'export interface WalletOverviewExternalAccount',
  'export interface WalletOverviewActivityItem',
  'export interface WalletOverviewCapabilities',
  'export interface WalletOverviewV2',
  'journalPosting: false',
  'moneyMovement: false',
  'blockchainBalances: false',
  'investmentPositions: false',
]);

const schemaMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema);
if (!schemaMatch || Number(schemaMatch[1]) < 78) {
  throw new Error('wallet overview requires Wallet Domain V2 migration 0078 or later');
}

console.log('Authenticated wallet read-model invariants: PASS');
