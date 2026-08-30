import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
} from '../src/data/investment-business-rule-governance.mjs';
import { INVESTMENT_BUSINESS_RULE_DECISION_INTAKE_VERSION } from '../src/lib/investment/business-rule-decision-intake.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const outputPath = argumentValue('--out');
if (!outputPath) {
  console.error('Usage: node scripts/create-investment-business-rule-decision-intake-template.mjs --out <decision-intake.json>');
  process.exit(2);
}

const intake = {
  version: INVESTMENT_BUSINESS_RULE_DECISION_INTAKE_VERSION,
  candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
  submittedAt: new Date().toISOString(),
  decisions: INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.map((id) => ({
    id,
    status: 'PENDING',
    reviewedCandidateCommit: null,
    reviewedCandidateBlobSha: null,
    decidedBy: null,
    decidedAt: null,
    evidenceRef: null,
  })),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(intake, null, 2)}\n`, 'utf8');
console.error(`Business-rule decision intake template written to ${outputPath}. No rule is approved by creating this file; every PENDING entry requires an explicit human decision against the pinned candidate.`);
