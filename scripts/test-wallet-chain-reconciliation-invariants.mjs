import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260830235000_0088_wallet_chain_reconciliation_v1.sql'),
  submitRoute: path.join(root, 'src/app/api/wallet/intents/[intentId]/submit/route.ts'),
  reconcileRoute: path.join(root, 'src/app/api/wallet/intents/[intentId]/reconcile/route.ts'),
  reconcileService: path.join(root, 'src/lib/wallet/chain-reconciliation-service.ts'),
  adapter: path.join(root, 'src/lib/wallet/chain-reconciliation.ts'),
  trustedSimulation: path.join(root, 'src/lib/wallet/trusted-simulation.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
  smoke: path.join(root, 'scripts/wallet-chain-reconciliation-schema-smoke.sql'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Wallet chain ${label} file missing: ${path.relative(root, file)}`);
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);
const requireFragments = (text, label, fragments) => {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
};

requireFragments(source.migration, 'Wallet chain migration', [
  'add column if not exists submitted_at timestamptz',
  'add column if not exists chain_last_checked_at timestamptz',
  'add column if not exists chain_observed_at timestamptz',
  'add column if not exists chain_confirmed_at timestamptz',
  'add column if not exists chain_reconciliation_digest_sha256 text',
  'create unique index if not exists wallet_intents_v2_chain_tx_hash_unique',
  'create or replace function public.register_wallet_chain_submission_v1_server(',
  "'wallet.intent-submit'",
  'v_rate_row.request_count >= 20',
  "set status = 'submitted'",
  "'blockchain'",
  "'tx_hash'",
  'WALLET_CHAIN_TX_HASH_ALREADY_BOUND',
  'create or replace function public.record_wallet_chain_reconciliation_v1_server(',
  "'wallet.intent-reconcile'",
  'v_rate_row.request_count >= 30',
  "v_status not in ('pending_external','confirmed_external','reconciled','failed')",
  'WALLET_CHAIN_RECONCILED_TERMINAL',
  'WALLET_CHAIN_FAILED_TERMINAL',
  "'chainReconciliationVersion', 'ctg-wallet-chain-reconciliation-v1'",
  'revoke insert, update, delete on public.wallet_intents_v2',
  'revoke insert, update, delete on public.wallet_transaction_references_v2',
]);

for (const unsafe of [
  'to authenticated;\ngrant execute on function public.register_wallet_chain_submission_v1_server',
  'to authenticated;\ngrant execute on function public.record_wallet_chain_reconciliation_v1_server',
  'insert into public.wallet_journal_entries_v2',
  'insert into public.wallet_journal_postings_v2',
  'update public.wallets set balance_cents',
  'eth_sendTransaction',
  'privateKey',
]) {
  if (source.migration.includes(unsafe)) {
    throw new Error(`Wallet chain migration crossed a prohibited boundary: ${unsafe}`);
  }
}

requireFragments(source.adapter, 'Trusted Polygon reconciliation adapter', [
  "import 'server-only'",
  "WALLET_CHAIN_SUBMISSION_VERSION = 'ctg-wallet-chain-submission-v1'",
  "WALLET_CHAIN_RECONCILIATION_VERSION = 'ctg-wallet-chain-reconciliation-v1'",
  'WALLET_CHAIN_DEFAULT_MIN_CONFIRMATIONS = 12',
  'process.env.POLYGON_RPC_URL',
  'process.env.WALLET_POLYGON_MIN_CONFIRMATIONS',
  "rpcCall(rpcUrl, 1, 'eth_chainId', [])",
  "'eth_getTransactionByHash'",
  "'eth_getTransactionReceipt'",
  "'eth_blockNumber'",
  'transaction.from !== input.authorizedWalletAddress',
  "ERC20_TRANSFER.decodeFunctionData('transfer', transaction.input)",
  "failureCode: 'WALLET_CHAIN_TRANSACTION_BINDING_MISMATCH'",
  "failureCode: 'WALLET_CHAIN_RECEIPT_REVERTED'",
  "confirmations >= minConfirmations ? 'reconciled' : 'confirmed_external'",
  "createHash('sha256')",
]);

for (const unsafe of [
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'sendTransaction(',
  'signTransaction(',
  'getSigner(',
  'privateKey',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
]) {
  if (source.adapter.includes(unsafe)) {
    throw new Error(`Chain reconciliation adapter must remain observation-only: ${unsafe}`);
  }
}

for (const address of [
  '0xe4200d6bed0db8e720cbb840c572182676515132',
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
]) {
  if (!source.adapter.includes(address) || !source.trustedSimulation.includes(address)) {
    throw new Error(`Trusted simulation/reconciliation token registry drifted: ${address}`);
  }
}

requireFragments(source.submitRoute, 'Chain submission route', [
  "const ALLOWED_BODY_KEYS = new Set(['version', 'txHash'])",
  'WALLET_CHAIN_SUBMISSION_VERSION',
  "admin.rpc('register_wallet_chain_submission_v1_server'",
  'p_user_id: auth.user.id',
  'p_intent_id: intentId',
  'p_tx_hash: parsed.txHash',
  "message.includes('WALLET_CHAIN_TX_HASH_ALREADY_BOUND')",
]);

for (const unsafe of [
  'simulationDigestSha256',
  'chainConfirmations',
  'eth_getTransactionReceipt',
  'eth_sendTransaction',
  "status: 'reconciled'",
]) {
  if (source.submitRoute.includes(unsafe)) {
    throw new Error(`Submission route must only register an unconfirmed tx hash: ${unsafe}`);
  }
}

// Reconciliation authority may be reused by the authenticated route and an
// internal worker, but it must live in exactly one server-only service.
requireFragments(source.reconcileService, 'Canonical chain reconciliation service', [
  "import 'server-only'",
  'authorized_wallet_address',
  'inspectPolygonWalletIntentV1({',
  'txHash: intent.tx_hash',
  'authorizedWalletAddress: intent.authorized_wallet_address',
  "admin.rpc('record_wallet_chain_reconciliation_v1_server'",
  'p_evidence_digest_sha256: observation.evidenceDigestSha256',
  'p_chain_observed: observation.chainObserved',
  'p_confirmations: observation.confirmations',
  'p_failure_code: observation.failureCode',
  "'reconciled'",
  "'failed'",
]);

for (const unsafe of [
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'sendTransaction(',
  'signTransaction(',
  'getSigner(',
  'privateKey',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
]) {
  if (source.reconcileService.includes(unsafe)) {
    throw new Error(`Canonical reconciliation service must remain observation-only: ${unsafe}`);
  }
}

requireFragments(source.reconcileRoute, 'Chain reconciliation route', [
  "const ALLOWED_BODY_KEYS = new Set(['version'])",
  ".from('wallet_intents_v2')",
  'WALLET_CHAIN_INTENT_SELECT',
  'normalizeWalletChainIntentSnapshot(rawIntent)',
  'reconcileWalletChainIntentV1(admin, intent)',
  'createAuthenticatedRequestContext(request)',
  'persistenceError',
]);

for (const duplicatedAuthority of [
  'inspectPolygonWalletIntentV1({',
  "admin.rpc('record_wallet_chain_reconciliation_v1_server'",
  'p_evidence_digest_sha256:',
  'p_confirmations:',
]) {
  if (source.reconcileRoute.includes(duplicatedAuthority)) {
    throw new Error(`Reconciliation route must delegate trusted chain authority to the shared service: ${duplicatedAuthority}`);
  }
}

for (const unsafe of [
  "new Set(['version', 'evidenceDigestSha256'])",
  'parsed.evidenceDigestSha256',
  'body.txHash',
  'body.confirmations',
  'eth_sendTransaction',
  'sendTransaction(',
]) {
  if (source.reconcileRoute.includes(unsafe)) {
    throw new Error(`Reconciliation route must derive evidence from trusted server reads: ${unsafe}`);
  }
}

requireFragments(source.smoke, 'Chain PostgreSQL smoke', [
  'register_wallet_chain_submission_v1_server',
  'record_wallet_chain_reconciliation_v1_server',
  'WALLET_CHAIN_TX_HASH_ALREADY_BOUND',
  "'pending_external'",
  "'confirmed_external'",
  "'reconciled'",
  "'failed'",
  'WALLET_CHAIN_RECONCILED_TERMINAL',
  'chain submission/reconciliation mutated the COP journal',
]);

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema)?.[1];
const schemaName = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(source.schema)?.[1];
const schemaCount = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source.schema)?.[1]);
if (schemaMigration !== '0088' || schemaName !== 'wallet_chain_reconciliation_v1' || schemaCount !== 88) {
  throw new Error('Runtime schema metadata must be pinned exactly to Wallet Chain Reconciliation V1 migration 0088.');
}

console.log('Wallet Chain Submission/Reconciliation V1 invariants: PASS');
