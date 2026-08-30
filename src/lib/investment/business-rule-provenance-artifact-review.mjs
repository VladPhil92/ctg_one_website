import { INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE } from '../../data/investment-business-rule-candidate-authority.mjs';
import { validateInvestmentBusinessRuleMainProvenanceEvidence } from './business-rule-main-provenance.mjs';

export const INVESTMENT_BR_PROVENANCE_ARTIFACT_REVIEW_VERSION =
  'ctg-investment-br-provenance-artifact-review-v1';
export const INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_VERSION =
  'ctg-investment-br-provenance-human-review-v1';
export const INVESTMENT_BR_PROVENANCE_REPOSITORY = 'VladPhil92/ctg_one_website';
export const INVESTMENT_BR_PROVENANCE_SOURCE_WORKFLOW_NAME =
  'Investment BR Merged-Main Provenance';
export const INVESTMENT_BR_PROVENANCE_SOURCE_WORKFLOW_PATH =
  '.github/workflows/investment-br-merged-main-provenance.yml';

export const INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_DECISIONS = Object.freeze([
  'PENDING',
  'APPROVED',
  'CHANGES_REQUIRED',
  'REJECTED',
]);

const FULL_SHA_RE = /^[0-9a-f]{40}$/i;
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

function normalizeDigest(value, label) {
  assert(typeof value === 'string' && SHA256_RE.test(value), `${label} must be a sha256 digest`);
  return value.toLowerCase();
}

function validateSourceRun(run, evidence) {
  assert(run && typeof run === 'object' && !Array.isArray(run), 'GitHub provenance workflow run metadata is required');
  assert(Number.isSafeInteger(run.id) && run.id > 0, 'GitHub provenance workflow run id is invalid');
  assert(String(run.id) === evidence.workflow.runId, 'GitHub provenance workflow run id does not match evidence');
  assert(run.name === INVESTMENT_BR_PROVENANCE_SOURCE_WORKFLOW_NAME, 'GitHub provenance workflow name mismatch');
  assert(run.path === INVESTMENT_BR_PROVENANCE_SOURCE_WORKFLOW_PATH, 'GitHub provenance workflow path mismatch');
  assert(run.event === 'push', 'GitHub provenance workflow must originate from push');
  assert(run.status === 'completed', 'GitHub provenance workflow run must be completed');
  assert(run.conclusion === 'success', 'GitHub provenance workflow run must conclude success');
  assert(run.head_branch === 'main', 'GitHub provenance workflow run must target main');
  assert(FULL_SHA_RE.test(run.head_sha ?? ''), 'GitHub provenance workflow head SHA is invalid');
  assert(run.head_sha === evidence.trustedMainSha, 'GitHub provenance workflow head SHA does not match evidence');
  assert(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0, 'GitHub provenance workflow run attempt is invalid');
  assert(String(run.run_attempt) === evidence.workflow.runAttempt, 'GitHub provenance workflow run attempt does not match evidence');
  assert(run.repository?.full_name === INVESTMENT_BR_PROVENANCE_REPOSITORY, 'GitHub provenance workflow repository mismatch');
  assert(run.head_repository?.full_name === INVESTMENT_BR_PROVENANCE_REPOSITORY, 'GitHub provenance workflow head repository mismatch');
  assert(typeof run.html_url === 'string' && run.html_url === `https://github.com/${INVESTMENT_BR_PROVENANCE_REPOSITORY}/actions/runs/${run.id}`, 'GitHub provenance workflow URL mismatch');
  assertIsoInstant(run.created_at, 'GitHub provenance workflow created_at');
  assertIsoInstant(run.updated_at, 'GitHub provenance workflow updated_at');
}

function validateSourceArtifact(artifact, run, evidence, downloadedArchiveDigest) {
  assert(artifact && typeof artifact === 'object' && !Array.isArray(artifact), 'GitHub provenance artifact metadata is required');
  assert(Number.isSafeInteger(artifact.id) && artifact.id > 0, 'GitHub provenance artifact id is invalid');
  assert(artifact.name === `investment-br-main-provenance-${evidence.trustedMainSha}`, 'GitHub provenance artifact name mismatch');
  assert(artifact.expired === false, 'GitHub provenance artifact is expired');
  assert(Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0, 'GitHub provenance artifact size is invalid');
  const apiDigest = normalizeDigest(artifact.digest, 'GitHub provenance artifact digest');
  const archiveDigest = normalizeDigest(downloadedArchiveDigest, 'Downloaded provenance archive digest');
  assert(apiDigest === archiveDigest, 'Downloaded provenance archive digest does not match GitHub artifact digest');
  assert(artifact.workflow_run?.id === run.id, 'GitHub provenance artifact run id mismatch');
  assert(artifact.workflow_run?.head_branch === 'main', 'GitHub provenance artifact branch mismatch');
  assert(artifact.workflow_run?.head_sha === evidence.trustedMainSha, 'GitHub provenance artifact head SHA mismatch');
  const createdAt = assertIsoInstant(artifact.created_at, 'GitHub provenance artifact created_at');
  const expiresAt = assertIsoInstant(artifact.expires_at, 'GitHub provenance artifact expires_at');
  assert(expiresAt > createdAt, 'GitHub provenance artifact expiry must be after creation');
  return apiDigest;
}

