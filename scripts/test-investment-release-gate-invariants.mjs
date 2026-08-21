import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildInvestmentReleaseGateMatrix } from '../src/lib/investment/release-gates.mjs';
import {
  INVESTMENT_HUMAN_RELEASE_APPROVED,
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

const blocked = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  operatingEvidenceReport: INVESTMENT_REVIEWED_OPERATING_EVIDENCE,
  humanReleaseApproved: INVESTMENT_HUMAN_RELEASE_APPROVED,
});

const byId = (matrix, id) => matrix.gates.find((item) => item.id === id);
assert.equal(byId(blocked, 'technical-contract')?.status, 'PASS');
assert.equal(byId(blocked, 'runtime-schema')?.status, 'PASS');
assert.equal(byId(blocked, 'operating-evidence')?.status, 'PENDING_EVIDENCE');
assert.equal(byId(blocked, 'business-decisions')?.status, 'BLOCKED_DECISION');
assert.equal(byId(blocked, 'public-exposure')?.status, 'SAFE_CLOSED');
assert.equal(byId(blocked, 'automatic-money-movement')?.status, 'SAFE_CLOSED');
assert.equal(byId(blocked, 'human-release-decision')?.status, 'PENDING_EVIDENCE');
assert.equal(blocked.promotionReviewEligible, false);
assert.equal(blocked.livePromotionEligible, false);
assert.equal(blocked.automaticPromotionAllowed, false);

const unsafeExposure = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: { ...closedFlags, publicFundingEnabled: true },
  pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
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
  operatingEvidenceReport: null,
  humanReleaseApproved: false,
});
assert.equal(byId(unsafeAutomation, 'automatic-money-movement')?.status, 'FAIL');
assert.equal(unsafeAutomation.automaticMoneyMovementSafe, false, 'Automatic withdrawals must fail closed while release prerequisites remain blocked.');

const reviewedEvidence = {
  classification: 'production-redacted',
  releaseEvidenceEligible: true,
  capabilityPromotionAllowed: false,
  evidenceSha256: 'b'.repeat(64),
  humanReview: { allJudgmentsPass: true },
};
const reviewEligible = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: false,
});
assert.equal(byId(reviewEligible, 'operating-evidence')?.status, 'PASS');
assert.equal(byId(reviewEligible, 'business-decisions')?.status, 'PASS');
assert.equal(reviewEligible.promotionReviewEligible, true);
assert.equal(reviewEligible.livePromotionEligible, false, 'Human approval must remain independently required.');
assert.equal(byId(reviewEligible, 'human-release-decision')?.status, 'PENDING_EVIDENCE');

const humanApproved = buildInvestmentReleaseGateMatrix({
  capability,
  deployment: productionDeployment,
  schemaCompatible: true,
  flags: closedFlags,
  pendingBusinessDecisionIds: [],
  operatingEvidenceReport: reviewedEvidence,
  humanReleaseApproved: true,
});
assert.equal(humanApproved.livePromotionEligible, true);
assert.equal(humanApproved.automaticPromotionAllowed, false, 'Even a fully eligible matrix must never perform automatic capability promotion.');

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
assert.doesNotMatch(adminPage, /<form|action=|method=['"]post/i, 'Release matrix admin page must remain read-only.');
assert.match(governanceSource, /INVESTMENT_REVIEWED_OPERATING_EVIDENCE = null/, 'No production operating evidence may be silently accepted in the governance pointer.');
assert.match(governanceSource, /INVESTMENT_HUMAN_RELEASE_APPROVED = false/, 'Human LIVE approval must remain false until explicitly changed by governance work.');
assert.match(releaseDocs, /automaticPromotionAllowed.*always.*false/i, 'Release documentation must prohibit automatic promotion.');
assert.match(releaseDocs, /BR-001[\s\S]*BR-005/, 'Release documentation must expose the complete pending business-decision range.');

console.log('Investment release gate matrix invariants: PASS');
