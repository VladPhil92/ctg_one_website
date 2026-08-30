import {
  INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_DECISIONS,
  INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_VERSION,
} from './business-rule-provenance-artifact-review.mjs';
import { validateInvestmentBusinessRuleProvenanceReviewTransport } from './business-rule-provenance-review-transport.mjs';

const SHA256_RE = /^sha256:[0-9a-f]{64}$/i;
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const REVIEW_REF_RE = /^https:\/\/github\.com\/VladPhil92\/ctg_one_website\/(?:issues|pull)\/\d+(?:#.*)?$/;

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

function assertIsoInstant(value, label) {
  assert(typeof value === 'string' && ISO_INSTANT_RE.test(value), `${label} must be an ISO UTC instant`);
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), `${label} must be a real calendar instant`);
  return parsed;
}

function validateTechnicalReviewArtifact(artifact, reviewEnvelope) {
  assert(artifact && typeof artifact === 'object' && !Array.isArray(artifact), 'Technical review artifact transport is required');
  assert(Number.isSafeInteger(artifact.id) && artifact.id > 0, 'Technical review artifact id is invalid');
  assert(artifact.name === `investment-br-provenance-technical-review-${reviewEnvelope.technicalReview.workflow.runId}-${reviewEnvelope.technicalReview.artifact.id}`, 'Technical review artifact name mismatch');
  assert(typeof artifact.digest === 'string' && SHA256_RE.test(artifact.digest), 'Technical review artifact digest is invalid');
  assert(Number.isSafeInteger(artifact.workflowRunId) && artifact.workflowRunId === reviewEnvelope.reviewWorkflow.runId, 'Technical review artifact workflow run id mismatch');
  assert(artifact.reviewHeadSha === reviewEnvelope.reviewWorkflow.headSha, 'Technical review artifact review head SHA mismatch');
}

export function createInvestmentBusinessRuleProvenanceHumanReviewRecord({
  reviewEnvelope,
  technicalReviewArtifact,
  decision = 'PENDING',
  reviewedBy = null,
  reviewedAt = null,
  evidenceRef = null,
} = {}) {
  validateInvestmentBusinessRuleProvenanceReviewTransport(reviewEnvelope);
  validateTechnicalReviewArtifact(technicalReviewArtifact, reviewEnvelope);
  assert(INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_DECISIONS.includes(decision), `Invalid human review decision: ${decision}`);

  const sourceEligible = reviewEnvelope.technicalReview.status === 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW';
  if (!sourceEligible) assert(decision === 'PENDING', 'A non-eligible provenance source cannot receive a human decision');

  if (decision === 'PENDING') {
    assert(reviewedBy === null, 'PENDING human review reviewedBy must be null');
    assert(reviewedAt === null, 'PENDING human review reviewedAt must be null');
    assert(evidenceRef === null, 'PENDING human review evidenceRef must be null');
  } else {
    assert(typeof reviewedBy === 'string' && reviewedBy.trim().length >= 2, 'Human review reviewedBy is required');
    const reviewedTime = assertIsoInstant(reviewedAt, 'Human review reviewedAt');
    const sourceArtifactTime = assertIsoInstant(reviewEnvelope.technicalReview.artifact.createdAt, 'Source artifact createdAt');
    assert(reviewedTime >= sourceArtifactTime, 'Human review cannot predate source provenance artifact');
    assert(typeof evidenceRef === 'string' && REVIEW_REF_RE.test(evidenceRef), 'Human review evidenceRef must be a repository issue or PR URL');
  }

  const status = !sourceEligible
    ? 'BLOCKED_SOURCE_NOT_ELIGIBLE'
    : decision === 'PENDING'
      ? 'AWAITING_HUMAN_REVIEW'
      : decision === 'APPROVED'
        ? 'HUMAN_REVIEW_APPROVED_REQUIRES_CANONICAL_AUTHORIZATION'
        : decision === 'CHANGES_REQUIRED'
          ? 'HUMAN_REVIEW_CHANGES_REQUIRED'
          : 'HUMAN_REVIEW_REJECTED';

  return deepFreeze({
    version: INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_VERSION,
    classification: 'investment-br-provenance-human-review',
    status,
    decision,
    source: {
      trustedMainSha: reviewEnvelope.technicalReview.source.trustedMainSha,
      governanceBlobSha: reviewEnvelope.technicalReview.source.governanceBlobSha,
      provenanceRunId: reviewEnvelope.technicalReview.workflow.runId,
      provenanceArtifactId: reviewEnvelope.technicalReview.artifact.id,
      provenanceArtifactDigest: reviewEnvelope.technicalReview.artifact.digest,
      technicalReviewRunId: reviewEnvelope.reviewWorkflow.runId,
      technicalReviewHeadSha: reviewEnvelope.reviewWorkflow.headSha,
      technicalReviewArtifact: { ...technicalReviewArtifact },
      candidate: { ...reviewEnvelope.technicalReview.source.candidate },
    },
    reviewedBy,
    reviewedAt,
    evidenceRef,
    humanReviewRecorded: decision !== 'PENDING',
    canonicalAuthorizationRequired: decision === 'APPROVED',
    standaloneAuthorityAllowed: false,
    implementationPrEligible: false,
    implementationAuthorityGranted: false,
    automaticMutationAllowed: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
  });
}

