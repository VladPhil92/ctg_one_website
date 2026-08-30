import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
} from '../src/data/investment-business-rule-governance.mjs';
import {
  INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION,
  buildInvestmentBusinessRulePropagationChangePlan,
  simulateInvestmentBusinessRulePropagationChangePlan,
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

function verifiedPropagationFixture() {
  return {
    version: INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
    status: 'VERIFIED',
    verifiedCandidateCommit: INVESTMENT_BUSINESS_RULE_CANDIDATE.commit,
    verifiedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha,
    verifiedBy: 'independent-propagation-reviewer',
    verifiedAt: '2026-08-30T10:00:00.000Z',
    evidenceRef: 'propagation-review:fixture',
  };
}

validateInvestmentBusinessRulePropagationChangeBlueprint(
  INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
);

const canonicalPlan = buildInvestmentBusinessRulePropagationChangePlan();
assert.equal(canonicalPlan.version, INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION);
assert.equal(canonicalPlan.status, 'BLOCKED_AWAITING_CANONICAL_APPROVAL');
assert.equal(canonicalPlan.authoritative, false);
assert.equal(canonicalPlan.blueprintAuthoritative, true);
assert.equal(canonicalPlan.governanceProvenanceVerified, false);
assert.equal(canonicalPlan.mergedMainProvenanceRequired, false);
assert.deepEqual(canonicalPlan.decisionBlockers, INVESTMENT_REQUIRED_BUSINESS_RULE_IDS);
assert.equal(canonicalPlan.approvalsRecordedInCheckout, false);
assert.equal(canonicalPlan.propagationRecordedVerifiedInCheckout, false);
assert.equal(canonicalPlan.implementationPlanningEligible, false);
assert.equal(canonicalPlan.implementationPrEligible, false);
assert.equal(canonicalPlan.implementationAuthorityGranted, false);
assert.equal(canonicalPlan.automaticApprovalAllowed, false);
assert.equal(canonicalPlan.automaticMutationAllowed, false);
assert.equal(canonicalPlan.runtimeMutationAllowedByPlanner, false);
assert.equal(canonicalPlan.propagationVerificationAllowed, false);
assert.equal(canonicalPlan.pilotAuthorizationGranted, false);
assert.equal(canonicalPlan.livePromotionAllowed, false);
assert.equal(canonicalPlan.requiredSurfaceCount, 7);
assert.equal(canonicalPlan.requiredTaskCount, 7);

assert.throws(
  () => buildInvestmentBusinessRulePropagationChangePlan({ governance: approvedGovernanceFixture() }),
  /accepts repository governance only/,
  'The repository-content planner must reject caller-supplied governance.',
);

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

const legalSurface = canonicalPlan.blueprint.surfaces.find((surface) => surface.id === 'agreement-legal-config');
assert.ok(legalSurface);
assert.ok(
  legalSurface.tasks[0].targets.some((target) => target.path === 'src/app/inversion/legal/page.tsx'),
  'The actual participant-facing legal instrument must be part of propagation planning.',
);

const approvedGovernance = approvedGovernanceFixture();
const approvedSimulation = simulateInvestmentBusinessRulePropagationChangePlan({
  governance: approvedGovernance,
});
assert.equal(approvedSimulation.status, 'SIMULATION_APPROVALS_SATISFIED');
assert.equal(approvedSimulation.authoritative, false);
assert.equal(approvedSimulation.blueprintAuthoritative, false);
assert.equal(approvedSimulation.governanceProvenanceVerified, false);
assert.equal(approvedSimulation.simulatedApprovalsSatisfied, true);
assert.equal(approvedSimulation.implementationPlanningEligible, false);
assert.equal(approvedSimulation.implementationPrEligible, false);
assert.equal(approvedSimulation.implementationAuthorityGranted, false);
assert.equal(approvedSimulation.automaticApprovalAllowed, false);
assert.equal(approvedSimulation.automaticMutationAllowed, false);
assert.equal(approvedSimulation.runtimeMutationAllowedByPlanner, false);
assert.equal(approvedSimulation.propagationVerificationAllowed, false);
assert.equal(approvedSimulation.pilotAuthorizationGranted, false);
assert.equal(approvedSimulation.livePromotionAllowed, false);

const shallowFrozenBlueprint = Object.freeze(clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT));
const shallowFrozenSimulation = simulateInvestmentBusinessRulePropagationChangePlan({
  governance: approvedGovernanceFixture(),
  blueprint: shallowFrozenBlueprint,
});
assert.equal(shallowFrozenSimulation.authoritative, false);
assert.ok(Object.isFrozen(shallowFrozenSimulation.blueprint));
assert.ok(Object.isFrozen(shallowFrozenSimulation.blueprint.surfaces));
assert.ok(Object.isFrozen(shallowFrozenSimulation.blueprint.surfaces[0].tasks));
assert.ok(Object.isFrozen(shallowFrozenSimulation.blueprint.surfaces[0].tasks[0].targets[0]));
assert.throws(
  () => {
    shallowFrozenSimulation.blueprint.surfaces[0].tasks[0].targets[0].path = '.git/config';
  },
  TypeError,
  'A shallow-frozen caller blueprint must become recursively immutable before it is returned in a plan.',
);

