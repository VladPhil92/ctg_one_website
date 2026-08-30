import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
} from '../src/data/investment-business-rule-governance.mjs';
import {
  INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION,
  INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_SCOPE,
  validateInvestmentClosedBetaPilotAuthorization,
} from '../src/data/investment-closed-beta-pilot-governance.mjs';
import {
  buildInvestmentClosedBetaPilotPreflight,
  validateInvestmentClosedBetaPilotManifest,
} from '../src/lib/investment/closed-beta-pilot-preflight.mjs';
import { createInvestmentProductionReadinessEvidence } from '../src/lib/investment/production-readiness-evidence.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));

const schemaSource = await read('src/lib/observability/schema-version.ts');
const expectedSchema = {
  migration: /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaSource)?.[1],
  name: /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(schemaSource)?.[1],
  count: Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaSource)?.[1]),
};
assert.ok(expectedSchema.migration && expectedSchema.name && Number.isSafeInteger(expectedSchema.count));

const syntheticManifest = JSON.parse(await read('scripts/fixtures/investment-closed-beta-pilot.synthetic-v1.json'));
validateInvestmentClosedBetaPilotManifest(syntheticManifest, { expectedSchema });

const safeFlags = {
  publicRegistrationEnabled: false,
  publicFundingEnabled: false,
  paymentGatewayEnabled: false,
  automaticSettlementEnabled: false,
  automaticWithdrawalsEnabled: false,
};

const canonical = buildInvestmentClosedBetaPilotPreflight({
  manifest: syntheticManifest,
  expectedSchema,
  businessRuleGovernance: INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  businessRulePropagation: INVESTMENT_BUSINESS_RULE_PROPAGATION,
  pilotAuthorization: INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION,
  productionReadinessCanary: null,
  deployment: {
    provider: syntheticManifest.environment.provider,
    branch: syntheticManifest.environment.branch,
    commit: syntheticManifest.environment.commit,
  },
  flags: safeFlags,
});
assert.equal(canonical.status, 'BLOCKED');
assert.equal(canonical.pilotStartReviewEligible, false);
assert.equal(canonical.automaticExecutionAllowed, false);
assert.deepEqual(canonical.businessDecisionBlockers, INVESTMENT_REQUIRED_BUSINESS_RULE_IDS);
assert.ok(canonical.blockers.includes('production-classification'));
assert.ok(canonical.blockers.includes('business-rules-and-propagation'));
assert.ok(canonical.blockers.includes('pilot-authorization'));
assert.ok(canonical.blockers.includes('exact-deployment-readiness'));

const approvedGovernance = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
for (const [index, rule] of approvedGovernance.rules.entries()) {
  rule.status = 'APPROVED';
  rule.reviewedCandidateCommit = INVESTMENT_BUSINESS_RULE_CANDIDATE.commit;
  rule.reviewedCandidateBlobSha = INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha;
  rule.decidedBy = 'governance-reviewer';
  rule.decidedAt = `2026-08-30T03:0${index}:00.000Z`;
  rule.evidenceRef = `governance-record:${rule.id}:fixture`;
}

const approvedButUnpropagated = buildInvestmentClosedBetaPilotPreflight({
  manifest: syntheticManifest,
  expectedSchema,
  businessRuleGovernance: approvedGovernance,
  businessRulePropagation: INVESTMENT_BUSINESS_RULE_PROPAGATION,
  pilotAuthorization: INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION,
  productionReadinessCanary: null,
  deployment: {
    provider: syntheticManifest.environment.provider,
    branch: syntheticManifest.environment.branch,
    commit: syntheticManifest.environment.commit,
  },
  flags: safeFlags,
});
assert.deepEqual(approvedButUnpropagated.businessDecisionBlockers, INVESTMENT_REQUIRED_BUSINESS_RULE_IDS);
assert.ok(approvedButUnpropagated.blockers.includes('business-rules-and-propagation'));

const verifiedPropagation = clone(INVESTMENT_BUSINESS_RULE_PROPAGATION);
verifiedPropagation.status = 'VERIFIED';
verifiedPropagation.verifiedCandidateCommit = INVESTMENT_BUSINESS_RULE_CANDIDATE.commit;
verifiedPropagation.verifiedCandidateBlobSha = INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha;
verifiedPropagation.verifiedBy = 'runtime-governance-reviewer';
verifiedPropagation.verifiedAt = '2026-08-30T03:20:00.000Z';
verifiedPropagation.evidenceRef = 'propagation-record:fixture';

