import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  server: path.join(root, 'src/lib/supabase/server.ts'),
  assurance: path.join(root, 'src/lib/security/financial-auth-assurance.ts'),
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
for (const forbiddenTokenProperty of ['verifiedBearerToken:', 'accessToken:', 'access_token:', 'bearerToken:', 'refreshToken:']) {
  if (source.server.includes(forbiddenTokenProperty)) {
    throw new Error(`validated bearer token must not become an auth-context property: ${forbiddenTokenProperty}`);
  }
}

requireFragments(source.assurance, 'mandatory financial MFA policy', [
  'await context.getAuthenticatorAssuranceLevel()',
  "mode: 'mfa-enrollment-required'",
  "mode: 'mfa-challenge-required'",
  "mode: 'aal2'",
  "mode: 'assurance-unavailable'",
  "currentLevel === 'aal2'",
  "nextLevel === 'aal2'",
]);
for (const forbidden of ['FINANCIAL_MFA_ENFORCEMENT_MODE', "allowed: true; mode: 'aal1-no-verified-factor'", 'verifiedBearerToken']) {
  if (source.assurance.includes(forbidden)) {
    throw new Error(`mandatory AAL2 policy contains stale/permissive fragment: ${forbidden}`);
  }
}

requireFragments(source.route, 'financial API MFA boundary', [
  'evaluateFinancialStepUp(context.user)',
  'evaluateFinancialAuthAssurance(context)',
  "code: 'FINANCIAL_MFA_ENROLLMENT_REQUIRED'",
  "code: 'FINANCIAL_MFA_CHALLENGE_REQUIRED'",
  "code: 'FINANCIAL_AUTH_ASSURANCE_UNAVAILABLE'",
  '428',
]);
if (source.route.includes('evaluateFinancialMfa(context)') || source.route.includes('FINANCIAL_MFA_ENFORCEMENT_MODE')) {
  throw new Error('financial API must have one mandatory assurance policy, not a second staged MFA layer');
}
const freshAuthIndex = source.route.indexOf('evaluateFinancialStepUp(context.user)');
const assuranceIndex = source.route.indexOf('evaluateFinancialAuthAssurance(context)');
const authzIndex = source.route.indexOf('authorizeFinancialOperation(context, parsed.data.operation)');
const mutationIndex = source.route.indexOf('admin.rpc(rpc, {');
if (!(freshAuthIndex >= 0 && assuranceIndex > freshAuthIndex && authzIndex > assuranceIndex && mutationIndex > authzIndex)) {
  throw new Error('financial boundary order must be fresh-auth -> mandatory AAL2 -> authorization -> privileged mutation');
}

requireFragments(source.client, 'interactive step-up client', [
  "body.code === 'FINANCIAL_MFA_ENROLLMENT_REQUIRED'",
  "body.code === 'FINANCIAL_MFA_CHALLENGE_REQUIRED'",
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
  "safeRedirectPath(searchParams.get('next'), '/dashboard')",
  'autoComplete="one-time-code"',
]);
for (const forbidden of ['console.log(', 'trackFunnelEvent(', 'localStorage', 'sessionStorage']) {
  if (source.mfaPage.includes(forbidden)) throw new Error(`MFA page must not leak TOTP material through ${forbidden}`);
}

const migration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema)?.[1];
const count = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source.schema)?.[1]);
if (!migration || Number(migration) < 115 || !Number.isSafeInteger(count) || count < 115) {
  throw new Error('Phase 5C requires repository schema compatibility at or above the certified 0115/115 floor');
}

console.log('Finance MFA mandatory AAL2 invariants: PASS');
