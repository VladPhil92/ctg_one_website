import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  INVESTMENT_OPERATING_EVIDENCE_VERSION,
  INVESTMENT_OPERATING_REDACTION_POLICY_VERSION,
} from '../src/lib/investment/operating-evidence.mjs';

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
const classification = argumentValue('--classification') ?? 'production-redacted';
if (!outputPath || !['production-redacted', 'synthetic-ci'].includes(classification)) {
  console.error('Usage: node scripts/create-investment-operating-evidence-template.mjs --out <private-evidence.json> [--classification production-redacted|synthetic-ci]');
  process.exit(2);
}

const schema = readExpectedSchema();
const isProduction = classification === 'production-redacted';
const template = {
  captureVersion: INVESTMENT_OPERATING_EVIDENCE_VERSION,
  classification,
  redactionPolicyVersion: INVESTMENT_OPERATING_REDACTION_POLICY_VERSION,
  captureId: `ioe-${randomBytes(12).toString('hex')}`,
  capturedAt: new Date().toISOString(),
  environment: {
    baseUrl: isProduction ? 'https://ctgone.com' : 'https://ci.invalid',
    provider: isProduction ? 'render' : 'ci',
    branch: isProduction ? 'main' : 'synthetic',
    commit: 'REPLACE_WITH_FULL_40_CHARACTER_GIT_SHA',
    schemaMigration: schema.migration,
    schemaMigrationName: schema.name,
    schemaMigrationCount: schema.count,
    schemaCompatible: isProduction,
    productionReadinessVerified: isProduction,
  },
  sourceDigests: [
    {
      label: 'replace-with-source-label',
      sourceClass: 'first-party-export',
      sha256: 'REPLACE_WITH_SHA256_OF_PRIVATE_SOURCE',
    },
  ],
  lots: [
    {
      lotDigestSha256: 'REPLACE_WITH_SHA256_OF_PRIVATE_LOT_IDENTIFIER',
      observedStatus: 'REPLACE_STATUS',
      funding: {
        allocatedCapitalCents: 0,
        cashReceiptCents: 0,
        approvedReinvestmentDebitCents: 0,
        internalCapitalCents: 0,
        unbackedExternalCapitalCents: 0,
        reconciled: false,
      },
      production: {
        serializedUnits: 0,
        terminalPhysicalUnits: 0,
        inventoryReconciled: false,
      },
      sales: {
        documentedSoldUnits: 0,
        returnedUnits: 0,
        returnGenealogyMismatches: 0,
      },
      settlement: {
        finalized: false,
        netDistributableProfitCents: null,
        participantCreditCents: 0,
      },
      liquidity: {
        approvedReinvestmentCents: 0,
        confirmedWithdrawalDebitCents: 0,
      },
    },
  ],
};

writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
console.error(`Operating evidence template written to ${outputPath}. It is intentionally invalid until every placeholder is replaced with redacted first-party evidence.`);
