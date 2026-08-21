// @ts-check

import { extractCitationIdentifiers } from './grounding.mjs';

export const KNOWLEDGE_EVALUATION_CAPTURE_VERSION = 'ctg-knowledge-authorized-capture-v1';

const PRODUCTION_HOSTS = new Set([
  'ctgone.com',
  'www.ctgone.com',
  'ctg-one-website.onrender.com',
]);

/** @param {string} value */
export function assertIsolatedEvaluationBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Evaluation base URL is invalid');
  }

  if (PRODUCTION_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('Authorized evaluation corpus must never be seeded or captured against production');
  }

  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
  if (!local && url.protocol !== 'https:') {
    throw new Error('Remote evaluation environments must use HTTPS');
  }

  return {
    baseUrl: url.origin,
    environmentKind: local ? 'isolated-local' : 'isolated-remote',
  };
}

/** @param {unknown[]} values */
function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

/**
 * @param {{ corpusVersion: string, documents: Array<{ evidenceId: string, sourceUri: string, title?: string }> }} corpusPackage
 */
function buildEvidenceIndex(corpusPackage) {
  if (!corpusPackage || typeof corpusPackage.corpusVersion !== 'string' || !Array.isArray(corpusPackage.documents)) {
    throw new Error('Invalid evaluation corpus package');
  }

  const byUri = new Map();
  const seenIds = new Set();
  for (const document of corpusPackage.documents) {
    if (!document.evidenceId || seenIds.has(document.evidenceId)) {
      throw new Error(`Duplicate or missing corpus evidence id: ${document.evidenceId || '<empty>'}`);
    }
    if (!document.sourceUri || byUri.has(document.sourceUri)) {
      throw new Error(`Duplicate or missing corpus source URI: ${document.sourceUri || '<empty>'}`);
    }
    seenIds.add(document.evidenceId);
    byUri.set(document.sourceUri, document);
  }
  return byUri;
}

/**
 * @param {Array<{ citation: number, sourceUri: string | null }>} sources
 * @param {Map<string, { evidenceId: string }>} evidenceByUri
 */
function resolveRetrievedEvidence(sources, evidenceByUri) {
  const citationMap = new Map();
  const retrieved = [];

  for (const source of sources) {
    if (!Number.isSafeInteger(source.citation) || source.citation <= 0 || citationMap.has(source.citation)) {
      throw new Error(`Invalid or duplicate captured citation identifier: ${source.citation}`);
    }
    if (typeof source.sourceUri !== 'string' || !source.sourceUri) {
      throw new Error(`Captured source ${source.citation} has no stable evaluation source URI`);
    }
    const document = evidenceByUri.get(source.sourceUri);
    if (!document) throw new Error(`Captured source is outside the authorized evaluation corpus: ${source.sourceUri}`);
    citationMap.set(source.citation, document.evidenceId);
    retrieved.push(document.evidenceId);
  }

  return { citationMap, retrievedEvidenceIds: uniqueStrings(retrieved) };
}

/**
 * @param {string} answer
 * @param {Map<number, string>} citationMap
 */
function resolveCitedEvidence(answer, citationMap) {
  const cited = [];
  for (const citation of extractCitationIdentifiers(answer)) {
    if (typeof citation !== 'number' || !Number.isSafeInteger(citation) || citation <= 0) {
      throw new Error(`Captured answer contains an invalid citation identifier: ${String(citation)}`);
    }
    const evidenceId = citationMap.get(citation);
    if (!evidenceId) throw new Error(`Captured answer cites source ${citation}, which was not returned by retrieval`);
    cited.push(evidenceId);
  }
  return uniqueStrings(cited);
}

/**
 * Build a human-review worksheet from a raw authorized capture. This function
 * never calls a provider and deliberately leaves semantic judgments unset.
 *
 * @param {{ version: string, corpusVersion?: string, cases: Array<{ id: string, question: string, expectedEvidenceIds: string[], expectsEvidence: boolean }> }} dataset
 * @param {{ corpusVersion: string, documents: Array<{ evidenceId: string, sourceUri: string, title?: string }> }} corpusPackage
 * @param {{ captureVersion: string, captureId: string, datasetVersion: string, corpusVersion: string, cases: Array<any> }} capture
 */
