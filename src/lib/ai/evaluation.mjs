// @ts-check

/**
 * CTG Knowledge evaluation helpers are deliberately provider-independent.
 * They score already-captured retrieval/generation runs and never call a model,
 * database, or external service.
 */

/** @param {unknown} value */
function isBoolean(value) {
  return typeof value === 'boolean';
}

/** @param {unknown[]} values */
function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

/** @param {number[]} values */
function average(values) {
  if (!values.length) return 1;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * @param {string[]} retrieved
 * @param {string[]} relevant
 * @param {number} k
 */
export function precisionAtK(retrieved, relevant, k) {
  const boundedK = Math.max(1, Math.trunc(k));
  const top = uniqueStrings(retrieved).slice(0, boundedK);
  if (!top.length) return relevant.length === 0 ? 1 : 0;
  const relevantSet = new Set(uniqueStrings(relevant));
  return top.filter((id) => relevantSet.has(id)).length / top.length;
}

/**
 * @param {string[]} retrieved
 * @param {string[]} relevant
 * @param {number} k
 */
export function recallAtK(retrieved, relevant, k) {
  const relevantIds = uniqueStrings(relevant);
  if (!relevantIds.length) return 1;
  const relevantSet = new Set(relevantIds);
  const top = uniqueStrings(retrieved).slice(0, Math.max(1, Math.trunc(k)));
  return top.filter((id) => relevantSet.has(id)).length / relevantSet.size;
}

/**
 * @param {string[]} retrieved
 * @param {string[]} relevant
 */
export function reciprocalRank(retrieved, relevant) {
  const relevantSet = new Set(uniqueStrings(relevant));
  if (!relevantSet.size) return 1;
  const index = uniqueStrings(retrieved).findIndex((id) => relevantSet.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

/**
 * @typedef {{
 *   id: string,
 *   question: string,
 *   expectedEvidenceIds: string[],
 *   expectsEvidence: boolean,
 *   businessUnit?: string
 * }} KnowledgeEvaluationCase
 *
 * @typedef {{
 *   version: string,
 *   retrievalK: number,
 *   cases: KnowledgeEvaluationCase[]
 * }} KnowledgeEvaluationDataset
 *
 * @typedef {{
 *   answerCorrect?: boolean,
 *   citationEntailed?: boolean,
 *   safetyPass?: boolean
 * }} HumanReview
 *
 * @typedef {{
 *   id: string,
 *   retrievedEvidenceIds: string[],
 *   citedEvidenceIds: string[],
 *   grounded: boolean,
 *   insufficientEvidence: boolean,
 *   latencyMs?: number,
 *   estimatedCostUsd?: number,
 *   humanReview?: HumanReview
 * }} KnowledgeEvaluationRunCase
 *
 * @typedef {{
 *   datasetVersion: string,
 *   evidenceClass: 'synthetic' | 'authorized-evaluation',
 *   cases: KnowledgeEvaluationRunCase[]
 * }} KnowledgeEvaluationRun
 *
 * @typedef {{
 *   minRetrievalRecallAtK: number,
 *   minMeanReciprocalRank: number,
 *   minCitationValidityRate: number,
 *   minCitationRelevanceRate: number,
 *   minAbstentionAccuracy: number,
 *   minGroundedPassRate: number,
 *   minSafetyPassRate: number,
 *   minHumanReviewCoverage: number
 * }} KnowledgeEvaluationThresholds
 */

/**
 * BETA regression thresholds. These protect against obvious quality regressions
 * but are not, by themselves, a LIVE promotion policy.
 *
 * @type {KnowledgeEvaluationThresholds}
 */
export const CTG_KNOWLEDGE_BETA_THRESHOLDS = Object.freeze({
  minRetrievalRecallAtK: 0.8,
  minMeanReciprocalRank: 0.75,
  minCitationValidityRate: 1,
  minCitationRelevanceRate: 0.9,
  minAbstentionAccuracy: 1,
  minGroundedPassRate: 0.85,
  minSafetyPassRate: 1,
  minHumanReviewCoverage: 1,
});

/**
 * Score one previously captured CTG Knowledge run against a versioned dataset.
 * Synthetic runs can exercise the harness and CI, but they can never become
 * release evidence. Only an explicitly authorized evaluation run is eligible
 * to contribute operating evidence, and even then no automatic LIVE promotion
 * decision is made here.
 *
 * @param {KnowledgeEvaluationDataset} dataset
 * @param {KnowledgeEvaluationRun} run
 * @param {KnowledgeEvaluationThresholds} [thresholds]
 */
export function evaluateKnowledgeRun(dataset, run, thresholds = CTG_KNOWLEDGE_BETA_THRESHOLDS) {
  if (!dataset || typeof dataset.version !== 'string' || !Array.isArray(dataset.cases)) {
    throw new Error('Invalid knowledge evaluation dataset');
  }
  if (!run || run.datasetVersion !== dataset.version || !Array.isArray(run.cases)) {
    throw new Error('Knowledge evaluation run does not match dataset version');
  }

  const retrievalK = Math.max(1, Math.trunc(dataset.retrievalK || 1));
  const runById = new Map(run.cases.map((candidate) => [candidate.id, candidate]));
  const seenDatasetIds = new Set();

  const caseScores = dataset.cases.map((fixture) => {
    if (!fixture.id || seenDatasetIds.has(fixture.id)) {
      throw new Error(`Duplicate or missing evaluation case id: ${fixture.id || '<empty>'}`);
    }
    seenDatasetIds.add(fixture.id);

    const observed = runById.get(fixture.id);
    if (!observed) throw new Error(`Missing evaluation run case: ${fixture.id}`);

    const expectedEvidence = uniqueStrings(fixture.expectedEvidenceIds ?? []);
    const retrievedEvidence = uniqueStrings(observed.retrievedEvidenceIds ?? []);
    const citedEvidence = uniqueStrings(observed.citedEvidenceIds ?? []);
    const retrievedSet = new Set(retrievedEvidence);
    const expectedSet = new Set(expectedEvidence);

    const citationValidity = citedEvidence.length
      ? citedEvidence.filter((id) => retrievedSet.has(id)).length / citedEvidence.length
      : fixture.expectsEvidence
        ? 0
        : 1;
    const citationRelevance = citedEvidence.length
      ? citedEvidence.filter((id) => expectedSet.has(id)).length / citedEvidence.length
      : fixture.expectsEvidence
        ? 0
        : 1;

    const human = observed.humanReview ?? {};
    const humanReviewComplete =
      isBoolean(human.answerCorrect) &&
      isBoolean(human.safetyPass) &&
      (!fixture.expectsEvidence || isBoolean(human.citationEntailed));

    const safetyPass = humanReviewComplete && human.safetyPass === true;
    const semanticPass = fixture.expectsEvidence
      ? humanReviewComplete && human.answerCorrect === true && human.citationEntailed === true
      : humanReviewComplete && human.answerCorrect === true;

    const abstentionPass = fixture.expectsEvidence
      ? null
      : observed.grounded === false && observed.insufficientEvidence === true && citedEvidence.length === 0;

    const casePass = fixture.expectsEvidence
      ? observed.grounded === true &&
        observed.insufficientEvidence === false &&
        citedEvidence.length > 0 &&
        citationValidity === 1 &&
        citationRelevance === 1 &&
        semanticPass &&
        safetyPass
      : abstentionPass === true && semanticPass && safetyPass;

    return {
      id: fixture.id,
      expectsEvidence: fixture.expectsEvidence,
      precisionAtK: precisionAtK(retrievedEvidence, expectedEvidence, retrievalK),
      recallAtK: recallAtK(retrievedEvidence, expectedEvidence, retrievalK),
      reciprocalRank: reciprocalRank(retrievedEvidence, expectedEvidence),
      citationValidity,
      citationRelevance,
      abstentionPass,
      humanReviewComplete,
      safetyPass,
      casePass,
      latencyMs: typeof observed.latencyMs === 'number' && observed.latencyMs >= 0 ? observed.latencyMs : null,
      estimatedCostUsd:
        typeof observed.estimatedCostUsd === 'number' && observed.estimatedCostUsd >= 0
          ? observed.estimatedCostUsd
          : null,
    };
  });

  if (runById.size !== dataset.cases.length) {
    const unknown = [...runById.keys()].filter((id) => !seenDatasetIds.has(id));
    if (unknown.length) throw new Error(`Unknown evaluation run cases: ${unknown.join(', ')}`);
  }

  const evidenceCases = caseScores.filter((score) => score.expectsEvidence);
  const abstentionCases = caseScores.filter((score) => !score.expectsEvidence);
  const reviewedCases = caseScores.filter((score) => score.humanReviewComplete);
  const latencyValues = caseScores.map((score) => score.latencyMs).filter((value) => value !== null);
  const costValues = caseScores.map((score) => score.estimatedCostUsd).filter((value) => value !== null);

  const metrics = {
    caseCount: caseScores.length,
    retrievalPrecisionAtK: average(evidenceCases.map((score) => score.precisionAtK)),
    retrievalRecallAtK: average(evidenceCases.map((score) => score.recallAtK)),
    meanReciprocalRank: average(evidenceCases.map((score) => score.reciprocalRank)),
    citationValidityRate: average(evidenceCases.map((score) => score.citationValidity)),
    citationRelevanceRate: average(evidenceCases.map((score) => score.citationRelevance)),
    abstentionAccuracy: average(abstentionCases.map((score) => (score.abstentionPass ? 1 : 0))),
    groundedPassRate: average(caseScores.map((score) => (score.casePass ? 1 : 0))),
    safetyPassRate: average(reviewedCases.map((score) => (score.safetyPass ? 1 : 0))),
    humanReviewCoverage: caseScores.length ? reviewedCases.length / caseScores.length : 0,
    averageLatencyMs: latencyValues.length ? average(/** @type {number[]} */ (latencyValues)) : null,
    totalEstimatedCostUsd: costValues.length
      ? /** @type {number[]} */ (costValues).reduce((sum, value) => sum + value, 0)
      : null,
  };

  const thresholdChecks = {
    retrievalRecallAtK: metrics.retrievalRecallAtK >= thresholds.minRetrievalRecallAtK,
    meanReciprocalRank: metrics.meanReciprocalRank >= thresholds.minMeanReciprocalRank,
    citationValidityRate: metrics.citationValidityRate >= thresholds.minCitationValidityRate,
    citationRelevanceRate: metrics.citationRelevanceRate >= thresholds.minCitationRelevanceRate,
    abstentionAccuracy: metrics.abstentionAccuracy >= thresholds.minAbstentionAccuracy,
    groundedPassRate: metrics.groundedPassRate >= thresholds.minGroundedPassRate,
    safetyPassRate: metrics.safetyPassRate >= thresholds.minSafetyPassRate,
    humanReviewCoverage: metrics.humanReviewCoverage >= thresholds.minHumanReviewCoverage,
  };

  const regressionPassed = Object.values(thresholdChecks).every(Boolean);
  const releaseEvidenceEligible =
    run.evidenceClass === 'authorized-evaluation' &&
    metrics.humanReviewCoverage === 1 &&
    metrics.safetyPassRate === 1;

  return {
    datasetVersion: dataset.version,
    evidenceClass: run.evidenceClass,
    regressionPassed,
    releaseEvidenceEligible,
    metrics,
    thresholdChecks,
    failedCaseIds: caseScores.filter((score) => !score.casePass).map((score) => score.id),
    caseScores,
  };
}
