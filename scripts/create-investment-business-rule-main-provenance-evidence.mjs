import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import {
  createInvestmentBusinessRuleMainProvenanceEvidence,
  validateInvestmentBusinessRuleMainProvenanceEvidence,
} from '../src/lib/investment/business-rule-main-provenance.mjs';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('Merged-main provenance evidence may only be emitted by GitHub Actions');
}

const mergedPullRequest = JSON.parse(
  readFileSync(requiredEnv('BR_PROVENANCE_MERGED_PR_PATH'), 'utf8'),
);
const commitMetadata = JSON.parse(
  readFileSync(requiredEnv('BR_PROVENANCE_COMMIT_METADATA_PATH'), 'utf8'),
);
const mergeShape = requiredEnv('BR_PROVENANCE_MERGE_SHAPE');
const parents = commitMetadata?.parents;
if (!Array.isArray(parents) || !['merge-commit', 'squash'].includes(mergeShape)) {
  throw new Error('Merged-main provenance requires a supported GitHub merge shape');
}
if (mergeShape === 'merge-commit' && parents.length !== 2) {
  throw new Error('Merge-commit provenance requires exactly two parents');
}
if (mergeShape === 'squash' && parents.length !== 1) {
  throw new Error('Squash provenance requires exactly one parent');
}

const evidence = createInvestmentBusinessRuleMainProvenanceEvidence({
  repository: requiredEnv('GITHUB_REPOSITORY'),
  eventName: requiredEnv('GITHUB_EVENT_NAME'),
  ref: requiredEnv('GITHUB_REF'),
  sha: requiredEnv('GITHUB_SHA'),
  headSha: requiredEnv('BR_PROVENANCE_HEAD_SHA'),
  eventBefore: requiredEnv('BR_PROVENANCE_EVENT_BEFORE'),
  mergeShape,
  mergeFirstParentSha: parents[0]?.sha,
  mergeSecondParentSha: mergeShape === 'merge-commit' ? parents[1]?.sha : null,
  commitVerified: commitMetadata?.commit?.verification?.verified === true,
  governanceBlobSha: requiredEnv('BR_PROVENANCE_GOVERNANCE_BLOB_SHA'),
  candidateBlobSha: requiredEnv('BR_PROVENANCE_CANDIDATE_BLOB_SHA'),
  mergePullRequest: mergedPullRequest,
  workflowName: requiredEnv('GITHUB_WORKFLOW'),
  workflowRunId: requiredEnv('GITHUB_RUN_ID'),
  workflowRunAttempt: requiredEnv('GITHUB_RUN_ATTEMPT'),
});

validateInvestmentBusinessRuleMainProvenanceEvidence(evidence);

const outputPath = process.env.BR_PROVENANCE_OUTPUT_PATH
  ?? 'provenance-evidence/investment-business-rule-main-provenance.json';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: evidence.status,
  trustedMainSha: evidence.trustedMainSha,
  beforeSha: evidence.transition.beforeSha,
  mergeShape: evidence.transition.mergeShape,
  governanceBlobSha: evidence.governance.blobSha,
  mergePr: evidence.mergePullRequest.number,
  workflowEvidenceCandidateEligible: evidence.workflowEvidenceCandidateEligible,
  standaloneAuthorityAllowed: evidence.standaloneAuthorityAllowed,
}, null, 2));
