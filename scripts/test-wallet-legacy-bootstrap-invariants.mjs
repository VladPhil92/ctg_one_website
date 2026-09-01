import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'src/app/api/wallet/identity/legacy-bootstrap/route.ts');
const verifierPath = path.join(root, 'src/lib/wallet/privy-identity-token.ts');

if (!fs.existsSync(routePath)) throw new Error('legacy wallet bootstrap route missing');
if (!fs.existsSync(verifierPath)) throw new Error('Privy identity verifier missing');

const route = fs.readFileSync(routePath, 'utf8');
const verifier = fs.readFileSync(verifierPath, 'utf8');

const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
};

requireFragments(route, 'legacy bootstrap route', [
  "const LEGACY_CLAIM_VERSION = 'ctg-wallet-legacy-claim-v1' as const",
  'const requestSchema = z.object({}).strict()',
  'createAuthenticatedRequestContext(request)',
  "'consume_wallet_identity_link_rate_limit'",
  "request.headers.get('privy-id-token')",
  'verifyPrivyIdentityToken({',
  'canonicalCtgUserId: user.id',
  "createHash('sha256')",
  "LEGACY_CLAIM_VERSION,\n    params.canonicalUserId,\n    params.privyUserId,\n    params.embeddedEvmAddress.toLowerCase()",
  ".from('wallet_legacy_migration_evidence')",
  "provider: 'privy'",
  "chain_family: 'evm'",
  'provider_user_id: verifiedIdentity.privyUserId',
  'expected_address: address',
  'source_digest_sha256: sourceDigestSha256',
  "status: 'pending'",
  "serviceRole.rpc(\n    'link_verified_wallet_identity'",
  "p_link_mode: 'legacy_preserve'",
  "const CORS_METHODS = ['POST', 'OPTIONS'] as const",
  'return walletCorsPreflight(request, CORS_METHODS)',
  "headers.set('Cache-Control', 'no-store')",
  'legacyPreserved: true',
]);

requireFragments(verifier, 'Privy identity verifier', [
  "iss !== 'privy.io'",
  'aud !== expectedAppId',
  ".filter((account) => account.type === 'custom_auth')",
  'customAuthAccounts[0] !== params.canonicalCtgUserId',
  "account.walletClientType === 'privy'",
]);

const forbiddenBodyAuthority = [
  'body.walletAddress',
  'body.evmAddress',
  'body.providerUserId',
  'body.privyUserId',
  'body.sourceDigestSha256',
  'body.expectedAddress',
];
for (const fragment of forbiddenBodyAuthority) {
  if (route.includes(fragment)) {
    throw new Error(`legacy bootstrap must not trust browser identity provenance: ${fragment}`);
  }
}

if (route.includes('PRIVY_JWT_VERIFICATION_KEY') || route.includes('NEXT_PUBLIC_PRIVY_JWT_VERIFICATION_KEY')) {
  throw new Error('legacy bootstrap must use the shared server-only verifier, not handle verification keys itself');
}

const authIndex = route.indexOf('createAuthenticatedRequestContext(request)');
const rateIndex = route.indexOf("'consume_wallet_identity_link_rate_limit'");
const verifyIndex = route.indexOf('verifyPrivyIdentityToken({');
const evidenceIndex = route.indexOf(".from('wallet_legacy_migration_evidence')");
const linkIndex = route.lastIndexOf("'link_verified_wallet_identity'");
if (!(authIndex >= 0 && rateIndex > authIndex && verifyIndex > rateIndex && evidenceIndex > verifyIndex && linkIndex > evidenceIndex)) {
  throw new Error('legacy bootstrap must authenticate, rate-limit, verify signed Privy identity, persist provenance, then link');
}

if (!route.includes(".join('\\n')")) {
  throw new Error('legacy evidence digest must use canonical newline-delimited input');
}
if (route.includes('verifiedIdentity.issuedAt') || route.includes('verifiedIdentity.expiresAt')) {
  throw new Error('legacy evidence digest must remain stable across refreshed Privy identity tokens');
}

console.log('Legacy wallet claim bootstrap invariants: PASS');
