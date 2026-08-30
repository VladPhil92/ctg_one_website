import {
  deriveBlockingInvestmentBusinessDecisionIds,
  validateInvestmentBusinessRuleGovernance,
  validateInvestmentBusinessRulePropagation,
} from '../../data/investment-business-rule-governance.mjs';
import {
  isInvestmentClosedBetaPilotAuthorized,
  validateInvestmentClosedBetaPilotAuthorization,
} from '../../data/investment-closed-beta-pilot-governance.mjs';
import { isSuccessfulInvestmentProductionReadinessEvidence } from './production-readiness-evidence.mjs';

export const INVESTMENT_CLOSED_BETA_PILOT_MANIFEST_VERSION =
  'ctg-investment-closed-beta-pilot-manifest-v1';
export const INVESTMENT_CLOSED_BETA_PRODUCTION_FLAG_EVIDENCE_VERSION =
  'ctg-investment-production-flag-evidence-v1';

export const INVESTMENT_CLOSED_BETA_PILOT_CLASSIFICATIONS = Object.freeze([
  'production-redacted-preflight',
  'synthetic-ci',
]);

const VALID_CLASSIFICATIONS = new Set(INVESTMENT_CLOSED_BETA_PILOT_CLASSIFICATIONS);
const VALID_MANUAL_FUNDING_RAILS = new Set(['manual-bank', 'manual-crypto']);
const CLOSED_BETA_SAFETY_FLAG_NAMES = Object.freeze([
  'publicRegistrationEnabled',
  'publicFundingEnabled',
  'paymentGatewayEnabled',
  'automaticSettlementEnabled',
  'automaticWithdrawalsEnabled',
]);
const SHA256_RE = /^[0-9a-f]{64}$/;
const GIT_SHA_RE = /^[0-9a-f]{40}$/;
const MIGRATION_RE = /^\d{4}$/;
const SAFE_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

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

function assertIsoTimestamp(value, path) {
  assert(typeof value === 'string' && Number.isFinite(Date.parse(value)), `${path} must be an ISO timestamp`);
}

function assertSha256(value, path) {
  assert(typeof value === 'string' && SHA256_RE.test(value), `${path} must be a lowercase SHA-256 digest`);
}

function assertSafeVersion(value, path) {
  assert(typeof value === 'string' && SAFE_VERSION_RE.test(value), `${path} must be a safe version token`);
}

function validateExpectedSchema(expectedSchema) {
  assert(expectedSchema && typeof expectedSchema === 'object' && !Array.isArray(expectedSchema), 'Expected repository schema identity is required');
  assert(MIGRATION_RE.test(expectedSchema.migration), 'Expected repository schema migration must be a four-digit version');
  assertSafeVersion(expectedSchema.name, 'expectedSchema.name');
  assert(Number.isSafeInteger(expectedSchema.count) && expectedSchema.count > 0, 'Expected repository schema count must be a positive safe integer');
  return expectedSchema;
}

