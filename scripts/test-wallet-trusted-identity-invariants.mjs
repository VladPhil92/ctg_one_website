import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260829234000_0077_trusted_wallet_identity_linking.sql'),
  verifier: path.join(root, 'src/lib/wallet/privy-identity-token.ts'),
  route: path.join(root, 'src/app/api/wallet/identity/link/route.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
  env: path.join(root, '.env.local.example'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`trusted wallet identity ${label} file missing: ${path.relative(root, file)}`);
  }
}

const migration = fs.readFileSync(files.migration, 'utf8');
const verifier = fs.readFileSync(files.verifier, 'utf8');
const route = fs.readFileSync(files.route, 'utf8');
const schema = fs.readFileSync(files.schema, 'utf8');
const env = fs.readFileSync(files.env, 'utf8');

const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
};

requireFragments(migration, 'trusted identity migration', [
  'create or replace function public.consume_wallet_identity_link_rate_limit(p_user_id uuid)',
  'v_limit constant integer := 6;',
  'v_window_seconds constant integer := 600;',
  "v_scope constant text := 'wallet.identity-link';",
  'revoke all on function public.consume_wallet_identity_link_rate_limit(uuid)',
  'grant execute on function public.consume_wallet_identity_link_rate_limit(uuid)',
  'to service_role;',
  'create table public.wallet_legacy_migration_evidence',
  'expected_address_normalized text generated always as (lower(trim(expected_address))) stored',
  'source_digest_sha256 text not null',
  'alter table public.wallet_legacy_migration_evidence enable row level security',
  'revoke all on public.wallet_legacy_migration_evidence from public, anon, authenticated',
  'grant select, insert, update on public.wallet_legacy_migration_evidence to service_role',
  'create table public.wallet_identity_audit_log',
  'alter table public.wallet_identity_audit_log enable row level security',
  'wallet_identity_audit_log_immutable',
  "raise exception 'wallet identity audit history is append-only'",
  'create or replace function public.link_verified_wallet_identity(',
  'security definer',
  "raise exception 'LEGACY_MIGRATION_EVIDENCE_REQUIRED'",
  "raise exception 'LEGACY_MIGRATION_REQUIRED'",
  "raise exception 'LEGACY_PROVIDER_IDENTITY_MISMATCH'",
  "raise exception 'LEGACY_WALLET_MISMATCH'",
  'from public.wallet_legacy_migration_evidence',
  "pg_advisory_xact_lock(hashtextextended('wallet-link:user:'",
  "pg_advisory_xact_lock(hashtextextended('wallet-link:provider:privy:'",
  "pg_advisory_xact_lock(hashtextextended('wallet-link:evm:'",
  "raise exception 'Privy identity is already linked to another CTG user'",
  "raise exception 'EVM wallet is already linked to another CTG user'",
  "raise exception 'canonical CTG user already has a different active primary EVM wallet'",
  "set status = 'consumed', consumed_at = v_now",
  'revoke all on function public.link_verified_wallet_identity(uuid,text,text,text)',
  'grant execute on function public.link_verified_wallet_identity(uuid,text,text,text)',
]);

const forbiddenMigration = [
  'grant execute on function public.consume_wallet_identity_link_rate_limit(uuid) to authenticated',
  'grant execute on function public.link_verified_wallet_identity(uuid,text,text,text) to authenticated',
  'grant select on public.wallet_legacy_migration_evidence to authenticated',
  'grant insert on public.wallet_legacy_migration_evidence to authenticated',
  'grant update on public.wallet_legacy_migration_evidence to authenticated',
  'grant delete on public.wallet_legacy_migration_evidence to authenticated',
  'grant delete on public.wallet_legacy_migration_evidence to service_role',
  'grant insert on public.wallet_identity_audit_log to authenticated',
  'grant update on public.wallet_identity_audit_log to authenticated',
  'grant delete on public.wallet_identity_audit_log to authenticated',
];
for (const fragment of forbiddenMigration) {
  if (migration.includes(fragment)) {
    throw new Error(`trusted identity migration weakens the server-only boundary: ${fragment}`);
  }
}