const productionManifest = clone(syntheticManifest);
productionManifest.classification = 'production-redacted-preflight';
productionManifest.environment.origin = 'https://ctgone.com';
productionManifest.environment.provider = 'render';
productionManifest.environment.branch = 'main';
productionManifest.environment.schemaCompatible = true;
productionManifest.environment.productionReadinessVerified = true;
validateInvestmentClosedBetaPilotManifest(productionManifest, { expectedSchema });

const productionDeployment = {
  provider: 'render',
  branch: 'main',
  commit: productionManifest.environment.commit,
};
const successfulCanary = createInvestmentProductionReadinessEvidence({
  classification: 'production-canary',
  capturedAt: '2026-08-30T03:30:00.000Z',
  origin: 'https://ctgone.com',
  result: 'PASS',
  expectedSha: productionDeployment.commit,
  expectedBranch: 'main',
  expectedMigration: expectedSchema.migration,
  expectedMigrationName: expectedSchema.name,
  expectedMigrationCount: expectedSchema.count,
  observed: {
    readinessHttp: 200,
    readinessStatus: 'ready',
    deploymentCommit: productionDeployment.commit,
    publicStatus: 'BETA',
    productionOperatingEvidence: 'pending',
    surfaceHttp: 200,
    surfaceFinalUrl: 'https://ctgone.com/inversion',
  },
  failures: [],
});

const noPilotAuthorization = buildInvestmentClosedBetaPilotPreflight({
  manifest: productionManifest,
  expectedSchema,
  businessRuleGovernance: approvedGovernance,
  businessRulePropagation: verifiedPropagation,
  pilotAuthorization: INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION,
  productionReadinessCanary: successfulCanary,
  deployment: productionDeployment,
  flags: safeFlags,
});
assert.deepEqual(noPilotAuthorization.businessDecisionBlockers, []);
assert.deepEqual(noPilotAuthorization.blockers, ['pilot-authorization']);
assert.equal(noPilotAuthorization.pilotStartReviewEligible, false);

const authorizedPilot = {
  version: 'ctg-investment-closed-beta-pilot-authorization-v1',
  status: 'AUTHORIZED',
  scope: INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION_SCOPE,
  reviewedCandidateCommit: INVESTMENT_BUSINESS_RULE_CANDIDATE.commit,
  reviewedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha,
  authorizedBy: 'pilot-governance-reviewer',
  authorizedAt: '2026-08-30T03:40:00.000Z',
  evidenceRef: 'pilot-authorization:fixture',
};
validateInvestmentClosedBetaPilotAuthorization(authorizedPilot);

const ready = buildInvestmentClosedBetaPilotPreflight({
  manifest: productionManifest,
  expectedSchema,
  businessRuleGovernance: approvedGovernance,
  businessRulePropagation: verifiedPropagation,
  pilotAuthorization: authorizedPilot,
  productionReadinessCanary: successfulCanary,
  deployment: productionDeployment,
  flags: safeFlags,
});
assert.equal(ready.status, 'READY');
assert.equal(ready.pilotStartReviewEligible, true);
assert.equal(ready.automaticExecutionAllowed, false, 'Even a fully passing preflight must never execute or auto-authorize money movement.');
assert.deepEqual(ready.blockers, []);

const staleCanary = createInvestmentProductionReadinessEvidence({
  ...successfulCanary,
  expectedSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  observed: {
    ...successfulCanary.observed,
    deploymentCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  },
});
const staleReadiness = buildInvestmentClosedBetaPilotPreflight({
  manifest: productionManifest,
  expectedSchema,
  businessRuleGovernance: approvedGovernance,
  businessRulePropagation: verifiedPropagation,
  pilotAuthorization: authorizedPilot,
  productionReadinessCanary: staleCanary,
  deployment: productionDeployment,
  flags: safeFlags,
});
assert.ok(staleReadiness.blockers.includes('exact-deployment-readiness'));
assert.equal(staleReadiness.status, 'BLOCKED');

const staleSchemaCanary = createInvestmentProductionReadinessEvidence({
  ...successfulCanary,
  expectedMigration: '0001',
  expectedMigrationName: 'initial',
  expectedMigrationCount: 1,
});
const staleSchemaReadiness = buildInvestmentClosedBetaPilotPreflight({
  manifest: productionManifest,
  expectedSchema,
  businessRuleGovernance: approvedGovernance,
  businessRulePropagation: verifiedPropagation,
  pilotAuthorization: authorizedPilot,
  productionReadinessCanary: staleSchemaCanary,
  deployment: productionDeployment,
  flags: safeFlags,
});
assert.ok(staleSchemaReadiness.blockers.includes('exact-deployment-readiness'));
assert.equal(staleSchemaReadiness.status, 'BLOCKED', 'A canary for stale schema metadata must not satisfy pilot readiness.');

