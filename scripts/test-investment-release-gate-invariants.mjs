import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildInvestmentReleaseGateMatrix } from '../src/lib/investment/release-gates.mjs';
import {
  INVESTMENT_HUMAN_RELEASE_APPROVED,
  INVESTMENT_PRODUCTION_READINESS_CANARY,
  INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  INVESTMENT_REVIEWED_OPERATING_EVIDENCE,
} from '../src/data/investment-release-governance.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

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
const successfulCanary = {
  result: 'PASS',
  expectedSha: productionDeployment.commit,
  expectedBranch: 'main',
  failures: [],
  observed: {
    readinessStatus: 'ready',
    deploymentCommit: productionDeployment.commit,
    publicStatus: 'BETA',
    productionOperatingEvidence: 'pending',
    surfaceHttp: 200,
  },
};
const reviewedEvidence = {
  classification: 'production-redacted',
  releaseEvidenceEligible: true,
  capabilityPromotionAllowed: false,
  evidenceSha256: 'b'.repeat(64),
  humanReview: { allJudgmentsPass: true },
};

const byId = (matrix, id) => matrix.gates.find((item) => item.id === id);

assert.throws(
  () => buildInvestmentReleaseGateMatrix({
    capability,
    deployment: productionDeployment,
    schemaCompatible: true,
    flags: closedFlags,
  }),
  /pendingBusinessDecisionIds is required/,
  'Omitting pending business decisions must fail closed instead of implying that all decisions are resolved.',
);

const blocked = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  productionReadinessCanary: INVESTMENT_PRODUCTION_READINESS_CANARY,
  operatingEvidenceReport: INVESTMENT_REVIEWED_OPERATING_EVIDENCE,
  humanReleaseApproved: INVESTMENT_HUMAN_RELEASE_APPROVED,
});

assert.equal(byId(blocked, 'technical-contract')?.status, 'PASS');
assert.equal(byId(blocked, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(blocked.deploymentIdentityReady, true, 'Deployment identity may be ready independently of canary acceptance.');
assert.equal(blocked.canaryVerified, false, 'Canonical governance currently accepts no production canary result.');
assert.equal(byId(blocked, 'operating-evidence')?.status, 'PENDING_EVIDENCE');
assert.equal(byId(blocked, 'business-decisions')?.status, 'BLOCKED_DECISION');
assert.equal(byId(blocked, 'public-exposure')?.status, 'SAFE_CLOSED');
assert.equal(byId(blocked, 'automatic-money-movement')?.status, 'SAFE_CLOSED');
assert.equal(byId(blocked, 'human-release-decision')?.status, 'PENDING_EVIDENCE');
assert.equal(blocked.promotionReviewEligible, false);
assert.equal(blocked.livePromotionEligible, false);
assert.equal(blocked.automaticPromotionAllowed, false);

const canaryReady = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: null,
  humanReleaseApproved: false,
});
assert.equal(byId(canaryReady, 'runtime-schema')?.status, 'PASS');
assert.equal(canaryReady.canaryVerified, true);
assert.equal(canaryReady.livePromotionEligible, false);

const staleCanary = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  productionReadinessCanary: {
    ...successfulCanary,
    expectedSha: 'c'.repeat(40),
    observed: { ...successfulCanary.observed, deploymentCommit: 'c'.repeat(40) },
  },
  operatingEvidenceReport: null,
  humanReleaseApproved: false,
});
assert.equal(byId(staleCanary, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(staleCanary.canaryVerified, false, 'A canary for a different deployment commit must never satisfy runtime readiness.');

const failedCanary = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  productionReadinessCanary: { ...successfulCanary, result: 'FAIL', failures: ['surface.http=500'] },
  operatingEvidenceReport: null,
  humanReleaseApproved: false,
});
assert.equal(byId(failedCanary, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(failedCanary.canaryVerified, false, 'A failed canary must never satisfy runtime readiness.');

const unsafeExposure = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: { ...closedFlags, publicFundingEnabled: true },
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: null,
  humanReleaseApproved: false,
});
assert.equal(byId(unsafeExposure, 'public-exposure')?.status, 'FAIL');
assert.equal(unsafeExposure.publicExposureSafe, false, 'Public funding must fail closed while release prerequisites remain blocked.');

const unsafeAutomation = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: { ...closedFlags, automaticWithdrawalsEnabled: true },
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: null,
  humanReleaseApproved: false,
});
assert.equal(byId(unsafeAutomation, 'automatic-money-movement')?.status, 'FAIL');
assert.equal(unsafeAutomation.automaticMoneyMovementSafe, false, 'Automatic withdrawals must fail closed while release prerequisites remain blocked.');

const reviewEligible = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: [],
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: false,
});
assert.equal(byId(reviewEligible, 'runtime-schema')?.status, 'PASS');
assert.equal(byId(reviewEligible, 'operating-evidence')?.status, 'PASS');
assert.equal(byId(reviewEligible, 'business-decisions')?.status, 'PASS');
assert.equal(reviewEligible.promotionReviewEligible, true);
assert.equal(reviewEligible.livePromotionEligible, false, 'Human approval must remain independently required.');
assert.equal(byId(reviewEligible, 'human-release-decision')?.status, 'PENDING_EVIDENCE');