function deriveTechnicalStatus(evidence) {
  if (evidence.status === 'MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE') {
    return 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW';
  }
  if (evidence.status === 'PROPAGATION_ALREADY_VERIFIED') {
    return 'NO_NEW_IMPLEMENTATION_AUTHORIZATION_REQUIRED';
  }
  return 'BLOCKED_SOURCE_NOT_ELIGIBLE';
}

export function createInvestmentBusinessRuleProvenanceArtifactReview({
  run,
  artifact,
  evidence,
  downloadedArchiveDigest,
  expectedArtifactId,
  expectedArtifactDigest,
} = {}) {
  validateInvestmentBusinessRuleMainProvenanceEvidence(evidence);
  validateSourceRun(run, evidence);
  const artifactDigest = validateSourceArtifact(artifact, run, evidence, downloadedArchiveDigest);

  if (expectedArtifactId !== undefined && expectedArtifactId !== null) {
    assert(Number(expectedArtifactId) === artifact.id, 'Requested provenance artifact id does not match GitHub artifact');
  }
  if (expectedArtifactDigest !== undefined && expectedArtifactDigest !== null && String(expectedArtifactDigest).trim() !== '') {
    assert(normalizeDigest(String(expectedArtifactDigest), 'Requested provenance artifact digest') === artifactDigest, 'Requested provenance artifact digest does not match GitHub artifact');
  }

  const status = deriveTechnicalStatus(evidence);
  const sourceEligibleForHumanReview = status === 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW';

  return deepFreeze({
    version: INVESTMENT_BR_PROVENANCE_ARTIFACT_REVIEW_VERSION,
    classification: 'github-actions-provenance-artifact-technical-review',
    status,
    repository: INVESTMENT_BR_PROVENANCE_REPOSITORY,
    source: {
      trustedMainSha: evidence.trustedMainSha,
      governanceBlobSha: evidence.governance.blobSha,
      candidate: { ...INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE },
      provenanceStatus: evidence.status,
      mergePullRequestNumber: evidence.mergePullRequest.number,
      transition: { ...evidence.transition },
    },
    workflow: {
      runId: run.id,
      runAttempt: run.run_attempt,
      name: run.name,
      path: run.path,
      event: run.event,
      branch: run.head_branch,
      headSha: run.head_sha,
      conclusion: run.conclusion,
      url: run.html_url,
    },
    artifact: {
      id: artifact.id,
      name: artifact.name,
      digest: artifactDigest,
      sizeInBytes: artifact.size_in_bytes,
      createdAt: artifact.created_at,
      expiresAt: artifact.expires_at,
    },
    transportVerified: true,
    downloadedArchiveDigestVerified: true,
    sourceEligibleForHumanReview,
    humanReviewRequired: sourceEligibleForHumanReview,
    standaloneAuthorityAllowed: false,
    implementationPlanningEligible: false,
    implementationPrEligible: false,
    implementationAuthorityGranted: false,
    automaticMutationAllowed: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
  });
}

