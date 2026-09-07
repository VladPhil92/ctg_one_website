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
  if (!fs.existsSync(file)) throw new Error(`wallet authenticated read-model ${label} missing: ${path.relative(root, file)}`);
}

const sources = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]));
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
};

requireFragments(sources.route, 'wallet overview route', [
  'export async function GET(request: Request)',
  'export function OPTIONS(request: Request)',
  'createAuthenticatedRequestContext(request)',
  'walletCorsPreflight(request, CORS_METHODS)',
  'applyWalletCors(request',
  "headers.set('Cache-Control', 'no-store')",
  ".from('profiles')",
  ".from('wallet_balance_compatibility_v2')",
  ".from('wallet_identity_links')",
  ".from('wallet_external_accounts')",
  ".from('transactions')",
  ".from('wallet_intents_v2')",
  ".from('wallet_ledger_activity_v2')",
  ".eq('user_id', userId)",
  'ledgerActivity: (ledgerActivityResult.data ?? [])',
  'buildWalletOverviewV2({',
  "identityResult.data?.status === 'verified'",
  'readPolygonPortfolio(primaryVerifiedEvmAccount?.address ?? null)',
  'buildWalletCopTopUpCapability(overview.user.kycStatus)',
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
  ".from('wallet_ledger_activity_v2')",
]) {
  if (sources.route.indexOf(table) <= authIndex) throw new Error(`wallet overview must authenticate before querying ${table}`);
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
  if (sources.route.includes(forbidden)) throw new Error(`wallet overview route must remain read-only/minimal: ${forbidden}`);
}

requireFragments(sources.serverAuth, 'wallet bearer authentication', [
  'export async function createAuthenticatedRequestContext(',
  "request.headers.get('authorization')",
  '/^Bearer\\s+([^\\s]+)$/i',
  'const validatedBearerToken = bearer.token;',
  'supabase.auth.getUser(validatedBearerToken)',
  'headers: { Authorization: `Bearer ${validatedBearerToken}` }',
  'getAuthenticatorAssuranceLevel: () =>',
  "transport: 'bearer'",
  "transport: 'cookie'",
]);
for (const forbiddenTokenProperty of ['verifiedBearerToken:', 'accessToken:', 'access_token:', 'bearerToken:', 'refreshToken:']) {
  if (sources.serverAuth.includes(forbiddenTokenProperty)) {
    throw new Error(`wallet bearer authentication must not expose raw credentials on request context: ${forbiddenTokenProperty}`);
  }
}

requireFragments(sources.cors, 'wallet CORS policy', [
  "'https://localhost'",
  "'capacitor://localhost'",
  'process.env.CTG_WALLET_ALLOWED_ORIGINS',
  "headers.set('Access-Control-Allow-Origin', origin)",
  "headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Privy-ID-Token')",
  "return new Response(null, { status: 403",
]);
if (sources.cors.includes("Access-Control-Allow-Origin', '*'") || sources.cors.includes('Access-Control-Allow-Credentials')) {
  throw new Error('wallet CORS policy must remain explicit and credential-free');
}

requireFragments(sources.copTopUp, 'COP top-up capability', [
  "export type WalletCopTopUpRail = 'bank_transfer' | 'bre_b_qr'",
  "currency: 'COP'",
  "submissionMode: 'ctg_one_web'",
  "path: '/dashboard/depositos'",
  'requiresKyc: true',
  "kycStatus !== 'verified' || rails.length === 0",
]);

requireFragments(sources.readModel, 'wallet read-model builder', [
  'export class WalletReadModelError',
  'export type WalletOverviewLedgerActivityRow',
  'export function buildWalletOverviewV2',
  "'WALLET_OWNER_MISMATCH'",
  'balance.balance_authority !== WALLET_V2_BALANCE_AUTHORITY',
  'balance.journal_posting_enabled !== WALLET_V2_JOURNAL_POSTING_ENABLED',
  "source: 'legacy_transaction'",
  "source: 'wallet_intent'",
  "source: 'ledger_entry'",
  'requireLedgerDirection(entry.direction)',
  "transaction.type === 'deposit' && transaction.status === 'approved'",
  'activity.slice(0, MAX_ACTIVITY_ITEMS)',
  'journalPosting: true',
  'moneyMovement: false',
  'blockchainBalances: false',
  'investmentPositions: false',
]);

requireFragments(sources.domain, 'wallet overview domain contract', [
  "WALLET_V2_BALANCE_AUTHORITY = 'ctg_ledger_v2'",
  'WALLET_V2_JOURNAL_POSTING_ENABLED = true',
  "WalletOverviewActivitySource = 'legacy_transaction' | 'wallet_intent' | 'ledger_entry'",
  "WalletOverviewActivityDirection = 'credit' | 'debit' | null",
  'direction: WalletOverviewActivityDirection',
  'journalPosting: true',
  'moneyMovement: false',
]);

requireFragments(sources.polygonPortfolio, 'Polygon portfolio read service', [
  "import 'server-only'",
  'POLYGON_CHAIN_ID = 137',
  "POLYGON_NETWORK = 'polygon'",
  'process.env.POLYGON_RPC_URL',
  'client.getBalance({ address })',
  "authority: 'blockchain'",
]);
for (const forbidden of ['sendTransaction', 'writeContract', 'privateKeyToAccount', 'walletClient']) {
  if (sources.polygonPortfolio.includes(forbidden)) throw new Error(`Polygon portfolio service must remain read-only: ${forbidden}`);
}

const schemaMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(sources.schema);
if (!schemaMatch || Number(schemaMatch[1]) < 84) {
  throw new Error('wallet overview requires canonical COP ledger migration 0084 or later');
}

console.log('Authenticated wallet read-model invariants: PASS');
