import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import {
  buildInvestmentBusinessRulePropagationReadiness,
  validateInvestmentBusinessRuleDecisionIntake,
  validateInvestmentBusinessRulePropagationManifest,
} from '../src/lib/investment/business-rule-decision-intake.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const intakePath = argumentValue('--intake');
const manifestPath = argumentValue('--manifest');
const reportOut = argumentValue('--report-out');
if (!intakePath || !manifestPath) {
  console.error('Usage: node scripts/validate-investment-business-rule-propagation-readiness.mjs --intake <decision-intake.json> --manifest <propagation-manifest.json> [--report-out <report.json>]');
  process.exit(2);
}

let result;
try {
  const intake = JSON.parse(readFileSync(intakePath, 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  validateInvestmentBusinessRuleDecisionIntake(intake);
  validateInvestmentBusinessRulePropagationManifest(manifest);
  result = buildInvestmentBusinessRulePropagationReadiness({ intake, manifest });
} catch (error) {
  result = {
    status: 'INVALID',
    canonicalMutationAllowed: false,
    runtimeMutationAllowed: false,
    livePromotionAllowed: false,
    error: error instanceof Error ? error.message : 'Propagation readiness validation failed.',
  };
}

if (reportOut) {
  mkdirSync(dirname(reportOut), { recursive: true });
  writeFileSync(reportOut, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'ELIGIBLE_FOR_PROPAGATION_GOVERNANCE_PR' ? 0 : 1);
