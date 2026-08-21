import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { evaluateKnowledgeRun } from '../src/lib/ai/evaluation.mjs';
import { finalizeAuthorizedKnowledgeEvaluationRun } from '../src/lib/ai/evaluation-capture.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const datasetPath = argumentValue('--dataset');
const packagePath = argumentValue('--package');
const capturePath = argumentValue('--capture');
const reviewPath = argumentValue('--review');
const runOutputPath = argumentValue('--run-out');
const reportOutputPath = argumentValue('--report-out');

if (!datasetPath || !packagePath || !capturePath || !reviewPath || !runOutputPath || !reportOutputPath) {
  console.error(
    'Usage: npm run knowledge:evaluation:finalize -- --dataset <dataset.json> --package <corpus-package.json> --capture <capture.json> --review <review.json> --run-out <authorized-run.json> --report-out <report.json>',
  );
  process.exit(2);
}

const dataset = readJson(datasetPath);
const corpusPackage = readJson(packagePath);
const capture = readJson(capturePath);
const review = readJson(reviewPath);
const run = finalizeAuthorizedKnowledgeEvaluationRun(dataset, corpusPackage, capture, review);
const report = evaluateKnowledgeRun(dataset, run);

writeFileSync(runOutputPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
writeFileSync(reportOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.error(
  `Authorized evaluation finalized: regressionPassed=${report.regressionPassed}; releaseEvidenceEligible=${report.releaseEvidenceEligible}; report=${reportOutputPath}`,
);
console.error('This command never promotes CTG Knowledge to LIVE. Maturity changes require a separate accountable decision.');

if (!report.regressionPassed) process.exit(1);
