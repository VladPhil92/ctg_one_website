import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  summarizeInvestmentOperatingEvidence,
  validateInvestmentOperatingEvidence,
} from '../src/lib/investment/operating-evidence.mjs';

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
const summaryOut = argumentValue('--summary-out');
const productionAuthorization = argumentValue('--authorize-production-evidence');

if (!evidencePath) {
  console.error('Usage: node scripts/validate-investment-operating-evidence.mjs --evidence <capture.json> [--summary-out <safe-summary.json>] [--authorize-production-evidence REVIEW_PRODUCTION_REDACTED_EVIDENCE]');
  process.exit(2);
}

const evidence = readJson(evidencePath);
if (evidence?.classification === 'production-redacted'
  && productionAuthorization !== 'REVIEW_PRODUCTION_REDACTED_EVIDENCE') {
  console.error('Refusing production-redacted evidence without explicit REVIEW_PRODUCTION_REDACTED_EVIDENCE authorization.');
  process.exit(2);
}

const expectedSchema = readExpectedSchema();
validateInvestmentOperatingEvidence(evidence, { expectedSchema });
const summary = summarizeInvestmentOperatingEvidence(evidence, { expectedSchema });
const safeResult = {
  result: 'PASS',
  captureId: evidence.captureId,
  classification: evidence.classification,
  environment: {
    provider: evidence.environment.provider,
    branch: evidence.environment.branch,
    commit: evidence.environment.commit,
    schemaMigration: evidence.environment.schemaMigration,
    schemaMigrationName: evidence.environment.schemaMigrationName,
    schemaMigrationCount: evidence.environment.schemaMigrationCount,
    schemaCompatible: evidence.environment.schemaCompatible,
    productionReadinessVerified: evidence.environment.productionReadinessVerified,
  },
  summary,
  productionOperatingEvidence: evidence.classification === 'production-redacted' ? 'candidate-for-human-review' : 'not-production-evidence',
  capabilityPromotionAllowed: false,
};

if (summaryOut) writeFileSync(summaryOut, `${JSON.stringify(safeResult, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(safeResult, null, 2));
