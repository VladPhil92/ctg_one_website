import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { buildInvestmentBusinessRulePropagationChangePlan } from '../src/lib/investment/business-rule-propagation-change-plan.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const outputPath = argumentValue('--out');

let result;
try {
  result = buildInvestmentBusinessRulePropagationChangePlan();
} catch (error) {
  result = {
    status: 'INVALID',
    automaticApprovalAllowed: false,
    automaticMutationAllowed: false,
    runtimeMutationAllowedByPlanner: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
    error: error instanceof Error ? error.message : 'Propagation change planning failed.',
  };
}

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'INVALID' ? 1 : 0);
