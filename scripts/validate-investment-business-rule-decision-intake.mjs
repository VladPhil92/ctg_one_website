import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import {
  summarizeInvestmentBusinessRuleDecisionIntake,
  validateInvestmentBusinessRuleDecisionIntake,
} from '../src/lib/investment/business-rule-decision-intake.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const intakePath = argumentValue('--intake');
const reportOut = argumentValue('--report-out');
if (!intakePath) {
  console.error('Usage: node scripts/validate-investment-business-rule-decision-intake.mjs --intake <decision-intake.json> [--report-out <report.json>]');
  process.exit(2);
}

let result;
try {
  const intake = JSON.parse(readFileSync(intakePath, 'utf8'));
  validateInvestmentBusinessRuleDecisionIntake(intake);
  result = summarizeInvestmentBusinessRuleDecisionIntake(intake);
} catch (error) {
  result = {
    status: 'INVALID',
    governancePrReviewEligible: false,
    propagationPlanningEligible: false,
    canonicalMutationAllowed: false,
    automaticApprovalAllowed: false,
    error: error instanceof Error ? error.message : 'Decision intake validation failed.',
  };
}

if (reportOut) {
  mkdirSync(dirname(reportOut), { recursive: true });
  writeFileSync(reportOut, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(result, null, 2));
process.exit(result.status !== 'INVALID' && result.governancePrReviewEligible ? 0 : 1);
