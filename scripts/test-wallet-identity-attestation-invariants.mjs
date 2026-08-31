import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  route: path.join(root, 'src/app/api/wallet/identity/proof/route.ts'),
  nextConfig: path.join(root, 'next.config.js'),
  identityMigration: path.join(root, 'supabase/migrations/20260829231000_0076_wallet_identity_bridge.sql'),
  trustedLinkMigration: path.join(root, 'supabase/migrations/20260829234000_0077_trusted_wallet_identity_linking.sql'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`wallet identity attestation ${label} file missing: ${path.relative(root, file)}`);
  }
}

const route = fs.readFileSync(files.route, 'utf8');
const nextConfig = fs.readFileSync(files.nextConfig, 'utf8');
const identityMigration = fs.readFileSync(files.identityMigration, 'utf8');
const trustedLinkMigration = fs.readFileSync(files.trustedLinkMigration, 'utf8');

const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
};

requireFragments(route, 'identity proof route', [
  "import { createHash } from 'node:crypto'",
  "const CORS_METHODS = ['GET', 'OPTIONS'] as const",
  "const PROOF_VERSION = 'ctg-wallet-identity-proof-v1' as const",
  'createAuthenticatedRequestContext(request)',
  'const serviceRole = createAdminClient()',
  ".from('wallet_identity_links')",
  "'id,user_id,provider,provider_user_id,status,link_mode,verified_at'",
  ".from('wallet_external_accounts')",
  ".eq('provider', 'privy')",
  ".eq('chain_family', 'evm')",
  ".eq('status', 'verified')",
  ".eq('is_primary', true)",
  '.limit(2)',
  'accounts.length !== 1',
  "account.identity_link_id !== identity.id",
  "account.account_kind !== 'embedded'",
  "const expectedLegacyPreserved = identity.link_mode === 'legacy_preserve'",
  'account.legacy_preserved !== expectedLegacyPreserved',
  "createHash('sha256')",
  "].join('\\0')",
  'providerUserId: identity.provider_user_id',
  'principalBindingDigestSha256',
  'canonicalUserId: user.id',
  'walletAddress',
  'linkMode: identity.link_mode',
  'legacyPreserved: account.legacy_preserved',
  'verifiedAt: identity.verified_at',
  'walletVerifiedAt: account.verified_at',
  "headers.set('Cache-Control', 'no-store')",
  "headers.set('Referrer-Policy', 'no-referrer')",
  'return walletCorsPreflight(request, CORS_METHODS)',
]);

// The Route Handler sets no-referrer itself, but Next.js project headers are
// applied at the platform layer. The sensitive route override must therefore
// remain after the catch-all rule so the last matching Referrer-Policy wins.
requireFragments(nextConfig, 'Next.js identity proof header override', [
  "source: '/:path*'",
  "{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }",
  "source: '/api/wallet/identity/proof'",
  "{ key: 'Referrer-Policy', value: 'no-referrer' }",
]);
const catchAllHeadersIndex = nextConfig.indexOf("source: '/:path*'");
const globalReferrerIndex = nextConfig.indexOf("{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }", catchAllHeadersIndex);
const identityProofHeadersIndex = nextConfig.indexOf("source: '/api/wallet/identity/proof'");
const identityNoReferrerIndex = nextConfig.indexOf("{ key: 'Referrer-Policy', value: 'no-referrer' }", identityProofHeadersIndex);
if (!(catchAllHeadersIndex >= 0 && globalReferrerIndex > catchAllHeadersIndex && identityProofHeadersIndex > globalReferrerIndex && identityNoReferrerIndex > identityProofHeadersIndex)) {
  throw new Error('identity proof no-referrer override must remain after the global referrer policy so Next.js applies the sensitive-route value last');
}

const authIndex = route.indexOf('createAuthenticatedRequestContext(request)');
const adminIndex = route.indexOf('const serviceRole = createAdminClient()');
const identityReadIndex = route.indexOf(".from('wallet_identity_links')");
const accountReadIndex = route.indexOf(".from('wallet_external_accounts')");
const digestIndex = route.indexOf('principalBindingDigestSha256 = buildPrincipalBindingDigest');
const responseIndex = route.indexOf('return noStoreJson(request, {\n    proof: {');
if (!(authIndex >= 0 && adminIndex > authIndex && identityReadIndex > adminIndex && accountReadIndex > identityReadIndex && digestIndex > accountReadIndex && responseIndex > digestIndex)) {
  throw new Error('identity attestation must authenticate, read trusted identity/account state, derive the digest, then respond');
}

for (const mutation of ['.insert(', '.delete(', '.upsert(', '.rpc(']) {
  if (route.includes(mutation)) {
    throw new Error(`identity proof route must remain read-only; found ${mutation}`);
  }
}
if (/\.from\([^)]*\)\s*\.update\(/s.test(route)) {
  throw new Error('identity proof route must remain read-only; found database .update(');
}

if (/export\s+async\s+function\s+POST/.test(route) || /request\.json\(|request\.text\(/.test(route)) {
  throw new Error('identity proof route must not accept a browser-supplied identity payload');
}

const responseSource = route.slice(responseIndex);
if (responseSource.includes('provider_user_id') || responseSource.includes('providerUserId')) {
  throw new Error('identity proof response must never expose the raw Privy provider principal');
}

requireFragments(identityMigration, 'identity schema', [
  'constraint wallet_identity_links_user_provider_unique unique (user_id, provider)',
  'constraint wallet_identity_links_provider_user_unique unique (provider, provider_user_id)',
  'constraint wallet_external_accounts_chain_address_unique',
  'create unique index wallet_external_accounts_one_primary_per_family',
  'where is_primary is true and status <> \'revoked\'',
]);

requireFragments(trustedLinkMigration, 'trusted identity linking', [
  'create or replace function public.link_verified_wallet_identity(',
  "raise exception 'Privy identity is already linked to another CTG user'",
  "raise exception 'EVM wallet is already linked to another CTG user'",
  "raise exception 'canonical CTG user already has a different active primary EVM wallet'",
  "raise exception 'LEGACY_PROVIDER_IDENTITY_MISMATCH'",
  "raise exception 'LEGACY_WALLET_MISMATCH'",
]);

console.log('CTG One Wallet canonical identity attestation V1 invariants: PASS');
