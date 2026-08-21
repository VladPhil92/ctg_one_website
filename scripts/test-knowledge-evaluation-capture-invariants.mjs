import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateKnowledgeRun } from '../src/lib/ai/evaluation.mjs';
import {
  assertIsolatedEvaluationBaseUrl,
  createKnowledgeEvaluationReviewTemplate,
  finalizeAuthorizedKnowledgeEvaluationRun,
  KNOWLEDGE_EVALUATION_CAPTURE_VERSION,
} from '../src/lib/ai/evaluation-capture.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dataset = {
  version: 'capture-test-v1',
  corpusVersion: 'corpus-test-v1',
  retrievalK: 2,
  cases: [
    {
      id: 'supported',
      question: 'What does the authorized source say?',
      expectedEvidenceIds: ['evidence-1'],
      expectsEvidence: true,
    },
    {
      id: 'no-evidence',
      question: 'What unsupported fact is not documented?',
      expectedEvidenceIds: [],
      expectsEvidence: false,
    },
  ],
};

const corpusPackage = {
  corpusVersion: 'corpus-test-v1',
  classification: 'public-first-party',
  scope: 'evaluation-only',
  documents: [
    {
      evidenceId: 'evidence-1',
      sourceUri: 'ctg-eval://corpus-test-v1/evidence-1@1111111111111111111111111111111111111111',
      title: 'Evidence one',
    },
  ],
};

const capture = {
  captureVersion: KNOWLEDGE_EVALUATION_CAPTURE_VERSION,
  captureId: 'capture-001',
  datasetVersion: dataset.version,
  corpusVersion: corpusPackage.corpusVersion,
  evaluationBusinessUnit: 'ctg_eval_capture_test_v1',
  environment: { kind: 'isolated-local', baseUrl: 'http://127.0.0.1:3000' },
  cases: [
    {
      id: 'supported',
      question: dataset.cases[0].question,
      answer: 'The source supports this answer [1].',
      grounded: true,
      latencyMs: 120,
      sources: [
        {
          citation: 1,
          sourceUri: corpusPackage.documents[0].sourceUri,
          similarity: 0.91,
        },
      ],
    },
    {
      id: 'no-evidence',
      question: dataset.cases[1].question,
      answer: 'The available authorized knowledge does not contain enough evidence to answer this question.',
      grounded: false,
      latencyMs: 80,
      sources: [],
    },
  ],
};

const template = createKnowledgeEvaluationReviewTemplate(dataset, corpusPackage, capture);
assert.equal(template.cases.length, 2);
assert.deepEqual(template.cases[0].retrievedEvidenceIds, ['evidence-1']);
assert.deepEqual(template.cases[0].citedEvidenceIds, ['evidence-1']);
assert.equal(template.cases[0].answerCorrect, null);

const review = {
  captureId: capture.captureId,
  datasetVersion: dataset.version,
  corpusVersion: corpusPackage.corpusVersion,
  cases: [
    {
      id: 'supported',
      answerCorrect: true,
      citationEntailed: true,
      safetyPass: true,
      estimatedCostUsd: 0.001,
    },
    {
      id: 'no-evidence',
      answerCorrect: true,
      citationEntailed: null,
      safetyPass: true,
      estimatedCostUsd: 0.0005,
    },
  ],
};

const run = finalizeAuthorizedKnowledgeEvaluationRun(dataset, corpusPackage, capture, review);
assert.equal(run.evidenceClass, 'authorized-evaluation');
assert.deepEqual(run.cases[0].retrievedEvidenceIds, ['evidence-1']);
assert.deepEqual(run.cases[0].citedEvidenceIds, ['evidence-1']);
assert.equal(run.cases[1].insufficientEvidence, true);
assert.equal('answer' in run.cases[0], false, 'Final scored run must not retain generated answer text.');

const report = evaluateKnowledgeRun(dataset, run);
assert.equal(report.regressionPassed, true);
assert.equal(report.releaseEvidenceEligible, true);
assert.equal(report.metrics.humanReviewCoverage, 1);
assert.equal(report.metrics.totalEstimatedCostUsd, 0.0015);

for (const productionUrl of [
  'https://ctgone.com',
  'https://ctgone.com.',
  'https://WWW.CTGONE.COM.',
  'https://ctg-one-website.onrender.com',
  'https://ctg-one-website.onrender.com.',
]) {
  assert.throws(
    () => assertIsolatedEvaluationBaseUrl(productionUrl),
    /must never be seeded or captured against production/,
    `Production target must be denied after hostname normalization: ${productionUrl}`,
  );
}

assert.equal(assertIsolatedEvaluationBaseUrl('http://127.0.0.1:3000').environmentKind, 'isolated-local');
assert.equal(assertIsolatedEvaluationBaseUrl('http://[::1]:3000').environmentKind, 'isolated-local');
assert.equal(assertIsolatedEvaluationBaseUrl('https://evaluation.example.test').environmentKind, 'isolated-remote');
assert.throws(() => assertIsolatedEvaluationBaseUrl('http://evaluation.example.test'), /must use HTTPS/);

const outsideCorpus = structuredClone(capture);
outsideCorpus.cases[0].sources[0].sourceUri = 'ctg-eval://other/unknown@2222222222222222222222222222222222222222';
assert.throws(
  () => createKnowledgeEvaluationReviewTemplate(dataset, corpusPackage, outsideCorpus),
  /outside the authorized evaluation corpus/,
);

const incompleteReview = structuredClone(review);
incompleteReview.cases[0].citationEntailed = null;
assert.throws(
  () => finalizeAuthorizedKnowledgeEvaluationRun(dataset, corpusPackage, capture, incompleteReview),
  /Citation entailment review is incomplete/,
);

const fabricatedCitation = structuredClone(capture);
fabricatedCitation.cases[0].answer = 'Fabricated citation [2].';
assert.throws(
  () => createKnowledgeEvaluationReviewTemplate(dataset, corpusPackage, fabricatedCitation),
  /was not returned by retrieval/,
);

const seedScript = read('scripts/seed-knowledge-evaluation-corpus.mjs');
const captureScript = read('scripts/capture-knowledge-evaluation.mjs');
const finalizeScript = read('scripts/finalize-knowledge-evaluation-capture.mjs');
const packageJson = read('package.json');
const proof = read('src/data/technology-proof.ts');
const runbook = read('docs/ai/CTG_KNOWLEDGE_CONTROLLED_EVALUATION.md');

assert.match(seedScript, /SEED_AUTHORIZED_EVALUATION/);
assert.match(captureScript, /RUN_AUTHORIZED_EVALUATION/);
assert.match(seedScript, /CTG_KNOWLEDGE_EVALUATION_COOKIE/);
assert.match(captureScript, /CTG_KNOWLEDGE_EVALUATION_COOKIE/);
assert.match(finalizeScript, /never promotes CTG Knowledge to LIVE/);
assert.match(packageJson, /knowledge:evaluation:seed/);
assert.match(packageJson, /knowledge:evaluation:capture/);
assert.match(packageJson, /knowledge:evaluation:review-template/);
assert.match(packageJson, /knowledge:evaluation:finalize/);
assert.match(packageJson, /test-knowledge-evaluation-capture-invariants\.mjs/);
assert.match(proof, /publicStatus: 'BETA'/);
assert.match(proof, /phase: '14'/);
assert.match(proof, /first authorized human-reviewed run still pending/i);
assert.match(runbook, /Production is a prohibited evaluation target/i);
assert.match(runbook, /No provider-backed command runs in CI/i);

console.log('CTG Knowledge controlled evaluation capture invariants passed.');
