import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  inspector: path.join(root, 'src/lib/wallet/identity-convergence-canary.ts'),
  canaryRoute: path.join(root, 'src/app/api/wallet/identity/canary/route.ts'),
  linkRoute: path.join(root, 'src/app/api/wallet/identity/link/route.ts'),
  legacyBootstrap: path.join(root, 'src/app/api/wallet/identity/legacy-bootstrap/route.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`identity convergence canary ${label} missing: ${path.relative(root, file)}`);
  }
}

const inspector = fs.readFileSync(files.inspector, 'utf8');
const canaryRoute = fs.readFileSync(files.canaryRoute, 'utf8');
const linkRoute = fs.readFileSync(files.linkRoute, 'utf8');
const legacyBootstrap = fs.readFileSync(files.legacyBootstrap, 'utf8');

function requireFragments(source, label, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant: ${fragment}`);
    }
  }
}

requireFragments(inspector, 'canary inspector', [
  "'ctg-wallet-identity-convergence-canary-v1'",
  "state: 'not_eligible'",
  "state: 'ready_to_converge'",
  "state: 'converged'",
  "state: 'conflict'",
  ".from('profiles')",
  ".select('role')",
  "profileResult.data?.role === 'admin'",
  ".from('wallet_identity_links')",
  ".from('wallet_external_accounts')",
  ".from('wallet_legacy_migration_evidence')",
  ".from('wallet_identity_audit_log')",
  "link.status === 'verified'",
  "link.link_mode === 'legacy_preserve'",
  "account.account_kind === 'embedded'",
  "account.legacy_preserved === true",
  "legacyEvidence.status === 'consumed'",
  "['IDENTITY_LINK_VERIFIED', 'IDENTITY_LINK_IDEMPOTENT']",
  "'IDENTITY_CONVERGENCE_CANARY_CERTIFIED'",
]);

const resultStart = inspector.indexOf('function result(params:');
const resultEnd = inspector.indexOf('export class IdentityConvergenceCanaryError', resultStart);
const resultBuilder = inspector.slice(resultStart, resultEnd);
for (const forbidden of [
  'userId:',
  'canonicalUserId:',
  'privyUserId:',
  'providerUserId:',
  'walletAddress:',
  'address:',
  'sourceDigestSha256:',
  'identityLinkId:',
  'externalAccountId:',
]) {
  if (resultBuilder.includes(forbidden)) {
    throw new Error(`privacy-safe canary result must not expose authority material: ${forbidden}`);
  }
}

requireFragments(canaryRoute, 'canary evidence route', [
  "const CORS_METHODS = ['GET', 'OPTIONS'] as const",
  'createAuthenticatedRequestContext(request)',
  'inspectIdentityConvergenceCanary(auth.user.id)',
  "{ error: 'UNAUTHENTICATED' }",
  "headers.set('Cache-Control', 'no-store')",
  "headers.set('Referrer-Policy', 'no-referrer')",
  'return walletCorsPreflight(request, CORS_METHODS)',
]);

for (const [label, route, rpcFragment] of [
  ['identity link', linkRoute, "serviceRole.rpc('link_verified_wallet_identity'"],
  ['legacy bootstrap', legacyBootstrap, "'bootstrap_verified_legacy_wallet_identity'"],
]) {
  requireFragments(route, `${label} canary gate`, [
    'createAuthenticatedRequestContext(request)',
    'inspectIdentityConvergenceCanary(user.id)',
    "'IDENTITY_CONVERGENCE_CANARY_ADMIN_ONLY'",
    "canary.state === 'conflict'",
    "'IDENTITY_CONVERGENCE_CANARY_UNAVAILABLE'",
    "'consume_wallet_identity_link_rate_limit'",
    'verifyPrivyIdentityToken({',
    rpcFragment,
  ]);

  const authIndex = route.indexOf('createAuthenticatedRequestContext(request)');
  const canaryIndex = route.indexOf('inspectIdentityConvergenceCanary(user.id)');
  const rateIndex = route.indexOf("'consume_wallet_identity_link_rate_limit'");
  const verifyIndex = route.indexOf('verifyPrivyIdentityToken({');
  const mutateIndex = route.indexOf(rpcFragment);

  if (!(authIndex >= 0 && canaryIndex > authIndex && rateIndex > canaryIndex && verifyIndex > rateIndex && mutateIndex > verifyIndex)) {
    throw new Error(`${label} must authenticate, pass admin canary, rate-limit, verify Privy, then mutate`);
  }
}

for (const route of [linkRoute, legacyBootstrap]) {
  for (const forbidden of [
    'body.walletAddress',
    'body.evmAddress',
    'body.providerUserId',
    'body.privyUserId',
  ]) {
    if (route.includes(forbidden)) {
      throw new Error(`canary mutation boundary must not trust browser authority: ${forbidden}`);
    }
  }
}

console.log('First canonical wallet identity convergence canary invariants: PASS');
