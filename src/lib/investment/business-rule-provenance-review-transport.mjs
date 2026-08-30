import {
  INVESTMENT_BR_PROVENANCE_ARTIFACT_REVIEW_VERSION,
  INVESTMENT_BR_PROVENANCE_REPOSITORY,
  validateInvestmentBusinessRuleProvenanceArtifactReview,
} from './business-rule-provenance-artifact-review.mjs';

export const INVESTMENT_BR_PROVENANCE_REVIEW_TRANSPORT_VERSION =
  'ctg-investment-br-provenance-review-transport-v1';
export const INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_NAME =
  'Investment BR Provenance Artifact Review';
export const INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_PATH =
  '.github/workflows/investment-br-provenance-artifact-review.yml';

const FULL_SHA_RE = /^[0-9a-f]{40}$/i;

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

export function createInvestmentBusinessRuleProvenanceReviewTransport({
  technicalReview,
  reviewWorkflow,
} = {}) {
  validateInvestmentBusinessRuleProvenanceArtifactReview(technicalReview);
  assert(reviewWorkflow && typeof reviewWorkflow === 'object' && !Array.isArray(reviewWorkflow), 'Review workflow transport metadata is required');
  assert(reviewWorkflow.name === INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_NAME, 'Review workflow name mismatch');
  assert(reviewWorkflow.path === INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_PATH, 'Review workflow path mismatch');
  assert(reviewWorkflow.event === 'workflow_dispatch', 'Review workflow must use workflow_dispatch');
  assert(reviewWorkflow.ref === 'refs/heads/main', 'Review workflow must execute from main');
  assert(FULL_SHA_RE.test(reviewWorkflow.headSha ?? ''), 'Review workflow head SHA is invalid');
  assert(Number.isSafeInteger(reviewWorkflow.runId) && reviewWorkflow.runId > 0, 'Review workflow run id is invalid');
  assert(Number.isSafeInteger(reviewWorkflow.runAttempt) && reviewWorkflow.runAttempt > 0, 'Review workflow run attempt is invalid');
  assert(typeof reviewWorkflow.actor === 'string' && reviewWorkflow.actor.trim().length >= 1, 'Review workflow actor is required');
  assert(Number(reviewWorkflow.requestedSourceRunId) === technicalReview.workflow.runId, 'Review workflow requested source run id mismatch');
  assert(Number(reviewWorkflow.requestedArtifactId) === technicalReview.artifact.id, 'Review workflow requested artifact id mismatch');
  assert(String(reviewWorkflow.requestedArtifactDigest).toLowerCase() === technicalReview.artifact.digest, 'Review workflow requested artifact digest mismatch');

  return deepFreeze({
    version: INVESTMENT_BR_PROVENANCE_REVIEW_TRANSPORT_VERSION,
    classification: 'github-actions-provenance-review-transport',
    technicalReview,
    reviewWorkflow: { ...reviewWorkflow },
    sourceTechnicalReviewVersion: INVESTMENT_BR_PROVENANCE_ARTIFACT_REVIEW_VERSION,
    reviewTransportVerified: true,
    humanReviewRequired: technicalReview.humanReviewRequired,
    standaloneAuthorityAllowed: false,
    implementationPrEligible: false,
    implementationAuthorityGranted: false,
    automaticMutationAllowed: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
  });
}

export function validateInvestmentBusinessRuleProvenanceReviewTransport(envelope) {
  assert(envelope && typeof envelope === 'object' && !Array.isArray(envelope), 'Provenance review transport envelope is required');
  assert(envelope.version === INVESTMENT_BR_PROVENANCE_REVIEW_TRANSPORT_VERSION, 'Provenance review transport version mismatch');
  assert(envelope.classification === 'github-actions-provenance-review-transport', 'Provenance review transport classification mismatch');
  validateInvestmentBusinessRuleProvenanceArtifactReview(envelope.technicalReview);
  assert(envelope.sourceTechnicalReviewVersion === INVESTMENT_BR_PROVENANCE_ARTIFACT_REVIEW_VERSION, 'Provenance review source technical version mismatch');
  const workflow = envelope.reviewWorkflow;
  assert(workflow?.name === INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_NAME, 'Provenance review workflow name mismatch');
  assert(workflow?.path === INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_PATH, 'Provenance review workflow path mismatch');
  assert(workflow?.event === 'workflow_dispatch', 'Provenance review workflow event mismatch');
  assert(workflow?.ref === 'refs/heads/main', 'Provenance review workflow ref mismatch');
  assert(FULL_SHA_RE.test(workflow?.headSha ?? ''), 'Provenance review workflow head SHA is invalid');
  assert(Number.isSafeInteger(workflow?.runId) && workflow.runId > 0, 'Provenance review workflow run id is invalid');
  assert(Number.isSafeInteger(workflow?.runAttempt) && workflow.runAttempt > 0, 'Provenance review workflow run attempt is invalid');
  assert(typeof workflow?.actor === 'string' && workflow.actor.trim().length >= 1, 'Provenance review workflow actor is required');
  assert(Number(workflow?.requestedSourceRunId) === envelope.technicalReview.workflow.runId, 'Provenance review requested source run id mismatch');
  assert(Number(workflow?.requestedArtifactId) === envelope.technicalReview.artifact.id, 'Provenance review requested artifact id mismatch');
  assert(String(workflow?.requestedArtifactDigest).toLowerCase() === envelope.technicalReview.artifact.digest, 'Provenance review requested artifact digest mismatch');
  assert(envelope.reviewTransportVerified === true, 'Provenance review transport must be verified');
  assert(envelope.humanReviewRequired === envelope.technicalReview.humanReviewRequired, 'Provenance review human-review requirement mismatch');
  assert(envelope.standaloneAuthorityAllowed === false, 'Review transport cannot grant standalone authority');
  assert(envelope.implementationPrEligible === false, 'Review transport cannot grant implementation PR eligibility');
  assert(envelope.implementationAuthorityGranted === false, 'Review transport cannot grant implementation authority');
  assert(envelope.automaticMutationAllowed === false, 'Review transport cannot allow mutation');
  assert(envelope.propagationVerificationAllowed === false, 'Review transport cannot verify propagation');
  assert(envelope.pilotAuthorizationGranted === false, 'Review transport cannot authorize pilot');
  assert(envelope.livePromotionAllowed === false, 'Review transport cannot promote LIVE');
  assert(envelope.technicalReview.repository === INVESTMENT_BR_PROVENANCE_REPOSITORY, 'Review transport repository mismatch');
  return envelope;
}