export function createKnowledgeEvaluationReviewTemplate(dataset, corpusPackage, capture) {
  const evidenceByUri = buildEvidenceIndex(corpusPackage);
  validateCaptureEnvelope(dataset, corpusPackage, capture);
  const captureById = new Map(capture.cases.map((candidate) => [candidate.id, candidate]));

  return {
    captureId: capture.captureId,
    datasetVersion: dataset.version,
    corpusVersion: corpusPackage.corpusVersion,
    instructions:
      'Review every case manually. Set answerCorrect and safetyPass to true/false. For evidence-bearing cases also set citationEntailed to true/false. Do not approve a citation merely because its identifier is valid.',
    cases: dataset.cases.map((fixture) => {
      const observed = captureById.get(fixture.id);
      const { citationMap, retrievedEvidenceIds } = resolveRetrievedEvidence(observed.sources ?? [], evidenceByUri);
      const citedEvidenceIds = resolveCitedEvidence(observed.answer ?? '', citationMap);
      return {
        id: fixture.id,
        question: fixture.question,
        expectsEvidence: fixture.expectsEvidence,
        expectedEvidenceIds: fixture.expectedEvidenceIds,
        retrievedEvidenceIds,
        citedEvidenceIds,
        answer: observed.answer,
        answerCorrect: null,
        citationEntailed: fixture.expectsEvidence ? null : null,
        safetyPass: null,
        estimatedCostUsd: null,
        notes: '',
      };
    }),
  };
}

/**
 * @param {{ version: string, corpusVersion?: string, cases: Array<{ id: string, question: string, expectedEvidenceIds: string[], expectsEvidence: boolean }> }} dataset
 * @param {{ corpusVersion: string }} corpusPackage
 * @param {{ captureVersion: string, captureId: string, datasetVersion: string, corpusVersion: string, cases: Array<any> }} capture
 */
function validateCaptureEnvelope(dataset, corpusPackage, capture) {
  if (!dataset || typeof dataset.version !== 'string' || !Array.isArray(dataset.cases)) {
    throw new Error('Invalid evaluation dataset');
  }
  if (dataset.corpusVersion && dataset.corpusVersion !== corpusPackage.corpusVersion) {
    throw new Error('Evaluation dataset does not match corpus package version');
  }
  if (!capture || capture.captureVersion !== KNOWLEDGE_EVALUATION_CAPTURE_VERSION) {
    throw new Error('Unsupported evaluation capture version');
  }
  if (!capture.captureId || capture.datasetVersion !== dataset.version || capture.corpusVersion !== corpusPackage.corpusVersion) {
    throw new Error('Evaluation capture does not match dataset/corpus identity');
  }
  if (!Array.isArray(capture.cases) || capture.cases.length !== dataset.cases.length) {
    throw new Error('Evaluation capture must contain exactly one result for every dataset case');
  }
}

/**
 * Convert a raw isolated-environment capture plus completed human review into
 * the provider-independent authorized run consumed by evaluation.mjs.
 * Generated answer text is intentionally not copied into the final run.
 *
 * @param {{ version: string, corpusVersion?: string, cases: Array<{ id: string, question: string, expectedEvidenceIds: string[], expectsEvidence: boolean }> }} dataset
 * @param {{ corpusVersion: string, documents: Array<{ evidenceId: string, sourceUri: string, title?: string }> }} corpusPackage
 * @param {{ captureVersion: string, captureId: string, datasetVersion: string, corpusVersion: string, evaluationBusinessUnit?: string, environment?: any, cases: Array<any> }} capture
 * @param {{ captureId: string, datasetVersion: string, corpusVersion?: string, cases: Array<any> }} review
 */
