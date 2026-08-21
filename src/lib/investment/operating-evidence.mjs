import { createHash } from 'node:crypto';

export const INVESTMENT_OPERATING_EVIDENCE_VERSION = 'ctg-investment-operating-evidence-v1';
export const INVESTMENT_OPERATING_REVIEW_VERSION = 'ctg-investment-operating-review-v1';
export const INVESTMENT_OPERATING_REPORT_VERSION = 'ctg-investment-operating-report-v1';
export const INVESTMENT_OPERATING_REDACTION_POLICY_VERSION = 'ctg-investment-redaction-v1';

const CLASSIFICATIONS = new Set(['synthetic-ci', 'production-redacted']);
const SOURCE_CLASSES = new Set(['first-party-export', 'first-party-report', 'operator-attestation']);
const PROHIBITED_KEYS = new Set([
  'email', 'emailaddress', 'phone', 'phonenumber', 'fullname', 'firstname', 'lastname',
  'name', 'documentnumber', 'identitynumber', 'cedula', 'passport', 'accountnumber',
  'bankaccount', 'bankreference', 'destinationmasked', 'destinationfingerprint', 'address',
  'storagepath', 'cookie', 'authorization', 'token', 'secret', 'password', 'userid',
  'participantuserid', 'participantid', 'orderid', 'allocationid', 'payoutid',
  'externalreference', 'merchantreference', 'paymentreference', 'withdrawalid',
]);
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const LONG_DIGIT_PATTERN = /\b\d{10,}\b/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const CAPTURE_ID_PATTERN = /^ioe-[0-9a-f]{24}$/;
const LOT_DIGEST_PATTERN = /^[0-9a-f]{64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeKey(key) {
  return String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function walkForSensitiveContent(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkForSensitiveContent(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const normalized = normalizeKey(key);
      if (PROHIBITED_KEYS.has(normalized)) {
        throw new Error(`Sensitive field is prohibited in operating evidence: ${path}.${key}`);
      }
      walkForSensitiveContent(entry, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === 'string') {
    if (EMAIL_PATTERN.test(value)) throw new Error(`Email-like value is prohibited at ${path}`);
    if (UUID_PATTERN.test(value)) throw new Error(`UUID-like value is prohibited at ${path}`);
    if (LONG_DIGIT_PATTERN.test(value)) throw new Error(`Long numeric identifier is prohibited at ${path}`);
  }
}

function assertNonNegativeInteger(value, path) {
  assert(Number.isSafeInteger(value) && value >= 0, `${path} must be a non-negative safe integer`);
}

function assertBoolean(value, path) {
  assert(typeof value === 'boolean', `${path} must be boolean`);
}

function assertIsoTimestamp(value, path) {
  assert(typeof value === 'string' && Number.isFinite(Date.parse(value)), `${path} must be an ISO timestamp`);
}

function assertExactKeys(object, allowedKeys, path) {
  assert(object && typeof object === 'object' && !Array.isArray(object), `${path} must be an object`);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(object)) {
    assert(allowed.has(key), `${path}.${key} is not an allowed field`);
  }
}

function validateEnvironment(environment, classification, expectedSchema) {
  assertExactKeys(environment, [
    'baseUrl', 'provider', 'branch', 'commit', 'schemaMigration', 'schemaMigrationName',
    'schemaMigrationCount', 'schemaCompatible', 'productionReadinessVerified',
  ], 'environment');
  assert(typeof environment.baseUrl === 'string', 'environment.baseUrl is required');
  const parsedUrl = new URL(environment.baseUrl);
  assert(parsedUrl.protocol === 'https:', 'environment.baseUrl must use HTTPS');
  assert(typeof environment.provider === 'string' && environment.provider.length > 0, 'environment.provider is required');
  assert(typeof environment.branch === 'string' && environment.branch.length > 0, 'environment.branch is required');
  assert(GIT_SHA_PATTERN.test(environment.commit), 'environment.commit must be a full Git SHA');
  assert(typeof environment.schemaMigration === 'string', 'environment.schemaMigration is required');
  assert(typeof environment.schemaMigrationName === 'string', 'environment.schemaMigrationName is required');
  assertNonNegativeInteger(environment.schemaMigrationCount, 'environment.schemaMigrationCount');
  assertBoolean(environment.schemaCompatible, 'environment.schemaCompatible');
  assertBoolean(environment.productionReadinessVerified, 'environment.productionReadinessVerified');

  if (expectedSchema) {
    assert(environment.schemaMigration === expectedSchema.migration, `environment.schemaMigration must equal repository ${expectedSchema.migration}`);
    assert(environment.schemaMigrationName === expectedSchema.name, `environment.schemaMigrationName must equal repository ${expectedSchema.name}`);
    assert(environment.schemaMigrationCount === expectedSchema.count, `environment.schemaMigrationCount must equal repository ${expectedSchema.count}`);
  }

  if (classification === 'production-redacted') {
    assert(parsedUrl.origin === 'https://ctgone.com', 'production-redacted evidence must identify https://ctgone.com');
    assert(environment.provider === 'render', 'production-redacted evidence must identify Render');
    assert(environment.branch === 'main', 'production-redacted evidence must identify main');
    assert(environment.schemaCompatible === true, 'production-redacted evidence requires compatible schema');
    assert(environment.productionReadinessVerified === true, 'production-redacted evidence requires verified deployment readiness');
  }
}

function validateSourceDigests(sourceDigests) {
  assert(Array.isArray(sourceDigests) && sourceDigests.length > 0, 'sourceDigests must contain at least one source digest');
  const labels = new Set();
  for (const [index, source] of sourceDigests.entries()) {
    const path = `sourceDigests[${index}]`;
    assertExactKeys(source, ['label', 'sourceClass', 'sha256'], path);
    assert(typeof source.label === 'string' && /^[a-z0-9][a-z0-9._-]{2,63}$/i.test(source.label), `${path}.label has invalid format`);
    assert(!labels.has(source.label), `${path}.label must be unique`);
    labels.add(source.label);
    assert(SOURCE_CLASSES.has(source.sourceClass), `${path}.sourceClass is not allowed`);
    assert(SHA256_PATTERN.test(source.sha256), `${path}.sha256 must be lowercase SHA-256`);
  }
}

function validateFunding(funding, path) {
  assertExactKeys(funding, [
    'allocatedCapitalCents', 'cashReceiptCents', 'approvedReinvestmentDebitCents',
    'internalCapitalCents', 'unbackedExternalCapitalCents', 'reconciled',
  ], path);
  for (const key of [
    'allocatedCapitalCents', 'cashReceiptCents', 'approvedReinvestmentDebitCents',
    'internalCapitalCents', 'unbackedExternalCapitalCents',
  ]) assertNonNegativeInteger(funding[key], `${path}.${key}`);
  assertBoolean(funding.reconciled, `${path}.reconciled`);
  assert(
    funding.cashReceiptCents + funding.approvedReinvestmentDebitCents + funding.internalCapitalCents + funding.unbackedExternalCapitalCents
      === funding.allocatedCapitalCents,
    `${path} capital sources must exactly equal allocatedCapitalCents`,
  );
  if (funding.reconciled) {
    assert(funding.unbackedExternalCapitalCents === 0, `${path}.reconciled cannot be true with unbacked external capital`);
  }
}

function validateProduction(production, path) {
  assertExactKeys(production, ['serializedUnits', 'terminalPhysicalUnits', 'inventoryReconciled'], path);
  assertNonNegativeInteger(production.serializedUnits, `${path}.serializedUnits`);
  assertNonNegativeInteger(production.terminalPhysicalUnits, `${path}.terminalPhysicalUnits`);
  assert(production.terminalPhysicalUnits <= production.serializedUnits, `${path}.terminalPhysicalUnits cannot exceed serializedUnits`);
  assertBoolean(production.inventoryReconciled, `${path}.inventoryReconciled`);
}

function validateSales(sales, production, path) {
  assertExactKeys(sales, ['documentedSoldUnits', 'returnedUnits', 'returnGenealogyMismatches'], path);
  assertNonNegativeInteger(sales.documentedSoldUnits, `${path}.documentedSoldUnits`);
  assertNonNegativeInteger(sales.returnedUnits, `${path}.returnedUnits`);
  assertNonNegativeInteger(sales.returnGenealogyMismatches, `${path}.returnGenealogyMismatches`);
  assert(sales.documentedSoldUnits <= production.serializedUnits, `${path}.documentedSoldUnits cannot exceed serializedUnits`);
  assert(sales.returnedUnits <= sales.documentedSoldUnits, `${path}.returnedUnits cannot exceed documentedSoldUnits`);
}

function validateSettlement(settlement, path) {
  assertExactKeys(settlement, ['finalized', 'netDistributableProfitCents', 'participantCreditCents'], path);
  assertBoolean(settlement.finalized, `${path}.finalized`);
  if (settlement.finalized) {
    assert(Number.isSafeInteger(settlement.netDistributableProfitCents), `${path}.netDistributableProfitCents must be a safe integer when finalized`);
    assertNonNegativeInteger(settlement.participantCreditCents, `${path}.participantCreditCents`);
  } else {
    assert(settlement.netDistributableProfitCents === null, `${path}.netDistributableProfitCents must be null before settlement`);
    assert(settlement.participantCreditCents === 0, `${path}.participantCreditCents must be zero before settlement`);
  }
}

function validateLiquidity(liquidity, settlement, path) {
  assertExactKeys(liquidity, ['approvedReinvestmentCents', 'confirmedWithdrawalDebitCents'], path);
  assertNonNegativeInteger(liquidity.approvedReinvestmentCents, `${path}.approvedReinvestmentCents`);
  assertNonNegativeInteger(liquidity.confirmedWithdrawalDebitCents, `${path}.confirmedWithdrawalDebitCents`);
  if (!settlement.finalized) {
    assert(liquidity.approvedReinvestmentCents === 0, `${path}.approvedReinvestmentCents requires finalized settlement`);
    assert(liquidity.confirmedWithdrawalDebitCents === 0, `${path}.confirmedWithdrawalDebitCents requires finalized settlement`);
  }
}

function validateLots(lots) {
  assert(Array.isArray(lots) && lots.length > 0 && lots.length <= 100, 'lots must contain 1 to 100 redacted lot observations');
  const digests = new Set();
  for (const [index, lot] of lots.entries()) {
    const path = `lots[${index}]`;
    assertExactKeys(lot, ['lotDigestSha256', 'observedStatus', 'funding', 'production', 'sales', 'settlement', 'liquidity'], path);
    assert(LOT_DIGEST_PATTERN.test(lot.lotDigestSha256), `${path}.lotDigestSha256 must be lowercase SHA-256`);
    assert(!digests.has(lot.lotDigestSha256), `${path}.lotDigestSha256 must be unique`);
    digests.add(lot.lotDigestSha256);
    assert(typeof lot.observedStatus === 'string' && /^[A-Z_]{3,40}$/.test(lot.observedStatus), `${path}.observedStatus has invalid format`);
    validateFunding(lot.funding, `${path}.funding`);
    validateProduction(lot.production, `${path}.production`);
    validateSales(lot.sales, lot.production, `${path}.sales`);
    validateSettlement(lot.settlement, `${path}.settlement`);
    validateLiquidity(lot.liquidity, lot.settlement, `${path}.liquidity`);
  }
}

export function sha256Json(value) {
  return createHash('sha256').update(`${JSON.stringify(value)}\n`, 'utf8').digest('hex');
}

export function validateInvestmentOperatingEvidence(evidence, options = {}) {
  assertExactKeys(evidence, [
    'captureVersion', 'classification', 'redactionPolicyVersion', 'captureId', 'capturedAt',
    'environment', 'sourceDigests', 'lots',
  ], 'evidence');
  assert(evidence.captureVersion === INVESTMENT_OPERATING_EVIDENCE_VERSION, 'Unsupported operating evidence captureVersion');
  assert(CLASSIFICATIONS.has(evidence.classification), 'Unsupported operating evidence classification');
  assert(evidence.redactionPolicyVersion === INVESTMENT_OPERATING_REDACTION_POLICY_VERSION, 'Unsupported redactionPolicyVersion');
  assert(CAPTURE_ID_PATTERN.test(evidence.captureId), 'captureId must use ioe- plus 24 lowercase hex characters');
  assertIsoTimestamp(evidence.capturedAt, 'capturedAt');
  walkForSensitiveContent(evidence);
  validateEnvironment(evidence.environment, evidence.classification, options.expectedSchema);
  validateSourceDigests(evidence.sourceDigests);
  validateLots(evidence.lots);
  return evidence;
}

export function summarizeInvestmentOperatingEvidence(evidence, options = {}) {
  validateInvestmentOperatingEvidence(evidence, options);
  const totals = evidence.lots.reduce((acc, lot) => {
    acc.allocatedCapitalCents += lot.funding.allocatedCapitalCents;
    acc.serializedUnits += lot.production.serializedUnits;
    acc.documentedSoldUnits += lot.sales.documentedSoldUnits;
    acc.returnedUnits += lot.sales.returnedUnits;
    acc.finalizedSettlements += lot.settlement.finalized ? 1 : 0;
    acc.participantCreditCents += lot.settlement.participantCreditCents;
    acc.approvedReinvestmentCents += lot.liquidity.approvedReinvestmentCents;
    acc.confirmedWithdrawalDebitCents += lot.liquidity.confirmedWithdrawalDebitCents;
    acc.reconciledFundingLots += lot.funding.reconciled ? 1 : 0;
    acc.reconciledInventoryLots += lot.production.inventoryReconciled ? 1 : 0;
    acc.returnGenealogyMismatches += lot.sales.returnGenealogyMismatches;
    acc.unbackedExternalCapitalCents += lot.funding.unbackedExternalCapitalCents;
    return acc;
  }, {
    allocatedCapitalCents: 0,
    serializedUnits: 0,
    documentedSoldUnits: 0,
    returnedUnits: 0,
    finalizedSettlements: 0,
    participantCreditCents: 0,
    approvedReinvestmentCents: 0,
    confirmedWithdrawalDebitCents: 0,
    reconciledFundingLots: 0,
    reconciledInventoryLots: 0,
    returnGenealogyMismatches: 0,
    unbackedExternalCapitalCents: 0,
  });
  return {
    lotCount: evidence.lots.length,
    ...totals,
    closedLoopObserved: evidence.lots.some((lot) =>
      lot.funding.reconciled
      && lot.production.serializedUnits > 0
      && lot.sales.documentedSoldUnits > 0
      && lot.settlement.finalized
      && (lot.liquidity.approvedReinvestmentCents > 0 || lot.liquidity.confirmedWithdrawalDebitCents > 0)),
  };
}

export function createInvestmentOperatingReviewTemplate(evidence, options = {}) {
  validateInvestmentOperatingEvidence(evidence, options);
  return {
    reviewVersion: INVESTMENT_OPERATING_REVIEW_VERSION,
    captureId: evidence.captureId,
    evidenceSha256: sha256Json(evidence),
    reviewerHandle: null,
    reviewedAt: null,
    judgments: {
      provenanceVerified: null,
      redactionVerified: null,
      fundingReconciliationReviewed: null,
      productionTraceabilityReviewed: null,
      salesReturnGenealogyReviewed: null,
      settlementLiquidityReviewed: null,
      noUnresolvedMaterialAnomalies: null,
    },
    notes: null,
  };
}

export function validateInvestmentOperatingReview(review, evidence, options = {}) {
  validateInvestmentOperatingEvidence(evidence, options);
  assertExactKeys(review, ['reviewVersion', 'captureId', 'evidenceSha256', 'reviewerHandle', 'reviewedAt', 'judgments', 'notes'], 'review');
  assert(review.reviewVersion === INVESTMENT_OPERATING_REVIEW_VERSION, 'Unsupported operating evidence reviewVersion');
  assert(review.captureId === evidence.captureId, 'review.captureId does not match evidence');
  assert(review.evidenceSha256 === sha256Json(evidence), 'review.evidenceSha256 does not match evidence');
  assert(typeof review.reviewerHandle === 'string' && /^[a-z0-9][a-z0-9._-]{2,63}$/i.test(review.reviewerHandle), 'review.reviewerHandle is required');
  assertIsoTimestamp(review.reviewedAt, 'review.reviewedAt');
  assertExactKeys(review.judgments, [
    'provenanceVerified', 'redactionVerified', 'fundingReconciliationReviewed',
    'productionTraceabilityReviewed', 'salesReturnGenealogyReviewed',
    'settlementLiquidityReviewed', 'noUnresolvedMaterialAnomalies',
  ], 'review.judgments');
  for (const [key, value] of Object.entries(review.judgments)) assertBoolean(value, `review.judgments.${key}`);
  assert(review.notes === null || (typeof review.notes === 'string' && review.notes.length <= 1000), 'review.notes must be null or at most 1000 characters');
  walkForSensitiveContent(review);
  return review;
}

export function finalizeInvestmentOperatingEvidence(evidence, review, options = {}) {
  validateInvestmentOperatingReview(review, evidence, options);
  const summary = summarizeInvestmentOperatingEvidence(evidence, options);
  const allJudgmentsPass = Object.values(review.judgments).every((value) => value === true);
  const structurallyReleaseEvidenceEligible =
    evidence.classification === 'production-redacted'
    && allJudgmentsPass
    && summary.unbackedExternalCapitalCents === 0
    && summary.returnGenealogyMismatches === 0
    && summary.closedLoopObserved;

  return {
    reportVersion: INVESTMENT_OPERATING_REPORT_VERSION,
    captureId: evidence.captureId,
    classification: evidence.classification,
    evidenceSha256: sha256Json(evidence),
    finalizedAt: new Date().toISOString(),
    environment: evidence.environment,
    summary,
    humanReview: {
      reviewerHandle: review.reviewerHandle,
      reviewedAt: review.reviewedAt,
      allJudgmentsPass,
    },
    releaseEvidenceEligible: structurallyReleaseEvidenceEligible,
    capabilityPromotionAllowed: false,
    promotionBlockers: [
      'explicit-human-release-decision-required',
      'pending-business-and-legal-decisions-remain-separate-gates',
    ],
    note: evidence.classification === 'synthetic-ci'
      ? 'Synthetic CI evidence can never count as production operating evidence.'
      : 'A structurally eligible production report is evidence for human release review only; it does not promote Investment automatically.',
  };
}
