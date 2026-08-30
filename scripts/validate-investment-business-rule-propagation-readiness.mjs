import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { INVESTMENT_BUSINESS_RULE_GOVERNANCE } from '../src/data/investment-business-rule-governance.mjs';
import {
  buildInvestmentBusinessRulePropagationReadiness,
  validateInvestmentBusinessRuleDecisionIntake,
  validateInvestmentBusinessRulePropagationManifest,
} from '../src/lib/investment/business-rule-decision-intake.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function gitText(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function verifyRepositoryEvidence(manifest) {
  const headCommit = gitText(['rev-parse', 'HEAD']);
  if (headCommit !== manifest.implementationCommit) {
    throw new Error(`Propagation implementationCommit must equal checked-out HEAD (${headCommit}).`);
  }

  const refs = [...new Set(
    manifest.surfaces
      .filter((surface) => surface.status === 'VERIFIED')
      .flatMap((surface) => surface.artifactRefs),
  )];
  const artifacts = refs.map((path) => {
    const objectSpec = `${headCommit}:${path}`;
    const type = gitText(['cat-file', '-t', objectSpec]);
    if (type !== 'blob') throw new Error(`Propagation artifact must resolve to a tracked file blob at implementationCommit: ${path}`);
    return Object.freeze({
      path,
      blobSha: gitText(['rev-parse', objectSpec]),
    });
  });

  return Object.freeze({
    headCommit,
    implementationCommitMatchesHead: true,
    artifactCount: artifacts.length,
    artifacts: Object.freeze(artifacts),
  });
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
  const repositoryEvidence = verifyRepositoryEvidence(manifest);
  result = {
    ...buildInvestmentBusinessRulePropagationReadiness({
      intake,
      canonicalGovernance: INVESTMENT_BUSINESS_RULE_GOVERNANCE,
      manifest,
    }),
    repositoryEvidenceVerified: true,
    repositoryEvidence,
  };
} catch (error) {
  result = {
    status: 'INVALID',
    repositoryEvidenceVerified: false,
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
process.exit(result.status === 'ELIGIBLE_FOR_PROPAGATION_GOVERNANCE_PR' && result.repositoryEvidenceVerified ? 0 : 1);
