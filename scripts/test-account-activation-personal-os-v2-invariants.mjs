import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  page,
  dashboard,
  activation,
  educationHook,
  walletHook,
  transactionsHook,
  investmentHook,
  analyticsFunnel,
] = await Promise.all([
  read('src/app/dashboard/page.tsx'),
  read('src/components/dashboard/PersonalOSDashboardV2.tsx'),
  read('src/lib/account/activation.ts'),
  read('src/hooks/useEducationActivationSummary.ts'),
  read('src/hooks/useWallet.ts'),
  read('src/hooks/useAccountTransactions.ts'),
  read('src/hooks/useInvestmentSummary.ts'),
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
assert.match(dashboard, /activation\.primary\.key === 'sync'/, 'Read failures must produce a retryable non-navigation action.');
assert.match(dashboard, /refreshAccountContexts/, 'Personal OS must provide a real retry path for failed context reads.');
assert.match(dashboard, /transactionState === 'error'/, 'Activity UI must distinguish read failure from an empty transaction list.');

assert.match(educationHook, /fetch\('\/api\/education\/library'/, 'Education activation must use the authenticated Education OS read boundary.');
assert.match(educationHook, /credentials:\s*'same-origin'/, 'Education activation fetch must remain same-origin authenticated.');
assert.doesNotMatch(educationHook, /\.from\(/, 'Personal OS must not query education tables directly from the browser.');
assert.match(educationHook, /state:\s*'error'/, 'Education read failures must remain distinguishable from an empty library.');
assert.match(educationHook, /\(item\.progressPercent \?\? 0\) > 0/, 'Only positive learning progress may be presented as continuation.');

assert.match(walletHook, /maybeSingle\(\)/, 'Wallet absence must be distinguishable from a failed single-row query.');
assert.match(walletHook, /if \(error\)[\s\S]*setState\('error'\)/, 'Wallet read failures must propagate an error state.');
assert.match(transactionsHook, /if \(error\)[\s\S]*setState\('error'\)/, 'Transaction read failures must propagate an error state.');
assert.match(investmentHook, /balanceResult\.error \|\| allocationResult\.error \|\| withdrawalResult\.error/, 'Investment read failures must be checked across all participant read models.');
assert.match(investmentHook, /setState\('error'\)/, 'Investment read failures must propagate an error state.');

const activationPlanSource = activation.slice(activation.indexOf('export function buildAccountActivationPlan'));
const precedence = [
  "if (!input.hasProfile || !input.hasCompleteProfile)",
  "else if (input.kycStatus === 'rejected')",
  "else if (input.kycStatus === 'pending')",
  "else if (input.kycStatus !== 'verified')",
  'else if (hasReadError)',
  "else if (walletReadyState && !input.walletReady)",
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

assert.match(activation, /input\.walletState === 'error'/, 'Wallet failures must block promotional fallback.');
assert.match(activation, /input\.transactionState === 'error'/, 'Transaction failures must block promotional fallback.');
assert.match(activation, /input\.investmentState === 'error'/, 'Investment failures must block promotional fallback.');
assert.match(activation, /input\.education\.state === 'error'/, 'Education failures must block promotional fallback.');
assert.match(activation, /primary\.key === 'sync'/, 'Sync state must suppress secondary acquisition recommendations.');
assert.match(activation, /Opcional/, 'Investment must remain optional in the activation model.');
assert.match(activation, /education\.state === 'ready'/, 'Education recommendations must only use successfully loaded read state.');
assert.ok(analyticsFunnel.includes("'education_library'"), 'Education library must remain an approved funnel service key.');
assert.ok(analyticsFunnel.includes("'education_learning_center'"), 'Learning continuation must remain an approved funnel service key.');

console.log('Account Activation & Personal OS v2 invariants: PASS');

// Rewards Foundation v1 extends the account platform contract and therefore
// runs inside the standard account activation invariant suite used by npm test.
await import('./test-rewards-foundation-v1-invariants.mjs');