export function validateInvestmentBusinessRuleProvenanceHumanReviewRecord(record, reviewEnvelope) {
  validateInvestmentBusinessRuleProvenanceReviewTransport(reviewEnvelope);
  assert(record && typeof record === 'object' && !Array.isArray(record), 'Human provenance review record is required');
  assert(record.version === INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_VERSION, 'Human provenance review version mismatch');
  assert(record.classification === 'investment-br-provenance-human-review', 'Human provenance review classification mismatch');
  assert(INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_DECISIONS.includes(record.decision), 'Human provenance review decision mismatch');
  validateTechnicalReviewArtifact(record.source?.technicalReviewArtifact, reviewEnvelope);
  assert(record.source?.trustedMainSha === reviewEnvelope.technicalReview.source.trustedMainSha, 'Human provenance review trusted main SHA mismatch');
  assert(record.source?.governanceBlobSha === reviewEnvelope.technicalReview.source.governanceBlobSha, 'Human provenance review governance blob mismatch');
  assert(record.source?.provenanceRunId === reviewEnvelope.technicalReview.workflow.runId, 'Human provenance review provenance run mismatch');
  assert(record.source?.provenanceArtifactId === reviewEnvelope.technicalReview.artifact.id, 'Human provenance review provenance artifact id mismatch');
  assert(record.source?.provenanceArtifactDigest === reviewEnvelope.technicalReview.artifact.digest, 'Human provenance review provenance artifact digest mismatch');
  assert(record.source?.technicalReviewRunId === reviewEnvelope.reviewWorkflow.runId, 'Human provenance review technical run mismatch');
  assert(record.source?.technicalReviewHeadSha === reviewEnvelope.reviewWorkflow.headSha, 'Human provenance review technical head SHA mismatch');
  assert(record.source?.candidate?.blobSha === reviewEnvelope.technicalReview.source.candidate.blobSha, 'Human provenance review candidate mismatch');

  const sourceEligible = reviewEnvelope.technicalReview.status === 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW';
  if (!sourceEligible) assert(record.decision === 'PENDING', 'Human provenance review cannot decide a non-eligible source');
  if (record.decision === 'PENDING') {
    assert(record.reviewedBy === null && record.reviewedAt === null && record.evidenceRef === null, 'PENDING human review metadata must be null');
  } else {
    assert(typeof record.reviewedBy === 'string' && record.reviewedBy.trim().length >= 2, 'Human provenance reviewer is required');
    const reviewedTime = assertIsoInstant(record.reviewedAt, 'Human provenance reviewedAt');
    const sourceArtifactTime = assertIsoInstant(reviewEnvelope.technicalReview.artifact.createdAt, 'Source provenance artifact createdAt');
    assert(reviewedTime >= sourceArtifactTime, 'Human provenance review cannot predate source artifact');
    assert(typeof record.evidenceRef === 'string' && REVIEW_REF_RE.test(record.evidenceRef), 'Human provenance review evidenceRef is invalid');
  }

  const expectedStatus = !sourceEligible
    ? 'BLOCKED_SOURCE_NOT_ELIGIBLE'
    : record.decision === 'PENDING'
      ? 'AWAITING_HUMAN_REVIEW'
      : record.decision === 'APPROVED'
        ? 'HUMAN_REVIEW_APPROVED_REQUIRES_CANONICAL_AUTHORIZATION'
        : record.decision === 'CHANGES_REQUIRED'
          ? 'HUMAN_REVIEW_CHANGES_REQUIRED'
          : 'HUMAN_REVIEW_REJECTED';
  assert(record.status === expectedStatus, 'Human provenance review status mismatch');
  assert(record.humanReviewRecorded === (record.decision !== 'PENDING'), 'Human provenance review recorded flag mismatch');
  assert(record.canonicalAuthorizationRequired === (record.decision === 'APPROVED'), 'Human provenance canonical authorization flag mismatch');
  assert(record.standaloneAuthorityAllowed === false, 'Human provenance review cannot grant standalone authority');
  assert(record.implementationPrEligible === false, 'Human provenance review cannot grant implementation PR eligibility');
  assert(record.implementationAuthorityGranted === false, 'Human provenance review cannot grant implementation authority');
  assert(record.automaticMutationAllowed === false, 'Human provenance review cannot allow mutation');
  assert(record.propagationVerificationAllowed === false, 'Human provenance review cannot verify propagation');
  assert(record.pilotAuthorizationGranted === false, 'Human provenance review cannot authorize pilot');
  assert(record.livePromotionAllowed === false, 'Human provenance review cannot promote LIVE');
  return record;
}