export function validateInvestmentClosedBetaProductionFlagEvidence(evidence, deployment) {
  assertExactKeys(evidence, [
    'evidenceVersion',
    'classification',
    'capturedAt',
    'source',
    'provider',
    'branch',
    'commit',
    'flags',
    'reviewedBy',
    'reviewedAt',
    'evidenceRef',
  ], 'productionFlagEvidence');
  assert(
    evidence.evidenceVersion === INVESTMENT_CLOSED_BETA_PRODUCTION_FLAG_EVIDENCE_VERSION,
    'Production flag evidence version mismatch',
  );
  assert(evidence.classification === 'production-runtime-flags', 'Production flag evidence classification mismatch');
  assert(evidence.source === 'render-environment-review', 'Production flag evidence must come from a Render environment review');
  assertIsoTimestamp(evidence.capturedAt, 'productionFlagEvidence.capturedAt');
  assertIsoTimestamp(evidence.reviewedAt, 'productionFlagEvidence.reviewedAt');
  assert(typeof evidence.reviewedBy === 'string' && evidence.reviewedBy.trim().length >= 2, 'Production flag evidence reviewedBy is required');
  assert(typeof evidence.evidenceRef === 'string' && evidence.evidenceRef.trim().length >= 3, 'Production flag evidence evidenceRef is required');
  assert(evidence.provider === 'render', 'Production flag evidence provider must be render');
  assert(evidence.branch === 'main', 'Production flag evidence branch must be main');
  assert(GIT_SHA_RE.test(evidence.commit), 'Production flag evidence commit must be a lowercase full Git SHA');
  assert(deployment && typeof deployment === 'object' && !Array.isArray(deployment), 'Pilot deployment identity is required for production flag evidence');
  assert(evidence.provider === deployment.provider, 'Production flag evidence provider does not match deployment');
  assert(evidence.branch === deployment.branch, 'Production flag evidence branch does not match deployment');
  assert(evidence.commit === deployment.commit, 'Production flag evidence commit does not match deployment');
  assertExactKeys(evidence.flags, CLOSED_BETA_SAFETY_FLAG_NAMES, 'productionFlagEvidence.flags');
  for (const name of CLOSED_BETA_SAFETY_FLAG_NAMES) {
    assert(typeof evidence.flags[name] === 'boolean', `Production flag evidence ${name} must be explicitly boolean`);
  }
  return evidence;
}

