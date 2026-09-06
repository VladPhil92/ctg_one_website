import { INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE } from '../../data/investment-business-rule-candidate-authority.mjs';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
  areInvestmentBusinessRulesApproved,
  validateInvestmentBusinessRuleGovernance,
  validateInvestmentBusinessRulePropagation,
} from '../../data/investment-business-rule-governance.mjs';

export const INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_VERSION =
  'ctg-investment-business-rule-main-provenance-v1';

export const INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_REPOSITORY =
  'VladPhil92/ctg_one_website';

export const INVESTMENT_BUSINESS_RULE_GOVERNANCE_PATH =
  'src/data/investment-business-rule-governance.mjs';

export const INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_CLASSIFICATION =
  'github-actions-main-push-provenance';

const FULL_SHA_RE = /^[0-9a-f]{40}$/i;
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const MERGE_SHAPES = Object.freeze(['merge-commit', 'squash']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  if (!Object.isFrozen(value)) Object.freeze(value);
  return value;
}

function validateGovernanceCandidateAuthority(candidate) {
  assert(candidate && typeof candidate === 'object', 'Governance candidate is required');
  assert(candidate.path === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.path, 'Governance candidate path drifted from immutable PR #256 authority');
  assert(candidate.commit === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.commit, 'Governance candidate commit drifted from immutable PR #256 authority');
  assert(candidate.blobSha === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha, 'Governance candidate blob drifted from immutable PR #256 authority');
  assert(candidate.sourcePr === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.sourcePr, 'Governance candidate PR drifted from immutable PR #256 authority');
}

function validateMergePullRequest(mergePullRequest, sha, eventBefore, mergeSecondParentSha, mergeShape) {
  assert(mergePullRequest && typeof mergePullRequest === 'object' && !Array.isArray(mergePullRequest), 'Merged pull-request metadata is required');
  assert(Number.isSafeInteger(mergePullRequest.number) && mergePullRequest.number > 0, 'Merged pull-request number is invalid');
  assert(typeof mergePullRequest.url === 'string' && /^https:\/\/github\.com\/VladPhil92\/ctg_one_website\/pull\/\d+$/.test(mergePullRequest.url), 'Merged pull-request URL is invalid');
  assert(mergePullRequest.url.endsWith(`/pull/${mergePullRequest.number}`), 'Merged pull-request URL/number mismatch');
  assert(mergePullRequest.baseRef === 'main', 'Merged pull request must target main');
  assert(FULL_SHA_RE.test(mergePullRequest.baseSha ?? ''), 'Merged pull-request base SHA is invalid');
  assert(FULL_SHA_RE.test(mergePullRequest.headSha ?? ''), 'Merged pull-request head SHA is invalid');
  assert(mergePullRequest.baseSha === eventBefore, 'Merged pull-request base SHA must equal the push before SHA');
  assert(mergePullRequest.headSha !== mergePullRequest.baseSha, 'Merged pull-request head SHA must differ from its base SHA');
  if (mergeShape === 'merge-commit') {
    assert(mergePullRequest.headSha === mergeSecondParentSha, 'Merged pull-request head SHA must equal the merge second parent');
  } else {
    assert(mergeSecondParentSha === null, 'Squash provenance must not claim a merge second parent');
  }
  assert(mergePullRequest.mergeCommitSha === sha, 'Merged pull-request merge commit must equal the trusted main SHA');
  assert(typeof mergePullRequest.mergedAt === 'string' && ISO_INSTANT_RE.test(mergePullRequest.mergedAt), 'Merged pull-request mergedAt must be an ISO UTC instant');
}

function deriveRuleStatuses(governance) {
  return Object.freeze(
    governance.rules.map((rule) => Object.freeze({ id: rule.id, status: rule.status })),
  );
}

