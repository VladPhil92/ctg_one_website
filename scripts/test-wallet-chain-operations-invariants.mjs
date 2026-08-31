import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  service: path.join(root, 'src/lib/wallet/chain-reconciliation-service.ts'),
  worker: path.join(root, 'src/app/api/internal/wallet/reconcile-pending/route.ts'),
  userRoute: path.join(root, 'src/app/api/wallet/intents/[intentId]/reconcile/route.ts'),
  scheduler: path.join(root, '.github/workflows/wallet-chain-reconciliation-worker.yml'),
  render: path.join(root, 'render.yaml'),
  runbook: path.join(root, 'docs/wallet/CHAIN_RECONCILIATION_OPERATIONS.md'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Wallet chain operations ${label} file missing: ${path.relative(root, file)}`);
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

const requireFragments = (text, label, fragments) => {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
};

requireFragments(source.service, 'Shared chain reconciliation service', [
  "import 'server-only'",
  "'submitted'",
  "'pending_external'",
  "'confirmed_external'",
  "'reconciled'",
  "'failed'",
  'inspectPolygonWalletIntentV1({',
  "admin.rpc('record_wallet_chain_reconciliation_v1_server'",
  'p_evidence_digest_sha256: observation.evidenceDigestSha256',
  'p_confirmations: observation.confirmations',
  'WALLET_CHAIN_RECONCILIATION_RESPONSE_INVALID',
]);

for (const unsafe of [
  'getSigner(',
  'sendTransaction(',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'privateKey',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
  'update public.wallets',
]) {
  if (source.service.includes(unsafe)) {
    throw new Error(`Shared reconciliation service crossed a prohibited authority boundary: ${unsafe}`);
  }
}

requireFragments(source.worker, 'Chain reconciliation worker route', [
  "const WORKER_VERSION = 'ctg-wallet-chain-worker-v1'",
  'WALLET_CHAIN_RECONCILIATION_WORKER_SECRET',
  'timingSafeEqual(expectedBytes, suppliedBytes)',
  'expected.length < 32',
  'const DEFAULT_BATCH_SIZE = 10',
  'const MAX_BATCH_SIZE = 25',
  'const DEFAULT_STUCK_AFTER_SECONDS = 15 * 60',
  ".in('status', [...WALLET_CHAIN_RECONCILABLE_STATUSES])",
  ".not('tx_hash', 'is', null)",
  '.limit(batchSize)',
  'normalizeWalletChainIntentSnapshot(rawIntent)',
  'reconcileWalletChainIntentV1(admin, intent)',
  "logger.warn('wallet.chain.worker.stuck_intent'",
  "logger.info('wallet.chain.worker.completed'",
  "createHash('sha256').update(intentId)",
  "{ error: 'WALLET_CHAIN_WORKER_NOT_CONFIGURED' }",
]);

for (const unsafe of [
  'createAuthenticatedRequestContext',
  'applyWalletCors',
  'walletCorsPreflight',
  'export function OPTIONS',
  'getSigner(',
  'sendTransaction(',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'privateKey',
]) {
  if (source.worker.includes(unsafe)) {
    throw new Error(`Internal worker must remain scheduler-only and observation-only: ${unsafe}`);
  }
}

requireFragments(source.userRoute, 'Authenticated reconciliation route', [
  'normalizeWalletChainIntentSnapshot(rawIntent)',
  'reconcileWalletChainIntentV1(admin, intent)',
  'WALLET_CHAIN_INTENT_SELECT',
  'createAuthenticatedRequestContext(request)',
  'walletCorsPreflight(request, CORS_METHODS)',
]);

for (const duplicatedAuthority of [
  'inspectPolygonWalletIntentV1({',
  "admin.rpc('record_wallet_chain_reconciliation_v1_server'",
]) {
  if (source.userRoute.includes(duplicatedAuthority)) {
    throw new Error(`Authenticated reconciliation route must delegate canonical chain authority to the shared service: ${duplicatedAuthority}`);
  }
}

requireFragments(source.scheduler, 'Scheduled reconciliation invocation', [
  "cron: '*/10 * * * *'",
  'https://ctgone.com/api/internal/wallet/reconcile-pending',
  'secrets.WALLET_CHAIN_RECONCILIATION_WORKER_SECRET',
  'if [ -z "${WORKER_SECRET}" ]',
  'echo "enabled=false" >> "$GITHUB_OUTPUT"',
  "steps.gate.outputs.enabled == 'true'",
  'X-CTG-Wallet-Worker-Secret: ${WORKER_SECRET}',
  "--data '{\"version\":\"ctg-wallet-chain-worker-v1\"}'",
  '.counts.stuck',
]);

for (const unsafeScheduler of [
  'intentId',
  'txHash',
  'confirmations',
  'evidenceDigestSha256',
]) {
  if (source.scheduler.includes(unsafeScheduler)) {
    throw new Error(`Scheduler must not choose transaction evidence or a specific intent: ${unsafeScheduler}`);
  }
}

requireFragments(source.render, 'Render worker credential declaration', [
  '- key: WALLET_CHAIN_RECONCILIATION_WORKER_SECRET',
  'sync: false',
]);

requireFragments(source.runbook, 'Chain operations runbook', [
  'migration 0088',
  'VITE_CANONICAL_WALLET_BROADCAST_ENABLED` remains `false`',
  'Remove or rotate the GitHub Actions worker secret',
  'do not rewrite transaction hashes',
]);

console.log('Wallet Chain Reconciliation Operations V1 invariants: PASS');
