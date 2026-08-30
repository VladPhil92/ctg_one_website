import { INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE } from './investment-business-rule-candidate-authority.mjs';

export const INVESTMENT_BR_PROVENANCE_AUTHORIZATION_VERSION =
  'ctg-investment-br-provenance-authorization-v1';

export const INVESTMENT_BR_PROVENANCE_AUTHORIZATION_STATUSES = Object.freeze([
  'PENDING',
  'AUTHORIZED',
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

function assertIsoInstant(value, label) {
  assert(typeof value === 'string' && ISO_INSTANT_RE.test(value), `${label} must be an ISO UTC instant`);
  assert(Number.isFinite(Date.parse(value)), `${label} must be a real calendar instant`);
}

export function validateInvestmentBusinessRuleProvenanceAuthorization(record) {
  assert(record && typeof record === 'object' && !Array.isArray(record), 'Provenance authorization record is required');
  assert(record.version === INVESTMENT_BR_PROVENANCE_AUTHORIZATION_VERSION, 'Provenance authorization version mismatch');
  assert(INVESTMENT_BR_PROVENANCE_AUTHORIZATION_STATUSES.includes(record.status), `Invalid provenance authorization status: ${record.status}`);
  assert(record.candidate?.path === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.path, 'Provenance authorization candidate path mismatch');
  assert(record.candidate?.commit === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.commit, 'Provenance authorization candidate commit mismatch');
  assert(record.candidate?.blobSha === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.blobSha, 'Provenance authorization candidate blob mismatch');
  assert(record.candidate?.sourcePr === INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE.sourcePr, 'Provenance authorization candidate PR mismatch');

  if (record.status === 'PENDING') {
    for (const field of [
      'trustedMainSha',
      'governanceBlobSha',
      'provenanceRunId',
      'artifactId',
      'artifactDigest',
      'technicalReviewArtifactRef',
      'humanReviewRef',
      'authorizedBy',
      'authorizedAt',
    ]) {
      assert(record[field] === null, `PENDING provenance authorization ${field} must be null`);
    }
    return record;
  }

  assert(FULL_SHA_RE.test(record.trustedMainSha ?? ''), 'Provenance authorization trustedMainSha is invalid');
  assert(FULL_SHA_RE.test(record.governanceBlobSha ?? ''), 'Provenance authorization governanceBlobSha is invalid');
  assert(Number.isSafeInteger(record.provenanceRunId) && record.provenanceRunId > 0, 'Provenance authorization run id is invalid');
  assert(Number.isSafeInteger(record.artifactId) && record.artifactId > 0, 'Provenance authorization artifact id is invalid');
  assert(typeof record.artifactDigest === 'string' && SHA256_RE.test(record.artifactDigest), 'Provenance authorization artifact digest is invalid');
  assert(typeof record.technicalReviewArtifactRef === 'string' && record.technicalReviewArtifactRef.trim().length >= 3, 'Provenance authorization technical review artifact ref is required');
  assert(typeof record.humanReviewRef === 'string' && REVIEW_REF_RE.test(record.humanReviewRef), 'Provenance authorization human review ref must be a repository issue or PR URL');
  assert(typeof record.authorizedBy === 'string' && record.authorizedBy.trim().length >= 2, 'Provenance authorization authorizedBy is required');
  assertIsoInstant(record.authorizedAt, 'Provenance authorization authorizedAt');
  return record;
}

export function deriveInvestmentBusinessRuleProvenanceAuthorizationObservation(record) {
  validateInvestmentBusinessRuleProvenanceAuthorization(record);
  const status = record.status === 'PENDING'
    ? 'BLOCKED_AWAITING_CANONICAL_AUTHORIZATION'
    : record.status === 'AUTHORIZED'
      ? 'AUTHORIZATION_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE'
      : record.status === 'CHANGES_REQUIRED'
        ? 'AUTHORIZATION_CHANGES_REQUIRED'
        : 'AUTHORIZATION_REJECTED';

  return Object.freeze({
    status,
    authorizationRecorded: record.status === 'AUTHORIZED',
    mergedMainAuthorizationProvenanceRequired: record.status === 'AUTHORIZED',
    implementationPrEligible: false,
    implementationAuthorityGranted: false,
    automaticMutationAllowed: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
  });
}

export const INVESTMENT_BR_PROVENANCE_AUTHORIZATION = Object.freeze({
  version: INVESTMENT_BR_PROVENANCE_AUTHORIZATION_VERSION,
  status: 'PENDING',
  candidate: INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE,
  trustedMainSha: null,
  governanceBlobSha: null,
  provenanceRunId: null,
  artifactId: null,
  artifactDigest: null,
  technicalReviewArtifactRef: null,
  humanReviewRef: null,
  authorizedBy: null,
  authorizedAt: null,
});

validateInvestmentBusinessRuleProvenanceAuthorization(INVESTMENT_BR_PROVENANCE_AUTHORIZATION);
