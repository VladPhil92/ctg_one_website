import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260829234000_0077_trusted_wallet_identity_linking.sql'),
  verifier: path.join(root, 'src/lib/wallet/privy-identity-token.ts'),
  route: path.join(root, 'src/app/api/wallet/identity/link/route.ts'),
  rateLimit: path.join(root, 'src/lib/security/api-rate-limit.ts'),
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
const rateLimit = fs.readFileSync(files.rateLimit, 'utf8');
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
  "when 'wallet.identity-link' then",
  'v_limit := 6;',
  'v_window_seconds := 600;',
  'create table public.wallet_identity_audit_log',
  'alter table public.wallet_identity_audit_log enable row level security',
  'wallet_identity_audit_log_immutable',
  "raise exception 'wallet identity audit history is append-only'",
  'create or replace function public.link_verified_wallet_identity(',
  'security definer',
  "raise exception 'LEGACY_WALLET_MISMATCH'",
  "pg_advisory_xact_lock(hashtextextended('wallet-link:user:'",
  "pg_advisory_xact_lock(hashtextextended('wallet-link:provider:privy:'",
  "pg_advisory_xact_lock(hashtextextended('wallet-link:evm:'",
  "raise exception 'Privy identity is already linked to another CTG user'",
  "raise exception 'EVM wallet is already linked to another CTG user'",
  "raise exception 'canonical CTG user already has a different active primary EVM wallet'",
  'revoke all on function public.link_verified_wallet_identity(uuid,text,text,text,text)',
  'from public, anon, authenticated;',
  'grant execute on function public.link_verified_wallet_identity(uuid,text,text,text,text)',
  'to service_role;',
]);

const forbiddenMigration = [
  'grant execute on function public.link_verified_wallet_identity(uuid,text,text,text,text) to authenticated',
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
  "header.alg !== 'ES256'",
  "iss !== 'privy.io'",
  'aud !== expectedAppId',
  "dsaEncoding: 'ieee-p1363'",
  "account.type === 'custom_auth'",
  "customUserId === params.canonicalCtgUserId",
  "account.type === 'wallet'",
  "account.chainType === 'ethereum'",
  "account.walletClientType === 'privy'",
  "'PRIVY_EMBEDDED_WALLET_AMBIGUOUS'",
  "'LEGACY_WALLET_MISMATCH'",
  'MAX_TOKEN_AGE_SECONDS',
]);

requireFragments(route, 'trusted identity-link route', [
  "supabase.auth.getUser()",
  "consumeAuthenticatedRateLimit(supabase, 'wallet.identity-link')",
  "request.headers.get('privy-id-token')",
  'verifyPrivyIdentityToken({',
  'canonicalCtgUserId: user.id',
  'createAdminClient()',
  "serviceRole.rpc('link_verified_wallet_identity'",
  'p_provider_user_id: verifiedIdentity.privyUserId',
  'p_evm_address: verifiedIdentity.embeddedEvmAddress',
  'MAX_REQUEST_BYTES',
  "headers.set('Cache-Control', 'no-store')",
]);

if (/walletAddress\s*:/i.test(route) || /evmAddress\s*:/i.test(route)) {
  throw new Error('identity-link request body must not accept a browser-asserted wallet address');
}

const authIndex = route.indexOf('supabase.auth.getUser()');
const adminIndex = route.indexOf('createAdminClient()');
const verifyIndex = route.indexOf('verifyPrivyIdentityToken({');
const rpcIndex = route.indexOf("serviceRole.rpc('link_verified_wallet_identity'");
if (!(authIndex >= 0 && verifyIndex > authIndex && adminIndex > verifyIndex && rpcIndex > adminIndex)) {
  throw new Error('trusted identity-link route must authenticate and cryptographically verify before service-role mutation');
}

requireFragments(rateLimit, 'API rate-limit contract', [
  "| 'wallet.identity-link';",
]);

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
