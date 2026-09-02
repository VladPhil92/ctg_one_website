import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [route, verifier, workflow] = await Promise.all([
  read('src/app/api/wallet/identity/provider-readiness/route.ts'),
  read('scripts/verify-wallet-provider-readiness.mjs'),
  read('.github/workflows/wallet-provider-readiness-canary.yml'),
]);

for (const fragment of [
  "READINESS_VERSION = 'ctg-wallet-provider-readiness-v1'",
  'isPrivyUserRegistryConfigured()',
  'getPrivyUserByCustomAuthId(READINESS_PROBE_CUSTOM_USER_ID)',
  "code: 'PRIVY_USER_REGISTRY_NOT_CONFIGURED'",
  "code: 'PRIVY_USER_REGISTRY_READY'",
  'PROVIDER_PROBE_CACHE_TTL_MS = 30_000',
  'let cachedProbe:',
  'let inFlightProbe:',
  'if (cachedProbe && cachedProbe.expiresAt > now)',
  'if (!inFlightProbe)',
  "'Cache-Control': 'no-store, max-age=0'",
]) {
  assert.ok(route.includes(fragment), `Provider readiness route missing invariant: ${fragment}`);
}

for (const forbidden of [
  'PRIVY_APP_SECRET:',
  'privyUserId:',
  'walletAddress:',
  'linkedAccounts:',
  'customUserId:',
]) {
  assert.ok(!route.includes(forbidden), `Provider readiness route must not expose sensitive field: ${forbidden}`);
}

for (const fragment of [
  '/api/wallet/identity/provider-readiness',
  "last?.body?.version === 'ctg-wallet-provider-readiness-v1'",
  "last?.body?.check?.code === 'PRIVY_USER_REGISTRY_READY'",
  'wallet-provider-readiness.json',
  'process.exitCode = 1',
]) {
  assert.ok(verifier.includes(fragment), `Provider readiness verifier missing invariant: ${fragment}`);
}

for (const fragment of [
  'name: Wallet Provider Registry Production Canary',
  "cron: '9,19,29,39,49,59 * * * *'",
  'workflow_dispatch:',
  'expected_sha:',
  'EXPECTED_DEPLOYMENT_SHA: ${{ github.event.inputs.expected_sha || github.sha }}',
  'EXPECTED_DEPLOYMENT_BRANCH: main',
  "CANARY_ATTEMPTS: '10'",
  "CANARY_INTERVAL_MS: '25000'",
  "CANARY_REQUEST_TIMEOUT_MS: '10000'",
  'timeout-minutes: 12',
  'ref: ${{ github.event.inputs.expected_sha || github.sha }}',
  'node scripts/verify-deployment-health.mjs',
  'node scripts/verify-wallet-provider-readiness.mjs',
  'Archive provider readiness evidence',
  'retention-days: 14',
]) {
  assert.ok(workflow.includes(fragment), `Provider readiness workflow missing invariant: ${fragment}`);
}

assert.ok(
  workflow.indexOf('node scripts/verify-deployment-health.mjs')
    < workflow.indexOf('node scripts/verify-wallet-provider-readiness.mjs'),
  'Privy readiness must only run after the exact Render deployment identity is certified.',
);
assert.ok(
  !/^\s*push:/m.test(workflow),
  'Provider production canary must not run on push because Render deploys only after repository checks pass.',
);
assert.ok(
  !/^\s*pull_request:/m.test(workflow),
  'Provider production canary must not run on pull requests.',
);
assert.ok(
  !/^\s*workflow_run:/m.test(workflow),
  'Provider production canary must not create a workflow_run race with Render checksPass deployment.',
);

console.log('CTG One wallet exact-deployment Privy provider readiness certification contract: PASS');
