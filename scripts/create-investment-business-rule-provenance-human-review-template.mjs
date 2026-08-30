import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { validateInvestmentBusinessRuleProvenanceReviewTransport } from '../src/lib/investment/business-rule-provenance-review-transport.mjs';
import {
  createInvestmentBusinessRuleProvenanceHumanReviewRecord,
  validateInvestmentBusinessRuleProvenanceHumanReviewRecord,
} from '../src/lib/investment/business-rule-provenance-human-review.mjs';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const envelopePath = process.argv[2] ?? process.env.BR_REVIEW_OUTPUT_PATH;
if (!envelopePath) throw new Error('Review envelope path is required');
const envelope = JSON.parse(readFileSync(envelopePath, 'utf8'));
validateInvestmentBusinessRuleProvenanceReviewTransport(envelope);

const technicalReviewArtifact = {
  id: Number(requiredEnv('BR_REVIEW_TECHNICAL_ARTIFACT_ID')),
  name: requiredEnv('BR_REVIEW_TECHNICAL_ARTIFACT_NAME'),
  digest: requiredEnv('BR_REVIEW_TECHNICAL_ARTIFACT_DIGEST').toLowerCase(),
  workflowRunId: Number(requiredEnv('GITHUB_RUN_ID')),
  reviewHeadSha: requiredEnv('GITHUB_SHA'),
};

const record = createInvestmentBusinessRuleProvenanceHumanReviewRecord({
  reviewEnvelope: envelope,
  technicalReviewArtifact,
  decision: 'PENDING',
});
validateInvestmentBusinessRuleProvenanceHumanReviewRecord(record, envelope);

const outputPath = process.env.BR_HUMAN_REVIEW_TEMPLATE_PATH
  ?? 'provenance-review/investment-business-rule-provenance-human-review.json';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: record.status,
  decision: record.decision,
  sourceEligible: envelope.technicalReview.sourceEligibleForHumanReview,
  technicalReviewArtifactId: record.source.technicalReviewArtifact.id,
  technicalReviewArtifactDigest: record.source.technicalReviewArtifact.digest,
  canonicalAuthorizationRequired: record.canonicalAuthorizationRequired,
  implementationPrEligible: record.implementationPrEligible,
}, null, 2));
