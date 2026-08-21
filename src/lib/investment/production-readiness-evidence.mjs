export const INVESTMENT_PRODUCTION_READINESS_EVIDENCE_VERSION = 'ctg-investment-production-readiness-evidence-v1';

const CLASSIFICATIONS = new Set(['production-canary', 'non-production-canary', 'synthetic-ci']);
const RESULTS = new Set(['PASS', 'FAIL']);
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const MIGRATION_PATTERN = /^\d{4}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertExactKeys(object, allowedKeys, path) {
  assert(object && typeof object === 'object' && !Array.isArray(object), `${path} must be an object`);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(object)) {
    assert(allowed.has(key), `${path}.${key} is not an allowed field`);
  }
}

function assertNullableInteger(value, path) {
  assert(value === null || Number.isSafeInteger(value), `${path} must be null or a safe integer`);
}

function assertNullableString(value, path) {
  assert(value === null || typeof value === 'string', `${path} must be null or a string`);
}

function assertIsoTimestamp(value, path) {
  assert(typeof value === 'string' && Number.isFinite(Date.parse(value)), `${path} must be an ISO timestamp`);
}

function validateObserved(observed) {
  assertExactKeys(observed, [
    'readinessHttp',
    'readinessStatus',
    'deploymentCommit',
    'publicStatus',
    'productionOperatingEvidence',
    'surfaceHttp',
    'surfaceFinalUrl',
  ], 'evidence.observed');
  assertNullableInteger(observed.readinessHttp, 'evidence.observed.readinessHttp');
  assertNullableString(observed.readinessStatus, 'evidence.observed.readinessStatus');
  assertNullableString(observed.deploymentCommit, 'evidence.observed.deploymentCommit');
  assertNullableString(observed.publicStatus, 'evidence.observed.publicStatus');
  assertNullableString(observed.productionOperatingEvidence, 'evidence.observed.productionOperatingEvidence');
  assertNullableInteger(observed.surfaceHttp, 'evidence.observed.surfaceHttp');
  assertNullableString(observed.surfaceFinalUrl, 'evidence.observed.surfaceFinalUrl');
  if (observed.deploymentCommit !== null) {
    assert(GIT_SHA_PATTERN.test(observed.deploymentCommit), 'evidence.observed.deploymentCommit must be a lowercase full Git SHA when present');
  }
  if (observed.surfaceFinalUrl !== null) {
    const url = new URL(observed.surfaceFinalUrl);
    assert(url.protocol === 'https:', 'evidence.observed.surfaceFinalUrl must use HTTPS');
  }
}

