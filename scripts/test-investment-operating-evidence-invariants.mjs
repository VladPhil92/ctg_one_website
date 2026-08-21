import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createInvestmentOperatingReviewTemplate,
  finalizeInvestmentOperatingEvidence,
  summarizeInvestmentOperatingEvidence,
  validateInvestmentOperatingEvidence,
} from '../src/lib/investment/operating-evidence.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const fixture = JSON.parse(await read('scripts/fixtures/investment-operating-evidence.synthetic-v1.json'));
const schemaSource = await read('src/lib/observability/schema-version.ts');
const expectedSchema = {
  migration: /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaSource)?.[1],
  name: /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(schemaSource)?.[1],
  count: Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaSource)?.[1]),
};
assert.ok(expectedSchema.migration && expectedSchema.name && Number.isSafeInteger(expectedSchema.count), 'Repository schema metadata must be readable.');

validateInvestmentOperatingEvidence(fixture, { expectedSchema });
const summary = summarizeInvestmentOperatingEvidence(fixture, { expectedSchema });
assert.equal(summary.lotCount, 1);
assert.equal(summary.allocatedCapitalCents, 230000);
assert.equal(summary.participantCreditCents, 280000);
assert.equal(summary.approvedReinvestmentCents + summary.confirmedWithdrawalDebitCents, 280000);
assert.equal(summary.closedLoopObserved, true);
assert.equal(summary.unbackedExternalCapitalCents, 0);
assert.equal(summary.returnGenealogyMismatches, 0);

const review = createInvestmentOperatingReviewTemplate(fixture, { expectedSchema });
review.reviewerHandle = 'ci-reviewer';
review.reviewedAt = '2026-08-21T00:10:00.000Z';
for (const key of Object.keys(review.judgments)) review.judgments[key] = true;
const report = finalizeInvestmentOperatingEvidence(fixture, review, { expectedSchema });
assert.equal(report.humanReview.allJudgmentsPass, true);
assert.equal(report.releaseEvidenceEligible, false, 'Synthetic CI evidence must never become production release evidence.');
assert.equal(report.capabilityPromotionAllowed, false, 'Evidence tooling must never promote capability maturity automatically.');
assert.match(report.note, /Synthetic CI evidence can never count as production operating evidence/);

const clone = (value) => JSON.parse(JSON.stringify(value));

const overspend = clone(fixture);
overspend.lots[0].liquidity.confirmedWithdrawalDebitCents = 140001;
assert.throws(
  () => validateInvestmentOperatingEvidence(overspend, { expectedSchema }),
  /cannot exceed participant settlement credit/,
  'Evidence must reject post-settlement liquidity that exceeds participant credit.',
);

const unbalancedFunding = clone(fixture);
unbalancedFunding.lots[0].funding.cashReceiptCents = 229999;
assert.throws(
  () => validateInvestmentOperatingEvidence(unbalancedFunding, { expectedSchema }),
  /capital sources must exactly equal allocatedCapitalCents/,
  'Evidence must reject capital-source imbalance.',
);

const pii = clone(fixture);
pii.sourceDigests[0].label = 'operator@example.com';
assert.throws(
  () => validateInvestmentOperatingEvidence(pii, { expectedSchema }),
  /Email-like value is prohibited/,
  'Evidence must reject email-like content even inside otherwise allowed fields.',
);

const uuidLeak = clone(fixture);
uuidLeak.sourceDigests[0].label = '550e8400-e29b-41d4-a716-446655440000';
assert.throws(
  () => validateInvestmentOperatingEvidence(uuidLeak, { expectedSchema }),
  /UUID-like value is prohibited/,
  'Evidence must reject UUID-like identifiers.',
);

const falseProduction = clone(fixture);
falseProduction.classification = 'production-redacted';
falseProduction.environment.baseUrl = 'https://ctgone.com';
falseProduction.environment.provider = 'ci';
falseProduction.environment.branch = 'main';
falseProduction.environment.productionReadinessVerified = true;
assert.throws(
  () => validateInvestmentOperatingEvidence(falseProduction, { expectedSchema }),
  /must identify Render/,
  'Production evidence must be pinned to the canonical Render runtime.',
);

const staleSchema = clone(fixture);
staleSchema.environment.schemaMigrationCount = expectedSchema.count - 1;
assert.throws(
  () => validateInvestmentOperatingEvidence(staleSchema, { expectedSchema }),
  /schemaMigrationCount must equal repository/,
  'Evidence must fail closed on schema drift.',
);

const [validatorCli, reviewCli, finalizerCli, templateCli, gitignore] = await Promise.all([
  read('scripts/validate-investment-operating-evidence.mjs'),
  read('scripts/create-investment-operating-review.mjs'),
  read('scripts/finalize-investment-operating-evidence.mjs'),
  read('scripts/create-investment-operating-evidence-template.mjs'),
  read('.gitignore'),
]);
assert.match(validatorCli, /REVIEW_PRODUCTION_REDACTED_EVIDENCE/, 'Production validation must require explicit operator authorization.');
assert.match(reviewCli, /REVIEW_PRODUCTION_REDACTED_EVIDENCE/, 'Production review-template generation must require explicit operator authorization.');
assert.match(finalizerCli, /FINALIZE_PRODUCTION_REDACTED_EVIDENCE/, 'Production finalization must require a distinct explicit authorization.');
assert.match(templateCli, /intentionally invalid until every placeholder is replaced/, 'Production template must never look pre-validated.');
assert.match(gitignore, /\.private-evidence\//, 'Private evidence working directory must be gitignored.');
assert.match(gitignore, /\*\.investment-operating-evidence\.capture\.json/, 'Raw operating evidence captures must be gitignored by filename convention.');
assert.match(gitignore, /\*\.investment-operating-evidence\.review\.json/, 'Human review worksheets must be gitignored by filename convention.');

console.log('Investment operating evidence invariants: PASS');
