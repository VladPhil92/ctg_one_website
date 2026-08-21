// @ts-check

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reproduce Git's blob object SHA-1 for a UTF-8 text file so a manifest can pin
 * evaluation evidence to the exact repository object reviewed at dataset time.
 *
 * @param {string} content
 */
export function gitBlobSha(content) {
  const body = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(body).digest('hex');
}

/**
 * Extract one Markdown section beginning immediately after the requested heading
 * and ending before the next heading at the same or higher level.
 *
 * @param {string} content
 * @param {string} heading
 */
export function extractMarkdownSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const headingPattern = new RegExp(`^(#{1,6})\\s+${escapeRegExp(heading)}\\s*$`);
  let start = -1;
  let level = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(headingPattern);
    if (!match) continue;
    start = index + 1;
    level = match[1].length;
    break;
  }

  if (start === -1) throw new Error(`Evaluation corpus heading not found: ${heading}`);

  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }

  const section = lines.slice(start, end).join('\n').trim();
  if (!section) throw new Error(`Evaluation corpus heading has no content: ${heading}`);
  return section;
}

/**
 * @typedef {{
 *   id: string,
 *   path: string,
 *   heading: string,
 *   gitBlobSha: string
 * }} EvaluationCorpusSource
 *
 * @typedef {{
 *   version: string,
 *   classification: string,
 *   scope: string,
 *   allowedPathPrefixes: string[],
 *   sources: EvaluationCorpusSource[]
 * }} EvaluationCorpusManifest
 *
 * @typedef {{
 *   version: string,
 *   corpusVersion: string,
 *   retrievalK: number,
 *   cases: Array<{
 *     id: string,
 *     question: string,
 *     expectedEvidenceIds: string[],
 *     expectsEvidence: boolean,
 *     businessUnit?: string,
 *     tags?: string[]
 *   }>
 * }} EvaluationDataset
 */

/**
 * Validate pinned first-party evaluation sources and materialize exact reviewed
 * sections into an ingestion-ready package. This function performs no network,
 * database, model, or provider calls.
 *
 * @param {EvaluationCorpusManifest} manifest
 * @param {{ readFile?: (path: string) => string }} [options]
 */
export function buildEvaluationCorpusPackage(manifest, options = {}) {
  if (!manifest || typeof manifest.version !== 'string' || !manifest.version) {
    throw new Error('Invalid evaluation corpus version');
  }
  if (manifest.classification !== 'public-first-party') {
    throw new Error('Evaluation corpus must be classified public-first-party');
  }
  if (manifest.scope !== 'evaluation-only') {
    throw new Error('Evaluation corpus scope must remain evaluation-only');
  }
  if (!Array.isArray(manifest.allowedPathPrefixes) || !manifest.allowedPathPrefixes.length) {
    throw new Error('Evaluation corpus requires explicit allowed path prefixes');
  }
  if (!Array.isArray(manifest.sources) || !manifest.sources.length) {
    throw new Error('Evaluation corpus requires at least one source');
  }

  const readFile = options.readFile ?? ((path) => readFileSync(path, 'utf8'));
  const seenIds = new Set();
  const documents = manifest.sources.map((source) => {
    if (!source.id || seenIds.has(source.id)) {
      throw new Error(`Duplicate or missing evaluation evidence id: ${source.id || '<empty>'}`);
    }
    seenIds.add(source.id);

    const allowedPath = manifest.allowedPathPrefixes.some((prefix) => source.path.startsWith(prefix));
    if (!allowedPath || source.path.includes('..') || source.path.startsWith('/')) {
      throw new Error(`Evaluation source path is outside the allow-list: ${source.path}`);
    }
    if (!/^[0-9a-f]{40}$/.test(source.gitBlobSha)) {
      throw new Error(`Invalid Git blob SHA for evaluation source: ${source.id}`);
    }
    if (!source.heading) {
      throw new Error(`Evaluation source requires a heading: ${source.id}`);
    }

    const content = readFile(source.path);
    const observedSha = gitBlobSha(content);
    if (observedSha !== source.gitBlobSha) {
      throw new Error(
        `Evaluation corpus drift detected for ${source.id}: expected ${source.gitBlobSha}, observed ${observedSha}`,
      );
    }

    const section = extractMarkdownSection(content, source.heading);
    return {
      evidenceId: source.id,
      title: `${source.path} — ${source.heading}`,
      businessUnit: 'CTG One Technology',
      sourceUri: `ctg-eval://${manifest.version}/${encodeURIComponent(source.id)}@${source.gitBlobSha}`,
      content: section,
      repositoryPath: source.path,
      heading: source.heading,
      gitBlobSha: source.gitBlobSha,
    };
  });

  return {
    corpusVersion: manifest.version,
    classification: manifest.classification,
    scope: manifest.scope,
    documents,
  };
}