requireFragments(verifier, 'Privy identity-token verifier', [
  "const PRIVY_USER_ID_RE = /^did:privy:",
  "header.alg !== 'ES256'",
  "iss !== 'privy.io'",
  'aud !== expectedAppId',
  "dsaEncoding: 'ieee-p1363'",
  'const customAuthAccounts = accounts',
  ".filter((account) => account.type === 'custom_auth')",
  "readString(account, 'custom_user_id', 'customUserId')",
  'customAuthAccounts.length !== 1',
  'customAuthAccounts[0] !== params.canonicalCtgUserId',
  "account.type === 'wallet'",
  "account.chainType === 'ethereum'",
  "account.walletClientType === 'privy'",
  "'PRIVY_EMBEDDED_WALLET_AMBIGUOUS'",
  "'LEGACY_WALLET_MISMATCH'",
  'MAX_TOKEN_AGE_SECONDS',
]);

requireFragments(route, 'trusted identity-link route', [
  'supabase.auth.getUser()',
  'const serviceRole = createAdminClient()',
  "serviceRole.rpc(\n    'consume_wallet_identity_link_rate_limit'",
  "request.headers.get('privy-id-token')",
  "body.linkMode === 'legacy_preserve'",
  ".from('wallet_legacy_migration_evidence')",
  ".select('provider_user_id,expected_address_normalized,status')",
  'expectedLegacyAddress: legacyEvidence?.expected_address_normalized ?? null',
  'legacyEvidence.provider_user_id !== verifiedIdentity.privyUserId',
  'verifyPrivyIdentityToken({',
  'canonicalCtgUserId: user.id',
  "serviceRole.rpc('link_verified_wallet_identity'",
  'p_provider_user_id: verifiedIdentity.privyUserId',
  'p_evm_address: verifiedIdentity.embeddedEvmAddress',
  'p_link_mode: body.linkMode',
  'MAX_REQUEST_BYTES',
  "headers.set('Cache-Control', 'no-store')",
]);

if (
  /walletAddress\s*:/i.test(route) ||
  /evmAddress\s*:/i.test(route) ||
  route.includes('expectedLegacyWalletAddress') ||
  route.includes('consumeAuthenticatedRateLimit')
) {
  throw new Error('identity-link route must not trust browser wallet provenance or widen the authenticated rate-limit RPC');
}

const authIndex = route.indexOf('supabase.auth.getUser()');
const adminIndex = route.indexOf('const serviceRole = createAdminClient()');
const rateIndex = route.indexOf("'consume_wallet_identity_link_rate_limit'");
const evidenceIndex = route.indexOf(".from('wallet_legacy_migration_evidence')");
const verifyIndex = route.indexOf('verifyPrivyIdentityToken({');
const rpcIndex = route.indexOf("serviceRole.rpc('link_verified_wallet_identity'");
if (!(authIndex >= 0 && adminIndex > authIndex && rateIndex > adminIndex && evidenceIndex > rateIndex && verifyIndex > evidenceIndex && rpcIndex > verifyIndex)) {
  throw new Error('trusted linking must authenticate, rate-limit, load provenance, verify Privy, then mutate');
}

requireFragments(schema, 'runtime schema contract', [
  "EXPECTED_DATABASE_MIGRATION = '0077'",
  "EXPECTED_DATABASE_MIGRATION_NAME = 'trusted_wallet_identity_linking'",
  'EXPECTED_DATABASE_MIGRATION_COUNT = 77',
]);

requireFragments(env, 'environment contract', [
  'NEXT_PUBLIC_PRIVY_APP_ID=',
  'PRIVY_JWT_VERIFICATION_KEY=',
]);
if (env.includes('NEXT_PUBLIC_PRIVY_JWT_VERIFICATION_KEY')) {
  throw new Error('Privy verification key must never be exposed through a NEXT_PUBLIC_ variable');
}

console.log('Trusted wallet identity-link invariants: PASS');
