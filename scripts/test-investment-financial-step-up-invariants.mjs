import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
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

requireFragments(source.telemetry, 'structured financial security telemetry', [
  "logger.info('security.financial.operation_succeeded'",
  "logger.error('security.financial.authorization_unavailable'",
  "logger.error('security.financial.authorization_denied'",
  "logger.warn('security.financial.operation_rejected'",
  "logger.warn('security.financial.step_up_required'",
  'actor_user_id: input.actorUserId',
  'operation: input.operation',
  'outcome_reason_code: input.reasonCode',
  'auth_transport: input.transport',
  'actor_auth_age_seconds: input.actorAuthAgeSeconds',
  'correlation_id: input.correlationId',
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
  'requestBody:',
]) {
  if (source.telemetry.includes(forbiddenField)) {
    throw new Error(`financial security telemetry accepts sensitive field: ${forbiddenField}`);
  }
}
for (const forbiddenDependency of [
  "createAdminClient",
  "record_financial_security_event_server",
  "EXPECTED_DATABASE_MIGRATION",
]) {
  if (source.telemetry.includes(forbiddenDependency)) {
    throw new Error(`Phase 5A telemetry must remain schema-free: ${forbiddenDependency}`);
  }
}

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema)?.[1];
const schemaCount = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source.schema)?.[1]);
const schemaName = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(source.schema)?.[1];
if (schemaMigration !== '0114' || schemaCount !== 114 || schemaName !== 'revoke_legacy_financial_rpc_client_execution') {
  throw new Error('Phase 5A must preserve the certified production schema contract at 0114/114');
}
if (fs.existsSync(path.join(root, 'supabase/migrations/20260906183008_0115_financial_security_step_up_telemetry.sql'))) {
  throw new Error('Phase 5A must not merge the deferred 0115 durable journal migration');
}

console.log('Investment financial step-up + structured telemetry invariants: PASS');
