import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const source = {
  page: await read('src/app/inversion/admin/page.tsx'),
  financialClient: await read('src/lib/investment/financial-client.ts'),
  financialControlRoute: await read('src/app/api/investment/admin/financial-control/route.ts'),
  adminAuth: await read('src/lib/auth/admin-auth.ts'),
  securityPolicy: await read('src/lib/security/financial-security-policy.ts'),
  telemetry: await read('src/lib/security/financial-security-telemetry.ts'),
  mfaEnrollment: await read('src/components/security/FinanceMfaEnrollment.tsx'),
  mfaStatusRoute: await read('src/app/api/auth/mfa/status/route.ts'),
  mfaEnrollRoute: await read('src/app/api/auth/mfa/enroll/route.ts'),
  mfaChallengeRoute: await read('src/app/api/auth/mfa/challenge/route.ts'),
  migration: await read('supabase/migrations/20260906200632_0115_financial_security_step_up_telemetry.sql'),
  schema: await read('src/lib/observability/schema-version.ts'),
};

function requireFragments(text, label, fragments) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) {
      throw new Error(`${label} is missing required fragment: ${fragment}`);
    }
  }
}

function forbidFragments(text, label, fragments) {
  for (const fragment of fragments) {
    if (text.includes(fragment)) {
      throw new Error(`${label} contains forbidden fragment: ${fragment}`);
    }
  }
}

requireFragments(source.adminAuth, 'admin auth', [
  "export type AdminAssurance = 'session' | 'financial';",
  'requiredAssurance?: AdminAssurance;',
  "requiredAssurance === 'financial'",
  'sessionEpochMs',
  'FINANCE_MAX_SESSION_AGE_MS',
  'assuranceLevel',
  "aal2",
  "error: 'FINANCIAL_FRESH_AUTH_REQUIRED'",
  "error: 'FINANCIAL_MFA_REQUIRED'",
]);

requireFragments(source.securityPolicy, 'financial security policy', [
  'FINANCE_MAX_SESSION_AGE_MS',
  'FINANCE_MAX_FAILED_ATTEMPTS',
  'FINANCE_LOCKOUT_WINDOW_MS',
  'resolveFinancialAal2Decision',
]);

requireFragments(source.financialControlRoute, 'financial control route', [
  "requiredAssurance: 'financial'",
  'recordFinancialSecurityEvent',
  "eventType: 'financial_control_authorized'",
  "eventType: 'financial_control_denied'",
]);

requireFragments(source.telemetry, 'financial telemetry', [
  'recordFinancialSecurityEvent',
  'record_financial_security_event_server',
  'SUPABASE_SERVICE_ROLE_KEY',
]);
forbidFragments(source.telemetry, 'financial telemetry', [
  'console.log(',
  'console.error(',
  'bank_reference',
  'transaction_hash',
]);

requireFragments(source.mfaStatusRoute, 'MFA status route', [
  'getAuthenticatorAssuranceLevel',
  'listFactors',
  'verifiedFactors',
  'aal1',
  'aal2',
]);
requireFragments(source.mfaEnrollRoute, 'MFA enroll route', [
  "factorType: 'totp'",
  'friendlyName',
  'qr_code',
  'secret',
]);
requireFragments(source.mfaChallengeRoute, 'MFA challenge route', [
  'challengeAndVerify',
  'factorId',
  'code',
]);
requireFragments(source.mfaEnrollment, 'Finance MFA enrollment UX', [
  'Configurar autenticación financiera',
  '/api/auth/mfa/enroll',
  '/api/auth/mfa/challenge',
  '/api/auth/mfa/status',
  'qrCode',
]);

requireFragments(source.page, 'investment admin page', [
  'FinanceMfaEnrollment',
  'financialControlRequest',
  'FINANCIAL_FRESH_AUTH_REQUIRED',
  'FINANCIAL_MFA_REQUIRED',
  'Reautenticar',
  'segundo factor',
]);
forbidFragments(source.page, 'investment admin page', [
  "fetch('/api/investment/admin/financial-control'",
  'createSupabaseBrowserClient',
  "from('lot_funding_transactions').update",
  "from('lot_participant_ledger').insert",
]);

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
