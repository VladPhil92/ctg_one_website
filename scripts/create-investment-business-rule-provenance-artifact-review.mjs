import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import {
  createInvestmentBusinessRuleProvenanceArtifactReview,
  validateInvestmentBusinessRuleProvenanceArtifactReview,
} from '../src/lib/investment/business-rule-provenance-artifact-review.mjs';
import {
  INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_NAME,
  INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_PATH,
  createInvestmentBusinessRuleProvenanceReviewTransport,
  validateInvestmentBusinessRuleProvenanceReviewTransport,
} from '../src/lib/investment/business-rule-provenance-review-transport.mjs';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('Provenance artifact technical review may only be emitted by GitHub Actions');
}
if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') {
  throw new Error('Provenance artifact technical review requires workflow_dispatch');
}
if (process.env.GITHUB_REF !== 'refs/heads/main') {
  throw new Error('Provenance artifact technical review must execute from refs/heads/main');
}
if (process.env.GITHUB_WORKFLOW !== INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_NAME) {
  throw new Error('Unexpected provenance artifact review workflow');
}

const run = JSON.parse(readFileSync(requiredEnv('BR_REVIEW_SOURCE_RUN_METADATA_PATH'), 'utf8'));
const artifact = JSON.parse(readFileSync(requiredEnv('BR_REVIEW_SOURCE_ARTIFACT_METADATA_PATH'), 'utf8'));
const evidence = JSON.parse(readFileSync(requiredEnv('BR_REVIEW_SOURCE_EVIDENCE_PATH'), 'utf8'));

const technicalReview = createInvestmentBusinessRuleProvenanceArtifactReview({
  run,
  artifact,
  evidence,
  downloadedArchiveDigest: requiredEnv('BR_REVIEW_DOWNLOADED_ARCHIVE_DIGEST'),
  expectedArtifactId: requiredEnv('BR_REVIEW_EXPECTED_ARTIFACT_ID'),
  expectedArtifactDigest: requiredEnv('BR_REVIEW_EXPECTED_ARTIFACT_DIGEST'),
});
validateInvestmentBusinessRuleProvenanceArtifactReview(technicalReview);

const envelope = createInvestmentBusinessRuleProvenanceReviewTransport({
  technicalReview,
  reviewWorkflow: {
    name: INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_NAME,
    path: INVESTMENT_BR_PROVENANCE_REVIEW_WORKFLOW_PATH,
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    headSha: requiredEnv('GITHUB_SHA'),
    runId: Number(requiredEnv('GITHUB_RUN_ID')),
    runAttempt: Number(requiredEnv('GITHUB_RUN_ATTEMPT')),
    actor: requiredEnv('GITHUB_ACTOR'),
    requestedSourceRunId: Number(requiredEnv('BR_REVIEW_EXPECTED_SOURCE_RUN_ID')),
    requestedArtifactId: Number(requiredEnv('BR_REVIEW_EXPECTED_ARTIFACT_ID')),
    requestedArtifactDigest: requiredEnv('BR_REVIEW_EXPECTED_ARTIFACT_DIGEST').toLowerCase(),
  },
});
validateInvestmentBusinessRuleProvenanceReviewTransport(envelope);

const outputPath = process.env.BR_REVIEW_OUTPUT_PATH
  ?? 'provenance-review/investment-business-rule-provenance-artifact-review.json';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: envelope.technicalReview.status,
  sourceRunId: envelope.technicalReview.workflow.runId,
  sourceArtifactId: envelope.technicalReview.artifact.id,
  sourceArtifactDigest: envelope.technicalReview.artifact.digest,
  reviewRunId: envelope.reviewWorkflow.runId,
  reviewHeadSha: envelope.reviewWorkflow.headSha,
  transportVerified: envelope.technicalReview.transportVerified,
  humanReviewRequired: envelope.humanReviewRequired,
  implementationPrEligible: envelope.implementationPrEligible,
  livePromotionAllowed: envelope.livePromotionAllowed,
}, null, 2));