export function validateInvestmentClosedBetaPilotManifest(manifest, { expectedSchema } = {}) {
  assertExactKeys(manifest, [
    'manifestVersion',
    'classification',
    'preparedAt',
    'environment',
    'participant',
    'lot',
    'funding',
  ], 'manifest');

  assert(
    manifest.manifestVersion === INVESTMENT_CLOSED_BETA_PILOT_MANIFEST_VERSION,
    'Unsupported closed-beta pilot manifestVersion',
  );
  assert(VALID_CLASSIFICATIONS.has(manifest.classification), 'Unsupported closed-beta pilot classification');
  assertIsoTimestamp(manifest.preparedAt, 'manifest.preparedAt');

  assertExactKeys(manifest.environment, [
    'origin',
    'provider',
    'branch',
    'commit',
    'schemaMigration',
    'schemaMigrationName',
    'schemaMigrationCount',
    'schemaCompatible',
    'productionReadinessVerified',
  ], 'manifest.environment');

  const origin = new URL(manifest.environment.origin);
  assert(origin.origin === manifest.environment.origin, 'manifest.environment.origin must be an origin without path/query/hash');
  assert(origin.protocol === 'https:', 'manifest.environment.origin must use HTTPS');
  assert(typeof manifest.environment.provider === 'string' && manifest.environment.provider.length > 0, 'manifest.environment.provider is required');
  assert(typeof manifest.environment.branch === 'string' && manifest.environment.branch.length > 0, 'manifest.environment.branch is required');
  assert(GIT_SHA_RE.test(manifest.environment.commit), 'manifest.environment.commit must be a lowercase full Git SHA');
  assert(MIGRATION_RE.test(manifest.environment.schemaMigration), 'manifest.environment.schemaMigration must be a four-digit version');
  assertSafeVersion(manifest.environment.schemaMigrationName, 'manifest.environment.schemaMigrationName');
  assert(Number.isSafeInteger(manifest.environment.schemaMigrationCount) && manifest.environment.schemaMigrationCount > 0, 'manifest.environment.schemaMigrationCount must be a positive safe integer');
  assert(typeof manifest.environment.schemaCompatible === 'boolean', 'manifest.environment.schemaCompatible must be boolean');
  assert(typeof manifest.environment.productionReadinessVerified === 'boolean', 'manifest.environment.productionReadinessVerified must be boolean');

  if (expectedSchema) {
    validateExpectedSchema(expectedSchema);
    assert(manifest.environment.schemaMigration === expectedSchema.migration, 'Pilot manifest schema migration mismatch');
    assert(manifest.environment.schemaMigrationName === expectedSchema.name, 'Pilot manifest schema migration name mismatch');
    assert(manifest.environment.schemaMigrationCount === expectedSchema.count, 'Pilot manifest schema migration count mismatch');
  }

  if (manifest.classification === 'production-redacted-preflight') {
    assert(manifest.environment.origin === 'https://ctgone.com', 'Production pilot preflight must identify https://ctgone.com');
    assert(manifest.environment.provider === 'render', 'Production pilot preflight must identify Render');
    assert(manifest.environment.branch === 'main', 'Production pilot preflight must target main');
  } else {
    assert(manifest.environment.origin !== 'https://ctgone.com', 'Synthetic pilot preflight cannot identify the production origin');
  }

  assertExactKeys(manifest.participant, [
    'profileDigestSha256',
    'kycStatus',
    'agreementAccepted',
    'agreementVersion',
    'agreementDigestSha256',
  ], 'manifest.participant');
  assertSha256(manifest.participant.profileDigestSha256, 'manifest.participant.profileDigestSha256');
  assert(manifest.participant.kycStatus === 'VERIFIED', 'Pilot participant must have VERIFIED KYC');
  assert(manifest.participant.agreementAccepted === true, 'Pilot participant must have current agreement acceptance');
  assertSafeVersion(manifest.participant.agreementVersion, 'manifest.participant.agreementVersion');
  assertSha256(manifest.participant.agreementDigestSha256, 'manifest.participant.agreementDigestSha256');

  assertExactKeys(manifest.lot, [
    'lotDigestSha256',
    'formulaVersion',
    'agreementVersion',
    'plannedUnits',
    'serializationPlanVersion',
    'longStopAt',
    'currency',
    'capitalTargetCents',
  ], 'manifest.lot');
  assertSha256(manifest.lot.lotDigestSha256, 'manifest.lot.lotDigestSha256');
  assertSafeVersion(manifest.lot.formulaVersion, 'manifest.lot.formulaVersion');
  assertSafeVersion(manifest.lot.agreementVersion, 'manifest.lot.agreementVersion');
  assert(manifest.lot.agreementVersion === manifest.participant.agreementVersion, 'Pilot lot and participant agreement versions must match');
  assert(Number.isSafeInteger(manifest.lot.plannedUnits) && manifest.lot.plannedUnits > 0, 'manifest.lot.plannedUnits must be a positive safe integer');
  assertSafeVersion(manifest.lot.serializationPlanVersion, 'manifest.lot.serializationPlanVersion');
  assertIsoTimestamp(manifest.lot.longStopAt, 'manifest.lot.longStopAt');
  assert(Date.parse(manifest.lot.longStopAt) > Date.parse(manifest.preparedAt), 'manifest.lot.longStopAt must be after manifest.preparedAt');
  assert(manifest.lot.currency === 'COP', 'Closed-beta pilot currency must be COP');
  assert(Number.isSafeInteger(manifest.lot.capitalTargetCents) && manifest.lot.capitalTargetCents > 0, 'manifest.lot.capitalTargetCents must be a positive safe integer');

  assertExactKeys(manifest.funding, [
    'rail',
    'manualVerificationRequired',
  ], 'manifest.funding');
  assert(VALID_MANUAL_FUNDING_RAILS.has(manifest.funding.rail), 'Pilot funding rail must be manual-bank or manual-crypto');
  assert(manifest.funding.manualVerificationRequired === true, 'Pilot funding must require manual external verification');

  return manifest;
}

function gate(id, status, detail) {
  return Object.freeze({ id, status, detail });
}

