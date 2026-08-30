import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { INVESTMENT_CLOSED_BETA_PILOT_MANIFEST_VERSION } from '../src/lib/investment/closed-beta-pilot-preflight.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function readExpectedSchema() {
  const source = readFileSync(new URL('../src/lib/observability/schema-version.ts', import.meta.url), 'utf8');
  const migration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source)?.[1];
  const name = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(source)?.[1];
  const count = Number(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source)?.[1]);
  if (!migration || !name || !Number.isSafeInteger(count)) throw new Error('Unable to resolve repository schema metadata.');
  return { migration, name, count };
}

const outputPath = argumentValue('--out');
const classification = argumentValue('--classification') ?? 'production-redacted-preflight';
if (!outputPath || !['production-redacted-preflight', 'synthetic-ci'].includes(classification)) {
  console.error('Usage: node scripts/create-investment-closed-beta-pilot-template.mjs --out <private-manifest.json> [--classification production-redacted-preflight|synthetic-ci]');
  process.exit(2);
}

const expectedSchema = readExpectedSchema();
const production = classification === 'production-redacted-preflight';
const preparedAt = new Date();
const longStopAt = new Date(preparedAt.getTime() + (30 * 24 * 60 * 60 * 1000));

const manifest = {
  manifestVersion: INVESTMENT_CLOSED_BETA_PILOT_MANIFEST_VERSION,
  classification,
  preparedAt: preparedAt.toISOString(),
  environment: {
    origin: production ? 'https://ctgone.com' : 'https://ci.invalid',
    provider: production ? 'render' : 'ci',
    branch: production ? 'main' : 'synthetic',
    commit: 'REPLACE_WITH_FULL_40_CHARACTER_DEPLOYED_GIT_SHA',
    schemaMigration: expectedSchema.migration,
    schemaMigrationName: expectedSchema.name,
    schemaMigrationCount: expectedSchema.count,
    schemaCompatible: false,
    productionReadinessVerified: false,
  },
  participant: {
    profileDigestSha256: 'REPLACE_WITH_SHA256_OF_PRIVATE_PROFILE_REFERENCE',
    kycStatus: 'REPLACE_WITH_VERIFIED',
    agreementAccepted: false,
    agreementVersion: 'replace-agreement-version',
    agreementDigestSha256: 'REPLACE_WITH_SHA256_OF_ACCEPTED_AGREEMENT',
  },
  lot: {
    lotDigestSha256: 'REPLACE_WITH_SHA256_OF_PRIVATE_LOT_REFERENCE',
    formulaVersion: 'replace-formula-version',
    agreementVersion: 'replace-agreement-version',
    plannedUnits: 0,
    serializationPlanVersion: 'replace-serialization-plan-version',
    longStopAt: longStopAt.toISOString(),
    currency: 'COP',
    capitalTargetCents: 0,
  },
  funding: {
    rail: 'manual-bank',
    manualVerificationRequired: true,
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.error(`Closed-beta pilot manifest template ${randomBytes(4).toString('hex')} written to ${outputPath}. It is intentionally BLOCKED until placeholders are replaced with redacted facts and every independent governance/readiness gate is satisfied.`);