export function createInvestmentBusinessRuleMainProvenanceEvidence({
  repository,
  eventName,
  ref,
  sha,
  headSha,
  eventBefore,
  mergeShape = 'merge-commit',
  mergeFirstParentSha,
  mergeSecondParentSha,
  commitVerified,
  governanceBlobSha,
  candidateBlobSha,
  mergePullRequest,
  workflowName,
  workflowRunId,
  workflowRunAttempt,
  governance = INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  propagation = INVESTMENT_BUSINESS_RULE_PROPAGATION,
} = {}) {
  validateInvestmentBusinessRuleGovernance(governance);
  validateGovernanceCandidateAuthority(governance.candidate);
  validateInvestmentBusinessRulePropagation(governance, propagation);

  assert(repository === INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_REPOSITORY, 'Provenance repository mismatch');
  assert(eventName === 'push', 'Merged-main provenance requires a GitHub push event');
  assert(ref === 'refs/heads/main', 'Merged-main provenance requires refs/heads/main');
  assert(FULL_SHA_RE.test(sha ?? ''), 'Trusted main SHA must be a full Git SHA');
  assert(headSha === sha, 'Checked-out HEAD must equal the trusted main SHA');
  assert(FULL_SHA_RE.test(eventBefore ?? ''), 'Push before SHA must be a full Git SHA');
  assert(eventBefore !== '0'.repeat(40), 'Push before SHA cannot be the zero SHA');
  assert(MERGE_SHAPES.includes(mergeShape), 'Merged-main provenance merge shape is invalid');
  assert(FULL_SHA_RE.test(mergeFirstParentSha ?? ''), 'Merge first parent SHA must be a full Git SHA');
  if (mergeShape === 'merge-commit') {
    assert(FULL_SHA_RE.test(mergeSecondParentSha ?? ''), 'Merge second parent SHA must be a full Git SHA');
  } else {
    assert(mergeSecondParentSha === null, 'Squash provenance must not claim a merge second parent');
  }
  assert(eventBefore === mergeFirstParentSha, 'Push before SHA must equal the merge first parent');
  assert(commitVerified === true, 'Trusted main commit must have verified GitHub commit provenance');
  assert(FULL_SHA_RE.test(governanceBlobSha ?? ''), 'Governance blob SHA must be a full Git SHA');
  assert(candidateBlobSha === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha, 'Pinned BR candidate blob does not match immutable PR #256 authority');
  validateMergePullRequest(mergePullRequest, sha, eventBefore, mergeSecondParentSha, mergeShape);
  assert(typeof workflowName === 'string' && workflowName === 'Investment BR Merged-Main Provenance', 'Unexpected provenance workflow name');
  assert(typeof workflowRunId === 'string' && /^\d+$/.test(workflowRunId), 'Workflow run id is invalid');
  assert(typeof workflowRunAttempt === 'string' && /^[1-9]\d*$/.test(workflowRunAttempt), 'Workflow run attempt is invalid');

  const approvalsSatisfied = areInvestmentBusinessRulesApproved(governance);
  const propagationVerified = propagation.status === 'VERIFIED';
  const workflowEvidenceCandidateEligible = approvalsSatisfied && !propagationVerified;

  const status = propagationVerified
    ? 'PROPAGATION_ALREADY_VERIFIED'
    : approvalsSatisfied
      ? 'MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE'
      : 'BLOCKED_AWAITING_BUSINESS_RULE_APPROVALS';

  return deepFreeze({
    version: INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_VERSION,
    classification: INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_CLASSIFICATION,
    status,
    repository,
    eventName,
    ref,
    trustedMainSha: sha,
    transition: {
      beforeSha: eventBefore,
      afterSha: sha,
      mergeShape,
      firstParentSha: mergeFirstParentSha,
      secondParentSha: mergeSecondParentSha,
      forced: false,
      deleted: false,
    },
    governance: {
      path: INVESTMENT_BUSINESS_RULE_GOVERNANCE_PATH,
      blobSha: governanceBlobSha,
      ruleStatuses: deriveRuleStatuses(governance),
      approvalsSatisfied,
      propagationStatus: propagation.status,
    },
    candidate: { ...INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE },
    mergePullRequest: { ...mergePullRequest },
    workflow: {
      name: workflowName,
      runId: workflowRunId,
      runAttempt: workflowRunAttempt,
    },
    workflowEvidenceCandidateEligible,
    standaloneAuthorityAllowed: false,
    implementationPlanningEligible: false,
    implementationPrEligible: false,
    implementationAuthorityGranted: false,
    automaticMutationAllowed: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
    requiresGitHubArtifactProvenance: true,
    requiresArtifactDigestVerification: true,
    requiresHumanReview: true,
  });
}

