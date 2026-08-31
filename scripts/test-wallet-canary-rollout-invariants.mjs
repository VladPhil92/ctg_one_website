import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  rollout,
  authorize,
  submit,
  reconcile,
  preflightProbe,
  preflightRoute,
  migration0091,
  workflow,
] = await Promise.all([
  read('src/lib/wallet/execution-rollout.ts'),
  read('src/app/api/wallet/intents/[intentId]/authorize/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/submit/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/reconcile/route.ts'),
  read('src/lib/wallet/canary-preflight.ts'),
  read('src/app/api/wallet/canary/preflight/route.ts'),
  read('supabase/migrations/20260831050000_0091_wallet_canary_execution_guardrails_v1.sql'),
  read('.github/workflows/wallet-chain-reconciliation.yml'),
]);

for (const fragment of [
  'WALLET_CRYPTO_SEND_EXECUTION_MODE',
  'WALLET_CRYPTO_SEND_CANARY_USER_IDS',
  'WALLET_CRYPTO_SEND_CANARY_ASSET_SYMBOL',
  'WALLET_CRYPTO_SEND_CANARY_MAX_AMOUNT_BASE_UNITS',
  'WALLET_CRYPTO_SEND_CANARY_DESTINATION_ADDRESS',
  "WalletCryptoSendExecutionMode = 'disabled' | 'canary'",
  "if (!raw || raw === 'disabled') return 'disabled'",
  "if (raw === 'canary') return 'canary'",
  'WALLET_EXECUTION_CONFIG_INVALID',
  'WALLET_EXECUTION_DISABLED',
  'WALLET_EXECUTION_CANARY_NOT_ALLOWED',
  'WALLET_EXECUTION_CANARY_GUARDRAILS_NOT_CONFIGURED',
  'WALLET_EXECUTION_CANARY_ASSET_NOT_ALLOWED',
  'WALLET_EXECUTION_CANARY_AMOUNT_EXCEEDED',
  'WALLET_EXECUTION_CANARY_DESTINATION_NOT_ALLOWED',
  'canaryUserIds.has(userId)',
  'canaryGuardrailsConfigured',
  'inspectWalletCryptoSendExecutionConfiguration',
  'assertWalletCryptoSendExecutionAllowed',
  'assertWalletCryptoSendCanaryIntentAllowed',
  'BigInt(amountBaseUnits) > BigInt(guardrails.maxAmountBaseUnits)',
]) {
  assert.ok(rollout.includes(fragment), `Canary rollout helper missing invariant: ${fragment}`);
}

assert.ok(!rollout.includes("'public'"), 'Public crypto-send execution mode must not exist in Canary Readiness.');
assert.ok(!rollout.includes('NEXT_PUBLIC_'), 'Server rollout allowlist/guardrails must never be browser-public configuration.');

for (const fragment of [
  "searchParams.get('execution')",
  "execution === 'canary'",
  "if (intent.status === 'created' || executionRevalidation)",
  'assertWalletCryptoSendExecutionAllowed(auth.user.id)',
  'assertWalletCryptoSendCanaryIntentAllowed({',
  'assetSymbol: intent.asset_symbol',
  'amountBaseUnits: intent.amount_base_units',
  'destinationAddress: intent.destination_address',
  "admin.rpc('authorize_wallet_intent_v2_server'",
  'WALLET_AUTH_CANARY_SINGLE_FLIGHT_CONFLICT',
  'WALLET_EXECUTION_QUERY_INVALID',
  'WALLET_EXECUTION_GATE_FAILED',
]) {
  assert.ok(authorize.includes(fragment), `Authorization route missing canary invariant: ${fragment}`);
}

const intentReadIndex = authorize.indexOf(".from('wallet_intents_v2')");
const createdGateConditionIndex = authorize.indexOf("if (intent.status === 'created' || executionRevalidation)");
const gateIndex = authorize.indexOf('assertWalletCryptoSendExecutionAllowed(auth.user.id)', createdGateConditionIndex);
const guardIndex = authorize.indexOf('assertWalletCryptoSendCanaryIntentAllowed({', gateIndex);
const authorizedBranchIndex = authorize.indexOf("if (intent.status === 'authorized')");
const createdBranchIndex = authorize.indexOf("else if (intent.status === 'created')");

assert.ok(intentReadIndex >= 0, 'Authorization route must load canonical intent state before deciding replay vs new authorization.');
assert.ok(createdGateConditionIndex > intentReadIndex, 'Rollout eligibility must be evaluated from canonical intent state, not client query state alone.');
assert.ok(gateIndex > createdGateConditionIndex, 'Every new created -> authorized transition must call the server rollout gate.');
assert.ok(guardIndex > gateIndex, 'Exact canary exposure guardrails must run after identity/mode eligibility and before authorization.');
assert.ok(authorizedBranchIndex > guardIndex, 'Canary guardrail enforcement must run before authorization/replay branching.');
assert.ok(createdBranchIndex > authorizedBranchIndex, 'Created authorization branch must remain explicit and downstream of the rollout gates.');

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
  'create or replace function public.authorize_wallet_intent_v2_server',
  'pg_advisory_xact_lock(',
  "hashtextextended('ctg-wallet-canary-single-flight:' || p_user_id::text, 0)",
  "other.status in ('authorized','submitted','pending_external','confirmed_external')",
  "raise exception 'WALLET_AUTH_CANARY_SINGLE_FLIGHT_CONFLICT'",
  'return public.authorize_wallet_intent_v1_server(',
  'grant execute on function public.authorize_wallet_intent_v2_server',
  'revoke execute on function public.authorize_wallet_intent_v1_server',
]) {
  assert.ok(migration0091.includes(fragment), `Canary guardrail migration missing invariant: ${fragment}`);
}

for (const forbidden of [
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'sendTransaction(',
  'privateKey',
]) {
  assert.ok(!migration0091.includes(forbidden), `Canary guardrail migration crossed financial/signing boundary: ${forbidden}`);
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
  "redirect: 'error'",
  "payload.jsonrpc !== '2.0'",
  'payload.id !== 1',
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
  "const ALLOWED_BODY_KEYS = new Set(['version', 'clientCommitSha'])",
  'if (value.version !== WALLET_CANARY_PREFLIGHT_VERSION) return null',
  'assertReviewedWalletCanaryClientCommitSha(value.clientCommitSha)',
  'inspectWalletCryptoSendExecutionConfiguration(auth.user.id)',
  'canaryGuardrailsConfigured: rollout.canaryGuardrailsConfigured',
  '&& rollout.canaryGuardrailsConfigured',
  "blockers.push('WALLET_CANARY_GUARDRAILS_NOT_CONFIGURED')",
  ".from('wallet_external_accounts')",
  ".eq('user_id', auth.user.id)",
  ".eq('provider', 'privy')",
  ".eq('account_kind', 'embedded')",
  ".eq('status', 'verified')",
  ".eq('is_primary', true)",
  ".from('wallet_identity_links')",
  'probeRuntimeSchemaCompatibility()',
  'probePolygonCanaryInfrastructureV1(signerAddress)',
  'reviewedClientCommit',
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

console.log('CTG One Wallet canary authorization, exposure guardrails, single-flight and recovery invariants: PASS');
