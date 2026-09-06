import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE } from '../src/data/investment-business-rule-candidate-authority.mjs';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
} from '../src/data/investment-business-rule-governance.mjs';
import {
  createInvestmentBusinessRuleMainProvenanceEvidence,
  validateInvestmentBusinessRuleMainProvenanceEvidence,
} from '../src/lib/investment/business-rule-main-provenance.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const trustedSha = 'a'.repeat(40);
const beforeSha = 'b'.repeat(40);
const headParentSha = 'c'.repeat(40);
const governanceBlobSha = 'd'.repeat(40);
const baseContext = {
  repository: 'VladPhil92/ctg_one_website',
  eventName: 'push',
  ref: 'refs/heads/main',
  sha: trustedSha,
  headSha: trustedSha,
  eventBefore: beforeSha,
  mergeShape: 'merge-commit',
  mergeFirstParentSha: beforeSha,
  mergeSecondParentSha: headParentSha,
  commitVerified: true,
  governanceBlobSha,
  candidateBlobSha: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha,
  mergePullRequest: {
    number: 999,
    url: 'https://github.com/VladPhil92/ctg_one_website/pull/999',
    mergedAt: '2026-08-30T12:00:00Z',
    mergeCommitSha: trustedSha,
    baseRef: 'main',
    baseSha: beforeSha,
    headSha: headParentSha,
  },
  workflowName: 'Investment BR Merged-Main Provenance',
  workflowRunId: '123456789',
  workflowRunAttempt: '1',
};

assert.deepEqual(INVESTMENT_BUSINESS_RULE_CANDIDATE, INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE);

function approvedGovernanceFixture() {
  return {
    version: INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
    candidate: { ...INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE },
    rules: INVESTMENT_BUSINESS_RULE_GOVERNANCE.rules.map((rule, index) => ({
      id: rule.id,
      status: 'APPROVED',
      reviewedCandidateCommit: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.commit,
      reviewedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha,
      decidedBy: `reviewer-${index + 1}`,
      decidedAt: `2026-08-30T12:0${index}:00Z`,
      evidenceRef: `governance-review-${index + 1}`,
    })),
  };
}

const blocked = createInvestmentBusinessRuleMainProvenanceEvidence(baseContext);
validateInvestmentBusinessRuleMainProvenanceEvidence(blocked);
assert.equal(blocked.status, 'BLOCKED_AWAITING_BUSINESS_RULE_APPROVALS');
assert.equal(blocked.workflowEvidenceCandidateEligible, false);
assert.equal(blocked.transition.beforeSha, beforeSha);
assert.equal(blocked.transition.afterSha, trustedSha);
assert.equal(blocked.transition.mergeShape, 'merge-commit');
assert.equal(blocked.transition.firstParentSha, beforeSha);
assert.equal(blocked.transition.secondParentSha, headParentSha);
assert.equal(blocked.transition.forced, false);
assert.equal(blocked.transition.deleted, false);
assert.equal(blocked.standaloneAuthorityAllowed, false);
assert.equal(blocked.implementationPlanningEligible, false);
assert.equal(blocked.implementationPrEligible, false);
assert.equal(blocked.implementationAuthorityGranted, false);
assert.equal(blocked.automaticMutationAllowed, false);
assert.equal(blocked.pilotAuthorizationGranted, false);
assert.equal(blocked.livePromotionAllowed, false);
assert.ok(Object.isFrozen(blocked));
assert.ok(Object.isFrozen(blocked.transition));
assert.ok(Object.isFrozen(blocked.governance));
assert.ok(Object.isFrozen(blocked.governance.ruleStatuses));
assert.ok(Object.isFrozen(blocked.governance.ruleStatuses[0]));

const squash = createInvestmentBusinessRuleMainProvenanceEvidence({
  ...baseContext,
  mergeShape: 'squash',
  mergeSecondParentSha: null,
});
validateInvestmentBusinessRuleMainProvenanceEvidence(squash);
assert.equal(squash.transition.mergeShape, 'squash');
assert.equal(squash.transition.secondParentSha, null);

