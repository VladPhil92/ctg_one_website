import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CTG_KNOWLEDGE_BETA_THRESHOLDS,
  evaluateKnowledgeRun,
  precisionAtK,
  recallAtK,
  reciprocalRank,
} from '../src/lib/ai/evaluation.mjs';

const dataset = JSON.parse(readFileSync('scripts/fixtures/knowledge-evaluation-dataset.synthetic.json', 'utf8'));
const syntheticRun = JSON.parse(readFileSync('scripts/fixtures/knowledge-evaluation-run.synthetic.json', 'utf8'));
const evaluationModule = readFileSync('src/lib/ai/evaluation.mjs', 'utf8');
const evaluationCli = readFileSync('scripts/evaluate-knowledge-run.mjs', 'utf8');
const technologyProof = readFileSync('src/data/technology-proof.ts', 'utf8');

assert.equal(precisionAtK(['a', 'noise'], ['a'], 3), 0.5, 'precision@k must penalize retrieved noise');
assert.equal(recallAtK(['a'], ['a', 'b'], 3), 0.5, 'recall@k must expose missing relevant evidence');
assert.equal(reciprocalRank(['noise', 'a'], ['a']), 0.5, 'MRR must reward earlier relevant evidence');

const result = evaluateKnowledgeRun(dataset, syntheticRun, CTG_KNOWLEDGE_BETA_THRESHOLDS);
assert.equal(result.regressionPassed, true, 'synthetic golden run must satisfy the BETA regression thresholds');
assert.equal(result.releaseEvidenceEligible, false, 'synthetic fixtures must never qualify as release evidence');
assert.equal(result.metrics.humanReviewCoverage, 1, 'all synthetic fixtures must exercise human-review fields');
assert.equal(result.metrics.abstentionAccuracy, 1, 'no-evidence fixture must fail closed through abstention');
assert.equal(result.failedCaseIds.length, 0, 'golden synthetic run must not contain failing cases');

const fabricatedCitationRun = structuredClone(syntheticRun);
fabricatedCitationRun.cases[0].citedEvidenceIds = ['fabricated#source'];
const fabricatedCitationResult = evaluateKnowledgeRun(dataset, fabricatedCitationRun, CTG_KNOWLEDGE_BETA_THRESHOLDS);
assert.equal(fabricatedCitationResult.regressionPassed, false, 'fabricated evidence references must fail the regression gate');
assert.equal(fabricatedCitationResult.metrics.citationValidityRate < 1, true);
assert.deepEqual(fabricatedCitationResult.failedCaseIds, ['known-single-source']);

const unsafeAbstentionRun = structuredClone(syntheticRun);
const noEvidenceCase = unsafeAbstentionRun.cases.find((candidate) => candidate.id === 'no-authorized-evidence');
noEvidenceCase.grounded = true;
noEvidenceCase.insufficientEvidence = false;
noEvidenceCase.citedEvidenceIds = ['fixture-hallucinated#1'];
const unsafeAbstentionResult = evaluateKnowledgeRun(dataset, unsafeAbstentionRun, CTG_KNOWLEDGE_BETA_THRESHOLDS);
assert.equal(unsafeAbstentionResult.regressionPassed, false, 'grounded output without authorized evidence must fail closed');
assert.equal(unsafeAbstentionResult.metrics.abstentionAccuracy, 0);

const missingHumanReviewRun = structuredClone(syntheticRun);
delete missingHumanReviewRun.cases[1].humanReview;
const missingHumanReviewResult = evaluateKnowledgeRun(dataset, missingHumanReviewRun, CTG_KNOWLEDGE_BETA_THRESHOLDS);
assert.equal(missingHumanReviewResult.regressionPassed, false, 'incomplete human review must block the regression gate');
assert.equal(missingHumanReviewResult.releaseEvidenceEligible, false);

const authorizedRun = structuredClone(syntheticRun);
authorizedRun.evidenceClass = 'authorized-evaluation';
const authorizedResult = evaluateKnowledgeRun(dataset, authorizedRun, CTG_KNOWLEDGE_BETA_THRESHOLDS);
assert.equal(authorizedResult.releaseEvidenceEligible, true, 'explicit authorized evidence class may contribute release evidence');
assert.equal(authorizedResult.regressionPassed, true);

assert.throws(
  () => evaluateKnowledgeRun(dataset, { ...syntheticRun, datasetVersion: 'wrong-version' }),
  /does not match dataset version/,
  'dataset/run version drift must fail closed',
);

assert.doesNotMatch(evaluationModule, /fetch\s*\(/, 'evaluation scoring must remain provider-independent');
assert.doesNotMatch(evaluationModule, /openai|supabase/i, 'evaluation scoring must not hide provider/database calls');
assert.match(evaluationCli, /--dataset/);
assert.match(evaluationCli, /--run/);
assert.match(
  technologyProof,
  /Reproducible evaluation harness implemented; authorized semantic and operating evidence still required for LIVE promotion/,
  'Technology Proof must distinguish harness implementation from actual operating evidence',
);

console.log('CTG Knowledge evaluation invariants passed.');
