// @ts-check

/**
 * Extract unique numeric citations from bracket citations such as [1], [2], [1, 3]
 * or malformed source identifiers such as [0] and [-1]. Non-numeric markdown
 * brackets are ignored.
 *
 * Deliberately retain non-positive and non-safe numeric identifiers here. Route
 * citations are positive safe integers, so discarding malformed numeric tokens
 * before validation could let a fabricated source reference bypass the fail-closed
 * integrity gate when it appears beside an otherwise valid citation.
 *
 * @param {string} answer
 * @returns {number[]}
 */
export function extractCitationNumbers(answer) {
  const citations = [];
  const seen = new Set();
  const pattern = /\[\s*([+-]?\d+(?:\s*,\s*[+-]?\d+)*)\s*\]/g;

  for (const match of answer.matchAll(pattern)) {
    for (const raw of match[1].split(',')) {
      const citation = Number(raw.trim());
      if (!Number.isFinite(citation) || seen.has(citation)) continue;
      seen.add(citation);
      citations.push(citation);
    }
  }

  return citations;
}

/**
 * A generated answer is considered grounded only when it contains at least one
 * numeric citation and every citation points to a source that was actually
 * supplied to the model for this request.
 *
 * Allowed source identifiers are always positive safe integers. Any observed
 * numeric identifier outside that domain is therefore retained in the parsed
 * citation set and rejected as invalid.
 *
 * This deliberately does not attempt to judge semantic correctness. It is a
 * deterministic post-generation integrity gate that prevents unsupported or
 * fabricated source references from being surfaced as grounded output.
 *
 * @param {string} answer
 * @param {number[]} allowedCitations
 * @returns {{ grounded: boolean, citations: number[], invalidCitations: number[], hasCitations: boolean }}
 */
export function validateGroundedAnswer(answer, allowedCitations) {
  const allowed = new Set(
    allowedCitations.filter((citation) => Number.isSafeInteger(citation) && citation > 0),
  );
  const citations = extractCitationNumbers(answer);
  const invalidCitations = citations.filter(
    (citation) => !Number.isSafeInteger(citation) || citation <= 0 || !allowed.has(citation),
  );
  const hasCitations = citations.length > 0;

  return {
    grounded: hasCitations && invalidCitations.length === 0,
    citations,
    invalidCitations,
    hasCitations,
  };
}
