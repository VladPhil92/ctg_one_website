import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE } from '../src/data/investment-business-rule-candidate-authority.mjs';
import {
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
} from '../src/data/investment-business-rule-governance.mjs';
import {
  INVESTMENT_BR_PROVENANCE_AUTHORIZATION,
  INVESTMENT_BR_PROVENANCE_AUTHORIZATION_VERSION,
  deriveInvestmentBusinessRuleProvenanceAuthorizationObservation,
  validateInvestmentBusinessRuleProvenanceAuthorization,
} from '../src/data/investment-business-rule-provenance-authorization.mjs';
import { createInvestmentBusinessRuleMainProvenanceEvidence } from '../src/lib/investment/business-rule-main-provenance.mjs';
import {
  createInvestmentBusinessRuleProvenanceArtifactReview,
  validateInvestmentBusinessRuleProvenanceArtifactReview,
} from '../src/lib/investment/business-rule-provenance-artifact-review.mjs';
import {
  createInvestmentBusinessRuleProvenanceReviewTransport,
  validateInvestmentBusinessRuleProvenanceReviewTransport,
} from '../src/lib/investment/business-rule-provenance-review-transport.mjs';
import {
  createInvestmentBusinessRuleProvenanceHumanReviewRecord,
  validateInvestmentBusinessRuleProvenanceHumanReviewRecord,
} from '../src/lib/investment/business-rule-provenance-human-review.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const trustedSha = 'a'.repeat(40);
const beforeSha = 'b'.repeat(40);
const headSha = 'c'.repeat(40);
const governanceBlobSha = 'd'.repeat(40);
const artifactDigest = `sha256:${'e'.repeat(64)}`;

function approvedGovernanceFixture() {
  return {
    version: INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
    candidate: { ...INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE },
    rules: INVESTMENT_BUSINESS_RULE_GOVERNANCE.rules.map((rule, index) => ({
      id: rule.id,
      status: 'APPROVED',
      reviewedCandidateCommit: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.commit,
      reviewedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha,
      decidedBy: `authorized-reviewer-${index + 1}`,
      decidedAt: `2026-08-30T13:0${index}:00Z`,
      evidenceRef: `decision-${index + 1}`,
    })),
  };
}

function provenanceEvidence(governance = INVESTMENT_BUSINESS_RULE_GOVERNANCE) {
  return createInvestmentBusinessRuleMainProvenanceEvidence({
    repository: 'VladPhil92/ctg_one_website',
    eventName: 'push',
    ref: 'refs/heads/main',
    sha: trustedSha,
    headSha: trustedSha,
    eventBefore: beforeSha,
    mergeFirstParentSha: beforeSha,
    mergeSecondParentSha: headSha,
    commitVerified: true,
    governanceBlobSha,
    candidateBlobSha: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha,
    mergePullRequest: {
      number: 777,
      url: 'https://github.com/VladPhil92/ctg_one_website/pull/777',
      mergedAt: '2026-08-30T13:30:00Z',
      mergeCommitSha: trustedSha,
      baseRef: 'main',
      baseSha: beforeSha,
      headSha,
    },
    workflowName: 'Investment BR Merged-Main Provenance',
    workflowRunId: '33333333333',
    workflowRunAttempt: '1',
    governance,
    propagation: INVESTMENT_BUSINESS_RULE_PROPAGATION,
  });
}

function sourceRun(evidence) {
  return {
    id: Number(evidence.workflow.runId),
    name: 'Investment BR Merged-Main Provenance',
    path: '.github/workflows/investment-br-merged-main-provenance.yml',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    head_branch: 'main',
    head_sha: evidence.trustedMainSha,
    run_attempt: Number(evidence.workflow.runAttempt),
    repository: { full_name: 'VladPhil92/ctg_one_website' },
    head_repository: { full_name: 'VladPhil92/ctg_one_website' },
    html_url: `https://github.com/VladPhil92/ctg_one_website/actions/runs/${evidence.workflow.runId}`,
    created_at: '2026-08-30T13:30:10Z',
    updated_at: '2026-08-30T13:31:00Z',
  };
}

function sourceArtifact(evidence) {
  return {
    id: 9733999999,
    name: `investment-br-main-provenance-${evidence.trustedMainSha}`,
    size_in_bytes: 2048,
    expired: false,
    digest: artifactDigest,
    created_at: '2026-08-30T13:30:30Z',
    expires_at: '2026-09-29T13:30:30Z',
    workflow_run: {
      id: Number(evidence.workflow.runId),
      head_branch: 'main',
      head_sha: evidence.trustedMainSha,
    },
  };
}