export function validateInvestmentBusinessRuleProvenanceArtifactReview(review) {
  assert(review && typeof review === 'object' && !Array.isArray(review), 'Provenance artifact technical review is required');
  assert(review.version === INVESTMENT_BR_PROVENANCE_ARTIFACT_REVIEW_VERSION, 'Provenance artifact technical review version mismatch');
  assert(review.classification === 'github-actions-provenance-artifact-technical-review', 'Provenance artifact technical review classification mismatch');
  assert([
    'BLOCKED_SOURCE_NOT_ELIGIBLE',
    'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW',
    'NO_NEW_IMPLEMENTATION_AUTHORIZATION_REQUIRED',
  ].includes(review.status), `Invalid provenance artifact technical review status: ${review.status}`);
  assert(review.repository === INVESTMENT_BR_PROVENANCE_REPOSITORY, 'Provenance artifact technical review repository mismatch');
  assert(FULL_SHA_RE.test(review.source?.trustedMainSha ?? ''), 'Provenance artifact technical review main SHA is invalid');
  assert(FULL_SHA_RE.test(review.source?.governanceBlobSha ?? ''), 'Provenance artifact technical review governance blob is invalid');
  assert(review.source?.candidate?.path === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.path, 'Provenance artifact technical review candidate path mismatch');
  assert(review.source?.candidate?.commit === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.commit, 'Provenance artifact technical review candidate commit mismatch');
  assert(review.source?.candidate?.blobSha === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha, 'Provenance artifact technical review candidate blob mismatch');
  assert(review.source?.candidate?.sourcePr === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.sourcePr, 'Provenance artifact technical review candidate PR mismatch');
  assert(Number.isSafeInteger(review.workflow?.runId) && review.workflow.runId > 0, 'Provenance artifact technical review run id is invalid');
  assert(review.workflow?.name === INVESTMENT_BR_PROVENANCE_SOURCE_WORKFLOW_NAME, 'Provenance artifact technical review workflow name mismatch');
  assert(review.workflow?.path === INVESTMENT_BR_PROVENANCE_SOURCE_WORKFLOW_PATH, 'Provenance artifact technical review workflow path mismatch');
  assert(review.workflow?.event === 'push', 'Provenance artifact technical review workflow event mismatch');
  assert(review.workflow?.branch === 'main', 'Provenance artifact technical review workflow branch mismatch');
  assert(review.workflow?.headSha === review.source.trustedMainSha, 'Provenance artifact technical review workflow SHA mismatch');
  assert(review.workflow?.conclusion === 'success', 'Provenance artifact technical review workflow conclusion mismatch');
  assert(Number.isSafeInteger(review.artifact?.id) && review.artifact.id > 0, 'Provenance artifact technical review artifact id is invalid');
  assert(review.artifact?.name === `investment-br-main-provenance-${review.source.trustedMainSha}`, 'Provenance artifact technical review artifact name mismatch');
  normalizeDigest(review.artifact?.digest, 'Provenance artifact technical review artifact digest');
  assert(Number.isSafeInteger(review.artifact?.sizeInBytes) && review.artifact.sizeInBytes > 0, 'Provenance artifact technical review artifact size is invalid');
  const artifactCreatedAt = assertIsoInstant(review.artifact?.createdAt, 'Provenance artifact technical review artifact createdAt');
  const artifactExpiresAt = assertIsoInstant(review.artifact?.expiresAt, 'Provenance artifact technical review artifact expiresAt');
  assert(artifactExpiresAt > artifactCreatedAt, 'Provenance artifact technical review artifact expiry must follow creation');

  const expectedStatus = review.source?.provenanceStatus === 'MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE'
    ? 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW'
    : review.source?.provenanceStatus === 'PROPAGATION_ALREADY_VERIFIED'
      ? 'NO_NEW_IMPLEMENTATION_AUTHORIZATION_REQUIRED'
      : 'BLOCKED_SOURCE_NOT_ELIGIBLE';
  assert(review.status === expectedStatus, 'Provenance artifact technical review status does not match source provenance status');
  const expectedHumanReview = expectedStatus === 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW';
  assert(review.sourceEligibleForHumanReview === expectedHumanReview, 'Provenance artifact source eligibility mismatch');
  assert(review.humanReviewRequired === expectedHumanReview, 'Provenance artifact human-review requirement mismatch');
  assert(review.transportVerified === true, 'Provenance artifact transport must be verified');
  assert(review.downloadedArchiveDigestVerified === true, 'Provenance artifact downloaded digest must be verified');
  assert(review.standaloneAuthorityAllowed === false, 'Technical review cannot grant standalone authority');
  assert(review.implementationPlanningEligible === false, 'Technical review cannot grant implementation planning');
  assert(review.implementationPrEligible === false, 'Technical review cannot grant implementation PR eligibility');
  assert(review.implementationAuthorityGranted === false, 'Technical review cannot grant implementation authority');
  assert(review.automaticMutationAllowed === false, 'Technical review cannot allow automatic mutation');
  assert(review.propagationVerificationAllowed === false, 'Technical review cannot verify propagation');
  assert(review.pilotAuthorizationGranted === false, 'Technical review cannot authorize pilot');
  assert(review.livePromotionAllowed === false, 'Technical review cannot promote LIVE');
  return review;
}

