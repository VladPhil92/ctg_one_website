import { readFile } from 'node:fs/promises';

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

const [renderYaml, envExample, workflow, verifier, route] = await Promise.all([
  readFile('render.yaml', 'utf8'),
  readFile('.env.local.example', 'utf8'),
  readFile('.github/workflows/wallet-provider-readiness-canary.yml', 'utf8'),
  readFile('scripts/verify-wallet-provider-readiness.mjs', 'utf8'),
  readFile('src/app/api/wallet/identity/provider-readiness/route.ts', 'utf8'),
]);

requireCondition(
  /- key: NEXT_PUBLIC_PRIVY_APP_ID\s+sync: false/.test(renderYaml),
  'Render must declare NEXT_PUBLIC_PRIVY_APP_ID as externally provisioned runtime configuration',
);
requireCondition(
  /- key: PRIVY_APP_SECRET\s+sync: false/.test(renderYaml),
  'Render must declare PRIVY_APP_SECRET as externally provisioned server-only configuration',
);
requireCondition(
  /^NEXT_PUBLIC_PRIVY_APP_ID=/m.test(envExample),
  '.env.local.example must document NEXT_PUBLIC_PRIVY_APP_ID',
);
requireCondition(
  /^PRIVY_APP_SECRET=/m.test(envExample),
  '.env.local.example must document PRIVY_APP_SECRET',
);
requireCondition(
  !/^NEXT_PUBLIC_PRIVY_APP_SECRET=/m.test(envExample),
  'Privy App Secret must never have a NEXT_PUBLIC_ alias',
);
requireCondition(
  workflow.includes('scripts/verify-wallet-provider-readiness.mjs'),
  'Production provider readiness workflow must execute the repository verifier',
);
requireCondition(
  workflow.includes('wallet-provider-readiness-canary'),
  'Production provider readiness workflow must preserve its evidence artifact',
);
requireCondition(
  verifier.includes('PRIVY_USER_REGISTRY_NOT_CONFIGURED'),
  'Provider readiness verifier must classify missing production configuration deterministically',
);
requireCondition(
  verifier.includes('NEXT_PUBLIC_PRIVY_APP_ID (or PRIVY_APP_ID)'),
  'Provider readiness verifier must identify the accepted App ID runtime configuration without exposing a value',
);
requireCondition(
  verifier.includes('PRIVY_APP_SECRET'),
  'Provider readiness verifier must identify the required server-only Privy secret without exposing a value',
);
requireCondition(
  verifier.includes('secretValuesIncluded: false'),
  'Provider readiness evidence must explicitly state that secret values are excluded',
);
requireCondition(
  route.includes("code: 'PRIVY_USER_REGISTRY_NOT_CONFIGURED'"),
  'Public provider readiness route must fail closed when Privy registry configuration is absent',
);
requireCondition(
  route.includes('check.ready ? 200 : 503'),
  'Public provider readiness route must retain 503 semantics until the real provider is ready',
);
requireCondition(
  !route.includes('PRIVY_APP_SECRET'),
  'Public provider readiness route must not expose or inspect the Privy App Secret directly',
);

console.log('Wallet provider readiness operations invariants passed.');
