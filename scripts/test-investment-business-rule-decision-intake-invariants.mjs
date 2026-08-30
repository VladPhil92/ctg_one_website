import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
} from '../src/data/investment-business-rule-governance.mjs';
import {
  INVESTMENT_BUSINESS_RULE_DECISION_INTAKE_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_MANIFEST_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS,
  buildInvestmentBusinessRulePropagationReadiness,
  summarizeInvestmentBusinessRuleDecisionIntake,
  validateInvestmentBusinessRuleDecisionIntake,
  validateInvestmentBusinessRulePropagationManifest,
} from '../src/lib/investment/business-rule-decision-intake.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function pendingIntake() {
  return {
    version: INVESTMENT_BUSINESS_RULE_DECISION_INTAKE_VERSION,
    candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
    submittedAt: '2026-08-30T06:00:00.000Z',
    decisions: INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.map((id) => ({
      id,
      status: 'PENDING',
      reviewedCandidateCommit: null,
      reviewedCandidateBlobSha: null,
      decidedBy: null,
      decidedAt: null,
      evidenceRef: null,
    })),
  };
}

function approvedIntake() {
  const intake = pendingIntake();
  intake.decisions = INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.map((id, index) => ({
    id,
    status: 'APPROVED',
    reviewedCandidateCommit: INVESTMENT_BUSINESS_RULE_CANDIDATE.commit,
    reviewedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha,
    decidedBy: 'business-governance-reviewer',
    decidedAt: `2026-08-30T06:0${index}:00.000Z`,
    evidenceRef: `decision-record:${id}:fixture`,
  }));
  return intake;
}

function pendingPropagationManifest() {
  return {
    version: INVESTMENT_BUSINESS_RULE_PROPAGATION_MANIFEST_VERSION,
    candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
    preparedAt: '2026-08-30T06:20:00.000Z',
    implementationCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    surfaces: INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS.map((id) => ({
      id,
      status: 'PENDING',
      artifactRefs: [],
      verifiedBy: null,
      verifiedAt: null,
      evidenceRef: null,
    })),
    overallReview: {
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      evidenceRef: null,
    },
  };
}

function verifiedPropagationManifest() {
  const manifest = pendingPropagationManifest();
  const refs = {
    'business-model': ['docs/investment/BUSINESS_MODEL.md'],
    'financial-model': ['docs/investment/FINANCIAL_MODEL.md'],
    'lot-inventory-state-machine': ['docs/investment/DOMAIN_MODEL.md'],
    'agreement-legal-config': ['src/lib/investment/config.ts'],
    'postgres-runtime': ['supabase/migrations/0081_example_business_rule_propagation.sql'],
    'golden-path-tests': ['supabase/tests/investment-golden-path-smoke.sql'],
    'operator-evidence': ['docs/investment/OPERATING_EVIDENCE_CAPTURE.md'],
  };
  manifest.surfaces = INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS.map((id, index) => ({
    id,
    status: 'VERIFIED',
    artifactRefs: refs[id],
    verifiedBy: 'propagation-reviewer',
    verifiedAt: `2026-08-30T06:${30 + index}:00.000Z`,
    evidenceRef: `propagation-surface:${id}:fixture`,
  }));
  manifest.overallReview = {
    status: 'VERIFIED',
    reviewedBy: 'propagation-governance-reviewer',
    reviewedAt: '2026-08-30T06:50:00.000Z',
    evidenceRef: 'propagation-review:fixture',
  };
  return manifest;
}

const pending = pendingIntake();
validateInvestmentBusinessRuleDecisionIntake(pending);
const pendingSummary = summarizeInvestmentBusinessRuleDecisionIntake(pending);
assert.equal(pendingSummary.status, 'INCOMPLETE');
assert.equal(pendingSummary.explicitDecisionCount, 0);
assert.equal(pendingSummary.propagationPlanningEligible, false);
assert.equal(pendingSummary.governancePrReviewEligible, false);
assert.equal(pendingSummary.canonicalMutationAllowed, false);
assert.equal(pendingSummary.automaticApprovalAllowed, false);
assert.deepEqual(pendingSummary.decisionBlockers, INVESTMENT_REQUIRED_BUSINESS_RULE_IDS);

const approved = approvedIntake();
validateInvestmentBusinessRuleDecisionIntake(approved);
const approvedSummary = summarizeInvestmentBusinessRuleDecisionIntake(approved);
assert.equal(approvedSummary.status, 'ALL_APPROVED');
assert.equal(approvedSummary.explicitDecisionCount, 5);
assert.equal(approvedSummary.propagationPlanningEligible, true);
assert.equal(approvedSummary.governancePrReviewEligible, true);
assert.equal(approvedSummary.canonicalMutationAllowed, false);
assert.deepEqual(approvedSummary.decisionBlockers, []);

const changesRequired = approvedIntake();
changesRequired.decisions[2].status = 'CHANGES_REQUIRED';
const changesSummary = summarizeInvestmentBusinessRuleDecisionIntake(changesRequired);
assert.equal(changesSummary.status, 'COMPLETE_NOT_APPROVED');
assert.equal(changesSummary.governancePrReviewEligible, true);
assert.equal(changesSummary.propagationPlanningEligible, false);
assert.deepEqual(changesSummary.decisionBlockers, ['BR-003']);