export function createInvestmentBusinessRuleProvenanceHumanReview({
  technicalReview,
  decision = 'PENDING',
  reviewedBy = null,
  reviewedAt = null,
  evidenceRef = null,
} = {}) {
  validateInvestmentBusinessRuleProvenanceArtifactReview(technicalReview);
  assert(INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_DECISIONS.includes(decision), `Invalid human review decision: ${decision}`);

  const sourceEligible = technicalReview.status === 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW';
  if (!sourceEligible) {
    assert(decision === 'PENDING', 'A non-eligible provenance source cannot receive a human approval decision');
  }

  if (decision === 'PENDING') {
    assert(reviewedBy === null, 'PENDING human review reviewedBy must be null');
    assert(reviewedAt === null, 'PENDING human review reviewedAt must be null');
    assert(evidenceRef === null, 'PENDING human review evidenceRef must be null');
  } else {
    assert(typeof reviewedBy === 'string' && reviewedBy.trim().length >= 2, 'Human review reviewedBy is required');
    const reviewedTime = assertIsoInstant(reviewedAt, 'Human review reviewedAt');
    const artifactTime = assertIsoInstant(technicalReview.artifact.createdAt, 'Technical review artifact createdAt');
    assert(reviewedTime >= artifactTime, 'Human review cannot predate the provenance artifact');
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
    status,
    decision,
    source: {
      technicalReviewVersion: technicalReview.version,
      trustedMainSha: technicalReview.source.trustedMainSha,
      governanceBlobSha: technicalReview.source.governanceBlobSha,
      runId: technicalReview.workflow.runId,
      artifactId: technicalReview.artifact.id,
      artifactDigest: technicalReview.artifact.digest,
      candidate: { ...INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE },
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

export function validateInvestmentBusinessRuleProvenanceHumanReview(review, technicalReview) {
  validateInvestmentBusinessRuleProvenanceArtifactReview(technicalReview);
  assert(review && typeof review === 'object' && !Array.isArray(review), 'Human provenance review is required');
  assert(review.version === INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_VERSION, 'Human provenance review version mismatch');
  assert(INVESTMENT_BR_PROVENANCE_HUMAN_REVIEW_DECISIONS.includes(review.decision), 'Human provenance review decision mismatch');
  assert(review.source?.technicalReviewVersion === technicalReview.version, 'Human provenance review technical version mismatch');
  assert(review.source?.trustedMainSha === technicalReview.source.trustedMainSha, 'Human provenance review main SHA mismatch');
  assert(review.source?.governanceBlobSha === technicalReview.source.governanceBlobSha, 'Human provenance review governance blob mismatch');
  assert(review.source?.runId === technicalReview.workflow.runId, 'Human provenance review run id mismatch');
  assert(review.source?.artifactId === technicalReview.artifact.id, 'Human provenance review artifact id mismatch');
  assert(review.source?.artifactDigest === technicalReview.artifact.digest, 'Human provenance review artifact digest mismatch');
  assert(review.source?.candidate?.blobSha === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha, 'Human provenance review candidate blob mismatch');

  const sourceEligible = technicalReview.status === 'TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW';
  if (!sourceEligible) assert(review.decision === 'PENDING', 'Human provenance review cannot decide a non-eligible source');
  if (review.decision === 'PENDING') {
    assert(review.reviewedBy === null && review.reviewedAt === null && review.evidenceRef === null, 'PENDING human provenance review metadata must be null');
  } else {
    assert(typeof review.reviewedBy === 'string' && review.reviewedBy.trim().length >= 2, 'Human provenance review reviewer is required');
    const reviewedTime = assertIsoInstant(review.reviewedAt, 'Human provenance review reviewedAt');
    const artifactTime = assertIsoInstant(technicalReview.artifact.createdAt, 'Technical review artifact createdAt');
    assert(reviewedTime >= artifactTime, 'Human provenance review cannot predate artifact');
    assert(typeof review.evidenceRef === 'string' && REVIEW_REF_RE.test(review.evidenceRef), 'Human provenance review evidenceRef is invalid');
  }

  const expectedStatus = !sourceEligible
    ? 'BLOCKED_SOURCE_NOT_ELIGIBLE'
    : review.decision === 'PENDING'
      ? 'AWAITING_HUMAN_REVIEW'
      : review.decision === 'APPROVED'
        ? 'HUMAN_REVIEW_APPROVED_REQUIRES_CANONICAL_AUTHORIZATION'
        : review.decision === 'CHANGES_REQUIRED'
          ? 'HUMAN_REVIEW_CHANGES_REQUIRED'
          : 'HUMAN_REVIEW_REJECTED';
  assert(review.status === expectedStatus, 'Human provenance review status mismatch');
  assert(review.humanReviewRecorded === (review.decision !== 'PENDING'), 'Human provenance review recorded flag mismatch');
  assert(review.canonicalAuthorizationRequired === (review.decision === 'APPROVED'), 'Human provenance review canonical authorization flag mismatch');
  assert(review.standaloneAuthorityAllowed === false, 'Human review file cannot grant standalone authority');
  assert(review.implementationPrEligible === false, 'Human review file cannot grant implementation PR eligibility');
  assert(review.implementationAuthorityGranted === false, 'Human review file cannot grant implementation authority');
  assert(review.automaticMutationAllowed === false, 'Human review file cannot allow automatic mutation');
  assert(review.propagationVerificationAllowed === false, 'Human review file cannot verify propagation');
  assert(review.pilotAuthorizationGranted === false, 'Human review file cannot authorize pilot');
  assert(review.livePromotionAllowed === false, 'Human review file cannot promote LIVE');
  return review;
}