const preApprovalExposure = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: { ...closedFlags, publicFundingEnabled: true },
  pendingBusinessDecisionIds: [],
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: false,
});
assert.equal(preApprovalExposure.promotionReviewEligible, true);
assert.equal(preApprovalExposure.livePromotionEligible, false);
assert.equal(byId(preApprovalExposure, 'public-exposure')?.status, 'FAIL');
assert.equal(preApprovalExposure.publicExposureSafe, false, 'Review eligibility alone must never authorize public funding exposure.');

const preApprovalAutomation = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: { ...closedFlags, automaticWithdrawalsEnabled: true },
  pendingBusinessDecisionIds: [],
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: false,
});
assert.equal(byId(preApprovalAutomation, 'automatic-money-movement')?.status, 'FAIL');
assert.equal(preApprovalAutomation.automaticMoneyMovementSafe, false, 'Review eligibility alone must never authorize automatic withdrawals.');

const humanApproved = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: [],
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: true,
});
assert.equal(humanApproved.livePromotionEligible, true);
assert.equal(humanApproved.automaticPromotionAllowed, false, 'Even a fully eligible matrix must never perform automatic capability promotion.');

const authorizedExposure = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: { ...closedFlags, publicFundingEnabled: true, automaticWithdrawalsEnabled: true },
  pendingBusinessDecisionIds: [],
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: true,
});
assert.equal(byId(authorizedExposure, 'public-exposure')?.status, 'PASS');
assert.equal(byId(authorizedExposure, 'automatic-money-movement')?.status, 'PASS');
assert.equal(authorizedExposure.publicExposureSafe, true);
assert.equal(authorizedExposure.automaticMoneyMovementSafe, true);

const syntheticEvidence = {
  ...reviewedEvidence,
  classification: 'synthetic-ci',
};
const synthetic = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: [],
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: syntheticEvidence,
  humanReleaseApproved: true,
});
assert.equal(byId(synthetic, 'operating-evidence')?.status, 'PENDING_EVIDENCE');
assert.equal(synthetic.livePromotionEligible, false, 'Synthetic evidence must never satisfy the production operating-evidence gate.');

const preview = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: { provider: 'unknown', branch: 'main', commit: 'a'.repeat(40) },
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: [],
  productionReadinessCanary: successfulCanary,
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: true,
});
assert.equal(byId(preview, 'runtime-schema')?.status, 'PENDING_EVIDENCE');
assert.equal(preview.livePromotionEligible, false, 'Non-Render runtimes must never satisfy production release readiness.');

const [businessModel, technologyProof, flagsSource, adminPage, governanceSource, releaseDocs] = await Promise.all([
  read('docs/investment/BUSINESS_MODEL.md'),
  read('src/data/technology-proof.ts'),
  read('src/lib/investment/flags.ts'),
  read('src/app/admin/release-readiness/page.tsx'),
  read('src/data/investment-release-governance.mjs'),
  read('docs/investment/RELEASE_GATE_MATRIX.md'),
]);

const pendingSection = businessModel.split('## PENDING BUSINESS DECISION')[1]?.split('\n## ')[0] ?? '';
for (const id of INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS) {
  assert.match(pendingSection, new RegExp(`\\*\\*${id.replace('-', '\\-')}\\b`), `${id} must remain explicitly pending in authoritative BUSINESS_MODEL.md until resolved there.`);
}
for (const marker of evidenceMarkers) {
  assert.ok(technologyProof.includes(marker), `Canonical technology proof must retain Phase 17-19 evidence marker: ${marker}`);
}
assert.doesNotMatch(flagsSource, /None of these are wired to real money-moving code yet/, 'Feature flag comments must not claim the obsolete UI-skeleton-only state.');
assert.match(flagsSource, /process\.env\[name\] === 'true'/, 'Investment flags must continue to default false when unset.');
assert.match(adminPage, /investment_role'\)\.eq\('user_id', user\.id\)/, 'Release matrix page must resolve the investment role for the authenticated user.');
assert.match(adminPage, /investment_role !== 'SUPER_ADMIN'/, 'Release matrix page must be SUPER_ADMIN-only.');
assert.match(adminPage, /productionReadinessCanary: INVESTMENT_PRODUCTION_READINESS_CANARY/, 'Admin release matrix must use the canonical accepted canary pointer.');
assert.doesNotMatch(adminPage, /<form|action=|method=['"]post/i, 'Release matrix admin page must remain read-only.');
assert.match(governanceSource, /INVESTMENT_PRODUCTION_READINESS_CANARY = null/, 'No production readiness canary may be silently accepted in release governance.');
assert.match(governanceSource, /INVESTMENT_REVIEWED_OPERATING_EVIDENCE = null/, 'No production operating evidence may be silently accepted in the governance pointer.');
assert.match(governanceSource, /INVESTMENT_HUMAN_RELEASE_APPROVED = false/, 'Human LIVE approval must remain false until explicitly changed by governance work.');
assert.match(releaseDocs, /automaticPromotionAllowed.*always.*false/i, 'Release documentation must prohibit automatic promotion.');
assert.match(releaseDocs, /BR-001[\s\S]*BR-005/, 'Release documentation must expose the complete pending business-decision range.');

console.log('Investment release gate matrix invariants: PASS');
