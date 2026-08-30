import { readFileSync } from 'node:fs';
import process from 'node:process';
import { validateInvestmentBusinessRuleProvenanceReviewTransport } from '../src/lib/investment/business-rule-provenance-review-transport.mjs';
import { validateInvestmentBusinessRuleProvenanceHumanReviewRecord } from '../src/lib/investment/business-rule-provenance-human-review.mjs';

const envelopePath = process.argv[2];
const humanReviewPath = process.argv[3];
if (!envelopePath || !humanReviewPath) {
  throw new Error('Usage: node scripts/validate-investment-business-rule-provenance-human-review.mjs <review-envelope.json> <human-review.json>');
}

const envelope = JSON.parse(readFileSync(envelopePath, 'utf8'));
const humanReview = JSON.parse(readFileSync(humanReviewPath, 'utf8'));
validateInvestmentBusinessRuleProvenanceReviewTransport(envelope);
validateInvestmentBusinessRuleProvenanceHumanReviewRecord(humanReview, envelope);

console.log(JSON.stringify({
  status: 'VALID',
  reviewStatus: humanReview.status,
  decision: humanReview.decision,
  trustedMainSha: humanReview.source.trustedMainSha,
  provenanceRunId: humanReview.source.provenanceRunId,
  provenanceArtifactId: humanReview.source.provenanceArtifactId,
  technicalReviewRunId: humanReview.source.technicalReviewRunId,
  technicalReviewArtifactId: humanReview.source.technicalReviewArtifact.id,
  canonicalAuthorizationRequired: humanReview.canonicalAuthorizationRequired,
  implementationPrEligible: humanReview.implementationPrEligible,
  livePromotionAllowed: humanReview.livePromotionAllowed,
}, null, 2));
