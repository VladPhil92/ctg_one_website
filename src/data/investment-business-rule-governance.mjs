export const INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION = 'ctg-investment-business-rule-governance-v1';
export const INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION = 'ctg-investment-business-rule-propagation-v1';

export const INVESTMENT_REQUIRED_BUSINESS_RULE_IDS = Object.freeze([
  'BR-001',
  'BR-002',
  'BR-003',
  'BR-004',
  'BR-005',
]);

export const INVESTMENT_BUSINESS_RULE_CANDIDATE = Object.freeze({
  path: 'docs/investment/CLOSED_BETA_DECISION_PACK.md',
  commit: '0f8f935080b43080bd7fbf7d544c831ba049cc6a',
  blobSha: '2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5',
  sourcePr: 256,
});

export const INVESTMENT_BUSINESS_RULE_STATUSES = Object.freeze([
  'PENDING',
  'APPROVED',
  'CHANGES_REQUIRED',
  'REJECTED',
]);

export const INVESTMENT_BUSINESS_RULE_PROPAGATION_STATUSES = Object.freeze([
  'PENDING',
  'VERIFIED',
]);

const VALID_STATUSES = new Set(INVESTMENT_BUSINESS_RULE_STATUSES);
const VALID_PROPAGATION_STATUSES = new Set(INVESTMENT_BUSINESS_RULE_PROPAGATION_STATUSES);
const FULL_SHA_RE = /^[0-9a-f]{40}$/i;
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateCandidate(candidate) {
  assert(candidate && typeof candidate === 'object', 'Business-rule candidate source is required');
  assert(candidate.path === INVESTMENT_BUSINESS_RULE_CANDIDATE.path, 'Business-rule candidate path mismatch');
  assert(candidate.commit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, 'Business-rule candidate commit mismatch');
  assert(candidate.blobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, 'Business-rule candidate blob mismatch');
  assert(candidate.sourcePr === INVESTMENT_BUSINESS_RULE_CANDIDATE.sourcePr, 'Business-rule candidate PR mismatch');
  assert(FULL_SHA_RE.test(candidate.commit), 'Business-rule candidate commit must be a full Git SHA');
  assert(FULL_SHA_RE.test(candidate.blobSha), 'Business-rule candidate blob must be a full Git SHA');
}

function validateDecisionMetadata(rule) {
  const decided = rule.status !== 'PENDING';

  if (!decided) {
    assert(rule.reviewedCandidateCommit === null, `${rule.id} PENDING reviewedCandidateCommit must be null`);
    assert(rule.reviewedCandidateBlobSha === null, `${rule.id} PENDING reviewedCandidateBlobSha must be null`);
    assert(rule.decidedBy === null, `${rule.id} PENDING decidedBy must be null`);
    assert(rule.decidedAt === null, `${rule.id} PENDING decidedAt must be null`);
    assert(rule.evidenceRef === null, `${rule.id} PENDING evidenceRef must be null`);
    return;
  }

  assert(rule.reviewedCandidateCommit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, `${rule.id} reviewed candidate commit mismatch`);
  assert(rule.reviewedCandidateBlobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, `${rule.id} reviewed candidate blob mismatch`);
  assert(FULL_SHA_RE.test(rule.reviewedCandidateCommit), `${rule.id} reviewedCandidateCommit must be a full Git SHA`);
  assert(FULL_SHA_RE.test(rule.reviewedCandidateBlobSha), `${rule.id} reviewedCandidateBlobSha must be a full Git SHA`);
  assert(typeof rule.decidedBy === 'string' && rule.decidedBy.trim().length >= 2, `${rule.id} decidedBy is required`);
  assert(typeof rule.decidedAt === 'string' && ISO_INSTANT_RE.test(rule.decidedAt), `${rule.id} decidedAt must be an ISO UTC instant`);
  assert(typeof rule.evidenceRef === 'string' && rule.evidenceRef.trim().length >= 3, `${rule.id} evidenceRef is required`);
}

export function validateInvestmentBusinessRuleGovernance(record) {
  assert(record && typeof record === 'object' && !Array.isArray(record), 'Business-rule governance record is required');
  assert(record.version === INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION, 'Business-rule governance version mismatch');
  validateCandidate(record.candidate);

  assert(Array.isArray(record.rules), 'Business-rule governance rules must be an array');
  assert(record.rules.length === INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.length, 'Business-rule governance must contain exactly five required rules');

  const seen = new Set();
  for (const rule of record.rules) {
    assert(rule && typeof rule === 'object', 'Business-rule governance contains an invalid rule');
    assert(INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.includes(rule.id), `Unknown business-rule id: ${rule.id}`);
    assert(!seen.has(rule.id), `Duplicate business-rule id: ${rule.id}`);
    seen.add(rule.id);
    assert(VALID_STATUSES.has(rule.status), `${rule.id} has invalid governance status: ${rule.status}`);
    validateDecisionMetadata(rule);
  }

  for (const requiredId of INVESTMENT_REQUIRED_BUSINESS_RULE_IDS) {
    assert(seen.has(requiredId), `Missing required business-rule id: ${requiredId}`);
  }

  return record;
}

