import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  route: path.join(root, 'src/app/api/wallet/overview/route.ts'),
  serverAuth: path.join(root, 'src/lib/supabase/server.ts'),
  cors: path.join(root, 'src/lib/wallet/cors.ts'),
  readModel: path.join(root, 'src/lib/wallet/read-model.ts'),
  domain: path.join(root, 'src/lib/wallet/domain.ts'),
  copTopUp: path.join(root, 'src/lib/wallet/cop-topup-capability.ts'),
  polygonPortfolio: path.join(root, 'src/lib/wallet/polygon-portfolio.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`wallet authenticated read-model ${label} missing: ${path.relative(root, file)}`);
  }
}

const sources = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
};

requireFragments(sources.route, 'wallet overview route', [
  'export async function GET(request: Request)',
  'export function OPTIONS(request: Request)',
  'createAuthenticatedRequestContext(request)',
  'walletCorsPreflight(request, CORS_METHODS)',
  'applyWalletCors(request',
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
  "identityResult.data?.status === 'verified'",
  "account.chain_family === 'evm'",
  "account.status === 'verified'",
  'account.is_primary === true',
  'readPolygonPortfolio(primaryVerifiedEvmAccount?.address ?? null)',
  "blockchain.status === 'available' || blockchain.status === 'degraded'",
  'buildWalletCopTopUpCapability(overview.user.kycStatus)',
  'copTopUp: copTopUp.action',
  'copTopUp: copTopUp.enabled',
  "{ error: 'UNAUTHENTICATED' }",
  "{ error: 'WALLET_ACCOUNT_INCOMPLETE' }",
  "{ error: 'WALLET_READ_CONTRACT_VIOLATION' }",
]);

const authIndex = sources.route.indexOf('createAuthenticatedRequestContext(request)');
for (const table of [
  ".from('profiles')",
  ".from('wallet_balance_compatibility_v2')",
  ".from('wallet_identity_links')",
  ".from('wallet_external_accounts')",
  ".from('transactions')",
  ".from('wallet_intents_v2')",
]) {
  if (sources.route.indexOf(table) <= authIndex) {
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
  'BANK_TRANSFER_INSTRUCTIONS',
  'BRE_B_INSTRUCTIONS',
]) {
  if (sources.route.includes(forbidden)) {
    throw new Error(`wallet overview route must remain read-only/minimal: ${forbidden}`);
  }
}

requireFragments(sources.serverAuth, 'wallet bearer authentication', [
  'export async function createAuthenticatedRequestContext(',
  "request.headers.get('authorization')",
  '/^Bearer\\s+([^\\s]+)$/i',
  'supabase.auth.getUser(bearer.token)',
  "headers: { Authorization: `Bearer ${bearer.token}` }",
  "transport: 'bearer'",
  "transport: 'cookie'",
]);

const bearerStart = sources.serverAuth.indexOf('export async function createAuthenticatedRequestContext(');
const adminStart = sources.serverAuth.indexOf('export function createAdminClient()');
const bearerSection = sources.serverAuth.slice(bearerStart, adminStart);
if (bearerSection.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error('wallet bearer authentication must never use the service-role key');
}
if (!bearerSection.includes('if (bearer.present)') || !bearerSection.includes('if (!bearer.token) return null')) {
  throw new Error('an invalid Authorization header must fail closed instead of falling back to cookies');
}

requireFragments(sources.cors, 'wallet CORS policy', [
  "'https://localhost'",
  "'capacitor://localhost'",
  'process.env.CTG_WALLET_ALLOWED_ORIGINS',
  "headers.set('Access-Control-Allow-Origin', origin)",
  "headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Privy-ID-Token')",
  "return new Response(null, { status: 403",
]);
for (const forbidden of [
  "Access-Control-Allow-Origin', '*'",
  'Access-Control-Allow-Credentials',
]) {
  if (sources.cors.includes(forbidden)) {
    throw new Error(`wallet CORS policy must not broaden cross-origin trust: ${forbidden}`);
  }
}

requireFragments(sources.copTopUp, 'COP top-up capability', [
  "export type WalletCopTopUpRail = 'bank_transfer' | 'bre_b_qr'",
  "currency: 'COP'",
  "submissionMode: 'ctg_one_web'",
  "path: '/dashboard/depositos'",
  'requiresKyc: true',
  'BANK_TRANSFER_CONFIGURED',
  'BRE_B_CONFIGURED',
  "kycStatus !== 'verified' || rails.length === 0",
  'return { enabled: false }',
]);

for (const forbidden of [
  'BANK_TRANSFER_INSTRUCTIONS',
  'BRE_B_INSTRUCTIONS',
  'accountNumber',
  'accountHolder',
  'nit:',
  'proof_storage_path',
  'SUPABASE_SERVICE_ROLE_KEY',
]) {
  if (sources.copTopUp.includes(forbidden)) {
    throw new Error(`COP top-up capability leaked payment or server detail: ${forbidden}`);
  }
}

requireFragments(sources.readModel, 'wallet read-model builder', [
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

requireFragments(sources.domain, 'wallet overview domain contract', [
  "WALLET_OVERVIEW_VERSION = 'ctg-wallet-overview-v2'",
  'export type WalletKycStatus',
  'export interface WalletOverviewBalance',
  'export interface WalletOverviewIdentity',
  'export interface WalletOverviewExternalAccount',
  'export interface WalletOverviewBlockchainPosition',
  'export interface WalletOverviewBlockchainPortfolio',
  'export interface WalletOverviewActivityItem',
  'export interface WalletOverviewCapabilities',
  'export interface WalletOverviewV2',
  'journalPosting: false',
  'moneyMovement: false',
]);

requireFragments(sources.polygonPortfolio, 'Polygon portfolio read service', [
  "import 'server-only'",
  'POLYGON_CHAIN_ID = 137',
  "POLYGON_NETWORK = 'polygon'",
  'process.env.POLYGON_RPC_URL',
  'client.getBalance({ address })',
  "authority: 'blockchain'",
  "return unavailable(address, 'RPC_READ_FAILED')",
]);
for (const forbidden of ['sendTransaction', 'writeContract', 'privateKeyToAccount', 'walletClient']) {
  if (sources.polygonPortfolio.includes(forbidden)) {
    throw new Error(`Polygon portfolio service must remain read-only: ${forbidden}`);
  }
}

const schemaMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(sources.schema);
if (!schemaMatch || Number(schemaMatch[1]) < 83) {
  throw new Error('wallet overview requires Wallet Domain V2 migration 0083 or later');
}

console.log('Authenticated wallet read-model invariants: PASS');
