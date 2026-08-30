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

function validateMergePullRequest(mergePullRequest, sha) {
  assert(mergePullRequest && typeof mergePullRequest === 'object' && !Array.isArray(mergePullRequest), 'Merged pull-request metadata is required');
  assert(Number.isSafeInteger(mergePullRequest.number) && mergePullRequest.number > 0, 'Merged pull-request number is invalid');
  assert(typeof mergePullRequest.url === 'string' && /^https:\/\/github\.com\/VladPhil92\/ctg_one_website\/pull\/\d+$/.test(mergePullRequest.url), 'Merged pull-request URL is invalid');
  assert(mergePullRequest.baseRef === 'main', 'Merged pull request must target main');
  assert(FULL_SHA_RE.test(mergePullRequest.headSha ?? ''), 'Merged pull-request head SHA is invalid');
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
  validateInvestmentBusinessRulePropagation(governance, propagation);

  assert(repository === INVESTMENT_BUSINESS_RULE_MAIN_PROVENANCE_REPOSITORY, 'Provenance repository mismatch');
  assert(eventName === 'push', 'Merged-main provenance requires a GitHub push event');
  assert(ref === 'refs/heads/main', 'Merged-main provenance requires refs/heads/main');
  assert(FULL_SHA_RE.test(sha ?? ''), 'Trusted main SHA must be a full Git SHA');
  assert(headSha === sha, 'Checked-out HEAD must equal the trusted main SHA');
  assert(commitVerified === true, 'Trusted main commit must have verified GitHub commit provenance');
  assert(FULL_SHA_RE.test(governanceBlobSha ?? ''), 'Governance blob SHA must be a full Git SHA');
  assert(candidateBlobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, 'Pinned BR candidate blob does not match repository candidate authority');
  validateMergePullRequest(mergePullRequest, sha);
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
    governance: {
      path: INVESTMENT_BUSINESS_RULE_GOVERNANCE_PATH,
      blobSha: governanceBlobSha,
      ruleStatuses: deriveRuleStatuses(governance),
      approvalsSatisfied,
      propagationStatus: propagation.status,
    },
    candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
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
  assert(evidence.candidate?.path === INVESTMENT_BUSINESS_RULE_CANDIDATE.path, 'Merged-main provenance candidate path mismatch');
  assert(evidence.candidate?.commit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, 'Merged-main provenance candidate commit mismatch');
  assert(evidence.candidate?.blobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, 'Merged-main provenance candidate blob mismatch');
  assert(evidence.candidate?.sourcePr === INVESTMENT_BUSINESS_RULE_CANDIDATE.sourcePr, 'Merged-main provenance candidate PR mismatch');
  validateMergePullRequest(evidence.mergePullRequest, evidence.trustedMainSha);
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