export function derivePendingInvestmentBusinessDecisionIds(record) {
  validateInvestmentBusinessRuleGovernance(record);
  return Object.freeze(
    record.rules
      .filter((rule) => rule.status !== 'APPROVED')
      .map((rule) => rule.id),
  );
}

export function areInvestmentBusinessRulesApproved(record) {
  return derivePendingInvestmentBusinessDecisionIds(record).length === 0;
}

export function validateInvestmentBusinessRulePropagation(record, propagation) {
  validateInvestmentBusinessRuleGovernance(record);
  assert(propagation && typeof propagation === 'object' && !Array.isArray(propagation), 'Business-rule propagation record is required');
  assert(propagation.version === INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION, 'Business-rule propagation version mismatch');
  assert(VALID_PROPAGATION_STATUSES.has(propagation.status), `Invalid business-rule propagation status: ${propagation.status}`);

  if (propagation.status === 'PENDING') {
    assert(propagation.verifiedCandidateCommit === null, 'PENDING propagation verifiedCandidateCommit must be null');
    assert(propagation.verifiedCandidateBlobSha === null, 'PENDING propagation verifiedCandidateBlobSha must be null');
    assert(propagation.verifiedBy === null, 'PENDING propagation verifiedBy must be null');
    assert(propagation.verifiedAt === null, 'PENDING propagation verifiedAt must be null');
    assert(propagation.evidenceRef === null, 'PENDING propagation evidenceRef must be null');
    return propagation;
  }

  assert(areInvestmentBusinessRulesApproved(record), 'Business-rule propagation cannot be VERIFIED before all BRs are APPROVED');
  assert(propagation.verifiedCandidateCommit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, 'Propagation candidate commit mismatch');
  assert(propagation.verifiedCandidateBlobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, 'Propagation candidate blob mismatch');
  assert(FULL_SHA_RE.test(propagation.verifiedCandidateCommit), 'Propagation candidate commit must be a full Git SHA');
  assert(FULL_SHA_RE.test(propagation.verifiedCandidateBlobSha), 'Propagation candidate blob must be a full Git SHA');
  assert(typeof propagation.verifiedBy === 'string' && propagation.verifiedBy.trim().length >= 2, 'Propagation verifiedBy is required');
  assert(typeof propagation.verifiedAt === 'string' && ISO_INSTANT_RE.test(propagation.verifiedAt), 'Propagation verifiedAt must be an ISO UTC instant');
  assert(typeof propagation.evidenceRef === 'string' && propagation.evidenceRef.trim().length >= 3, 'Propagation evidenceRef is required');
  return propagation;
}

// Release governance keeps BR blockers present until both explicit approval and
// authoritative propagation are verified. This prevents an approved prose
// decision from making an old runtime appear LIVE-ready.
export function deriveBlockingInvestmentBusinessDecisionIds(record, propagation) {
  const pending = derivePendingInvestmentBusinessDecisionIds(record);
  validateInvestmentBusinessRulePropagation(record, propagation);
  if (pending.length > 0) return pending;
  if (propagation.status !== 'VERIFIED') return INVESTMENT_REQUIRED_BUSINESS_RULE_IDS;
  return Object.freeze([]);
}

export const INVESTMENT_BUSINESS_RULE_GOVERNANCE = Object.freeze({
  version: INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
  candidate: INVESTMENT_BUSINESS_RULE_CANDIDATE,
  rules: Object.freeze([
    Object.freeze({ id: 'BR-001', status: 'PENDING', reviewedCandidateCommit: null, reviewedCandidateBlobSha: null, decidedBy: null, decidedAt: null, evidenceRef: null }),
    Object.freeze({ id: 'BR-002', status: 'PENDING', reviewedCandidateCommit: null, reviewedCandidateBlobSha: null, decidedBy: null, decidedAt: null, evidenceRef: null }),
    Object.freeze({ id: 'BR-003', status: 'PENDING', reviewedCandidateCommit: null, reviewedCandidateBlobSha: null, decidedBy: null, decidedAt: null, evidenceRef: null }),
    Object.freeze({ id: 'BR-004', status: 'PENDING', reviewedCandidateCommit: null, reviewedCandidateBlobSha: null, decidedBy: null, decidedAt: null, evidenceRef: null }),
    Object.freeze({ id: 'BR-005', status: 'PENDING', reviewedCandidateCommit: null, reviewedCandidateBlobSha: null, decidedBy: null, decidedAt: null, evidenceRef: null }),
  ]),
});

export const INVESTMENT_BUSINESS_RULE_PROPAGATION = Object.freeze({
  version: INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
  status: 'PENDING',
  verifiedCandidateCommit: null,
  verifiedCandidateBlobSha: null,
  verifiedBy: null,
  verifiedAt: null,
  evidenceRef: null,
});

// Validate canonical governance at module load so malformed repository state
// cannot silently degrade the release gate.
validateInvestmentBusinessRuleGovernance(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
validateInvestmentBusinessRulePropagation(
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
);
