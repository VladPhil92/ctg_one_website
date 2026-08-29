import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  INVESTMENT_PRODUCTION_READINESS_EVIDENCE_VERSION,
  createInvestmentProductionReadinessEvidence,
  isSuccessfulInvestmentProductionReadinessEvidence,
  validateInvestmentProductionReadinessEvidence,
} from '../src/lib/investment/production-readiness-evidence.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const fixture = JSON.parse(await read('scripts/fixtures/investment-production-readiness-canary.synthetic-v1.json'));
const schemaSource = await read('src/lib/observability/schema-version.ts');
const expectedMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaSource)?.[1];
const expectedMigrationName = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(schemaSource)?.[1];
const expectedMigrationCount = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaSource)?.[1]);
assert.ok(expectedMigration && expectedMigrationName && Number.isSafeInteger(expectedMigrationCount), 'Repository schema metadata must be parseable.');

validateInvestmentProductionReadinessEvidence(fixture);
assert.equal(fixture.evidenceVersion, INVESTMENT_PRODUCTION_READINESS_EVIDENCE_VERSION);
assert.equal(fixture.expectedMigration, expectedMigration, 'Synthetic fixture must track the repository migration version.');
assert.equal(fixture.expectedMigrationName, expectedMigrationName, 'Synthetic fixture must track the repository migration name.');
assert.equal(fixture.expectedMigrationCount, expectedMigrationCount, 'Synthetic fixture must track the repository migration count.');
assert.equal(
  isSuccessfulInvestmentProductionReadinessEvidence(fixture, {
    provider: 'render',
    branch: 'main',
    commit: fixture.expectedSha,
  }),
  false,
  'Synthetic CI evidence must never qualify as production release evidence.',
);

const productionEvidence = createInvestmentProductionReadinessEvidence({
  classification: 'production-canary',
  capturedAt: '2026-08-21T18:30:00.000Z',
  origin: 'https://ctgone.com',
  result: 'PASS',
  expectedSha: 'b'.repeat(40),
  expectedBranch: 'main',
  expectedMigration,
  expectedMigrationName,
  expectedMigrationCount,
  observed: {
    readinessHttp: 200,
    readinessStatus: 'ready',
    deploymentCommit: 'b'.repeat(40),
    publicStatus: 'BETA',
    productionOperatingEvidence: 'pending',
    surfaceHttp: 200,
    surfaceFinalUrl: 'https://ctgone.com/inversion',
  },
  failures: [],
});
const deployment = { provider: 'render', branch: 'main', commit: 'b'.repeat(40) };
assert.equal(isSuccessfulInvestmentProductionReadinessEvidence(productionEvidence, deployment), true);
assert.equal(
  isSuccessfulInvestmentProductionReadinessEvidence(productionEvidence, { ...deployment, commit: 'c'.repeat(40) }),
  false,
  'A stale canary artifact must not validate a different deployment commit.',
);
assert.equal(
  isSuccessfulInvestmentProductionReadinessEvidence(productionEvidence, { ...deployment, provider: 'unknown' }),
  false,
  'Only Render production deployment identity may consume production-canary evidence.',
);

const failedEvidence = createInvestmentProductionReadinessEvidence({
  ...productionEvidence,
  result: 'FAIL',
  failures: ['surface.http=503'],
});
assert.equal(isSuccessfulInvestmentProductionReadinessEvidence(failedEvidence, deployment), false, 'FAIL evidence must never satisfy release readiness.');

