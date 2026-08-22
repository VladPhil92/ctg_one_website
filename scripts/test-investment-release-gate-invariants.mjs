import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildInvestmentReleaseGateMatrix } from '../src/lib/investment/release-gates.mjs';
import { createInvestmentProductionReadinessEvidence } from '../src/lib/investment/production-readiness-evidence.mjs';
import {
  INVESTMENT_HUMAN_RELEASE_APPROVED,
  INVESTMENT_PRODUCTION_READINESS_CANARY,
  INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  INVESTMENT_REVIEWED_OPERATING_EVIDENCE,
} from '../src/data/investment-release-governance.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const schemaSource = await read('src/lib/observability/schema-version.ts');
const expectedMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaSource)?.[1];
const expectedMigrationName = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(schemaSource)?.[1];
const expectedMigrationCount = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaSource)?.[1]);
assert.ok(expectedMigration && expectedMigrationName && Number.isSafeInteger(expectedMigrationCount), 'Schema metadata must be parseable.');

const evidenceMarkers = [
  'Operational Golden Journey reconstructs funding, payment, production, inventory, sale/return, settlement and post-settlement liquidity evidence per lot',
  'Post-deploy Production readiness canary verifies exact Render identity, runtime schema compatibility and the canonical Investment surface without production mutations; real operating evidence remains required for LIVE promotion',
  'Private redacted operating-evidence capture, validation, human-review and finalization tooling is implemented with PII/identifier rejection, source hashing and synthetic-evidence separation; no real production operating capture has been approved yet',
];
const capability = {
  id: 'investment-platform',
  status: 'PARTIAL',
  publicStatus: 'BETA',
  evidence: evidenceMarkers,
};
const closedFlags = {
  publicRegistrationEnabled: false,
  publicFundingEnabled: false,
  paymentGatewayEnabled: false,
  automaticSettlementEnabled: false,
  automaticWithdrawalsEnabled: false,
  kycProviderEnabled: false,
  whatsappNotificationsEnabled: false,
};
const productionDeployment = {
  provider: 'render',
  branch: 'main',
  commit: 'a'.repeat(40),
};
const successfulCanary = createInvestmentProductionReadinessEvidence({
  classification: 'production-canary',
  capturedAt: '2026-08-21T18:30:00.000Z',
  origin: 'https://ctgone.com',
  result: 'PASS',
  expectedSha: productionDeployment.commit,
  expectedBranch: 'main',
  expectedMigration,
  expectedMigrationName,
  expectedMigrationCount,
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
const reviewedEvidence = {
  classification: 'production-redacted',
  releaseEvidenceEligible: true,
  capabilityPromotionAllowed: false,
  evidenceSha256: 'b'.repeat(64),
  humanReview: { allJudgmentsPass: true },
};
const byId = (matrix, id) => matrix.gates.find((item) => item.id === id);
const build = (overrides = {}) => buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: null,
  humanReleaseApproved: false,
  ...overrides,
});

assert.throws(
  () => buildInvestmentReleaseGateMatrix({ capability, deployment: productionDeployment, schemaCompatible: true, flags: closedFlags }),
  /pendingBusinessDecisionIds is required/,
  'Omitting pending business decisions must fail closed.',
);

