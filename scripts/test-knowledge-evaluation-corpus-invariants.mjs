import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildEvaluationCorpusPackage,
  gitBlobSha,
  validateEvaluationDatasetAgainstCorpus,
} from '../src/lib/ai/evaluation-corpus.mjs';

const manifestPath = 'scripts/fixtures/knowledge-evaluation-corpus.public-v2.json';
const datasetPath = 'scripts/fixtures/knowledge-evaluation-dataset.public-v2.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
const moduleSource = readFileSync('src/lib/ai/evaluation-corpus.mjs', 'utf8');
const packageSource = readFileSync('scripts/prepare-knowledge-evaluation-corpus.mjs', 'utf8');

const validation = validateEvaluationDatasetAgainstCorpus(manifest, dataset);
assert.equal(validation.corpusVersion, manifest.version);
assert.equal(validation.datasetVersion, dataset.version);
assert.equal(validation.sourceCount, 13, 'public evaluation corpus must pin the reviewed source set');
assert.equal(validation.caseCount, 18, 'representative public evaluation dataset must retain its case coverage');
assert.ok(validation.supportedCount >= 8);
assert.ok(validation.noEvidenceCount >= 2);
assert.ok(validation.adversarialCount >= 2);
assert.ok(validation.multiSourceCount >= 2);

const prepared = buildEvaluationCorpusPackage(manifest);
assert.equal(prepared.classification, 'public-first-party');
assert.equal(prepared.scope, 'evaluation-only');
assert.equal(prepared.documents.length, manifest.sources.length);
assert.ok(prepared.documents.every((document) => document.sourceUri.startsWith(`ctg-eval://${manifest.version}/`)));
assert.ok(prepared.documents.every((document) => document.content.length > 20));

const firstSource = manifest.sources[0];
assert.equal(
  gitBlobSha(readFileSync(firstSource.path, 'utf8')),
  firstSource.gitBlobSha,
  'manifest blob identity must match the exact reviewed Git object',
);

const staleManifest = structuredClone(manifest);
staleManifest.sources[0].gitBlobSha = '0'.repeat(40);
assert.throws(
  () => buildEvaluationCorpusPackage(staleManifest),
  /drift detected/,
  'source changes must fail closed until the manifest/dataset are deliberately re-versioned',
);

const escapedPathManifest = structuredClone(manifest);
escapedPathManifest.sources[0].path = '.env.local';
assert.throws(
  () => buildEvaluationCorpusPackage(escapedPathManifest),
  /outside the allow-list/,
  'evaluation corpus must not expand into secrets or arbitrary repository paths',
);

const mismatchedDataset = structuredClone(dataset);
mismatchedDataset.corpusVersion = 'different-corpus';
assert.throws(
  () => validateEvaluationDatasetAgainstCorpus(manifest, mismatchedDataset),
  /corpus version does not match/,
  'dataset must be cryptographically/provenance-bound to its reviewed corpus version',
);

const unknownEvidenceDataset = structuredClone(dataset);
unknownEvidenceDataset.cases[0].expectedEvidenceIds = ['unknown#evidence'];
assert.throws(
  () => validateEvaluationDatasetAgainstCorpus(manifest, unknownEvidenceDataset),
  /references unknown evidence/,
  'expected evidence must be selected only from the reviewed manifest',
);

const fakeNoEvidenceDataset = structuredClone(dataset);
const noEvidenceCase = fakeNoEvidenceDataset.cases.find((fixture) => fixture.expectsEvidence === false);
noEvidenceCase.expectedEvidenceIds = [manifest.sources[0].id];
assert.throws(
  () => validateEvaluationDatasetAgainstCorpus(manifest, fakeNoEvidenceDataset),
  /No-evidence case must not declare expected evidence/,
  'abstention cases must not smuggle answer evidence into the expected set',
);

assert.doesNotMatch(moduleSource, /fetch\s*\(/, 'corpus validation must remain provider-independent');
assert.doesNotMatch(packageSource, /OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/, 'corpus packaging must not depend on provider secrets');
assert.match(packageSource, /validateEvaluationDatasetAgainstCorpus/, 'packaging must validate corpus/dataset integrity before emitting documents');

console.log('CTG Knowledge public evaluation corpus invariants passed.');