function technicalReviewFor(evidence) {
  const run = sourceRun(evidence);
  const artifact = sourceArtifact(evidence);
  return createInvestmentBusinessRuleProvenanceArtifactReview({
    run,
    artifact,
    evidence,
    downloadedArchiveDigest: artifact.digest,
    expectedArtifactId: artifact.id,
    expectedArtifactDigest: artifact.digest,
  });
}

function reviewEnvelopeFor(technicalReview) {
  return createInvestmentBusinessRuleProvenanceReviewTransport({
    technicalReview,
    reviewWorkflow: {
      name: 'Investment BR Provenance Artifact Review',
      path: '.github/workflows/investment-br-provenance-artifact-review.yml',
      event: 'workflow_dispatch',
      ref: 'refs/heads/main',
      headSha: 'f'.repeat(40),
      runId: 44444444444,
      runAttempt: 1,
      actor: 'operator-reviewer',
      requestedSourceRunId: technicalReview.workflow.runId,
      requestedArtifactId: technicalReview.artifact.id,
      requestedArtifactDigest: technicalReview.artifact.digest,
    },
  });
}

const blockedEvidence = provenanceEvidence();
const blockedTechnical = technicalReviewFor(blockedEvidence);
validateInvestmentBusinessRuleProvenanceArtifactReview(blockedTechnical);
assert.equal(blockedTechnical.status, 'BLOCKED_SOURCE_NOT_ELIGIBLE');
assert.equal(blockedTechnical.transportVerified, true);
assert.equal(blockedTechnical.downloadedArchiveDigestVerified, true);
assert.equal(blockedTechnical.sourceEligibleForHumanReview, false);
assert.equal(blockedTechnical.humanReviewRequired, false);
assert.equal(blockedTechnical.implementationPrEligible, false);
assert.equal(blockedTechnical.livePromotionAllowed, false);

const blockedEnvelope = reviewEnvelopeFor(blockedTechnical);
validateInvestmentBusinessRuleProvenanceReviewTransport(blockedEnvelope);
assert.equal(blockedEnvelope.reviewTransportVerified, true);
assert.equal(blockedEnvelope.humanReviewRequired, false);
assert.equal(blockedEnvelope.implementationPrEligible, false);

const blockedHuman = createInvestmentBusinessRuleProvenanceHumanReviewRecord({
  reviewEnvelope: blockedEnvelope,
  technicalReviewArtifact: {
    id: 9744000001,
    name: `investment-br-provenance-technical-review-${blockedTechnical.workflow.runId}-${blockedTechnical.artifact.id}`,
    digest: `sha256:${'1'.repeat(64)}`,
    workflowRunId: blockedEnvelope.reviewWorkflow.runId,
    reviewHeadSha: blockedEnvelope.reviewWorkflow.headSha,
  },
  decision: 'PENDING',
});
validateInvestmentBusinessRuleProvenanceHumanReviewRecord(blockedHuman, blockedEnvelope);
assert.equal(blockedHuman.status, 'BLOCKED_SOURCE_NOT_ELIGIBLE');
assert.equal(blockedHuman.implementationPrEligible, false);
assert.throws(
  () => createInvestmentBusinessRuleProvenanceHumanReviewRecord({
    reviewEnvelope: blockedEnvelope,
    technicalReviewArtifact: blockedHuman.source.technicalReviewArtifact,
    decision: 'APPROVED',
    reviewedBy: 'reviewer',
    reviewedAt: '2026-08-30T14:00:00Z',
    evidenceRef: 'https://github.com/VladPhil92/ctg_one_website/issues/219',
  }),
  /non-eligible provenance source/i,
);

