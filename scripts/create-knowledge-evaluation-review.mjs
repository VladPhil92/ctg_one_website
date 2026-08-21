import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { createKnowledgeEvaluationReviewTemplate } from '../src/lib/ai/evaluation-capture.mjs';

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
const outputPath = argumentValue('--out');

if (!datasetPath || !packagePath || !capturePath || !outputPath) {
  console.error(
    'Usage: npm run knowledge:evaluation:review-template -- --dataset <dataset.json> --package <corpus-package.json> --capture <capture.json> --out <review.json>',
  );
  process.exit(2);
}

const dataset = readJson(datasetPath);
const corpusPackage = readJson(packagePath);
const capture = readJson(capturePath);
const review = createKnowledgeEvaluationReviewTemplate(dataset, corpusPackage, capture);

writeFileSync(outputPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
console.error(`Human review worksheet written to ${outputPath}. Every null judgment must be replaced with an explicit boolean before finalization.`);