export function buildInvestmentClosedBetaPilotPreflight({
  manifest,
  expectedSchema,
  businessRuleGovernance,
  businessRulePropagation,
  pilotAuthorization,
  productionReadinessCanary,
  deployment,
  productionFlagEvidence,
}) {
  validateExpectedSchema(expectedSchema);
  validateInvestmentClosedBetaPilotManifest(manifest, { expectedSchema });
  validateInvestmentBusinessRuleGovernance(businessRuleGovernance);
  validateInvestmentBusinessRulePropagation(businessRuleGovernance, businessRulePropagation);
  validateInvestmentClosedBetaPilotAuthorization(pilotAuthorization);

  assert(deployment && typeof deployment === 'object' && !Array.isArray(deployment), 'Pilot deployment identity is required');

  const businessBlockers = deriveBlockingInvestmentBusinessDecisionIds(
    businessRuleGovernance,
    businessRulePropagation,
  );
  const businessReady = businessBlockers.length === 0;
  const authorizationReady = isInvestmentClosedBetaPilotAuthorized(pilotAuthorization);
  const productionClassification = manifest.classification === 'production-redacted-preflight';
  const deploymentMatchesManifest = Boolean(
    deployment.provider === manifest.environment.provider
    && deployment.branch === manifest.environment.branch
    && deployment.commit === manifest.environment.commit
  );
  const canarySchemaMatches = Boolean(
    productionReadinessCanary
    && productionReadinessCanary.expectedMigration === expectedSchema.migration
    && productionReadinessCanary.expectedMigrationName === expectedSchema.name
    && productionReadinessCanary.expectedMigrationCount === expectedSchema.count
  );
  const canaryReady = Boolean(
    productionClassification
    && manifest.environment.schemaCompatible === true
    && manifest.environment.productionReadinessVerified === true
    && deploymentMatchesManifest
    && canarySchemaMatches
    && isSuccessfulInvestmentProductionReadinessEvidence(productionReadinessCanary, deployment)
  );

  let flagEvidenceValid = false;
  let unsafeFlagNames = [];
  if (productionFlagEvidence) {
    try {
      validateInvestmentClosedBetaProductionFlagEvidence(productionFlagEvidence, deployment);
      flagEvidenceValid = true;
      unsafeFlagNames = CLOSED_BETA_SAFETY_FLAG_NAMES.filter(
        (name) => productionFlagEvidence.flags[name] === true,
      );
    } catch {
      flagEvidenceValid = false;
    }
  }
  const exposureSafe = productionClassification && flagEvidenceValid && unsafeFlagNames.length === 0;

  const gates = Object.freeze([
    gate(
      'manifest',
      'PASS',
      'Manifest is structurally valid, redacted and pinned to the expected schema.',
    ),
    gate(
      'production-classification',
      productionClassification ? 'PASS' : 'BLOCKED',
      productionClassification
        ? 'Manifest is classified for production-redacted preflight review.'
        : 'Synthetic CI manifests can never authorize a real pilot.',
    ),
    gate(
      'business-rules-and-propagation',
      businessReady ? 'PASS' : 'BLOCKED',
      businessReady
        ? 'BR-001..BR-005 are approved and authoritative propagation is VERIFIED.'
        : `Business-rule blockers: ${businessBlockers.join(', ') || 'unknown'}.`,
    ),
    gate(
      'pilot-authorization',
      authorizationReady ? 'PASS' : 'BLOCKED',
      authorizationReady
        ? 'Separate human closed-beta pilot authorization is recorded for the exact BR candidate.'
        : 'Separate closed-beta real-money pilot authorization is not recorded.',
    ),
    gate(
      'exact-deployment-readiness',
      canaryReady ? 'PASS' : 'BLOCKED',
      canaryReady
        ? 'Exact deployment identity, schema compatibility and production canary are verified.'
        : 'Exact production deployment/readiness evidence is absent, stale or mismatched.',
    ),
    gate(
      'closed-beta-exposure',
      exposureSafe ? 'PASS' : 'BLOCKED',
      exposureSafe
        ? 'Reviewed production evidence confirms public funding/payment exposure and automatic money movement are disabled.'
        : flagEvidenceValid && unsafeFlagNames.length > 0
          ? `Reviewed production evidence reports unsafe flags enabled: ${unsafeFlagNames.join(', ')}.`
          : 'Reviewed production feature-flag evidence for the exact deployment is absent, malformed or stale.',
    ),
  ]);

  const blockers = Object.freeze(gates.filter((item) => item.status !== 'PASS').map((item) => item.id));
  const ready = blockers.length === 0;

  return Object.freeze({
    preflightVersion: 'ctg-investment-closed-beta-pilot-preflight-v1',
    status: ready ? 'READY' : 'BLOCKED',
    pilotStartReviewEligible: ready,
    automaticExecutionAllowed: false,
    manualFundingVerificationRequired: true,
    businessDecisionBlockers: businessBlockers,
    blockers,
    gates,
  });
}