const eligibleEvidence = provenanceEvidence(approvedGovernanceFixture());
const eligibleTechnical = technicalReviewFor(eligibleEvidence);
assert.equal(eligibleTechnical.status, 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW');
assert.equal(eligibleTechnical.sourceEligibleForHumanReview, true);
assert.equal(eligibleTechnical.humanReviewRequired, true);
assert.equal(eligibleTechnical.implementationPrEligible, false);
const eligibleEnvelope = reviewEnvelopeFor(eligibleTechnical);
const technicalArtifact = {
  id: 9744000002,
  name: `investment-br-provenance-technical-review-${eligibleTechnical.workflow.runId}-${eligibleTechnical.artifact.id}`,
  digest: `sha256:${'2'.repeat(64)}`,
  workflowRunId: eligibleEnvelope.reviewWorkflow.runId,
  reviewHeadSha: eligibleEnvelope.reviewWorkflow.headSha,
};

const pendingHuman = createInvestmentBusinessRuleProvenanceHumanReviewRecord({
  reviewEnvelope: eligibleEnvelope,
  technicalReviewArtifact: technicalArtifact,
});
assert.equal(pendingHuman.status, 'AWAITING_HUMAN_REVIEW');
assert.equal(pendingHuman.canonicalAuthorizationRequired, false);
assert.equal(pendingHuman.implementationPrEligible, false);

const approvedHuman = createInvestmentBusinessRuleProvenanceHumanReviewRecord({
  reviewEnvelope: eligibleEnvelope,
  technicalReviewArtifact: technicalArtifact,
  decision: 'APPROVED',
  reviewedBy: 'authorized-human-reviewer',
  reviewedAt: '2026-08-30T14:00:00Z',
  evidenceRef: 'https://github.com/VladPhil92/ctg_one_website/issues/219',
});
validateInvestmentBusinessRuleProvenanceHumanReviewRecord(approvedHuman, eligibleEnvelope);
assert.equal(approvedHuman.status, 'HUMAN_REVIEW_APPROVED_REQUIRES_CANONICAL_AUTHORIZATION');
assert.equal(approvedHuman.canonicalAuthorizationRequired, true);
assert.equal(approvedHuman.standaloneAuthorityAllowed, false);
assert.equal(approvedHuman.implementationPrEligible, false);
assert.equal(approvedHuman.implementationAuthorityGranted, false);
assert.equal(approvedHuman.pilotAuthorizationGranted, false);
assert.equal(approvedHuman.livePromotionAllowed, false);

assert.throws(
  () => createInvestmentBusinessRuleProvenanceHumanReviewRecord({
    reviewEnvelope: eligibleEnvelope,
    technicalReviewArtifact: technicalArtifact,
    decision: 'APPROVED',
    reviewedBy: 'authorized-human-reviewer',
    reviewedAt: '2026-08-29T14:00:00Z',
    evidenceRef: 'https://github.com/VladPhil92/ctg_one_website/issues/219',
  }),
  /cannot predate/i,
);
assert.throws(
  () => createInvestmentBusinessRuleProvenanceHumanReviewRecord({
    reviewEnvelope: eligibleEnvelope,
    technicalReviewArtifact: { ...technicalArtifact, digest: `sha256:${'3'.repeat(64)}` },
    decision: 'APPROVED',
    reviewedBy: 'authorized-human-reviewer',
    reviewedAt: '2026-08-30T14:00:00Z',
    evidenceRef: 'https://example.com/review',
  }),
  /evidenceRef/i,
);

for (const [label, runOverride, artifactOverride, digestOverride, expected] of [
  ['wrong run name', { name: 'Other Workflow' }, {}, null, /workflow name/i],
  ['manual source run', { event: 'workflow_dispatch' }, {}, null, /originate from push/i],
  ['failed source run', { conclusion: 'failure' }, {}, null, /conclude success/i],
  ['wrong source branch', { head_branch: 'feature' }, {}, null, /target main/i],
  ['source SHA drift', { head_sha: '9'.repeat(40) }, {}, null, /head SHA/i],
  ['expired artifact', {}, { expired: true }, null, /expired/i],
  ['artifact run drift', {}, { workflow_run: { ...sourceArtifact(eligibleEvidence).workflow_run, id: 1 } }, null, /run id mismatch/i],
  ['archive digest drift', {}, {}, `sha256:${'9'.repeat(64)}`, /downloaded provenance archive digest/i],
]) {
  const run = { ...sourceRun(eligibleEvidence), ...runOverride };
  const artifact = { ...sourceArtifact(eligibleEvidence), ...artifactOverride };
  assert.throws(
    () => createInvestmentBusinessRuleProvenanceArtifactReview({
      run,
      artifact,
      evidence: eligibleEvidence,
      downloadedArchiveDigest: digestOverride ?? artifact.digest,
      expectedArtifactId: artifact.id,
      expectedArtifactDigest: artifact.digest,
    }),
    expected,
    label,
  );
}

assert.throws(
  () => createInvestmentBusinessRuleProvenanceReviewTransport({
    technicalReview: eligibleTechnical,
    reviewWorkflow: { ...eligibleEnvelope.reviewWorkflow, ref: 'refs/heads/feature' },
  }),
  /execute from main/i,
);
assert.throws(
  () => createInvestmentBusinessRuleProvenanceReviewTransport({
    technicalReview: eligibleTechnical,
    reviewWorkflow: { ...eligibleEnvelope.reviewWorkflow, requestedArtifactDigest: `sha256:${'4'.repeat(64)}` },
  }),
  /requested artifact digest mismatch/i,
);

validateInvestmentBusinessRuleProvenanceAuthorization(INVESTMENT_BR_PROVENANCE_AUTHORIZATION);
const pendingAuthorization = deriveInvestmentBusinessRuleProvenanceAuthorizationObservation(INVESTMENT_BR_PROVENANCE_AUTHORIZATION);
assert.equal(pendingAuthorization.status, 'BLOCKED_AWAITING_CANONICAL_AUTHORIZATION');
assert.equal(pendingAuthorization.implementationPrEligible, false);

const authorizedFixture = {
  version: INVESTMENT_BR_PROVENANCE_AUTHORIZATION_VERSION,
  status: 'AUTHORIZED',
  candidate: { ...INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE },
  trustedMainSha: eligibleTechnical.source.trustedMainSha,
  governanceBlobSha: eligibleTechnical.source.governanceBlobSha,
  provenanceRunId: eligibleTechnical.workflow.runId,
  artifactId: eligibleTechnical.artifact.id,
  artifactDigest: eligibleTechnical.artifact.digest,
  technicalReviewArtifactRef: 'github-actions-artifact:9744000002',
  humanReviewRef: 'https://github.com/VladPhil92/ctg_one_website/issues/219',
  authorizedBy: 'authorized-human-reviewer',
  authorizedAt: '2026-08-30T14:05:00Z',
};
validateInvestmentBusinessRuleProvenanceAuthorization(authorizedFixture);
const authorizationObservation = deriveInvestmentBusinessRuleProvenanceAuthorizationObservation(authorizedFixture);
assert.equal(authorizationObservation.status, 'AUTHORIZATION_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE');
assert.equal(authorizationObservation.authorizationRecorded, true);
assert.equal(authorizationObservation.mergedMainAuthorizationProvenanceRequired, true);
assert.equal(authorizationObservation.implementationPrEligible, false);
assert.equal(authorizationObservation.livePromotionAllowed, false);

const workflow = await read('.github/workflows/investment-br-provenance-artifact-review.yml');
assert.match(workflow, /name:\s*Investment BR Provenance Artifact Review/);
assert.match(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /\n\s*push:\s*\n/);
assert.doesNotMatch(workflow, /\n\s*pull_request:\s*\n/);
assert.match(workflow, /test "\$\{GITHUB_REF\}" = 'refs\/heads\/main'/);
assert.match(workflow, /actions\/runs\/\$\{BR_REVIEW_EXPECTED_SOURCE_RUN_ID\}/);
assert.match(workflow, /actions\/artifacts\/\$\{BR_REVIEW_EXPECTED_ARTIFACT_ID\}/);
assert.match(workflow, /sha256sum/);
assert.match(workflow, /unzip -Z1/);
assert.match(workflow, /entry_count/);
assert.match(workflow, /git merge-base --is-ancestor/);
assert.match(workflow, /commit\.verification\.verified == true/);
assert.match(workflow, /\.base\.sha == \$before/);
assert.match(workflow, /\.head\.sha == \$second/);
assert.match(workflow, /investment-business-rule-candidate-authority\.mjs/);
assert.match(workflow, /actions\/upload-artifact@v7/);
assert.match(workflow, /artifact-digest/);
assert.match(workflow, /create-investment-business-rule-provenance-human-review-template\.mjs/);

const packageSource = await read('package.json');
assert.equal((packageSource.match(/"test"\s*:/g) ?? []).length, 1, 'package.json must contain one canonical test key');

const docs = await read('docs/investment/PROVENANCE_ARTIFACT_REVIEW_AND_AUTHORIZATION.md');
assert.match(docs, /artifact ID/i);
assert.match(docs, /artifact digest/i);
assert.match(docs, /downloaded.*SHA-256/i);
assert.match(docs, /human review/i);
assert.match(docs, /canonical authorization/i);
assert.match(docs, /does not approve BR-001\.\.BR-005/i);
assert.match(docs, /implementation.*false/i);

console.log('Investment BR provenance artifact review and authorization invariants: PASS');
