import { readFileSync } from 'node:fs';
import process from 'node:process';
import { validateInvestmentBusinessRuleProvenanceReviewTransport } from '../src/lib/investment/business-rule-provenance-review-transport.mjs';

const path = process.argv[2];
if (!path) throw new Error('Usage: node scripts/validate-investment-business-rule-provenance-artifact-review.mjs <review-envelope.json>');

const envelope = JSON.parse(readFileSync(path, 'utf8'));
validateInvestmentBusinessRuleProvenanceReviewTransport(envelope);

console.log(JSON.stringify({
  status: 'VALID',
  technicalStatus: envelope.technicalReview.status,
  sourceRunId: envelope.technicalReview.workflow.runId,
  sourceArtifactId: envelope.technicalReview.artifact.id,
  sourceArtifactDigest: envelope.technicalReview.artifact.digest,
  reviewRunId: envelope.reviewWorkflow.runId,
  reviewHeadSha: envelope.reviewWorkflow.headSha,
  humanReviewRequired: envelope.humanReviewRequired,
  implementationPrEligible: envelope.implementationPrEligible,
  livePromotionAllowed: envelope.livePromotionAllowed,
}, null, 2));
