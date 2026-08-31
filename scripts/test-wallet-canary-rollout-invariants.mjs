import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [rollout, authorize, submit, reconcile, workflow] = await Promise.all([
  read('src/lib/wallet/execution-rollout.ts'),
  read('src/app/api/wallet/intents/[intentId]/authorize/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/submit/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/reconcile/route.ts'),
  read('.github/workflows/wallet-chain-reconciliation.yml'),
]);

for (const fragment of [
  'WALLET_CRYPTO_SEND_EXECUTION_MODE',
  'WALLET_CRYPTO_SEND_CANARY_USER_IDS',
  "WalletCryptoSendExecutionMode = 'disabled' | 'canary'",
  "if (!raw || raw === 'disabled') return 'disabled'",
  "if (raw === 'canary') return 'canary'",
  'WALLET_EXECUTION_CONFIG_INVALID',
  'WALLET_EXECUTION_DISABLED',
  'WALLET_EXECUTION_CANARY_NOT_ALLOWED',
  'canaryUserIds.has(userId)',
  'assertWalletCryptoSendExecutionAllowed',
]) {
  assert.ok(rollout.includes(fragment), `Canary rollout helper missing invariant: ${fragment}`);
}

assert.ok(!rollout.includes("'public'"), 'Public crypto-send execution mode must not exist in Canary Readiness.');
assert.ok(!rollout.includes('NEXT_PUBLIC_'), 'Server rollout allowlist must never be browser-public configuration.');

for (const fragment of [
  "searchParams.get('execution')",
  "execution === 'canary'",
  "if (intent.status === 'created' || executionRevalidation)",
  'assertWalletCryptoSendExecutionAllowed(auth.user.id)',
  'WALLET_EXECUTION_QUERY_INVALID',
  'WALLET_EXECUTION_GATE_FAILED',
]) {
  assert.ok(authorize.includes(fragment), `Authorization route missing canary invariant: ${fragment}`);
}

const intentReadIndex = authorize.indexOf(".from('wallet_intents_v2')");
const createdGateConditionIndex = authorize.indexOf("if (intent.status === 'created' || executionRevalidation)");
const gateIndex = authorize.indexOf('assertWalletCryptoSendExecutionAllowed(auth.user.id)', createdGateConditionIndex);
const authorizedBranchIndex = authorize.indexOf("if (intent.status === 'authorized')");
const createdBranchIndex = authorize.indexOf("else if (intent.status === 'created')");

assert.ok(intentReadIndex >= 0, 'Authorization route must load canonical intent state before deciding replay vs new authorization.');
assert.ok(createdGateConditionIndex > intentReadIndex, 'Rollout eligibility must be evaluated from canonical intent state, not client query state alone.');
assert.ok(gateIndex > createdGateConditionIndex, 'Every new created -> authorized transition must call the server rollout gate.');
assert.ok(authorizedBranchIndex > gateIndex, 'Rollout gate must run before authorization/replay branching.');
assert.ok(createdBranchIndex > authorizedBranchIndex, 'Created authorization branch must remain explicit and downstream of the rollout gate.');

for (const recoveryRoute of [submit, reconcile]) {
  assert.ok(
    !recoveryRoute.includes('assertWalletCryptoSendExecutionAllowed'),
    'Submission/reconciliation recovery must remain available after the canary kill-switch is closed.',
  );
  assert.ok(
    !recoveryRoute.includes("@/lib/wallet/execution-rollout"),
    'Recovery routes must not depend on rollout eligibility.',
  );
}

for (const fragment of [
  "'src/app/api/wallet/intents/**/authorize/**'",
  "'src/lib/wallet/execution-rollout.ts'",
  "'scripts/test-wallet-canary-rollout-invariants.mjs'",
  'node scripts/test-wallet-canary-rollout-invariants.mjs',
]) {
  assert.ok(workflow.includes(fragment), `Canary invariant test is not wired into the wallet CI contract: ${fragment}`);
}

console.log('CTG One Wallet non-bypassable canary authorization and recovery invariants: PASS');
