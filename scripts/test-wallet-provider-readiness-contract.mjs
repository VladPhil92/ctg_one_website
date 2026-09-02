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
  "/api/wallet/identity/provider-readiness",
  "last?.body?.version === 'ctg-wallet-provider-readiness-v1'",
  "last?.body?.check?.code === 'PRIVY_USER_REGISTRY_READY'",
  'wallet-provider-readiness.json',
  'process.exitCode = 1',
]) {
  assert.ok(verifier.includes(fragment), `Provider readiness verifier missing invariant: ${fragment}`);
}

for (const fragment of [
  'name: Wallet Provider Registry Production Canary',
  "cron: '23 * * * *'",
  'workflow_dispatch:',
  'ref: main',
  'node scripts/verify-wallet-provider-readiness.mjs',
  'Archive provider readiness evidence',
  'retention-days: 14',
]) {
  assert.ok(workflow.includes(fragment), `Provider readiness workflow missing invariant: ${fragment}`);
}

assert.ok(
  !/^\s*push:/m.test(workflow),
  'Provider production canary must not run on push because Render deploys only after repository checks pass.',
);

console.log('CTG One wallet bounded post-deploy Privy provider readiness certification contract: PASS');
