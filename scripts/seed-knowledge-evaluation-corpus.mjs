import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { assertIsolatedEvaluationBaseUrl } from '../src/lib/ai/evaluation-capture.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const packagePath = argumentValue('--package');
const baseUrlArg = argumentValue('--base-url');
const businessUnit = argumentValue('--business-unit');
const outputPath = argumentValue('--out');
const authorization = argumentValue('--authorize-provider-calls');
const expectedCommit = argumentValue('--expected-commit');
const cookie = process.env.CTG_KNOWLEDGE_EVALUATION_COOKIE;

if (!packagePath || !baseUrlArg || !businessUnit || !outputPath) {
  console.error(
    'Usage: npm run knowledge:evaluation:seed -- --package <corpus-package.json> --base-url <isolated-url> --business-unit <evaluation-unit> --out <receipt.json> --authorize-provider-calls SEED_AUTHORIZED_EVALUATION [--expected-commit <sha>]',
  );
  process.exit(2);
}
if (authorization !== 'SEED_AUTHORIZED_EVALUATION') {
  console.error('Refusing provider-backed corpus seeding without explicit SEED_AUTHORIZED_EVALUATION authorization.');
  process.exit(2);
}
if (!cookie) {
  console.error('CTG_KNOWLEDGE_EVALUATION_COOKIE is required and is never written to output.');
  process.exit(2);
}

const { baseUrl, environmentKind } = assertIsolatedEvaluationBaseUrl(baseUrlArg);
if (environmentKind === 'isolated-remote' && !expectedCommit) {
  console.error('Remote isolated evaluation environments require --expected-commit.');
  process.exit(2);
}

const corpusPackage = readJson(packagePath);
if (!corpusPackage?.corpusVersion || !Array.isArray(corpusPackage.documents) || !corpusPackage.documents.length) {
  throw new Error('Invalid evaluation corpus package');
}
if (corpusPackage.scope !== 'evaluation-only') {
  throw new Error('Only evaluation-only corpus packages may be seeded by this script');
}

const healthResponse = await fetch(`${baseUrl}/api/health`, { headers: { Cookie: cookie }, cache: 'no-store' });
const health = await healthResponse.json().catch(() => ({}));
if (!healthResponse.ok && environmentKind === 'isolated-remote') {
  throw new Error(`Evaluation environment health check failed with HTTP ${healthResponse.status}`);
}
if (expectedCommit && health?.deployment?.commit !== expectedCommit) {
  throw new Error(`Evaluation environment commit mismatch: expected ${expectedCommit}, observed ${health?.deployment?.commit ?? '<none>'}`);
}

const documents = [];
for (const document of corpusPackage.documents) {
  const response = await fetch(`${baseUrl}/api/knowledge/admin/ingest`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[EVAL ${corpusPackage.corpusVersion}] ${document.title}`,
      content: document.content,
      sourceUri: document.sourceUri,
      businessUnit,
      status: 'published',
    }),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Evaluation corpus seeding failed for ${document.evidenceId}: HTTP ${response.status} ${payload?.code ?? ''}`.trim());
  }
  documents.push({
    evidenceId: document.evidenceId,
    sourceUri: document.sourceUri,
    documentId: payload?.document?.id ?? null,
    chunkCount: payload?.chunkCount ?? null,
    embeddingModel: payload?.embeddingModel ?? null,
  });
}

const receipt = {
  receiptVersion: 'ctg-knowledge-evaluation-seed-v1',
  corpusVersion: corpusPackage.corpusVersion,
  environment: {
    kind: environmentKind,
    baseUrl,
    observedCommit: health?.deployment?.commit ?? null,
    branch: health?.deployment?.branch ?? null,
  },
  evaluationBusinessUnit: businessUnit,
  seededAt: new Date().toISOString(),
  documentCount: documents.length,
  documents,
};

writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.error(`Seeded ${documents.length} evaluation documents into isolated environment; receipt written to ${outputPath}`);
