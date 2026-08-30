import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
} from '../src/data/investment-business-rule-governance.mjs';
import { INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION } from '../src/data/investment-closed-beta-pilot-governance.mjs';
import { INVESTMENT_PRODUCTION_READINESS_CANARY } from '../src/data/investment-release-governance.mjs';
import {
  buildInvestmentClosedBetaPilotPreflight,
  validateInvestmentClosedBetaPilotManifest,
} from '../src/lib/investment/closed-beta-pilot-preflight.mjs';

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

function envFlag(name) {
  return process.env[name] === 'true';
}

function closedBetaFlags() {
  return {
    publicRegistrationEnabled: envFlag('CTG_INVESTMENT_PUBLIC_REGISTRATION_ENABLED'),
    publicFundingEnabled: envFlag('CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED'),
    paymentGatewayEnabled: envFlag('CTG_INVESTMENT_PAYMENT_GATEWAY_ENABLED'),
    automaticSettlementEnabled: envFlag('CTG_INVESTMENT_AUTOMATIC_SETTLEMENT_ENABLED'),
    automaticWithdrawalsEnabled: envFlag('CTG_INVESTMENT_AUTOMATIC_WITHDRAWALS_ENABLED'),
  };
}

function safeBlockedResult(message) {
  return {
    preflightVersion: 'ctg-investment-closed-beta-pilot-preflight-v1',
    status: 'BLOCKED',
    pilotStartReviewEligible: false,
    automaticExecutionAllowed: false,
    manualFundingVerificationRequired: true,
    blockers: ['manifest-validity'],
    gates: [{ id: 'manifest-validity', status: 'BLOCKED', detail: message }],
  };
}

const manifestPath = argumentValue('--manifest');
const reportOut = argumentValue('--report-out');
const productionAuthorization = argumentValue('--authorize-production-preflight');

if (!manifestPath) {
  console.error('Usage: node scripts/validate-investment-closed-beta-pilot.mjs --manifest <private-manifest.json> [--report-out <safe-report.json>] [--authorize-production-preflight REVIEW_CLOSED_BETA_PILOT_PREFLIGHT]');
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  const result = safeBlockedResult('Pilot manifest cannot be read as JSON.');
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

if (manifest?.classification === 'production-redacted-preflight'
  && productionAuthorization !== 'REVIEW_CLOSED_BETA_PILOT_PREFLIGHT') {
  const result = safeBlockedResult('Refusing production pilot preflight without explicit REVIEW_CLOSED_BETA_PILOT_PREFLIGHT operator authorization.');
  if (reportOut) writeFileSync(reportOut, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

const expectedSchema = readExpectedSchema();
let result;
try {
  validateInvestmentClosedBetaPilotManifest(manifest, { expectedSchema });
  const deployment = {
    provider: manifest.environment.provider,
    branch: manifest.environment.branch,
    commit: manifest.environment.commit,
  };
  result = buildInvestmentClosedBetaPilotPreflight({
    manifest,
    expectedSchema,
    businessRuleGovernance: INVESTMENT_BUSINESS_RULE_GOVERNANCE,
    businessRulePropagation: INVESTMENT_BUSINESS_RULE_PROPAGATION,
    pilotAuthorization: INVESTMENT_CLOSED_BETA_PILOT_AUTHORIZATION,
    productionReadinessCanary: INVESTMENT_PRODUCTION_READINESS_CANARY,
    deployment,
    flags: closedBetaFlags(),
  });
} catch (error) {
  result = safeBlockedResult(error instanceof Error ? error.message : 'Pilot manifest validation failed.');
}

if (reportOut) writeFileSync(reportOut, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'READY' ? 0 : 1);
