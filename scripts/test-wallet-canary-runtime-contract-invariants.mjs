import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const runtime = await readFile('src/lib/wallet/canary-runtime-contract.ts', 'utf8');
const health = await readFile('src/app/api/health/route.ts', 'utf8');
const authorize = await readFile('src/app/api/wallet/intents/[intentId]/authorize/route.ts', 'utf8');
const preflight = await readFile('src/lib/wallet/canary-preflight.ts', 'utf8');
const chain = await readFile('src/lib/wallet/chain-reconciliation.ts', 'utf8');
const evidence = await readFile('src/lib/wallet/canary-evidence.ts', 'utf8');
const schema = await readFile('src/lib/observability/schema-version.ts', 'utf8');

const requiredRuntimeFragments = [
  "'ctg-wallet-canary-runtime-v1'",
  "'ctg-wallet-authorization-v1'",
  'WALLET_CANARY_PREFLIGHT_VERSION',
  'WALLET_CHAIN_SUBMISSION_VERSION',
  'WALLET_CHAIN_RECONCILIATION_VERSION',
  'WALLET_CANARY_EVIDENCE_VERSION',
  'WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION',
  'WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_NAME',
  'WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_COUNT',
];
for (const fragment of requiredRuntimeFragments) {
  assert(runtime.includes(fragment), `runtime contract missing ${fragment}`);
}

assert(health.includes('getWalletCanaryRuntimeContract'), 'health must consume canonical wallet canary runtime contract');
assert(health.includes('walletCanary,'), 'health response must publish walletCanary metadata');

assert(authorize.includes("const AUTHORIZATION_VERSION = 'ctg-wallet-authorization-v1' as const;"), 'authorization route version drifted');
assert(preflight.includes("WALLET_CANARY_PREFLIGHT_VERSION = 'ctg-wallet-canary-preflight-v1'"), 'preflight version drifted');
assert(chain.includes("WALLET_CHAIN_SUBMISSION_VERSION = 'ctg-wallet-chain-submission-v1'"), 'submission version drifted');
assert(chain.includes("WALLET_CHAIN_RECONCILIATION_VERSION = 'ctg-wallet-chain-reconciliation-v1'"), 'reconciliation version drifted');
assert(evidence.includes("WALLET_CANARY_EVIDENCE_VERSION = 'ctg-wallet-canary-evidence-v1'"), 'evidence version drifted');
assert(schema.includes("WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION = '0091'"), 'wallet minimum schema migration drifted');
assert(schema.includes("WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_COUNT = 91"), 'wallet minimum schema count drifted');

// Normalize identifier casing and separators before scanning so normal TypeScript
// camelCase names such as destinationAddress, rpcUrl or privateKey cannot bypass
// the public-health sensitive-field invariant.
const normalizeIdentifier = (value) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();
const forbiddenPublicRuntimeTokens = [
  'CANARY_USER',
  'DESTINATION_ADDRESS',
  'MAX_AMOUNT',
  'RPC_URL',
  'SERVICE_ROLE',
  'PRIVATE_KEY',
  'API_KEY',
  'SECRET',
  'BALANCE',
];
const runtimeReturn = runtime.slice(runtime.indexOf('return {'));
const normalizedRuntimeReturn = normalizeIdentifier(runtimeReturn);
for (const token of forbiddenPublicRuntimeTokens) {
  const normalizedToken = normalizeIdentifier(token);
  assert(
    !normalizedRuntimeReturn.includes(normalizedToken),
    `runtime contract must not expose sensitive/dynamic field ${token}`,
  );
}

console.log('wallet canary runtime contract invariants: ok');
