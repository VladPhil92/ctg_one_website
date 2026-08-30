import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { INVESTMENT_BUSINESS_RULE_CANDIDATE } from '../src/data/investment-business-rule-governance.mjs';
import {
  INVESTMENT_BUSINESS_RULE_PROPAGATION_MANIFEST_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS,
} from '../src/lib/investment/business-rule-decision-intake.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const outputPath = argumentValue('--out');
if (!outputPath) {
  console.error('Usage: node scripts/create-investment-business-rule-propagation-template.mjs --out <propagation-manifest.json>');
  process.exit(2);
}

const manifest = {
  version: INVESTMENT_BUSINESS_RULE_PROPAGATION_MANIFEST_VERSION,
  candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
  preparedAt: new Date().toISOString(),
  implementationCommit: 'REPLACE_WITH_FULL_40_CHARACTER_IMPLEMENTATION_GIT_SHA',
  surfaces: INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS.map((id) => ({
    id,
    status: 'PENDING',
    artifactRefs: [],
    verifiedBy: null,
    verifiedAt: null,
    evidenceRef: null,
  })),
  overallReview: {
    status: 'PENDING',
    reviewedBy: null,
    reviewedAt: null,
    evidenceRef: null,
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.error(`Business-rule propagation manifest template written to ${outputPath}. It is intentionally not eligible until all seven authoritative surfaces and the overall review are explicitly VERIFIED after BR approval.`);
