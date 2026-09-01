import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260829234000_0077_trusted_wallet_identity_linking.sql'),
  atomicBootstrapMigration: path.join(root, 'supabase/migrations/20260901022000_0093_atomic_legacy_wallet_identity_bootstrap.sql'),
  verifier: path.join(root, 'src/lib/wallet/privy-identity-token.ts'),
  route: path.join(root, 'src/app/api/wallet/identity/link/route.ts'),
  legacyBootstrap: path.join(root, 'src/app/api/wallet/identity/legacy-bootstrap/route.ts'),
  serverAuth: path.join(root, 'src/lib/supabase/server.ts'),
  cors: path.join(root, 'src/lib/wallet/cors.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
  env: path.join(root, '.env.local.example'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`trusted wallet identity ${label} file missing: ${path.relative(root, file)}`);
  }
}

const migration = fs.readFileSync(files.migration, 'utf8');
const atomicBootstrapMigration = fs.readFileSync(files.atomicBootstrapMigration, 'utf8');
const verifier = fs.readFileSync(files.verifier, 'utf8');
const route = fs.readFileSync(files.route, 'utf8');
const legacyBootstrap = fs.readFileSync(files.legacyBootstrap, 'utf8');
const serverAuth = fs.readFileSync(files.serverAuth, 'utf8');
const cors = fs.readFileSync(files.cors, 'utf8');
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
  'constraint wallet_legacy_migration_evidence_consumption_check check (',
  'alter table public.wallet_legacy_migration_evidence enable row level security',
  'revoke all on public.wallet_legacy_migration_evidence from public, anon, authenticated',
  'revoke all on public.wallet_legacy_migration_evidence from service_role',
  'grant select, insert, update on public.wallet_legacy_migration_evidence to service_role',
  'create or replace function public._guard_wallet_legacy_migration_evidence_update()',
  "raise exception 'legacy wallet migration provenance is immutable'",
  "raise exception 'terminal legacy migration evidence status cannot change'",
  "raise exception 'terminal legacy migration consumption timestamp is immutable'",
  'create trigger wallet_legacy_migration_evidence_guard',
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
  'constraint wallet_legacy_migration_evidence_status_check check (',
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

requireFragments(atomicBootstrapMigration, 'atomic legacy bootstrap migration', [
  'create or replace function public.bootstrap_verified_legacy_wallet_identity(',
  'p_user_id uuid,',
  'p_provider_user_id text,',
  'p_evm_address text,',
  'p_source_digest_sha256 text',
  'security definer',
  'set search_path = public',
  "pg_advisory_xact_lock(\n    hashtextextended('wallet-link:user:'",
  "pg_advisory_xact_lock(\n    hashtextextended('wallet-link:provider:privy:'",
  "pg_advisory_xact_lock(\n    hashtextextended('wallet-link:evm:'",
  'from public.wallet_legacy_migration_evidence',
  'for update;',
  'if v_evidence.id is null then',
  'insert into public.wallet_legacy_migration_evidence(',
  'source_digest_sha256,',
  "'pending'",
  "raise exception 'LEGACY_PROVIDER_IDENTITY_MISMATCH'",
  "raise exception 'LEGACY_WALLET_MISMATCH'",
  'return public.link_verified_wallet_identity(',
  "'legacy_preserve'",
  'revoke all on function public.bootstrap_verified_legacy_wallet_identity(uuid,text,text,text)',
  'from public, anon, authenticated;',
  'grant execute on function public.bootstrap_verified_legacy_wallet_identity(uuid,text,text,text)',
  'to service_role;',
]);

