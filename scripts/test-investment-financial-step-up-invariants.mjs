import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260906183008_0115_financial_security_step_up_telemetry.sql'),
  route: path.join(root, 'src/app/api/investment/admin/financial-control/route.ts'),
  stepUp: path.join(root, 'src/lib/security/financial-step-up.ts'),
  telemetry: path.join(root, 'src/lib/security/financial-security-events.ts'),
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
  '.user_metadata',
  '.app_metadata',
  "['user_metadata']",
  '["user_metadata"]',
  "['app_metadata']",
  '["app_metadata"]',
]) {
  if (source.stepUp.includes(mutableMetadataAccess)) {
    throw new Error(`financial step-up must not trust mutable metadata access: ${mutableMetadataAccess}`);
  }
}

requireFragments(source.route, 'financial-control recent-auth boundary', [
  'evaluateFinancialStepUp(context.user)',
  'FINANCIAL_STEP_UP_REQUIRED',
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
const stepUpIndex = source.route.indexOf('evaluateFinancialStepUp(context.user)');
const authzIndex = source.route.indexOf('authorizeFinancialOperation(context, parsed.data.operation)');
const mutationIndex = source.route.indexOf('admin.rpc(rpc, {');
if (!(stepUpIndex >= 0 && authzIndex > stepUpIndex && mutationIndex > authzIndex)) {
  throw new Error('financial step-up must execute before authorization and before privileged mutation');
}
if (source.route.includes('recordFinancialSecurityEvent({\n      ...securityContext,\n      bankReference')) {
  throw new Error('bank references must never enter financial security telemetry');
}

requireFragments(source.telemetry, 'structured financial security telemetry', [
  "logger.info('security.financial.operation_succeeded'",
  'logger.error(',
  'logger.warn(',
  "Number(EXPECTED_DATABASE_MIGRATION) >= 115",
  "admin.rpc('record_financial_security_event_server'",
  'p_actor_user_id: input.actorUserId',
  'p_correlation_id: input.correlationId',
]);
for (const forbiddenField of [
  'bankReference:',
  'transactionHash:',
  'destinationMasked:',
  'destinationFingerprint:',
  'notes:',
  'accessToken:',
  'refreshToken:',
  'otp:',
]) {
  if (source.telemetry.includes(forbiddenField)) {
    throw new Error(`financial security telemetry accepts sensitive field: ${forbiddenField}`);
  }
}

const normalizedMigration = source.migration.replace(/\s+/g, ' ').trim();
requireFragments(normalizedMigration, '0115 security journal migration', [
  'create table if not exists public.financial_security_events',
  'alter table public.financial_security_events enable row level security;',
  'revoke all on table public.financial_security_events from public, anon, authenticated, service_role;',
  'create or replace function public.record_financial_security_event_server(',
  'security definer',
  "set search_path = ''",
  'revoke all on function public.record_financial_security_event_server( uuid, text, text, text, text, integer, uuid ) from public, anon, authenticated, service_role;',
  'grant execute on function public.record_financial_security_event_server( uuid, text, text, text, text, integer, uuid ) to service_role;',
  'financial_security_events_immutable',
]);
for (const forbiddenColumn of [
  'bank_reference',
  'transaction_hash',
  'destination_masked',
  'destination_fingerprint',
  'request_body',
  'access_token',
  'refresh_token',
  'otp_code',
  'email text',
]) {
  if (normalizedMigration.includes(forbiddenColumn)) {
    throw new Error(`0115 journal schema contains prohibited sensitive field: ${forbiddenColumn}`);
  }
}

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema)?.[1];
if (!schemaMigration) throw new Error('unable to resolve runtime schema contract');
if (Number(schemaMigration) < 115 && !source.telemetry.includes('if (!durableJournalAvailable) return true;')) {
  throw new Error('durable journal must remain gated while production runtime schema is below 0115');
}

console.log('Investment financial step-up + telemetry invariants: PASS');
