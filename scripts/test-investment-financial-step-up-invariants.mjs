import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260906200632_0115_financial_security_step_up_telemetry.sql'),
  route: path.join(root, 'src/app/api/investment/admin/financial-control/route.ts'),
  stepUp: path.join(root, 'src/lib/security/financial-step-up.ts'),
  assurance: path.join(root, 'src/lib/security/financial-auth-assurance.ts'),
  telemetry: path.join(root, 'src/lib/security/financial-security-events.ts'),
  server: path.join(root, 'src/lib/supabase/server.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Financial step-up ${label} missing: ${path.relative(root, file)}`);
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

function requireFragments(text, label, fragments) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
}

requireFragments(source.stepUp, 'recent-auth policy', [
  'FINANCIAL_STEP_UP_MAX_AGE_SECONDS = 15 * 60',
  'FINANCIAL_STEP_UP_CLOCK_SKEW_SECONDS = 2 * 60',
  'last_sign_in_at',
  'Date.parse(raw)',
  "reason: 'STALE_PRIMARY_AUTH'",
  "reason: 'FUTURE_LAST_SIGN_IN'",
]);
for (const mutableMetadataAccess of [
  '.user_metadata', '.app_metadata', "['user_metadata']", '["user_metadata"]', "['app_metadata']", '["app_metadata"]',
]) {
  if (source.stepUp.includes(mutableMetadataAccess)) {
    throw new Error(`financial step-up must not trust mutable metadata access: ${mutableMetadataAccess}`);
  }
}

requireFragments(source.assurance, 'mandatory Finance MFA assurance policy', [
  'await context.getAuthenticatorAssuranceLevel()',
  "mode: 'mfa-enrollment-required'",
  "mode: 'mfa-challenge-required'",
  "mode: 'aal2'",
  "mode: 'assurance-unavailable'",
  "currentLevel === 'aal2'",
  "nextLevel === 'aal2'",
]);
for (const legacyPermissiveFragment of [
  "mode: 'aal1-no-verified-factor'",
  "allowed: true; mode: 'aal1-no-verified-factor'",
]) {
  if (source.assurance.includes(legacyPermissiveFragment)) {
    throw new Error(`Phase 5C3 must not allow AAL1 financial mutations: ${legacyPermissiveFragment}`);
  }
}
if (source.assurance.includes('service_role') || source.assurance.includes('createAdminClient')) {
  throw new Error('MFA assurance must execute in the authenticated user context, never service_role');
}
if (source.assurance.includes('verifiedBearerToken')) {
  throw new Error('MFA assurance policy must not receive the raw validated bearer token as context data');
}

requireFragments(source.server, 'verified bearer assurance transport', [
  'const validatedBearerToken = bearer.token',
  'supabase.auth.getUser(validatedBearerToken)',
  'getAuthenticatorAssuranceLevel: () =>',
  'supabase.auth.mfa.getAuthenticatorAssuranceLevel(validatedBearerToken)',
  'supabase.auth.mfa.getAuthenticatorAssuranceLevel()',
]);
for (const forbiddenTokenProperty of ['verifiedBearerToken:', 'accessToken:', 'access_token:', 'bearerToken:', 'refreshToken:']) {
  if (source.server.includes(forbiddenTokenProperty)) {
    throw new Error(`validated bearer token must stay closure-bound and out of auth-context properties: ${forbiddenTokenProperty}`);
  }
}

