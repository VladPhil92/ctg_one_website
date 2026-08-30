export const INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION = 'ctg-investment-business-rule-governance-v1';

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

const VALID_STATUSES = new Set(INVESTMENT_BUSINESS_RULE_STATUSES);
const FULL_SHA_RE = /^[0-9a-f]{40}$/i;
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateDecisionMetadata(rule) {
  const decided = rule.status !== 'PENDING';

  if (!decided) {
    assert(rule.decidedBy === null, `${rule.id} PENDING decidedBy must be null`);
    assert(rule.decidedAt === null, `${rule.id} PENDING decidedAt must be null`);
    assert(rule.evidenceRef === null, `${rule.id} PENDING evidenceRef must be null`);
    return;
  }

  assert(typeof rule.decidedBy === 'string' && rule.decidedBy.trim().length >= 2, `${rule.id} decidedBy is required`);
  assert(typeof rule.decidedAt === 'string' && ISO_INSTANT_RE.test(rule.decidedAt), `${rule.id} decidedAt must be an ISO UTC instant`);
  assert(typeof rule.evidenceRef === 'string' && rule.evidenceRef.trim().length >= 3, `${rule.id} evidenceRef is required`);
}

export function validateInvestmentBusinessRuleGovernance(record) {
  assert(record && typeof record === 'object' && !Array.isArray(record), 'Business-rule governance record is required');
  assert(record.version === INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION, 'Business-rule governance version mismatch');

  const candidate = record.candidate;
  assert(candidate && typeof candidate === 'object', 'Business-rule candidate source is required');
  assert(candidate.path === INVESTMENT_BUSINESS_RULE_CANDIDATE.path, 'Business-rule candidate path mismatch');
  assert(candidate.commit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, 'Business-rule candidate commit mismatch');
  assert(candidate.blobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, 'Business-rule candidate blob mismatch');
  assert(candidate.sourcePr === INVESTMENT_BUSINESS_RULE_CANDIDATE.sourcePr, 'Business-rule candidate PR mismatch');
  assert(FULL_SHA_RE.test(candidate.commit), 'Business-rule candidate commit must be a full Git SHA');
  assert(FULL_SHA_RE.test(candidate.blobSha), 'Business-rule candidate blob must be a full Git SHA');

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

export const INVESTMENT_BUSINESS_RULE_GOVERNANCE = Object.freeze({
  version: INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
  candidate: INVESTMENT_BUSINESS_RULE_CANDIDATE,
  rules: Object.freeze(
    INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.map((id) => Object.freeze({
      id,
      status: 'PENDING',
      decidedBy: null,
      decidedAt: null,
      evidenceRef: null,
    })),
  ),
});

// Validate canonical governance at module load so malformed repository state
// cannot silently degrade the release gate.
validateInvestmentBusinessRuleGovernance(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
