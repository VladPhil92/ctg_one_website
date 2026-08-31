import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260831001000_0088_wallet_intent_submission_v1.sql'),
  route: path.join(root, 'src/app/api/wallet/intents/[intentId]/submit/route.ts'),
  trustedSubmission: path.join(root, 'src/lib/wallet/trusted-submission.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Wallet submission ${label} missing: ${path.relative(root, file)}`);
}

const sources = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

function requireFragments(source, label, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) throw new Error(`${label} missing invariant: ${fragment}`);
  }
}

requireFragments(sources.migration, 'submission migration', [
  'add column if not exists submitted_at timestamptz',
  'wallet_intents_v2_polygon_tx_hash_unique',
  'create or replace function public.submit_wallet_intent_v1_server(',
  "'wallet.intent-submit'",
  "if v_intent.status = 'submitted' then",
  "elsif v_intent.status = 'authorized' then",
  "interval '10 minutes'",
  "set status = 'submitted'",
  'tx_hash = v_tx_hash',
  'submitted_at = v_now',
  "'version', 'ctg-wallet-submission-v1'",
  'revoke all on function public.submit_wallet_intent_v1_server',
  'to service_role',
]);

for (const unsafe of [
  'insert into public.wallet_journal_entries_v2',
  'insert into public.wallet_journal_postings_v2',
  'update public.wallets set balance_cents',
  "set status = 'confirmed_external'",
  "set status = 'reconciled'",
]) {
  if (sources.migration.includes(unsafe)) {
    throw new Error(`Submission migration crossed settlement/ledger boundary: ${unsafe}`);
  }
}

requireFragments(sources.trustedSubmission, 'trusted Polygon submission verification', [
  "import 'server-only'",
  "process.env.POLYGON_RPC_URL",
  "WALLET_SUBMISSION_VERSION = 'ctg-wallet-submission-v1'",
  "rpcCall(rpcUrl, 1, 'eth_chainId', [])",
  "rpcCall(rpcUrl, 2, 'eth_getTransactionByHash', [input.txHash])",
  "throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_TX_NOT_PROPAGATED')",
  "throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_SIGNER_MISMATCH')",
  "throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_CALLDATA_MISMATCH')",
]);
for (const unsafe of ['eth_sendTransaction', 'sendTransaction(', 'getSigner(', 'privateKey']) {
  if (sources.trustedSubmission.includes(unsafe)) {
    throw new Error(`Trusted submission verifier must never sign or broadcast: ${unsafe}`);
  }
}

requireFragments(sources.route, 'submission API route', [
  "process.env.WALLET_INTENT_SUBMISSION_ENABLED !== 'true'",
  "const ALLOWED_BODY_KEYS = new Set(['version', 'txHash'])",
  "verifyTrustedWalletSubmissionV1({",
  "admin.rpc('submit_wallet_intent_v1_server'",
  ".eq('provider', 'privy')",
  ".eq('account_kind', 'embedded')",
  ".eq('status', 'verified')",
  ".eq('is_primary', true)",
  "intent.status === 'submitted'",
  "{ error: 'WALLET_SUBMISSION_REPLAY_CONFLICT' }",
]);
for (const unsafe of [
  'eth_sendTransaction',
  'sendTransaction(',
  'privateKey',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
]) {
  if (sources.route.includes(unsafe)) throw new Error(`Submission route crossed signing/ledger boundary: ${unsafe}`);
}

requireFragments(sources.schema, 'runtime schema contract', [
  "EXPECTED_DATABASE_MIGRATION = '0088'",
  "EXPECTED_DATABASE_MIGRATION_NAME = 'wallet_intent_submission_v1'",
  'EXPECTED_DATABASE_MIGRATION_COUNT = 88',
]);

console.log('Wallet Intent Submission V1 invariants: PASS');