assert.throws(
  () => validateInvestmentProductionReadinessEvidence({ ...productionEvidence, origin: 'https://preview.example.com' }),
  /production-canary evidence must identify https:\/\/ctgone\.com/,
  'Production classification must be pinned to the canonical production origin.',
);
assert.throws(
  () => validateInvestmentProductionReadinessEvidence({ ...productionEvidence, failures: ['unexpected'] }),
  /PASS evidence must contain no failures/,
  'A PASS artifact with failures must fail validation.',
);
assert.throws(
  () => validateInvestmentProductionReadinessEvidence({
    ...productionEvidence,
    observed: { ...productionEvidence.observed, deploymentCommit: 'c'.repeat(40) },
  }),
  /deployment commit must equal expectedSha/,
  'PASS evidence must bind the observed deployment to the expected SHA.',
);
assert.throws(
  () => validateInvestmentProductionReadinessEvidence({ ...productionEvidence, extraField: true }),
  /extraField is not an allowed field/,
  'Unknown evidence fields must fail closed.',
);

const [workflow, verifier, releaseGate, governance, gitignore, validatorCli] = await Promise.all([
  read('.github/workflows/post-deploy-health.yml'),
  read('scripts/verify-investment-production-readiness.mjs'),
  read('src/lib/investment/release-gates.mjs'),
  read('src/data/investment-release-governance.mjs'),
  read('.gitignore'),
  read('scripts/validate-investment-production-readiness-evidence.mjs'),
]);

assert.match(workflow, /INVESTMENT_CANARY_EVIDENCE_PATH:\s*canary-evidence\/investment-production-readiness\.json/, 'Workflow must define the generated evidence path.');
assert.match(workflow, /id:\s*investment-canary/, 'Investment canary step needs a stable id for conditional artifact archival.');
assert.match(workflow, /uses:\s*actions\/upload-artifact@v7/, 'Workflow must archive the canary evidence artifact using the current action runtime.');
assert.match(workflow, /if:\s*always\(\) && steps\.investment-canary\.outcome != 'skipped'/, 'Artifact archival must run on pass/fail only when the Investment canary was attempted.');
assert.match(workflow, /if-no-files-found:\s*error/, 'Missing evidence after an attempted canary must fail loudly.');
assert.match(workflow, /retention-days:\s*14/, 'Canary evidence retention must be explicit and bounded.');
assert.doesNotMatch(workflow, /INVESTMENT.*(?:SERVICE_ROLE|PASSWORD|SECRET)/i, 'Read-only canary evidence capture must not require privileged secrets.');

assert.match(verifier, /createInvestmentProductionReadinessEvidence/, 'Verifier must use the shared versioned evidence contract.');
assert.match(verifier, /INVESTMENT_CANARY_ATTEMPTS/, 'Investment canary must have its own bounded retry budget.');
assert.match(verifier, /attempts > 6/, 'Investment-specific retry attempts must be capped.');
assert.match(verifier, /INVESTMENT_CANARY_INTERVAL_MS/, 'Investment canary retry interval must be explicit.');
assert.match(verifier, /persistEvidence\(evidence\)/, 'Verifier must persist final PASS/FAIL evidence when a path is configured.');
assert.match(verifier, /healthOrigin === 'https:\/\/ctgone\.com'[\s\S]*'production-canary'[\s\S]*'non-production-canary'/, 'Only the canonical CTG One origin may be classified as a production canary.');
assert.doesNotMatch(verifier, /bodyPreview/, 'Persisted canary diagnostics must not retain arbitrary response body previews.');

assert.match(releaseGate, /isSuccessfulInvestmentProductionReadinessEvidence/, 'Release governance must reuse the same shared canary evidence validator as capture tooling.');
assert.doesNotMatch(releaseGate, /function isSuccessfulProductionReadinessCanary/, 'Release governance must not duplicate the canary validation contract.');
assert.match(governance, /INVESTMENT_PRODUCTION_READINESS_CANARY = null/, 'Artifact creation must not auto-accept a canary into release governance.');
assert.match(gitignore, /canary-evidence\//, 'Generated local canary evidence must not be committed accidentally.');
assert.match(validatorCli, /--require-production/, 'Evidence CLI must support explicit production qualification checks.');

console.log('Investment production-readiness evidence capture invariants: PASS');
