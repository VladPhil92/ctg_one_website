import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { finalizeInvestmentOperatingEvidence } from '../src/lib/investment/operating-evidence.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readExpectedSchema() {
  const source = readFileSync(new URL('../src/lib/observability/schema-version.ts', import.meta.url), 'utf8');
  const migration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source)?.[1];
  const name = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(source)?.[1];
  const count = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source)?.[1]);
  if (!migration || !name || !Number.isSafeInteger(count)) throw new Error('Unable to resolve repository schema metadata.');
  return { migration, name, count };
}

const evidencePath = argumentValue('--evidence');
const reviewPath = argumentValue('--review');
const outputPath = argumentValue('--out');
const productionAuthorization = argumentValue('--authorize-production-evidence');

if (!evidencePath || !reviewPath || !outputPath) {
  console.error('Usage: node scripts/finalize-investment-operating-evidence.mjs --evidence <capture.json> --review <completed-review.json> --out <safe-report.json> [--authorize-production-evidence FINALIZE_PRODUCTION_REDACTED_EVIDENCE]');
  process.exit(2);
}

const evidence = readJson(evidencePath);
if (evidence?.classification === 'production-redacted'
  && productionAuthorization !== 'FINALIZE_PRODUCTION_REDACTED_EVIDENCE') {
  console.error('Refusing production-redacted finalization without explicit FINALIZE_PRODUCTION_REDACTED_EVIDENCE authorization.');
  process.exit(2);
}

const review = readJson(reviewPath);
const report = finalizeInvestmentOperatingEvidence(evidence, review, { expectedSchema: readExpectedSchema() });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  result: 'PASS',
  captureId: report.captureId,
  classification: report.classification,
  releaseEvidenceEligible: report.releaseEvidenceEligible,
  capabilityPromotionAllowed: report.capabilityPromotionAllowed,
  outputPath,
}, null, 2));
