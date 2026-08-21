import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { createInvestmentOperatingReviewTemplate } from '../src/lib/investment/operating-evidence.mjs';

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
const outputPath = argumentValue('--out');
const productionAuthorization = argumentValue('--authorize-production-evidence');

if (!evidencePath || !outputPath) {
  console.error('Usage: node scripts/create-investment-operating-review.mjs --evidence <capture.json> --out <private-review.json> [--authorize-production-evidence REVIEW_PRODUCTION_REDACTED_EVIDENCE]');
  process.exit(2);
}

const evidence = readJson(evidencePath);
if (evidence?.classification === 'production-redacted'
  && productionAuthorization !== 'REVIEW_PRODUCTION_REDACTED_EVIDENCE') {
  console.error('Refusing production-redacted evidence without explicit REVIEW_PRODUCTION_REDACTED_EVIDENCE authorization.');
  process.exit(2);
}

const review = createInvestmentOperatingReviewTemplate(evidence, { expectedSchema: readExpectedSchema() });
writeFileSync(outputPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
console.error(`Human operating-evidence review worksheet written to ${outputPath}. Every null judgment and reviewer field must be completed explicitly before finalization.`);
