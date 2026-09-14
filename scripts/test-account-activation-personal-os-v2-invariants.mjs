import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [page, dashboard, activation, educationHook, analyticsFunnel] = await Promise.all([
  read('src/app/dashboard/page.tsx'),
  read('src/components/dashboard/PersonalOSDashboardV2.tsx'),
  read('src/lib/account/activation.ts'),
  read('src/hooks/useEducationActivationSummary.ts'),
  read('src/lib/analytics/funnel.ts'),
]);

assert.match(page, /PersonalOSDashboardV2/, 'Canonical /dashboard must render Personal OS v2.');
assert.doesNotMatch(page, /ReferenceDashboard/, 'Canonical /dashboard must not fall back to the legacy directory dashboard.');
assert.match(page, /TU ECOSISTEMA CTG ONE/, 'Account dashboard must retain the CTG One ecosystem identity contract.');

for (const source of [
  'useWallet',
  'useInvestmentSummary',
  'useAccountTransactions',
  'useEducationActivationSummary',
  'buildAccountActivationPlan',
]) {
  assert.ok(dashboard.includes(source), `Personal OS v2 must derive state from ${source}.`);
}

assert.match(dashboard, /dashboard_viewed/, 'Personal OS must instrument authenticated dashboard activation.');
assert.match(dashboard, /first_service_used/, 'State-backed activation navigation must instrument service use.');
assert.match(dashboard, /Tu siguiente mejor acción/, 'Personal OS must expose one dominant next action.');
assert.match(dashboard, /Estado de tu cuenta/, 'Personal OS must expose state-backed activation progress.');
assert.match(dashboard, /Education OS/, 'Education must be a first-class Personal OS context.');
assert.match(dashboard, /Personal OS no inventa actividad/, 'Empty states must explicitly avoid fabricating activity.');

assert.match(educationHook, /fetch\('\/api\/education\/library'/, 'Education activation must use the authenticated Education OS read boundary.');
assert.match(educationHook, /credentials:\s*'same-origin'/, 'Education activation fetch must remain same-origin authenticated.');
assert.doesNotMatch(educationHook, /\.from\(/, 'Personal OS must not query education tables directly from the browser.');
assert.match(educationHook, /state:\s*'error'/, 'Education read failures must remain distinguishable from an empty library.');

const activationPlanSource = activation.slice(activation.indexOf('export function buildAccountActivationPlan'));
const precedence = [
  "if (!input.hasProfile || !input.hasCompleteProfile)",
  "else if (input.kycStatus === 'rejected')",
  "else if (input.kycStatus === 'pending')",
  "else if (input.kycStatus !== 'verified')",
  "else if (!input.walletReady)",
  'const learning = educationReady ? continueLearningAction',
  'if (learning)',
  'else if (hasInvestmentValue)',
  'else if (hasTransactionValue)',
  'else if (educationReady && input.education.pendingOrders > 0)',
  'primary = EDUCATION_DISCOVERY_ACTION',
];
let cursor = -1;
for (const rule of precedence) {
  const next = activationPlanSource.indexOf(rule);
  assert.ok(next > cursor, `Activation precedence must retain rule ordering: ${rule}`);
  cursor = next;
}

assert.match(activation, /Opcional/, 'Investment must remain optional in the activation model.');
assert.match(activation, /education\.state === 'ready'/, 'Education recommendations must only use successfully loaded read state.');
assert.ok(analyticsFunnel.includes("'education_library'"), 'Education library must remain an approved funnel service key.');
assert.ok(analyticsFunnel.includes("'education_learning_center'"), 'Learning continuation must remain an approved funnel service key.');

console.log('Account Activation & Personal OS v2 invariants: PASS');
