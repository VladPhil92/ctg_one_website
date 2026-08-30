import { readFileSync } from 'node:fs';
import process from 'node:process';
import { validateInvestmentBusinessRuleMainProvenanceEvidence } from '../src/lib/investment/business-rule-main-provenance.mjs';

const evidencePath = process.argv[2] ?? process.env.BR_PROVENANCE_OUTPUT_PATH;
if (!evidencePath) {
  throw new Error('Usage: node scripts/validate-investment-business-rule-main-provenance-evidence.mjs <evidence.json>');
}

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
validateInvestmentBusinessRuleMainProvenanceEvidence(evidence);
console.log(JSON.stringify({
  status: 'VALID',
  evidenceStatus: evidence.status,
  trustedMainSha: evidence.trustedMainSha,
  mergePr: evidence.mergePullRequest.number,
  workflowEvidenceCandidateEligible: evidence.workflowEvidenceCandidateEligible,
  standaloneAuthorityAllowed: evidence.standaloneAuthorityAllowed,
}, null, 2));