export function validateInvestmentBusinessRuleMainProvenanceEvidence(evidence) {
  assert(evidence && typeof evidence === 'object' && !Array.isArray(evidence), 'Merged-main provenance evidence is required');
  assert(evidence.version === INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_VERSION, 'Merged-main provenance evidence version mismatch');
  assert(evidence.classification === INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_CLASSIFICATION, 'Merged-main provenance classification mismatch');
  assert([
    'BLOCKED_AWAITING_BUSINESS_RULE_APPROVALS',
    'MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE',
    'PROPAGATION_ALREADY_VERIFIED',
  ].includes(evidence.status), `Invalid merged-main provenance status: ${evidence.status}`);
  assert(evidence.repository === INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_REPOSITORY, 'Merged-main provenance repository mismatch');
  assert(evidence.eventName === 'push', 'Merged-main provenance evidence must come from a push event');
  assert(evidence.ref === 'refs/heads/main', 'Merged-main provenance evidence must come from main');
  assert(FULL_SHA_RE.test(evidence.trustedMainSha ?? ''), 'Merged-main provenance trusted SHA is invalid');
  assert(FULL_SHA_RE.test(evidence.transition?.beforeSha ?? ''), 'Merged-main provenance before SHA is invalid');
  assert(evidence.transition.beforeSha !== '0'.repeat(40), 'Merged-main provenance before SHA cannot be zero');
  assert(evidence.transition?.afterSha === evidence.trustedMainSha, 'Merged-main provenance after SHA must equal trusted main SHA');
  assert(MERGE_SHAPES.includes(evidence.transition?.mergeShape), 'Merged-main provenance merge shape is invalid');
  assert(evidence.transition?.firstParentSha === evidence.transition.beforeSha, 'Merged-main provenance first parent must equal before SHA');
  if (evidence.transition.mergeShape === 'merge-commit') {
    assert(FULL_SHA_RE.test(evidence.transition?.secondParentSha ?? ''), 'Merged-main provenance second parent SHA is invalid');
  } else {
    assert(evidence.transition?.secondParentSha === null, 'Squash provenance second parent must be null');
  }
  assert(evidence.transition?.forced === false, 'Merged-main provenance cannot originate from a forced push');
  assert(evidence.transition?.deleted === false, 'Merged-main provenance cannot originate from a branch deletion');
  assert(evidence.governance?.path === INVESTMENT_BUSINESS_RULE_GOVERNANCE_PATH, 'Merged-main provenance governance path mismatch');
  assert(FULL_SHA_RE.test(evidence.governance?.blobSha ?? ''), 'Merged-main provenance governance blob is invalid');
  assert(Array.isArray(evidence.governance?.ruleStatuses) && evidence.governance.ruleStatuses.length === INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.length, 'Merged-main provenance must contain exactly five rule statuses');
  const seen = new Set();
  for (const rule of evidence.governance.ruleStatuses) {
    assert(INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.includes(rule.id), `Unknown merged-main provenance rule: ${rule.id}`);
    assert(!seen.has(rule.id), `Duplicate merged-main provenance rule: ${rule.id}`);
    seen.add(rule.id);
    assert(['PENDING', 'APPROVED', 'CHANGES_REQUIRED', 'REJECTED'].includes(rule.status), `${rule.id} has invalid provenance status`);
  }
  assert(evidence.candidate?.path === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.path, 'Merged-main provenance candidate path mismatch');
  assert(evidence.candidate?.commit === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.commit, 'Merged-main provenance candidate commit mismatch');
  assert(evidence.candidate?.blobSha === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha, 'Merged-main provenance candidate blob mismatch');
  assert(evidence.candidate?.sourcePr === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.sourcePr, 'Merged-main provenance candidate PR mismatch');
  validateMergePullRequest(
    evidence.mergePullRequest,
    evidence.trustedMainSha,
    evidence.transition.beforeSha,
    evidence.transition.secondParentSha,
    evidence.transition.mergeShape,
  );
  assert(evidence.workflow?.name === 'Investment BR Merged-Main Provenance', 'Merged-main provenance workflow mismatch');
  assert(typeof evidence.workflow?.runId === 'string' && /^\d+$/.test(evidence.workflow.runId), 'Merged-main provenance run id is invalid');
  assert(typeof evidence.workflow?.runAttempt === 'string' && /^[1-9]\d*$/.test(evidence.workflow.runAttempt), 'Merged-main provenance run attempt is invalid');

  const approvalsSatisfied = evidence.governance.ruleStatuses.every((rule) => rule.status === 'APPROVED');
  assert(evidence.governance.approvalsSatisfied === approvalsSatisfied, 'Merged-main provenance approvalsSatisfied mismatch');
  assert(['PENDING', 'VERIFIED'].includes(evidence.governance.propagationStatus), 'Merged-main provenance propagation status is invalid');
  if (evidence.governance.propagationStatus === 'VERIFIED') {
    assert(approvalsSatisfied, 'Verified propagation provenance requires five approved business rules');
  }
  const expectedStatus = evidence.governance.propagationStatus === 'VERIFIED'
    ? 'PROPAGATION_ALREADY_VERIFIED'
    : approvalsSatisfied
      ? 'MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE'
      : 'BLOCKED_AWAITING_BUSINESS_RULE_APPROVALS';
  assert(evidence.status === expectedStatus, 'Merged-main provenance status does not match governance state');
  const expectedCandidateEligible = approvalsSatisfied && evidence.governance.propagationStatus === 'PENDING';
  assert(evidence.workflowEvidenceCandidateEligible === expectedCandidateEligible, 'Merged-main provenance evidence eligibility mismatch');

  assert(evidence.standaloneAuthorityAllowed === false, 'Standalone provenance files cannot grant authority');
  assert(evidence.implementationPlanningEligible === false, 'Provenance evidence cannot independently grant implementation planning');
  assert(evidence.implementationPrEligible === false, 'Provenance evidence cannot independently grant implementation PR eligibility');
  assert(evidence.implementationAuthorityGranted === false, 'Provenance evidence cannot independently grant implementation authority');
  assert(evidence.automaticMutationAllowed === false, 'Provenance evidence cannot allow automatic mutation');
  assert(evidence.propagationVerificationAllowed === false, 'Provenance evidence cannot mark propagation verified');
  assert(evidence.pilotAuthorizationGranted === false, 'Provenance evidence cannot authorize a pilot');
  assert(evidence.livePromotionAllowed === false, 'Provenance evidence cannot promote LIVE');
  assert(evidence.requiresGitHubArtifactProvenance === true, 'Provenance evidence must require GitHub artifact provenance');
  assert(evidence.requiresArtifactDigestVerification === true, 'Provenance evidence must require artifact digest verification');
  assert(evidence.requiresHumanReview === true, 'Provenance evidence must require human review');
  return evidence;
}

// Fail closed at module load if the mutable governance source ever attempts to
// redefine the immutable PR #256 decision candidate.
validateGovernanceCandidateAuthority(INVESTMENT_BUSINESS_RULE_CANDIDATE);
