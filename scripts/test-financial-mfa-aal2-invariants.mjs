import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  server: path.join(root, 'src/lib/supabase/server.ts'),
  policy: path.join(root, 'src/lib/security/financial-mfa.ts'),
  route: path.join(root, 'src/app/api/investment/admin/financial-control/route.ts'),
  client: path.join(root, 'src/lib/security/financial-control-client.ts'),
  login: path.join(root, 'src/app/(auth)/iniciar-sesion/page.tsx'),
  mfaPage: path.join(root, 'src/app/dashboard/seguridad/mfa/page.tsx'),
  orders: path.join(root, 'src/modules/investment/admin-orders/browser-repository.ts'),
  payouts: path.join(root, 'src/app/admin/finance/rails/page.tsx'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error(`Financial MFA ${label} missing: ${path.relative(root, file)}`);
}
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]));

function requireFragments(text, label, fragments) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
}

requireFragments(source.server, 'validated auth context AAL binding', [
  'supabase.auth.getUser(validatedBearerToken)',
  'getAuthenticatorAssuranceLevel: () =>',
  'supabase.auth.mfa.getAuthenticatorAssuranceLevel(validatedBearerToken)',
  'supabase.auth.mfa.getAuthenticatorAssuranceLevel()',
]);
for (const forbiddenTokenProperty of ['accessToken:', 'access_token:', 'bearerToken:', 'jwt: validatedBearerToken']) {
  if (source.server.includes(forbiddenTokenProperty)) {
    throw new Error(`validated bearer token must not become a serializable auth-context property: ${forbiddenTokenProperty}`);
  }
}

requireFragments(source.policy, 'staged financial MFA policy', [
  "FINANCIAL_MFA_PATH = '/dashboard/seguridad/mfa'",
  "FINANCIAL_MFA_ENFORCEMENT_MODE === 'required'",
  'await context.getAuthenticatorAssuranceLevel()',
  "currentLevel === 'aal2' && nextLevel === 'aal1'",
  "reason: 'MFA_SESSION_REFRESH_REQUIRED'",
  "reason: 'MFA_CHALLENGE_REQUIRED'",
  "reason: 'MFA_ENROLLMENT_REQUIRED'",
  'enrollmentRecommended: true',
  "logger.error('security.financial.mfa_assurance_unavailable'",
  "logger.warn('security.financial.mfa_required'",
  "logger.warn('security.financial.mfa_enrollment_recommended'",
  "logger.info('security.financial.mfa_satisfied'",
]);
for (const mutableMetadataAccess of ['user_metadata', 'app_metadata']) {
  if (source.policy.includes(mutableMetadataAccess)) {
    throw new Error(`MFA authorization policy must not trust metadata: ${mutableMetadataAccess}`);
  }
}

requireFragments(source.route, 'financial API MFA boundary', [
  'evaluateFinancialMfa(context)',
  'recordFinancialMfaDecision(context.user.id, operation, correlationId, mfa)',
  "code: 'FINANCIAL_MFA_CHECK_UNAVAILABLE'",
  "code: 'FINANCIAL_MFA_REQUIRED'",
  'mfaPath: FINANCIAL_MFA_PATH',
  '428',
]);
const freshAuthIndex = source.route.indexOf('evaluateFinancialStepUp(context.user)');
const mfaIndex = source.route.indexOf('evaluateFinancialMfa(context)');
const authzIndex = source.route.indexOf('authorizeFinancialOperation(context, parsed.data.operation)');
const mutationIndex = source.route.indexOf('admin.rpc(rpc, {');
if (!(freshAuthIndex >= 0 && mfaIndex > freshAuthIndex && authzIndex > mfaIndex && mutationIndex > authzIndex)) {
  throw new Error('financial boundary order must be fresh-auth -> MFA -> authorization -> privileged mutation');
}

requireFragments(source.client, 'interactive step-up client', [
  "body.code === 'FINANCIAL_MFA_REQUIRED'",
  '/dashboard/seguridad/mfa',
  "body.code === 'FINANCIAL_STEP_UP_REQUIRED'",
  '/iniciar-sesion?next=',
  'encodeURIComponent(returnPath)',
]);
requireFragments(source.orders, 'funding consumer', [
  "import { runFinancialControl } from '@/lib/security/financial-control-client'",
]);
requireFragments(source.payouts, 'payout consumer', [
  "import { runFinancialControl } from '@/lib/security/financial-control-client'",
]);

requireFragments(source.login, 'post-password MFA routing', [
  'supabase.auth.signInWithPassword',
  'supabase.auth.mfa.getAuthenticatorAssuranceLevel()',
  "assurance.currentLevel !== 'aal2' && assurance.nextLevel === 'aal2'",
  '/dashboard/seguridad/mfa?next=',
]);

requireFragments(source.mfaPage, 'TOTP enrollment/challenge surface', [
  "factorType: 'totp'",
  "friendlyName: 'CTG One Finance'",
  'supabase.auth.mfa.listFactors()',
  "factor.status === 'verified'",
  'supabase.auth.mfa.challengeAndVerify({',
  "aalData?.currentLevel !== 'aal2'",
  'safeRedirectPath(searchParams.get(\'next\'), \'/dashboard\')',
  'autoComplete="one-time-code"',
]);
for (const forbidden of ['console.log(', 'trackFunnelEvent(', 'localStorage', 'sessionStorage']) {
  if (source.mfaPage.includes(forbidden)) throw new Error(`MFA page must not leak TOTP material through ${forbidden}`);
}

const migration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema)?.[1];
const count = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source.schema)?.[1]);
if (migration !== '0115' || count !== 115) {
  throw new Error('Phase 5C must remain schema-free on the certified 0115/115 database contract');
}

console.log('Finance MFA AAL2 staged-enforcement invariants: PASS');