export function finalizeAuthorizedKnowledgeEvaluationRun(dataset, corpusPackage, capture, review) {
  const evidenceByUri = buildEvidenceIndex(corpusPackage);
  validateCaptureEnvelope(dataset, corpusPackage, capture);

  if (!review || review.captureId !== capture.captureId || review.datasetVersion !== dataset.version) {
    throw new Error('Human review does not match the captured evaluation run');
  }
  if (review.corpusVersion && review.corpusVersion !== corpusPackage.corpusVersion) {
    throw new Error('Human review does not match the evaluation corpus version');
  }
  if (!Array.isArray(review.cases) || review.cases.length !== dataset.cases.length) {
    throw new Error('Human review must cover every evaluation case exactly once');
  }

  const captureById = new Map();
  for (const candidate of capture.cases) {
    if (!candidate?.id || captureById.has(candidate.id)) throw new Error(`Duplicate or missing captured case id: ${candidate?.id || '<empty>'}`);
    captureById.set(candidate.id, candidate);
  }
  const reviewById = new Map();
  for (const candidate of review.cases) {
    if (!candidate?.id || reviewById.has(candidate.id)) throw new Error(`Duplicate or missing review case id: ${candidate?.id || '<empty>'}`);
    reviewById.set(candidate.id, candidate);
  }

  const cases = dataset.cases.map((fixture) => {
    const observed = captureById.get(fixture.id);
    const human = reviewById.get(fixture.id);
    if (!observed || !human) throw new Error(`Missing capture or review for evaluation case: ${fixture.id}`);
    if (observed.question !== fixture.question) throw new Error(`Captured question drift detected for case: ${fixture.id}`);
    if (typeof observed.answer !== 'string' || typeof observed.grounded !== 'boolean' || !Array.isArray(observed.sources)) {
      throw new Error(`Malformed captured response for case: ${fixture.id}`);
    }

    const { citationMap, retrievedEvidenceIds } = resolveRetrievedEvidence(observed.sources, evidenceByUri);
    const citedEvidenceIds = resolveCitedEvidence(observed.answer, citationMap);

    if (observed.grounded && (!retrievedEvidenceIds.length || !citedEvidenceIds.length)) {
      throw new Error(`Grounded capture lacks retrieved/cited evidence: ${fixture.id}`);
    }
    if (!observed.grounded && (observed.sources.length || citedEvidenceIds.length)) {
      throw new Error(`Ungrounded capture must use the standard evidence-free fallback: ${fixture.id}`);
    }

    if (typeof human.answerCorrect !== 'boolean' || typeof human.safetyPass !== 'boolean') {
      throw new Error(`Human correctness/safety review is incomplete: ${fixture.id}`);
    }
    if (fixture.expectsEvidence && typeof human.citationEntailed !== 'boolean') {
      throw new Error(`Citation entailment review is incomplete: ${fixture.id}`);
    }
    if (human.estimatedCostUsd != null && (typeof human.estimatedCostUsd !== 'number' || human.estimatedCostUsd < 0)) {
      throw new Error(`Invalid estimated cost for evaluation case: ${fixture.id}`);
    }

    return {
      id: fixture.id,
      retrievedEvidenceIds,
      citedEvidenceIds,
      grounded: observed.grounded,
      insufficientEvidence: observed.grounded === false,
      latencyMs: typeof observed.latencyMs === 'number' && observed.latencyMs >= 0 ? observed.latencyMs : undefined,
      estimatedCostUsd: human.estimatedCostUsd ?? undefined,
      humanReview: {
        answerCorrect: human.answerCorrect,
        citationEntailed: fixture.expectsEvidence ? human.citationEntailed : undefined,
        safetyPass: human.safetyPass,
      },
    };
  });

  const datasetIds = new Set(dataset.cases.map((fixture) => fixture.id));
  for (const id of captureById.keys()) if (!datasetIds.has(id)) throw new Error(`Unknown captured evaluation case: ${id}`);
  for (const id of reviewById.keys()) if (!datasetIds.has(id)) throw new Error(`Unknown reviewed evaluation case: ${id}`);

  return {
    datasetVersion: dataset.version,
    evidenceClass: 'authorized-evaluation',
    captureId: capture.captureId,
    corpusVersion: corpusPackage.corpusVersion,
    evaluationBusinessUnit: capture.evaluationBusinessUnit ?? null,
    environment: capture.environment ?? null,
    cases,
  };
}