export function validateInvestmentProductionReadinessEvidence(evidence) {
  assertExactKeys(evidence, [
    'evidenceVersion',
    'classification',
    'capturedAt',
    'origin',
    'result',
    'expectedSha',
    'expectedBranch',
    'expectedMigration',
    'expectedMigrationName',
    'expectedMigrationCount',
    'observed',
    'failures',
  ], 'evidence');

  assert(
    evidence.evidenceVersion === INVESTMENT_PRODUCTION_READINESS_EVIDENCE_VERSION,
    'Unsupported Investment production-readiness evidenceVersion',
  );
  assert(CLASSIFICATIONS.has(evidence.classification), 'Unsupported Investment canary evidence classification');
  assertIsoTimestamp(evidence.capturedAt, 'evidence.capturedAt');

  const origin = new URL(evidence.origin);
  assert(origin.protocol === 'https:', 'evidence.origin must use HTTPS');
  assert(origin.origin === evidence.origin, 'evidence.origin must be an origin without path/query/hash');

  assert(RESULTS.has(evidence.result), 'evidence.result must be PASS or FAIL');
  assert(GIT_SHA_PATTERN.test(evidence.expectedSha), 'evidence.expectedSha must be a lowercase full Git SHA');
  assert(typeof evidence.expectedBranch === 'string' && evidence.expectedBranch.length > 0, 'evidence.expectedBranch is required');
  assert(MIGRATION_PATTERN.test(evidence.expectedMigration), 'evidence.expectedMigration must be a four-digit migration version');
  assert(typeof evidence.expectedMigrationName === 'string' && /^[a-z0-9_]+$/.test(evidence.expectedMigrationName), 'evidence.expectedMigrationName must be snake_case');
  assert(Number.isSafeInteger(evidence.expectedMigrationCount) && evidence.expectedMigrationCount > 0, 'evidence.expectedMigrationCount must be a positive safe integer');

  validateObserved(evidence.observed);
  assert(Array.isArray(evidence.failures), 'evidence.failures must be an array');
  for (const [index, failure] of evidence.failures.entries()) {
    assert(typeof failure === 'string' && failure.length > 0 && failure.length <= 240, `evidence.failures[${index}] must be a non-empty string of at most 240 characters`);
  }

  if (evidence.classification === 'production-canary') {
    assert(evidence.origin === 'https://ctgone.com', 'production-canary evidence must identify https://ctgone.com');
    assert(evidence.expectedBranch === 'main', 'production-canary evidence must target main');
  } else if (evidence.classification === 'non-production-canary') {
    assert(evidence.origin !== 'https://ctgone.com', 'non-production-canary evidence cannot identify the production origin');
  }

  if (evidence.result === 'PASS') {
    assert(evidence.failures.length === 0, 'PASS evidence must contain no failures');
    assert(evidence.observed.readinessHttp === 200, 'PASS evidence requires readiness HTTP 200');
    assert(evidence.observed.readinessStatus === 'ready', 'PASS evidence requires readiness status ready');
    assert(evidence.observed.deploymentCommit === evidence.expectedSha, 'PASS evidence deployment commit must equal expectedSha');
    assert(evidence.observed.publicStatus === 'BETA', 'PASS evidence requires public status BETA');
    assert(evidence.observed.productionOperatingEvidence === 'pending', 'PASS evidence must preserve pending production operating evidence');
    assert(evidence.observed.surfaceHttp === 200, 'PASS evidence requires canonical Investment surface HTTP 200');
    assert(typeof evidence.observed.surfaceFinalUrl === 'string', 'PASS evidence requires surfaceFinalUrl');
    const surface = new URL(evidence.observed.surfaceFinalUrl);
    assert(surface.origin === evidence.origin, 'PASS evidence surface origin must equal evidence.origin');
    assert(surface.pathname === '/inversion', 'PASS evidence must resolve to canonical /inversion');
    assert(surface.search === '', 'PASS evidence canonical Investment surface must not include a query string');
  } else {
    assert(evidence.failures.length > 0, 'FAIL evidence must explain at least one failure');
  }

  return evidence;
}

export function createInvestmentProductionReadinessEvidence(input) {
  const evidence = {
    evidenceVersion: INVESTMENT_PRODUCTION_READINESS_EVIDENCE_VERSION,
    classification: input.classification,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    origin: input.origin,
    result: input.result,
    expectedSha: input.expectedSha,
    expectedBranch: input.expectedBranch,
    expectedMigration: input.expectedMigration,
    expectedMigrationName: input.expectedMigrationName,
    expectedMigrationCount: input.expectedMigrationCount,
    observed: {
      readinessHttp: input.observed?.readinessHttp ?? null,
      readinessStatus: input.observed?.readinessStatus ?? null,
      deploymentCommit: input.observed?.deploymentCommit ?? null,
      publicStatus: input.observed?.publicStatus ?? null,
      productionOperatingEvidence: input.observed?.productionOperatingEvidence ?? null,
      surfaceHttp: input.observed?.surfaceHttp ?? null,
      surfaceFinalUrl: input.observed?.surfaceFinalUrl ?? null,
    },
    failures: [...(input.failures ?? [])],
  };
  return validateInvestmentProductionReadinessEvidence(evidence);
}

export function isSuccessfulInvestmentProductionReadinessEvidence(evidence, deployment) {
  try {
    validateInvestmentProductionReadinessEvidence(evidence);
  } catch {
    return false;
  }
  return Boolean(
    evidence.classification === 'production-canary'
    && evidence.result === 'PASS'
    && deployment?.provider === 'render'
    && deployment?.branch === 'main'
    && deployment?.commit === evidence.expectedSha
    && evidence.expectedBranch === deployment.branch
    && evidence.observed.deploymentCommit === deployment.commit,
  );
}