const staleCandidate = pendingIntake();
staleCandidate.candidate.commit = 'b'.repeat(40);
assert.throws(
  () => validateInvestmentBusinessRuleDecisionIntake(staleCandidate),
  /candidate\.commit mismatch/,
  'Decision authority must never transfer to a different candidate commit.',
);

const duplicateRule = pendingIntake();
duplicateRule.decisions[4].id = 'BR-004';
assert.throws(
  () => validateInvestmentBusinessRuleDecisionIntake(duplicateRule),
  /Duplicate business-rule id: BR-004/,
);

const pendingManifest = pendingPropagationManifest();
validateInvestmentBusinessRulePropagationManifest(pendingManifest);
const pendingReadiness = buildInvestmentBusinessRulePropagationReadiness({ intake: approved, manifest: pendingManifest });
assert.equal(pendingReadiness.status, 'BLOCKED');
assert.deepEqual(pendingReadiness.pendingSurfaces, INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS);
assert.equal(pendingReadiness.canonicalMutationAllowed, false);
assert.equal(pendingReadiness.runtimeMutationAllowed, false);
assert.equal(pendingReadiness.livePromotionAllowed, false);
assert.equal(pendingReadiness.proposedPropagationRecord.status, 'PENDING');

const partialDecisionReadiness = buildInvestmentBusinessRulePropagationReadiness({
  intake: changesRequired,
  manifest: pendingManifest,
});
assert.equal(partialDecisionReadiness.status, 'BLOCKED');
assert.deepEqual(partialDecisionReadiness.decisionBlockers, ['BR-003']);

const prematureOverall = pendingPropagationManifest();
prematureOverall.overallReview = {
  status: 'VERIFIED',
  reviewedBy: 'reviewer',
  reviewedAt: '2026-08-30T06:50:00.000Z',
  evidenceRef: 'propagation-review:premature',
};
assert.throws(
  () => validateInvestmentBusinessRulePropagationManifest(prematureOverall),
  /cannot be VERIFIED before every required surface is VERIFIED/,
);

const missingSurface = pendingPropagationManifest();
missingSurface.surfaces.pop();
assert.throws(
  () => validateInvestmentBusinessRulePropagationManifest(missingSurface),
  /exactly seven required surfaces/,
);

const traversal = verifiedPropagationManifest();
traversal.surfaces[0].artifactRefs = ['../private/decision.json'];
assert.throws(
  () => validateInvestmentBusinessRulePropagationManifest(traversal),
  /cannot traverse directories/,
);

const stalePropagationCandidate = verifiedPropagationManifest();
stalePropagationCandidate.candidate.blobSha = 'c'.repeat(40);
assert.throws(
  () => validateInvestmentBusinessRulePropagationManifest(stalePropagationCandidate),
  /candidate\.blobSha mismatch/,
);

const verifiedManifest = verifiedPropagationManifest();
validateInvestmentBusinessRulePropagationManifest(verifiedManifest);
const ready = buildInvestmentBusinessRulePropagationReadiness({ intake: approved, manifest: verifiedManifest });
assert.equal(ready.status, 'ELIGIBLE_FOR_PROPAGATION_GOVERNANCE_PR');
assert.deepEqual(ready.pendingSurfaces, []);
assert.equal(ready.overallReviewVerified, true);
assert.equal(ready.proposedPropagationRecord.status, 'VERIFIED');
assert.equal(ready.canonicalMutationAllowed, false);
assert.equal(ready.runtimeMutationAllowed, false);
assert.equal(ready.livePromotionAllowed, false);

assert.ok(INVESTMENT_BUSINESS_RULE_GOVERNANCE.rules.every((rule) => rule.status === 'PENDING'));
assert.equal(INVESTMENT_BUSINESS_RULE_PROPAGATION.status, 'PENDING');

const [packageSource, docsSource] = await Promise.all([
  read('package.json'),
  read('docs/investment/BUSINESS_RULE_DECISION_INTAKE.md'),
]);
const packageJson = JSON.parse(packageSource);
assert.match(packageJson.scripts.test, /test-investment-business-rule-decision-intake-invariants\.mjs/);
assert.match(packageJson.scripts['investment:br:intake:template'], /create-investment-business-rule-decision-intake-template\.mjs/);
assert.match(packageJson.scripts['investment:br:intake:validate'], /validate-investment-business-rule-decision-intake\.mjs/);
assert.match(packageJson.scripts['investment:br:propagation:template'], /create-investment-business-rule-propagation-template\.mjs/);
assert.match(packageJson.scripts['investment:br:propagation:validate'], /validate-investment-business-rule-propagation-readiness\.mjs/);
assert.match(docsSource, /does not approve BR-001\.\.BR-005/i);
assert.match(docsSource, /canonicalMutationAllowed.*false/i);

console.log('Investment business-rule decision intake and propagation readiness invariants: PASS');
