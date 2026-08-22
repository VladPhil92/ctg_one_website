import { readFile } from 'node:fs/promises';
import process from 'node:process';
import {
  isSuccessfulInvestmentProductionReadinessEvidence,
  validateInvestmentProductionReadinessEvidence,
} from '../src/lib/investment/production-readiness-evidence.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const filePath = argumentValue('--file');
const expectedSha = argumentValue('--expected-sha');
const requireProduction = process.argv.includes('--require-production');

if (!filePath) {
  console.error('Usage: node scripts/validate-investment-production-readiness-evidence.mjs --file <evidence.json> [--expected-sha <full-sha>] [--require-production]');
  process.exit(2);
}
if (expectedSha && !/^[0-9a-f]{40}$/.test(expectedSha)) {
  console.error('--expected-sha must be a lowercase full 40-character Git SHA.');
  process.exit(2);
}

const evidence = JSON.parse(await readFile(filePath, 'utf8'));
validateInvestmentProductionReadinessEvidence(evidence);

if (expectedSha && evidence.expectedSha !== expectedSha) {
  throw new Error(`Evidence SHA ${evidence.expectedSha} does not match expected SHA ${expectedSha}.`);
}

if (requireProduction) {
  const deployment = {
    provider: 'render',
    branch: 'main',
    commit: expectedSha ?? evidence.expectedSha,
  };
  if (!isSuccessfulInvestmentProductionReadinessEvidence(evidence, deployment)) {
    throw new Error('Evidence is structurally valid but does not qualify as successful production-readiness evidence for the requested deployment.');
  }
}

console.log(JSON.stringify({
  valid: true,
  classification: evidence.classification,
  result: evidence.result,
  expectedSha: evidence.expectedSha,
  expectedBranch: evidence.expectedBranch,
  expectedMigration: evidence.expectedMigration,
  expectedMigrationName: evidence.expectedMigrationName,
  expectedMigrationCount: evidence.expectedMigrationCount,
  productionEligible: isSuccessfulInvestmentProductionReadinessEvidence(evidence, {
    provider: 'render',
    branch: 'main',
    commit: evidence.expectedSha,
  }),
}, null, 2));