requireFragments(source.route, 'mandatory financial-control MFA boundary', [
  'evaluateFinancialStepUp(context.user)',
  'evaluateFinancialAuthAssurance(context)',
  'FINANCIAL_STEP_UP_REQUIRED',
  'FINANCIAL_MFA_ENROLLMENT_REQUIRED',
  'FINANCIAL_MFA_CHALLENGE_REQUIRED',
  'FINANCIAL_AUTH_ASSURANCE_UNAVAILABLE',
  "reasonCode: 'MFA_ENROLLMENT_REQUIRED'",
  "reasonCode: 'AAL2_REQUIRED'",
  "reasonCode: 'AUTH_ASSURANCE_BACKEND_ERROR'",
  "enrollmentPath: '/admin/security/mfa'",
  "challengePath: '/admin/security/mfa'",
  'FINANCIAL_STEP_UP_MAX_AGE_SECONDS',
  'randomUUID()',
  'recordFinancialSecurityEvent({',
  'FINANCIAL_AUTHORIZATION_UNAVAILABLE',
  'FINANCIAL_AUTHORIZATION_DENIED',
  'FINANCIAL_OPERATION_REJECTED',
  'FINANCIAL_OPERATION_SUCCEEDED',
  '428',
  'correlationId',
]);
const freshAuthIndex = source.route.indexOf('evaluateFinancialStepUp(context.user)');
const assuranceIndex = source.route.indexOf('evaluateFinancialAuthAssurance(context)');
const enrollmentBlockIndex = source.route.indexOf("assurance.mode === 'mfa-enrollment-required'");
const challengeBlockIndex = source.route.indexOf("assurance.mode === 'mfa-challenge-required'");
const authzIndex = source.route.indexOf('authorizeFinancialOperation(context, parsed.data.operation)');
const mutationIndex = source.route.indexOf('admin.rpc(rpc, {');
if (!(
  freshAuthIndex >= 0 &&
  assuranceIndex > freshAuthIndex &&
  enrollmentBlockIndex > assuranceIndex &&
  challengeBlockIndex > enrollmentBlockIndex &&
  authzIndex > challengeBlockIndex &&
  mutationIndex > authzIndex
)) {
  throw new Error('financial controls must execute fresh-auth -> mandatory MFA enrollment/challenge -> authorization -> privileged mutation');
}

requireFragments(source.telemetry, 'structured + durable financial security telemetry', [
  "'MFA_ENROLLMENT_REQUIRED'",
  "'AAL2_REQUIRED'",
  "'AUTH_ASSURANCE_BACKEND_ERROR'",
  "logger.info('security.financial.operation_succeeded'",
  "logger.error('security.financial.authorization_unavailable'",
  "logger.error('security.financial.authorization_denied'",
  "logger.warn('security.financial.operation_rejected'",
  "logger.warn('security.financial.step_up_required'",
  "admin.rpc('record_financial_security_event_server'",
]);
for (const forbiddenField of [
  'bankReference:', 'transactionHash:', 'destinationMasked:', 'destinationFingerprint:', 'notes:',
  'accessToken:', 'refreshToken:', 'verifiedBearerToken:', 'otp:', 'requestBody:',
]) {
  if (source.telemetry.includes(forbiddenField)) {
    throw new Error(`financial security telemetry accepts sensitive field: ${forbiddenField}`);
  }
}

const normalizedMigration = source.migration.replace(/\s+/g, ' ').trim();
requireFragments(normalizedMigration, '0115 durable journal migration', [
  'create table if not exists public.financial_security_events',
  'alter table public.financial_security_events enable row level security;',
  'revoke all on table public.financial_security_events from public, anon, authenticated, service_role;',
  'create or replace function public.record_financial_security_event_server(',
  'security definer',
  "set search_path = ''",
  'grant execute on function public.record_financial_security_event_server( uuid, text, text, text, text, integer, uuid ) to service_role;',
  'financial_security_events_immutable',
]);
for (const forbiddenColumn of [
  'bank_reference', 'transaction_hash', 'destination_masked', 'destination_fingerprint',
  'request_body', 'access_token', 'refresh_token', 'otp_code', 'email text',
]) {
  if (normalizedMigration.includes(forbiddenColumn)) {
    throw new Error(`0115 journal schema contains prohibited sensitive field: ${forbiddenColumn}`);
  }
}

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema)?.[1];
const schemaCount = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source.schema)?.[1]);
if (!schemaMigration || Number(schemaMigration) < 115 || !Number.isSafeInteger(schemaCount) || schemaCount < 115) {
  throw new Error('Phase 5C3 requires repository schema compatibility floor 0115/115');
}

console.log('Investment financial fresh-auth + mandatory MFA AAL2 + durable telemetry invariants: PASS');