/**
 * Validate that a representative dataset is bound to the exact corpus manifest
 * and covers supported, no-evidence, and adversarial behavior before any real
 * model run is captured.
 *
 * @param {EvaluationCorpusManifest} manifest
 * @param {EvaluationDataset} dataset
 * @param {{ readFile?: (path: string) => string }} [options]
 */
export function validateEvaluationDatasetAgainstCorpus(manifest, dataset, options = {}) {
  const corpusPackage = buildEvaluationCorpusPackage(manifest, options);

  if (!dataset || typeof dataset.version !== 'string' || !dataset.version) {
    throw new Error('Invalid evaluation dataset version');
  }
  if (dataset.corpusVersion !== manifest.version) {
    throw new Error('Evaluation dataset corpus version does not match the pinned manifest');
  }
  if (!Number.isInteger(dataset.retrievalK) || dataset.retrievalK < 1) {
    throw new Error('Evaluation dataset retrievalK must be a positive integer');
  }
  if (!Array.isArray(dataset.cases) || dataset.cases.length < 10) {
    throw new Error('Representative evaluation dataset must contain at least ten cases');
  }

  const evidenceIds = new Set(corpusPackage.documents.map((document) => document.evidenceId));
  const seenCaseIds = new Set();
  let supportedCount = 0;
  let noEvidenceCount = 0;
  let adversarialCount = 0;
  let multiSourceCount = 0;

  for (const fixture of dataset.cases) {
    if (!fixture.id || seenCaseIds.has(fixture.id)) {
      throw new Error(`Duplicate or missing evaluation case id: ${fixture.id || '<empty>'}`);
    }
    seenCaseIds.add(fixture.id);

    if (typeof fixture.question !== 'string' || fixture.question.trim().length < 8) {
      throw new Error(`Evaluation case requires a meaningful question: ${fixture.id}`);
    }
    if (!Array.isArray(fixture.expectedEvidenceIds)) {
      throw new Error(`Evaluation case expectedEvidenceIds must be an array: ${fixture.id}`);
    }

    const expected = [...new Set(fixture.expectedEvidenceIds)];
    for (const evidenceId of expected) {
      if (!evidenceIds.has(evidenceId)) {
        throw new Error(`Evaluation case ${fixture.id} references unknown evidence: ${evidenceId}`);
      }
    }

    if (fixture.expectsEvidence) {
      supportedCount += 1;
      if (!expected.length) {
        throw new Error(`Evidence-bearing case has no expected evidence: ${fixture.id}`);
      }
      if (expected.length > 1) multiSourceCount += 1;
    } else {
      noEvidenceCount += 1;
      if (expected.length) {
        throw new Error(`No-evidence case must not declare expected evidence: ${fixture.id}`);
      }
    }

    const tags = Array.isArray(fixture.tags) ? fixture.tags : [];
    if (tags.includes('adversarial')) adversarialCount += 1;
  }

  if (supportedCount < 8) throw new Error('Evaluation dataset requires broad supported-question coverage');
  if (noEvidenceCount < 2) throw new Error('Evaluation dataset requires at least two no-evidence cases');
  if (adversarialCount < 2) throw new Error('Evaluation dataset requires at least two adversarial cases');
  if (multiSourceCount < 2) throw new Error('Evaluation dataset requires at least two multi-source cases');

  return {
    datasetVersion: dataset.version,
    corpusVersion: manifest.version,
    sourceCount: corpusPackage.documents.length,
    caseCount: dataset.cases.length,
    supportedCount,
    noEvidenceCount,
    adversarialCount,
    multiSourceCount,
  };
}
