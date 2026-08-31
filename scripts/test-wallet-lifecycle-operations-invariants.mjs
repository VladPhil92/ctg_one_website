import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  service: path.join(root, 'src/lib/wallet/lifecycle-operations.ts'),
  health: path.join(root, 'src/app/api/internal/wallet/operations-health/route.ts'),
  reconciliationWorker: path.join(root, 'src/app/api/internal/wallet/reconcile-pending/route.ts'),
  scheduler: path.join(root, '.github/workflows/wallet-lifecycle-operations-worker.yml'),
  migration0090: path.join(root, 'supabase/migrations/20260831041000_0090_wallet_lifecycle_correlation_alerts_v1.sql'),
  runbook: path.join(root, 'docs/wallet/LIFECYCLE_OPERATIONS.md'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Wallet lifecycle operations ${label} file missing: ${path.relative(root, file)}`);
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

const requireFragments = (text, label, fragments) => {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
};

requireFragments(source.service, 'Lifecycle operations service', [
  "import 'server-only'",
  "WALLET_LIFECYCLE_OPERATIONS_VERSION = 'ctg-wallet-lifecycle-operations-v1'",
  "createHash('sha256').update(normalized).digest('hex').slice(0, 16)",
  "'WALLET_AUTHORIZED_WITHOUT_SUBMISSION'",
  "'WALLET_SUBMISSION_NOT_OBSERVED'",
  "'WALLET_PENDING_EXTERNAL_STUCK'",
  "'WALLET_CONFIRMED_EXTERNAL_NOT_RECONCILED'",
  "'WALLET_TERMINAL_CHAIN_FAILURE'",
  'normalizeDurableWalletAlert(value: unknown)',
  'normalizeRecentFailedWalletIntent(',
]);

for (const prohibitedAuthority of [
  'getSigner(',
  'sendTransaction(',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'privateKey',
  "admin.rpc('",
  '.insert(',
  '.delete(',
]) {
  if (source.service.includes(prohibitedAuthority)) {
    throw new Error(`Lifecycle operations service crossed read-only boundary: ${prohibitedAuthority}`);
  }
}

for (const sensitiveSelect of [
  "'user_id'",
  "'destination_address'",
  "'amount_base_units'",
  "'tx_hash'",
  "'authorized_wallet_address'",
  "'simulation_digest_sha256'",
  "'chain_reconciliation_digest_sha256'",
]) {
  if (source.service.includes(sensitiveSelect)) {
    throw new Error(`Lifecycle operations read model must not select sensitive field: ${sensitiveSelect}`);
  }
}

requireFragments(source.health, 'Protected operations health route', [
  'WALLET_CHAIN_RECONCILIATION_WORKER_SECRET',
  'timingSafeEqual(expectedBytes, suppliedBytes)',
  'expected.length < 32',
  'const MAX_AUTHORIZED_SAMPLE = 50',
  'const MAX_DURABLE_ALERT_SAMPLE = 100',
  'const MAX_FAILED_SAMPLE = 25',
  'const DEFAULT_AUTHORIZED_STUCK_AFTER_SECONDS = 10 * 60',
  ".eq('status', 'authorized')",
  ".from('wallet_chain_operational_alerts_v1')",
  ".eq('state', 'open')",
  "intent_fingerprint: item.intentFingerprint",
  "wallet_correlation_id: item.serverCorrelationId",
  "logger.error('wallet.operations.lifecycle_alert'",
  "logger.warn('wallet.operations.lifecycle_alert'",
  "logger.info('wallet.operations.completed'",
  'bounded: true',
]);

for (const unsafeHealth of [
  'createAuthenticatedRequestContext',
  'applyWalletCors',
  'walletCorsPreflight',
  'export function OPTIONS',
  'getSigner(',
  'sendTransaction(',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'privateKey',
  "admin.rpc('",
  '.update(',
  '.insert(',
  '.delete(',
]) {
  if (source.health.includes(unsafeHealth)) {
    throw new Error(`Operations health route must remain protected and read-only: ${unsafeHealth}`);
  }
}

requireFragments(source.reconciliationWorker, 'Reconciliation worker cross-runtime correlation', [
  "import { walletIntentFingerprint } from '@/lib/wallet/lifecycle-operations'",
  'const intentFingerprint = walletIntentFingerprint(intent.id)',
  'intent_fingerprint: intentFingerprint',
  'wallet_correlation_id: correlationId',
]);

requireFragments(source.scheduler, 'Lifecycle operations scheduler', [
  "cron: '5-55/10 * * * *'",
  'https://ctgone.com/api/internal/wallet/operations-health',
  'secrets.WALLET_CHAIN_RECONCILIATION_WORKER_SECRET',
  'X-CTG-Wallet-Worker-Secret: ${WORKER_SECRET}',
  '.version == "ctg-wallet-lifecycle-operations-v1"',
  '.sample.bounded == true',
  "severity == 'critical'",
  'exit 2',
  'never rebroadcast',
]);

for (const unsafeScheduler of [
  'intentId',
  'txHash',
  'destinationAddress',
  'amountBaseUnits',
  'canonicalUserId',
]) {
  if (source.scheduler.includes(unsafeScheduler)) {
    throw new Error(`Lifecycle scheduler must remain aggregate-only: ${unsafeScheduler}`);
  }
}

requireFragments(source.migration0090, 'Durable alert schema', [
  'operational_correlation_id uuid not null default gen_random_uuid()',
  'create table if not exists public.wallet_chain_operational_alerts_v1',
  "state text not null default 'open'",
  'revoke all on table public.wallet_chain_operational_alerts_v1 from public, anon, authenticated',
]);

requireFragments(source.runbook, 'Lifecycle operations runbook', [
  'SHA-256',
  '16 hexadecimal characters',
  'authorized',
  'durable alerts',
  'registration-only recovery',
  'never rebroadcast',
  'VITE_CANONICAL_WALLET_BROADCAST_ENABLED=false',
]);

console.log('Wallet Canonical Correlation & Stuck-State Operations V1 invariants: PASS');