if (atomicBootstrapMigration.includes('v_evidence.source_digest_sha256 <> v_source_digest')) {
  throw new Error('atomic bootstrap must reuse matching imported evidence even when its source-document digest differs');
}
if (atomicBootstrapMigration.includes('to authenticated;')) {
  throw new Error('atomic bootstrap RPC must remain service-role-only');
}
const atomicEvidenceIndex = atomicBootstrapMigration.indexOf('insert into public.wallet_legacy_migration_evidence(');
const atomicLinkIndex = atomicBootstrapMigration.indexOf('return public.link_verified_wallet_identity(');
if (!(atomicEvidenceIndex >= 0 && atomicLinkIndex > atomicEvidenceIndex)) {
  throw new Error('atomic bootstrap must create/reuse provenance before linking within one PostgreSQL function');
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

requireFragments(serverAuth, 'canonical wallet request authentication', [
  'export async function createAuthenticatedRequestContext(',
  'const bearer = parseBearerToken(request);',
  'if (bearer.present) {',
  'if (!bearer.token) return null;',
  'supabase.auth.getUser(bearer.token)',
  "return { supabase, user: data.user, transport: 'bearer' }",
  "return { supabase, user: data.user, transport: 'cookie' }",
]);

requireFragments(cors, 'wallet CORS boundary', [
  'export function isAllowedWalletOrigin',
  'export function applyWalletCors(',
  'export function walletCorsPreflight(',
  "headers.set('Access-Control-Allow-Origin', origin)",
  "headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Privy-ID-Token')",
]);

requireFragments(route, 'trusted identity-link route', [
  'createAuthenticatedRequestContext(request)',
  'isSupabaseConfigured',
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
  "const CORS_METHODS = ['POST', 'OPTIONS'] as const",
  'return walletCorsPreflight(request, CORS_METHODS)',
  'return applyWalletCors(',
  "headers.set('Cache-Control', 'no-store')",
  "headers.set('Referrer-Policy', 'no-referrer')",
]);

if (
  /walletAddress\s*:/i.test(route) ||
  /evmAddress\s*:/i.test(route) ||
  route.includes('expectedLegacyWalletAddress') ||
  route.includes('consumeAuthenticatedRateLimit') ||
  route.includes('supabase.auth.getUser()') ||
  route.includes('createClient()')
) {
  throw new Error('identity-link route must not trust browser wallet provenance, regress to cookie-only auth, or widen the authenticated rate-limit RPC');
}

const authIndex = route.indexOf('createAuthenticatedRequestContext(request)');
const adminIndex = route.indexOf('const serviceRole = createAdminClient()');
const rateIndex = route.indexOf("'consume_wallet_identity_link_rate_limit'");
const evidenceIndex = route.indexOf(".from('wallet_legacy_migration_evidence')");
const verifyIndex = route.indexOf('verifyPrivyIdentityToken({');
const rpcIndex = route.indexOf("serviceRole.rpc('link_verified_wallet_identity'");
if (!(authIndex >= 0 && adminIndex > authIndex && rateIndex > adminIndex && evidenceIndex > rateIndex && verifyIndex > evidenceIndex && rpcIndex > verifyIndex)) {
  throw new Error('trusted linking must authenticate, rate-limit, load provenance, verify Privy, then mutate');
}

requireFragments(legacyBootstrap, 'legacy identity bootstrap route', [
  "const LEGACY_CLAIM_VERSION = 'ctg-wallet-legacy-claim-v1' as const",
  'const requestSchema = z.object({}).strict()',
  'createAuthenticatedRequestContext(request)',
  "'consume_wallet_identity_link_rate_limit'",
  "request.headers.get('privy-id-token')",
  'verifyPrivyIdentityToken({',
  'canonicalCtgUserId: user.id',
  "createHash('sha256')",
  "serviceRole.rpc(\n    'bootstrap_verified_legacy_wallet_identity'",
  'p_provider_user_id: verifiedIdentity.privyUserId',
  'p_evm_address: address',
  'p_source_digest_sha256: sourceDigestSha256',
  'return walletCorsPreflight(request, CORS_METHODS)',
  'legacyPreserved: true',
]);

for (const fragment of [
  'body.walletAddress',
  'body.evmAddress',
  'body.providerUserId',
  'body.privyUserId',
  'body.sourceDigestSha256',
  'body.expectedAddress',
  ".from('wallet_legacy_migration_evidence')",
  ".insert({",
]) {
  if (legacyBootstrap.includes(fragment)) {
    throw new Error(`legacy bootstrap route must not directly trust or persist browser identity provenance: ${fragment}`);
  }
}
if (legacyBootstrap.includes('verifiedIdentity.issuedAt') || legacyBootstrap.includes('verifiedIdentity.expiresAt')) {
  throw new Error('legacy evidence digest must remain stable across refreshed Privy identity tokens');
}
const bootstrapAuthIndex = legacyBootstrap.indexOf('createAuthenticatedRequestContext(request)');
const bootstrapRateIndex = legacyBootstrap.indexOf("'consume_wallet_identity_link_rate_limit'");
const bootstrapVerifyIndex = legacyBootstrap.indexOf('verifyPrivyIdentityToken({');
const bootstrapRpcIndex = legacyBootstrap.indexOf("'bootstrap_verified_legacy_wallet_identity'");
if (!(bootstrapAuthIndex >= 0 && bootstrapRateIndex > bootstrapAuthIndex && bootstrapVerifyIndex > bootstrapRateIndex && bootstrapRpcIndex > bootstrapVerifyIndex)) {
  throw new Error('legacy bootstrap must authenticate, rate-limit, verify signed Privy identity, then invoke the atomic service-role RPC');
}

const bearerBranchIndex = serverAuth.indexOf('if (bearer.present) {');
const bearerRejectIndex = serverAuth.indexOf('if (!bearer.token) return null;', bearerBranchIndex);
const bearerVerifyIndex = serverAuth.indexOf('supabase.auth.getUser(bearer.token)', bearerBranchIndex);
const cookieVerifyIndex = serverAuth.indexOf('supabase.auth.getUser()', bearerBranchIndex);
if (!(bearerBranchIndex >= 0 && bearerRejectIndex > bearerBranchIndex && bearerVerifyIndex > bearerRejectIndex && cookieVerifyIndex > bearerVerifyIndex)) {
  throw new Error('invalid bearer authentication must fail closed before any cookie fallback');
}

const currentSchemaMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schema);
if (!currentSchemaMatch || Number(currentSchemaMatch[1]) < 93) {
  throw new Error('runtime schema contract must include atomic legacy wallet bootstrap migration 0093');
}

requireFragments(env, 'environment contract', [
  'NEXT_PUBLIC_PRIVY_APP_ID=',
  'PRIVY_JWT_VERIFICATION_KEY=',
]);
if (env.includes('NEXT_PUBLIC_PRIVY_JWT_VERIFICATION_KEY')) {
  throw new Error('Privy verification key must never be exposed through a NEXT_PUBLIC_ variable');
}

console.log('Trusted wallet identity-link invariants: PASS');