const incompleteFlags = { ...safeFlags };
delete incompleteFlags.publicFundingEnabled;
assert.throws(
  () => buildInvestmentClosedBetaPilotPreflight({
    manifest: productionManifest,
    expectedSchema,
    businessRuleGovernance: approvedGovernance,
    businessRulePropagation: verifiedPropagation,
    pilotAuthorization: authorizedPilot,
    productionReadinessCanary: successfulCanary,
    deployment: productionDeployment,
    flags: incompleteFlags,
  }),
  /publicFundingEnabled must be explicitly boolean/,
  'An omitted safety flag must fail closed rather than being treated as false.',
);

for (const unsafeFlag of [
  'publicRegistrationEnabled',
  'publicFundingEnabled',
  'paymentGatewayEnabled',
  'automaticSettlementEnabled',
  'automaticWithdrawalsEnabled',
]) {
  const unsafe = buildInvestmentClosedBetaPilotPreflight({
    manifest: productionManifest,
    expectedSchema,
    businessRuleGovernance: approvedGovernance,
    businessRulePropagation: verifiedPropagation,
    pilotAuthorization: authorizedPilot,
    productionReadinessCanary: successfulCanary,
    deployment: productionDeployment,
    flags: { ...safeFlags, [unsafeFlag]: true },
  });
  assert.ok(unsafe.blockers.includes('closed-beta-exposure'), `${unsafeFlag} must block closed-beta preflight.`);
  assert.equal(unsafe.status, 'BLOCKED');
}

const leakedIdentifier = clone(productionManifest);
leakedIdentifier.participant.participantId = 'private-identifier';
assert.throws(
  () => validateInvestmentClosedBetaPilotManifest(leakedIdentifier, { expectedSchema }),
  /participantId is not an allowed field/,
  'Raw participant identifiers must never enter the redacted pilot manifest.',
);

const mismatchedAgreement = clone(productionManifest);
mismatchedAgreement.lot.agreementVersion = 'other-version';
assert.throws(
  () => validateInvestmentClosedBetaPilotManifest(mismatchedAgreement, { expectedSchema }),
  /agreement versions must match/,
);

const staleAuthorization = { ...authorizedPilot, reviewedCandidateCommit: 'c'.repeat(40) };
assert.throws(
  () => validateInvestmentClosedBetaPilotAuthorization(staleAuthorization),
  /reviewed candidate commit mismatch/,
  'Pilot authorization must never transfer to a different BR candidate.',
);

const fullyGovernedSynthetic = buildInvestmentClosedBetaPilotPreflight({
  manifest: syntheticManifest,
  expectedSchema,
  businessRuleGovernance: approvedGovernance,
  businessRulePropagation: verifiedPropagation,
  pilotAuthorization: authorizedPilot,
  productionReadinessCanary: successfulCanary,
  deployment: {
    provider: syntheticManifest.environment.provider,
    branch: syntheticManifest.environment.branch,
    commit: syntheticManifest.environment.commit,
  },
  flags: safeFlags,
});
assert.ok(fullyGovernedSynthetic.blockers.includes('production-classification'));
assert.equal(fullyGovernedSynthetic.status, 'BLOCKED', 'Synthetic CI evidence must never satisfy a real pilot preflight.');

const [packageSource, docsSource, governanceSource] = await Promise.all([
  read('package.json'),
  read('docs/investment/CLOSED_BETA_PILOT_PREFLIGHT.md'),
  read('src/data/investment-closed-beta-pilot-governance.mjs'),
]);
const packageJson = JSON.parse(packageSource);
assert.match(packageJson.scripts.test, /test-investment-closed-beta-pilot-preflight-invariants\.mjs/);
assert.match(packageJson.scripts['investment:pilot:template'], /create-investment-closed-beta-pilot-template\.mjs/);
assert.match(packageJson.scripts['investment:pilot:preflight'], /validate-investment-closed-beta-pilot\.mjs/);
assert.match(docsSource, /`READY` does not authorize/i);
assert.match(docsSource, /automaticExecutionAllowed.*false/i);
assert.match(governanceSource, /status: 'NOT_AUTHORIZED'/);

console.log('Investment closed-beta pilot preflight invariants: PASS');
