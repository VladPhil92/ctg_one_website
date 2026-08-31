import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [rollout, authorize, submit, reconcile] = await Promise.all([
  read('src/lib/wallet/execution-rollout.ts'),
  read('src/app/api/wallet/intents/[intentId]/authorize/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/submit/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/reconcile/route.ts'),
]);

for (const fragment of [
  "WALLET_CRYPTO_SEND_EXECUTION_MODE",
  "WALLET_CRYPTO_SEND_CANARY_USER_IDS",
  "WalletCryptoSendExecutionMode = 'disabled' | 'canary'",
  "if (!raw || raw === 'disabled') return 'disabled'",
  "if (raw === 'canary') return 'canary'",
  "WALLET_EXECUTION_CONFIG_INVALID",
  "WALLET_EXECUTION_DISABLED",
  "WALLET_EXECUTION_CANARY_NOT_ALLOWED",
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
  'assertWalletCryptoSendExecutionAllowed(auth.user.id)',
  "WALLET_EXECUTION_QUERY_INVALID",
  "WALLET_EXECUTION_GATE_FAILED",
]) {
  assert.ok(authorize.includes(fragment), `Authorization route missing canary revalidation invariant: ${fragment}`);
}

const gateIndex = authorize.indexOf('assertWalletCryptoSendExecutionAllowed(auth.user.id)');
const intentReadIndex = authorize.indexOf(".from('wallet_intents_v2')");
assert.ok(gateIndex >= 0 && intentReadIndex > gateIndex, 'Execution rollout gate must run before intent state is read for pre-broadcast revalidation.');

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

console.log('CTG One Wallet canary execution rollout invariants: PASS');