const propagatedSimulation = simulateInvestmentBusinessRulePropagationChangePlan({
  governance: approvedGovernance,
  propagation: verifiedPropagationFixture(),
});
assert.equal(propagatedSimulation.status, 'SIMULATION_PROPAGATION_VERIFIED');
assert.equal(propagatedSimulation.authoritative, false);
assert.equal(propagatedSimulation.simulatedPropagationVerified, true);
assert.equal(propagatedSimulation.implementationPlanningEligible, false);
assert.equal(propagatedSimulation.implementationPrEligible, false);
assert.equal(propagatedSimulation.implementationAuthorityGranted, false);
assert.equal(propagatedSimulation.livePromotionAllowed, false);

const staleCandidate = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
staleCandidate.candidate.commit = 'a'.repeat(40);
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(staleCandidate),
  /candidate commit mismatch/,
  'A propagation plan must never transfer authority to another candidate commit.',
);

const missingDependency = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
missingDependency.surfaces.find((surface) => surface.id === 'postgres-runtime').dependsOn = [];
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(missingDependency),
  /dependencies must match the canonical contract/,
  'Required dependency edges cannot be removed from the canonical graph.',
);

const duplicateDependency = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
duplicateDependency.surfaces.find((surface) => surface.id === 'financial-model').dependsOn = ['business-model', 'business-model'];
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(duplicateDependency),
  /dependencies must match the canonical contract/,
);

const unsafeTarget = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
unsafeTarget.surfaces.find((surface) => surface.id === 'business-model').tasks[0].targets = [
  { kind: 'FILE', path: '.git/config' },
];
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(unsafeTarget),
  /targets must match the canonical surface contract/,
  'A surface cannot redirect authority to an unrelated repository path.',
);

const wrongTargetKind = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
wrongTargetKind.surfaces.find((surface) => surface.id === 'postgres-runtime').tasks[0].targets = [
  { kind: 'FILE', path: 'supabase/migrations' },
];
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(wrongTargetKind),
  /targets must match the canonical surface contract/,
);

const wrongAction = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
wrongAction.surfaces.find((surface) => surface.id === 'postgres-runtime').tasks[0].action = 'MODIFY_EXISTING';
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(wrongAction),
  /action must match the canonical surface contract/,
);

const missingRuleCoverage = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT);
missingRuleCoverage.surfaces.find((surface) => surface.id === 'operator-evidence').tasks[0].ruleIds = [
  'BR-002', 'BR-003', 'BR-004', 'BR-005',
];
assert.throws(
  () => validateInvestmentBusinessRulePropagationChangeBlueprint(missingRuleCoverage),
  /business-rule coverage must match the canonical surface contract/,
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
  'src/app/inversion/legal/page.tsx',
  'scripts/golden-path-transactional-smoke.sql',
  'scripts/investment-operational-golden-journey.sql',
  'docs/investment/OPERATING_EVIDENCE_CAPTURE.md',
  'scripts/validate-investment-operating-evidence.mjs',
  'scripts/finalize-investment-operating-evidence.mjs',
]) {
  await access(new URL(`../${path}`, import.meta.url));
}

const [packageSource, docsSource, plannerCliSource, plannerSource] = await Promise.all([
  read('package.json'),
  read('docs/investment/BUSINESS_RULE_PROPAGATION_CHANGE_PLAN.md'),
  read('scripts/plan-investment-business-rule-propagation.mjs'),
  read('src/lib/investment/business-rule-propagation-change-plan.mjs'),
]);
const packageJson = JSON.parse(packageSource);
assert.match(packageJson.scripts.test, /test-investment-business-rule-propagation-change-plan-invariants\.mjs/);
assert.match(packageJson.scripts['investment:br:propagation:plan'], /plan-investment-business-rule-propagation\.mjs/);
assert.match(docsSource, /BLOCKED_AWAITING_CANONICAL_APPROVAL/);
assert.match(docsSource, /APPROVALS_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE/);
assert.match(docsSource, /PROPAGATION_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE/);
assert.match(docsSource, /SIMULATION_\*/);
assert.match(docsSource, /src\/app\/inversion\/legal\/page\.tsx/);
assert.match(docsSource, /new immutable migration/i);
assert.match(docsSource, /does \*\*not\*\* reserve a migration number/i);
assert.match(plannerCliSource, /buildInvestmentBusinessRulePropagationChangePlan\(\)/);
assert.match(plannerCliSource, /result\.status === 'INVALID' \? 1 : 0/);
assert.match(plannerSource, /accepts repository governance only/);
assert.match(plannerSource, /governanceProvenanceVerified: false/);
assert.match(plannerSource, /seen = new WeakSet\(\)/);

console.log('Investment business-rule propagation change planner invariants: PASS');
