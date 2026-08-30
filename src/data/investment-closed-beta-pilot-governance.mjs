import { INVESTMENT_BUSINESS_RULE_CANDIDATE } from './investment-business-rule-governance.mjs';

export const INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_VERSION =
  'ctg-investment-closed-beta-pilot-authorization-v1';

export const INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_STATUSES = Object.freeze([
  'NOT_AUTHORIZED',
  'AUTHORIZED',
  'REVOKED',
]);

export const INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_SCOPE =
  'closed-beta-real-money-pilot';

const VALID_STATUSES = new Set(INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_STATUSES);
const FULL_SHA_RE = /^[0-9a-f]{40}$/i;
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertExactKeys(object, allowedKeys, path) {
  assert(object && typeof object === 'object' && !Array.isArray(object), `${path} must be an object`);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(object)) {
    assert(allowed.has(key), `${path}.${key} is not an allowed field`);
  }
  for (const key of allowed) {
    assert(Object.hasOwn(object, key), `${path}.${key} is required`);
  }
}

export function validateInvestmentClosedBetaPilotAuthorization(record) {
  assertExactKeys(record, [
    'version',
    'status',
    'scope',
    'reviewedCandidateCommit',
    'reviewedCandidateBlobSha',
    'authorizedBy',
    'authorizedAt',
    'evidenceRef',
  ], 'pilotAuthorization');

  assert(
    record.version === INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_VERSION,
    'Closed-beta pilot authorization version mismatch',
  );
  assert(VALID_STATUSES.has(record.status), `Invalid closed-beta pilot authorization status: ${record.status}`);
  assert(
    record.scope === INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_SCOPE,
    'Closed-beta pilot authorization scope mismatch',
  );

  if (record.status === 'NOT_AUTHORIZED') {
    assert(record.reviewedCandidateCommit === null, 'NOT_AUTHORIZED reviewedCandidateCommit must be null');
    assert(record.reviewedCandidateBlobSha === null, 'NOT_AUTHORIZED reviewedCandidateBlobSha must be null');
    assert(record.authorizedBy === null, 'NOT_AUTHORIZED authorizedBy must be null');
    assert(record.authorizedAt === null, 'NOT_AUTHORIZED authorizedAt must be null');
    assert(record.evidenceRef === null, 'NOT_AUTHORIZED evidenceRef must be null');
    return record;
  }

  assert(
    record.reviewedCandidateCommit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit,
    'Pilot authorization reviewed candidate commit mismatch',
  );
  assert(
    record.reviewedCandidateBlobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha,
    'Pilot authorization reviewed candidate blob mismatch',
  );
  assert(FULL_SHA_RE.test(record.reviewedCandidateCommit), 'Pilot authorization candidate commit must be a full Git SHA');
  assert(FULL_SHA_RE.test(record.reviewedCandidateBlobSha), 'Pilot authorization candidate blob must be a full Git SHA');
  assert(
    typeof record.authorizedBy === 'string' && record.authorizedBy.trim().length >= 2,
    'Pilot authorization authorizedBy is required',
  );
  assert(
    typeof record.authorizedAt === 'string' && ISO_INSTANT_RE.test(record.authorizedAt),
    'Pilot authorization authorizedAt must be an ISO UTC instant',
  );
  assert(
    typeof record.evidenceRef === 'string' && record.evidenceRef.trim().length >= 3,
    'Pilot authorization evidenceRef is required',
  );
  return record;
}

export function isInvestmentClosedBetaPilotAuthorized(record) {
  try {
    validateInvestmentClosedBetaPilotAuthorization(record);
  } catch {
    return false;
  }
  return record.status === 'AUTHORIZED';
}

// Canonical repository state deliberately grants no authority to initiate a
// real-money closed-beta pilot. A future AUTHORIZED record is a distinct human
// governance action and must remain bound to the exact BR candidate reviewed.
export const INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION = Object.freeze({
  version: INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_VERSION,
  status: 'NOT_AUTHORIZED',
  scope: INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_SCOPE,
  reviewedCandidateCommit: null,
  reviewedCandidateBlobSha: null,
  authorizedBy: null,
  authorizedAt: null,
  evidenceRef: null,
});

validateInvestmentClosedBetaPilotAuthorization(INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION);
