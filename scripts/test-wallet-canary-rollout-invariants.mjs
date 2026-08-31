import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [rollout, authorize, submit, reconcile, preflightProbe, preflightRoute, workflow] = await Promise.all([
  read('src/lib/wallet/execution-rollout.ts'),
  read('src/app/api/wallet/intents/[intentId]/authorize/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/submit/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/reconcile/route.ts'),
  read('src/lib/wallet/canary-preflight.ts'),
  read('src/app/api/wallet/canary/preflight/route.ts'),
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
  'inspectWalletCryptoSendExecutionConfiguration',
  'canaryUserConfigured',
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
  "WALLET_CANARY_PREFLIGHT_VERSION = 'ctg-wallet-canary-preflight-v1'",
  'WALLET_CANARY_POLYGON_CHAIN_ID = 137',
  "polygonRpc('eth_chainId', [])",
  "polygonRpc('eth_blockNumber', [])",
  "polygonRpc('eth_gasPrice', [])",
  "polygonRpc('eth_getBalance', [normalizedAddress, 'latest'])",
  'const BIGINT_ZERO = BigInt(0)',
  'hasNativeGasBalance: nativeBalance > BIGINT_ZERO',
  'WALLET_CANARY_DEFAULT_MIN_CONFIRMATIONS = 12',
]) {
  assert.ok(preflightProbe.includes(fragment), `Canary infrastructure probe missing invariant: ${fragment}`);
}

for (const forbidden of [
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'sendTransaction',
  'signTransaction',
  'signMessage',
  'privateKey',
  'seedPhrase',
]) {
  assert.ok(!preflightProbe.includes(forbidden), `Canary preflight must remain read-only; forbidden fragment: ${forbidden}`);
}

for (const fragment of [
  'createAuthenticatedRequestContext(request)',
  "const ALLOWED_BODY_KEYS = new Set(['version'])",
  'value.version === WALLET_CANARY_PREFLIGHT_VERSION',
  'inspectWalletCryptoSendExecutionConfiguration(auth.user.id)',
  ".from('wallet_external_accounts')",
  ".eq('user_id', auth.user.id)",
  ".eq('provider', 'privy')",
  ".eq('account_kind', 'embedded')",
  ".eq('status', 'verified')",
  ".eq('is_primary', true)",
  ".from('wallet_identity_links')",
  'probeRuntimeSchemaCompatibility()',
  'probePolygonCanaryInfrastructureV1(signerAddress)',
  "'ready_for_canary_execution'",
  "'ACTIVATE_CANARY_MODE_AND_REDEPLOY'",
  "'BUILD_REVIEWED_CANARY_ARTIFACT'",
]) {
  assert.ok(preflightRoute.includes(fragment), `Authenticated canary preflight route missing invariant: ${fragment}`);
}

for (const forbidden of [
  ".insert(",
  ".update(",
  ".delete(",
  '.rpc(',
  'txHash',
  'destinationAddress',
  'amountBaseUnits',
  'sendTransaction',
  'signTransaction',
]) {
  assert.ok(!preflightRoute.includes(forbidden), `Canary preflight route must not mutate or accept transaction authority: ${forbidden}`);
}

for (const fragment of [
  "'src/app/api/wallet/intents/**/authorize/**'",
  "'src/app/api/wallet/canary/preflight/**'",
  "'src/lib/wallet/execution-rollout.ts'",
  "'src/lib/wallet/canary-preflight.ts'",
  "'scripts/test-wallet-canary-rollout-invariants.mjs'",
  'node scripts/test-wallet-canary-rollout-invariants.mjs',
]) {
  assert.ok(workflow.includes(fragment), `Canary invariant test is not wired into the wallet CI contract: ${fragment}`);
}

console.log('CTG One Wallet canary authorization, preflight and recovery invariants: PASS');
