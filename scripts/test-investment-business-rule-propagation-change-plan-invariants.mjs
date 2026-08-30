import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
} from '../src/data/investment-business-rule-governance.mjs';
import {
  INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION,
  buildInvestmentBusinessRulePropagationChangePlan,
  validateInvestmentBusinessRulePropagationChangeBlueprint,
} from '../src/lib/investment/business-rule-propagation-change-plan.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function approvedGovernanceFixture() {
  return {
    version: INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
    candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
    rules: INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.map((id, index) => ({
      id,
      status: 'APPROVED',
      reviewedCandidateCommit: INVESTMENT_BUSINESS_RULE_CANDIDATE.commit,
      reviewedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha,
      decidedBy: 'authorized-business-governance-reviewer',
      decidedAt: `2026-08-30T08:0${index}:00.000Z`,
      evidenceRef: `decision-record:${id}:fixture`,
    })),
  };
}

validateInvestmentBusinessRulePropagationChangeBlueprint(
  INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
);

const canonicalPlan = buildInvestmentBusinessRulePropagationChangePlan();
assert.equal(canonicalPlan.version, INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION);
assert.equal(canonicalPlan.status, 'BLOCKED_AWAITING_CANONICAL_APPROVAL');
assert.deepEqual(canonicalPlan.decisionBlockers, INVESTMENT_REQUIRED_BUSINESS_RULE_IDS);
assert.equal(canonicalPlan.canonicalApprovalsSatisfied, false);
assert.equal(canonicalPlan.implementationPlanningEligible, false);
assert.equal(canonicalPlan.implementationPrEligible, false);
assert.equal(canonicalPlan.automaticApprovalAllowed, false);
assert.equal(canonicalPlan.automaticMutationAllowed, false);
assert.equal(canonicalPlan.runtimeMutationAllowedByPlanner, false);
assert.equal(canonicalPlan.propagationVerificationAllowed, false);
assert.equal(canonicalPlan.pilotAuthorizationGranted, false);
assert.equal(canonicalPlan.livePromotionAllowed, false);
assert.equal(canonicalPlan.requiredSurfaceCount, 7);
assert.equal(canonicalPlan.requiredTaskCount, 7);

const surfaceIds = canonicalPlan.blueprint.surfaces.map((surface) => surface.id);
assert.deepEqual(surfaceIds, [
  'business-model',
  'financial-model',
  'lot-inventory-state-machine',
  'agreement-legal-config',
  'postgres-runtime',
  'golden-path-tests',
  'operator-evidence',
]);

const runtimeSurface = canonicalPlan.blueprint.surfaces.find((surface) => surface.id === 'postgres-runtime');
assert.ok(runtimeSurface);
assert.equal(runtimeSurface.stage, 'RUNTIME_IMPLEMENTATION');
assert.deepEqual(runtimeSurface.dependsOn, [
  'business-model',
  'financial-model',
  'lot-inventory-state-machine',
  'agreement-legal-config',
]);
assert.equal(runtimeSurface.tasks[0].action, 'NEW_IMMUTABLE_MIGRATION');
assert.deepEqual(runtimeSurface.tasks[0].targets, [{ kind: 'DIRECTORY', path: 'supabase/migrations' }]);

const readyPlan = buildInvestmentBusinessRulePropagationChangePlan({
  governance: approvedGovernanceFixture(),
});
assert.equal(readyPlan.status, 'READY_FOR_REVIEWED_IMPLEMENTATION_PR');
assert.deepEqual(readyPlan.decisionBlockers, []);
assert.equal(readyPlan.canonicalApprovalsSatisfied, true);
assert.equal(readyPlan.implementationPlanningEligible, true);
assert.equal(readyPlan.implementationPrEligible, true);
assert.equal(readyPlan.automaticApprovalAllowed, false);
assert.equal(readyPlan.automaticMutationAllowed, false);
assert.equal(readyPlan.runtimeMutationAllowedByPlanner, false);
assert.equal(readyPlan.propagationVerificationAllowed, false);
assert.equal(readyPlan.pilotAuthorizationGranted, false);
assert.equal(readyPlan.livePromotionAllowed, false);

const staleCandidate = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
staleCandidate.candidate.commit = 'a'.repeat(40);
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(staleCandidate),
  /candidate commit mismatch/,
  'A propagation plan must never transfer authority to another candidate commit.',
);

const duplicateTask = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
duplicateTask.surfaces[1].tasks[0].id = duplicateTask.surfaces[0].tasks[0].id;
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(duplicateTask),
  /Duplicate propagation change task id/,
);

const missingCoverage = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
missingCoverage.surfaces
  .find((surface) => surface.id === 'operator-evidence')
  .tasks[0].ruleIds = ['BR-002', 'BR-003', 'BR-004', 'BR-005'];
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(missingCoverage),
  /BR-001 is missing required propagation coverage on operator-evidence/,
);

const remoteTarget = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
remoteTarget.surfaces[0].tasks[0].targets[0].path = 'https://example.com/business-model.md';
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(remoteTarget),
  /must not use a URI scheme/,
);

const traversalTarget = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
traversalTarget.surfaces[0].tasks[0].targets[0].path = '../BUSINESS_MODEL.md';
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(traversalTarget),
  /repository-relative path syntax|cannot traverse directories/,
);

const laterDependency = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
laterDependency.surfaces[0].dependsOn = ['postgres-runtime'];
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(laterDependency),
  /cannot depend on a later-stage surface/,
);

const shortCriterion = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
shortCriterion.surfaces[0].tasks[0].acceptanceCriteria[0] = 'too short';
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(shortCriterion),
  /acceptanceCriteria\[0\] is too short/,
);

assert.ok(
  INVESTMENT_BUSINESS_RULE_GOVERNANCE.rules.every((rule) => rule.status === 'PENDING'),
  'This planning phase must not approve canonical BRs.',
);
assert.equal(
  INVESTMENT_BUSINESS_RULE_PROPAGATION.status,
  'PENDING',
  'This planning phase must not mark propagation VERIFIED.',
);

for (const path of [
  'docs/investment/BUSINESS_MODEL.md',
  'docs/investment/FINANCIAL_MODEL.md',
  'docs/investment/DOMAIN_MODEL.md',
  'docs/investment/LEGAL_CONFIGURATION.md',
  'src/lib/investment/config.ts',
  'scripts/golden-path-transactional-smoke.sql',
  'scripts/investment-operational-golden-journey.sql',
  'docs/investment/OPERATING_EVIDENCE_CAPTURE.md',
  'scripts/validate-investment-operating-evidence.mjs',
  'scripts/finalize-investment-operating-evidence.mjs',
]) {
  await access(new URL(`../${path}`, import.meta.url));
}

const [packageSource, docsSource, plannerCliSource] = await Promise.all([
  read('package.json'),
  read('docs/investment/BUSINESS_RULE_PROPAGATION_CHANGE_PLAN.md'),
  read('scripts/plan-investment-business-rule-propagation.mjs'),
]);
const packageJson = JSON.parse(packageSource);
assert.match(packageJson.scripts.test, /test-investment-business-rule-propagation-change-plan-invariants\.mjs/);
assert.match(packageJson.scripts['investment:br:propagation:plan'], /plan-investment-business-rule-propagation\.mjs/);
assert.match(docsSource, /BLOCKED_AWAITING_CANONICAL_APPROVAL/);
assert.match(docsSource, /new immutable migration/i);
assert.match(docsSource, /does \*\*not\*\* reserve a migration number/i);
assert.match(plannerCliSource, /result\.status === 'INVALID' \? 1 : 0/);

console.log('Investment business-rule propagation change planner invariants: PASS');