const approvedGovernance = approvedGovernanceFixture();
const eligibleEvidenceCandidate = createInvestmentBusinessRuleMainProvenanceEvidence({
  ...baseContext,
  governance: approvedGovernance,
  propagation: INVESTMENT_BUSINESS_RULE_PROPAGATION,
});
validateInvestmentBusinessRuleMainProvenanceEvidence(eligibleEvidenceCandidate);
assert.equal(eligibleEvidenceCandidate.status, 'MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE');
assert.equal(eligibleEvidenceCandidate.workflowEvidenceCandidateEligible, true);
assert.equal(eligibleEvidenceCandidate.standaloneAuthorityAllowed, false);
assert.equal(eligibleEvidenceCandidate.implementationPlanningEligible, false);
assert.equal(eligibleEvidenceCandidate.implementationPrEligible, false);
assert.equal(eligibleEvidenceCandidate.implementationAuthorityGranted, false);
assert.equal(eligibleEvidenceCandidate.requiresGitHubArtifactProvenance, true);
assert.equal(eligibleEvidenceCandidate.requiresArtifactDigestVerification, true);
assert.equal(eligibleEvidenceCandidate.requiresHumanReview, true);

const propagated = createInvestmentBusinessRuleMainProvenanceEvidence({
  ...baseContext,
  governance: approvedGovernance,
  propagation: {
    version: INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
    status: 'VERIFIED',
    verifiedCandidateCommit: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.commit,
    verifiedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha,
    verifiedBy: 'independent-reviewer',
    verifiedAt: '2026-08-30T13:00:00Z',
    evidenceRef: 'propagation-evidence',
  },
});
assert.equal(propagated.status, 'PROPAGATION_ALREADY_VERIFIED');
assert.equal(propagated.workflowEvidenceCandidateEligible, false);
assert.equal(propagated.implementationPrEligible, false);

const inconsistentVerifiedEvidence = structuredClone(propagated);
inconsistentVerifiedEvidence.governance.ruleStatuses[0].status = 'PENDING';
inconsistentVerifiedEvidence.governance.approvalsSatisfied = false;
assert.throws(
  () => validateInvestmentBusinessRuleMainProvenanceEvidence(inconsistentVerifiedEvidence),
  /requires five approved business rules/i,
);

for (const [label, override, expected] of [
  ['wrong repository', { repository: 'someone/else' }, /repository mismatch/i],
  ['manual event', { eventName: 'workflow_dispatch' }, /requires a GitHub push event/i],
  ['wrong ref', { ref: 'refs/heads/feature' }, /requires refs\/heads\/main/i],
  ['head drift', { headSha: 'e'.repeat(40) }, /HEAD must equal/i],
  ['zero before', { eventBefore: '0'.repeat(40), mergeFirstParentSha: '0'.repeat(40), mergePullRequest: { ...baseContext.mergePullRequest, baseSha: '0'.repeat(40) } }, /cannot be the zero SHA/i],
  ['replayed before', { eventBefore: 'e'.repeat(40) }, /before SHA must equal the merge first parent/i],
  ['first parent drift', { mergeFirstParentSha: 'e'.repeat(40) }, /before SHA must equal the merge first parent/i],
  ['second parent drift', { mergeSecondParentSha: 'e'.repeat(40) }, /head SHA must equal the merge second parent/i],
  ['invalid merge shape', { mergeShape: 'rebase' }, /merge shape is invalid/i],
  ['squash second parent', { mergeShape: 'squash' }, /must not claim a merge second parent/i],
  ['unverified commit', { commitVerified: false }, /verified GitHub commit provenance/i],
  ['candidate drift', { candidateBlobSha: 'e'.repeat(40) }, /candidate blob/i],
  ['wrong merge base ref', { mergePullRequest: { ...baseContext.mergePullRequest, baseRef: 'develop' } }, /target main/i],
  ['wrong merge base sha', { mergePullRequest: { ...baseContext.mergePullRequest, baseSha: 'e'.repeat(40) } }, /base SHA must equal/i],
  ['wrong merge head sha', { mergePullRequest: { ...baseContext.mergePullRequest, headSha: 'e'.repeat(40) } }, /head SHA must equal/i],
  ['wrong merge sha', { mergePullRequest: { ...baseContext.mergePullRequest, mergeCommitSha: 'e'.repeat(40) } }, /merge commit must equal/i],
]) {
  assert.throws(
    () => createInvestmentBusinessRuleMainProvenanceEvidence({ ...baseContext, ...override }),
    expected,
    label,
  );
}

