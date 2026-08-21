import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  assertIsolatedEvaluationBaseUrl,
  KNOWLEDGE_EVALUATION_CAPTURE_VERSION,
} from '../src/lib/ai/evaluation-capture.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const datasetPath = argumentValue('--dataset');
const baseUrlArg = argumentValue('--base-url');
const businessUnit = argumentValue('--business-unit');
const outputPath = argumentValue('--out');
const authorization = argumentValue('--authorize-provider-calls');
const expectedCommit = argumentValue('--expected-commit');
const delayMs = Number(argumentValue('--delay-ms') ?? 1200);
const cookie = process.env.CTG_KNOWLEDGE_EVALUATION_COOKIE;

if (!datasetPath || !baseUrlArg || !businessUnit || !outputPath) {
  console.error(
    'Usage: npm run knowledge:evaluation:capture -- --dataset <dataset.json> --base-url <isolated-url> --business-unit <evaluation-unit> --out <capture.json> --authorize-provider-calls RUN_AUTHORIZED_EVALUATION [--expected-commit <sha>] [--delay-ms 1200]',
  );
  process.exit(2);
}
if (authorization !== 'RUN_AUTHORIZED_EVALUATION') {
  console.error('Refusing model/retrieval calls without explicit RUN_AUTHORIZED_EVALUATION authorization.');
  process.exit(2);
}
if (!cookie) {
  console.error('CTG_KNOWLEDGE_EVALUATION_COOKIE is required and is never written to output.');
  process.exit(2);
}
if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 60_000) {
  console.error('--delay-ms must be between 0 and 60000.');
  process.exit(2);
}

const { baseUrl, environmentKind } = assertIsolatedEvaluationBaseUrl(baseUrlArg);
if (environmentKind === 'isolated-remote' && !expectedCommit) {
  console.error('Remote isolated evaluation environments require --expected-commit.');
  process.exit(2);
}

const dataset = readJson(datasetPath);
if (!dataset?.version || !dataset?.corpusVersion || !Array.isArray(dataset.cases) || !dataset.cases.length) {
  throw new Error('Invalid evaluation dataset');
}

const healthResponse = await fetch(`${baseUrl}/api/health`, { headers: { Cookie: cookie }, cache: 'no-store' });
const health = await healthResponse.json().catch(() => ({}));
if (!healthResponse.ok && environmentKind === 'isolated-remote') {
  throw new Error(`Evaluation environment health check failed with HTTP ${healthResponse.status}`);
}
if (expectedCommit && health?.deployment?.commit !== expectedCommit) {
  throw new Error(`Evaluation environment commit mismatch: expected ${expectedCommit}, observed ${health?.deployment?.commit ?? '<none>'}`);
}

const captureId = randomUUID();
const capturedCases = [];

for (let index = 0; index < dataset.cases.length; index += 1) {
  const fixture = dataset.cases[index];
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/knowledge/query`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: fixture.question,
      businessUnit,
    }),
    cache: 'no-store',
  });
  const latencyMs = Math.round(performance.now() - started);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Evaluation capture failed for ${fixture.id}: HTTP ${response.status} ${payload?.code ?? ''}`.trim());
  }
  if (typeof payload?.answer !== 'string' || typeof payload?.grounded !== 'boolean' || !Array.isArray(payload?.sources)) {
    throw new Error(`Evaluation endpoint returned a malformed payload for ${fixture.id}`);
  }

  capturedCases.push({
    id: fixture.id,
    question: fixture.question,
    answer: payload.answer,
    grounded: payload.grounded,
    requestId: typeof payload.requestId === 'string' ? payload.requestId : null,
    latencyMs,
    sources: payload.sources.map((source) => ({
      citation: source.citation,
      sourceUri: source.sourceUri ?? null,
      title: source.title ?? null,
      similarity: typeof source.similarity === 'number' ? source.similarity : null,
    })),
  });

  if (index < dataset.cases.length - 1 && delayMs > 0) await sleep(delayMs);
}

const capture = {
  captureVersion: KNOWLEDGE_EVALUATION_CAPTURE_VERSION,
  captureId,
  datasetVersion: dataset.version,
  corpusVersion: dataset.corpusVersion,
  capturedAt: new Date().toISOString(),
  evaluationBusinessUnit: businessUnit,
  environment: {
    kind: environmentKind,
    baseUrl,
    observedCommit: health?.deployment?.commit ?? null,
    branch: health?.deployment?.branch ?? null,
    schemaCompatible: health?.schema?.compatible ?? null,
    healthStatus: health?.status ?? null,
  },
  cases: capturedCases,
};

writeFileSync(outputPath, `${JSON.stringify(capture, null, 2)}\n`, 'utf8');
console.error(`Captured ${capturedCases.length} authorized evaluation cases at ${outputPath}. Human semantic review is still required.`);
