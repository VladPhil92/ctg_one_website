import { readFileSync } from 'node:fs';
import process from 'node:process';
import {
  CTG_KNOWLEDGE_BETA_THRESHOLDS,
  evaluateKnowledgeRun,
} from '../src/lib/ai/evaluation.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const datasetPath = argumentValue('--dataset');
const runPath = argumentValue('--run');

if (!datasetPath || !runPath) {
  console.error('Usage: node scripts/evaluate-knowledge-run.mjs --dataset <dataset.json> --run <run.json>');
  process.exit(2);
}

const dataset = readJson(datasetPath);
const run = readJson(runPath);
const result = evaluateKnowledgeRun(dataset, run, CTG_KNOWLEDGE_BETA_THRESHOLDS);

console.log(JSON.stringify({
  datasetVersion: result.datasetVersion,
  evidenceClass: result.evidenceClass,
  regressionPassed: result.regressionPassed,
  releaseEvidenceEligible: result.releaseEvidenceEligible,
  failedCaseIds: result.failedCaseIds,
  metrics: result.metrics,
  thresholdChecks: result.thresholdChecks,
}, null, 2));

if (!result.regressionPassed) process.exit(1);
