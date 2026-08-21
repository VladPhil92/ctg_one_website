import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  buildEvaluationCorpusPackage,
  validateEvaluationDatasetAgainstCorpus,
} from '../src/lib/ai/evaluation-corpus.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const manifestPath = argumentValue('--manifest');
const datasetPath = argumentValue('--dataset');
const outputPath = argumentValue('--out');

if (!manifestPath || !datasetPath) {
  console.error(
    'Usage: node scripts/prepare-knowledge-evaluation-corpus.mjs --manifest <manifest.json> --dataset <dataset.json> [--out <package.json>]',
  );
  process.exit(2);
}

const manifest = readJson(manifestPath);
const dataset = readJson(datasetPath);
const validation = validateEvaluationDatasetAgainstCorpus(manifest, dataset);
const corpusPackage = buildEvaluationCorpusPackage(manifest);
const output = {
  generatedFrom: {
    manifest: manifestPath,
    dataset: datasetPath,
  },
  validation,
  ...corpusPackage,
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;

if (outputPath) {
  writeFileSync(outputPath, serialized, 'utf8');
  console.error(`Prepared ${corpusPackage.documents.length} evaluation documents at ${outputPath}`);
} else {
  process.stdout.write(serialized);
}