const blocked = build({
  productionReadinessCanary: INVESTMENT_PRODUCTION_READINESS_CANARY,
  operatingEvidenceReport: INVESTMENT_REVIEWED_OPERATING_EVIDENCE,
  humanReleaseApproved: INVESTMENT_HUMAN_RELEASE_APPROVED,
});
assert.equal(byId(blocked, 'technical-contract')?.status, 'PASS');
assert.equal(byId(blocked, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(blocked.deploymentIdentityReady, true);
assert.equal(blocked.canaryVerified, false);
assert.equal(byId(blocked, 'operating-evidence')?.status, 'PENDING_EVIDENCE');
assert.equal(byId(blocked, 'business-decisions')?.status, 'BLOCKED_DECISION');
assert.equal(byId(blocked, 'public-exposure')?.status, 'SAFE_CLOSED');
assert.equal(byId(blocked, 'automatic-money-movement')?.status, 'SAFE_CLOSED');
assert.equal(blocked.promotionReviewEligible, false);
assert.equal(blocked.livePromotionEligible, false);
assert.equal(blocked.automaticPromotionAllowed, false);

const canaryReady = build();
assert.equal(byId(canaryReady, 'runtime-schema')?.status, 'PASS');
assert.equal(canaryReady.canaryVerified, true);
assert.equal(canaryReady.livePromotionEligible, false);

const staleCanary = createInvestmentProductionReadinessEvidence({
  ...successfulCanary,
  expectedSha: 'c'.repeat(40),
  observed: { ...successfulCanary.observed, deploymentCommit: 'c'.repeat(40) },
});
const stale = build({ productionReadinessCanary: staleCanary });
assert.equal(byId(stale, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(stale.canaryVerified, false, 'A canary for a different deployment commit must never satisfy runtime readiness.');

const failedCanary = createInvestmentProductionReadinessEvidence({
  ...successfulCanary,
  result: 'FAIL',
  failures: ['surface.http=500'],
});
const failed = build({ productionReadinessCanary: failedCanary });
assert.equal(byId(failed, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(failed.canaryVerified, false);

const syntheticCanary = createInvestmentProductionReadinessEvidence({
  ...successfulCanary,
  classification: 'synthetic-ci',
  origin: 'https://ci.invalid',
  observed: { ...successfulCanary.observed, surfaceFinalUrl: 'https://ci.invalid/inversion' },
});
const syntheticRuntime = build({ productionReadinessCanary: syntheticCanary });
assert.equal(syntheticRuntime.canaryVerified, false, 'Synthetic canary evidence must never satisfy release readiness.');

const unsafeExposure = build({ flags: { ...closedFlags, publicFundingEnabled: true } });
assert.equal(byId(unsafeExposure, 'public-exposure')?.status, 'FAIL');
assert.equal(unsafeExposure.publicExposureSafe, false);
const unsafeAutomation = build({ flags: { ...closedFlags, automaticWithdrawalsEnabled: true } });
assert.equal(byId(unsafeAutomation, 'automatic-money-movement')?.status, 'FAIL');
assert.equal(unsafeAutomation.automaticMoneyMovementSafe, false);

const reviewEligible = build({
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
});
assert.equal(reviewEligible.promotionReviewEligible, true);
assert.equal(reviewEligible.livePromotionEligible, false, 'Human approval must remain independently required.');
assert.equal(byId(reviewEligible, 'human-release-decision')?.status, 'PENDING_EVIDENCE');

const preApprovalExposure = build({
  flags: { ...closedFlags, publicFundingEnabled: true },
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
});
assert.equal(preApprovalExposure.promotionReviewEligible, true);
assert.equal(preApprovalExposure.livePromotionEligible, false);
assert.equal(byId(preApprovalExposure, 'public-exposure')?.status, 'FAIL');
assert.equal(preApprovalExposure.publicExposureSafe, false, 'Review eligibility alone must never authorize public funding exposure.');

const preApprovalAutomation = build({
  flags: { ...closedFlags, automaticWithdrawalsEnabled: true },
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
});
assert.equal(byId(preApprovalAutomation, 'automatic-money-movement')?.status, 'FAIL');
assert.equal(preApprovalAutomation.automaticMoneyMovementSafe, false, 'Review eligibility alone must never authorize automatic withdrawals.');

const humanApproved = build({
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: true,
});
assert.equal(humanApproved.livePromotionEligible, true);
assert.equal(humanApproved.automaticPromotionAllowed, false);

const authorizedExposure = build({
  flags: { ...closedFlags, publicFundingEnabled: true, automaticWithdrawalsEnabled: true },
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: true,
});
assert.equal(byId(authorizedExposure, 'public-exposure')?.status, 'PASS');
assert.equal(byId(authorizedExposure, 'automatic-money-movement')?.status, 'PASS');
assert.equal(authorizedExposure.publicExposureSafe, true);
assert.equal(authorizedExposure.automaticMoneyMovementSafe, true);

const syntheticOperatingEvidence = { ...reviewedEvidence, classification: 'synthetic-ci' };
const syntheticOperating = build({
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: syntheticOperatingEvidence,
  humanReleaseApproved: true,
});
assert.equal(byId(syntheticOperating, 'operating-evidence')?.status, 'PENDING_EVIDENCE');
assert.equal(syntheticOperating.livePromotionEligible, false);

const preview = build({
  deployment: { provider: 'unknown', branch: 'main', commit: productionDeployment.commit },
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: true,
});
assert.equal(byId(preview, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(preview.livePromotionEligible, false);

const [businessModel, technologyProof, flagsSource, adminPage, governanceSource, releaseDocs, releaseGateSource] = await Promise.all([
  read('docs/investment/BUSINESS_MODEL.md'),
  read('src/data/technology-proof.ts'),
  read('src/lib/investment/flags.ts'),
  read('src/app/admin/release-readiness/page.tsx'),
  read('src/data/investment-release-governance.mjs'),
  read('docs/investment/RELEASE_GATE_MATRIX.md'),
  read('src/lib/investment/release-gates.mjs'),
]);
const pendingSection = businessModel.split('## PENDING BUSINESS DECISION')[1]?.split('\n## ')[0] ?? '';
for (const id of INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS) {
  assert.match(pendingSection, new RegExp(`\\*\\*${id.replace('-', '\\-')}\\b`), `${id} must remain explicitly pending in BUSINESS_MODEL.md.`);
}
for (const marker of evidenceMarkers) assert.ok(technologyProof.includes(marker));
assert.doesNotMatch(flagsSource, /None of these are wired to real money-moving code yet/);
assert.match(flagsSource, /process\.env\[name\] === 'true'/);
assert.match(adminPage, /investment_role !== 'SUPER_ADMIN'/);
assert.match(adminPage, /productionReadinessCanary: INVESTMENT_PRODUCTION_READINESS_CANARY/);
assert.doesNotMatch(adminPage, /<form|action=|method=['"]post/i);
assert.match(governanceSource, /INVESTMENT_PRODUCTION_READINESS_CANARY = null/);
assert.match(governanceSource, /INVESTMENT_REVIEWED_OPERATING_EVIDENCE = null/);
assert.match(governanceSource, /INVESTMENT_HUMAN_RELEASE_APPROVED = false/);
assert.match(releaseDocs, /automaticPromotionAllowed.*always.*false/i);
assert.match(releaseDocs, /BR-001[\s\S]*BR-005/);
assert.match(releaseGateSource, /isSuccessfulInvestmentProductionReadinessEvidence/, 'Release gates must consume the shared versioned canary validator.');

console.log('Investment release gate matrix invariants: PASS');