const tamperedTransition = structuredClone(blocked);
tamperedTransition.transition.beforeSha = 'e'.repeat(40);
assert.throws(
  () => validateInvestmentBusinessRuleMainProvenanceEvidence(tamperedTransition),
  /first parent must equal before SHA|base SHA must equal/i,
);

const tampered = structuredClone(eligibleEvidenceCandidate);
tampered.standaloneAuthorityAllowed = true;
assert.throws(
  () => validateInvestmentBusinessRuleMainProvenanceEvidence(tampered),
  /cannot grant authority/i,
);

const workflowSource = await read('.github/workflows/investment-br-merged-main-provenance.yml');
assert.match(workflowSource, /name:\s*Investment BR Merged-Main Provenance/);
assert.match(workflowSource, /on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/);
assert.doesNotMatch(workflowSource, /workflow_dispatch\s*:/);
assert.doesNotMatch(workflowSource, /pull_request\s*:/);
assert.match(workflowSource, /test "\$\{GITHUB_EVENT_NAME\}" = 'push'/);
assert.match(workflowSource, /test "\$\{GITHUB_REF\}" = 'refs\/heads\/main'/);
assert.match(workflowSource, /event_after=.*\.after/);
assert.match(workflowSource, /event_before=.*\.before/);
assert.match(workflowSource, /event_forced=.*\.forced/);
assert.match(workflowSource, /event_deleted=.*\.deleted/);
assert.match(workflowSource, /test "\$\{event_forced\}" = 'false'/);
assert.match(workflowSource, /test "\$\{event_deleted\}" = 'false'/);
assert.match(workflowSource, /test "\$\{event_after\}" = "\$\{GITHUB_SHA\}"/);
assert.match(workflowSource, /BR_PROVENANCE_EVENT_BEFORE/);
assert.match(workflowSource, /git rev-parse HEAD/);
assert.match(workflowSource, /\.commit\.verification\.verified == true/);
assert.match(workflowSource, /\(\.parents \| length\) == 1/);
assert.match(workflowSource, /\(\.parents \| length\) == 2/);
assert.match(workflowSource, /BR_PROVENANCE_MERGE_SHAPE/);
assert.match(workflowSource, /\.parents\[0\]\.sha/);
assert.match(workflowSource, /\.parents\[1\]\.sha/);
assert.match(workflowSource, /test "\$\{first_parent\}" = "\$\{BR_PROVENANCE_EVENT_BEFORE\}"/);
assert.match(workflowSource, /\.base\.sha == \$before/);
assert.match(workflowSource, /\.merge_commit_sha == \$sha/);
assert.match(workflowSource, /test "\$\{exact_count\}" = '1'/);
assert.match(workflowSource, /test "\$\{second_parent\}" = "\$\{merged_pr_head\}"/);
assert.match(workflowSource, /investment-business-rule-candidate-authority\.mjs/);
assert.match(workflowSource, /git rev-parse "\$\{candidate_commit\}:\$\{candidate_path\}"/);
assert.match(workflowSource, /HEAD:src\/data\/investment-business-rule-governance\.mjs/);
assert.match(workflowSource, /actions\/upload-artifact@v7/);
assert.match(workflowSource, /id:\s*provenance-artifact/);
assert.match(workflowSource, /artifact-digest/);
assert.match(workflowSource, /investment-br-main-provenance-\$\{\{ github\.sha \}\}/);

const emitterSource = await read('scripts/create-investment-business-rule-main-provenance-evidence.mjs');
assert.match(emitterSource, /GITHUB_ACTIONS !== 'true'/);
assert.match(emitterSource, /BR_PROVENANCE_EVENT_BEFORE/);
assert.match(emitterSource, /BR_PROVENANCE_MERGE_SHAPE/);
assert.match(emitterSource, /mergeShape === 'merge-commit'/);
assert.match(emitterSource, /mergeShape === 'squash'/);
assert.match(emitterSource, /standaloneAuthorityAllowed/);

const docs = await read('docs/investment/BUSINESS_RULE_MAIN_PROVENANCE.md');
assert.match(docs, /push.*main/i);
assert.match(docs, /artifact digest/i);
assert.match(docs, /standalone.*authority/i);
assert.match(docs, /BR-001.*BR-005/i);
assert.match(docs, /does not approve/i);

console.log('Investment business-rule merged-main provenance invariants: PASS');
